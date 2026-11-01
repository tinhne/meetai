# MeetAI — Technical decisions

Decisions in force as of 2026-11-01. Product-level decisions live in [docs/PRODUCT_PLAN.md](../docs/PRODUCT_PLAN.md) §13 and the phase specs in [docs/MASTER_PROMPT.md](../docs/MASTER_PROMPT.md).

## Process
- **Attribution:** all commits, PRs and docs are credited to **tinhne** only. No `Co-Authored-By`/"Generated with" lines for any AI tool. This overrides tool defaults. Older history was rewritten once to remove such lines.
- Work phase by phase (`phase-N-<slug>` branches, one commit per phase), run lint/typecheck/test/build, then wait for the owner's OK. Phases 0–8 are done and merged into `main`.
- Never push `main` (it auto-deploys Vercel production), run migrations on Neon, force-push, or change external dashboards without asking. Read-only DB checks are fine. Never print `.env` values.
- Production build checks run in a scratchpad copy (`rsync` without `node_modules/.next/.git` + symlinked `node_modules`), because `next build` would clobber the running `next dev` `.next` dir.

## Product / platform
- Positioning: team meetings + practice (IELTS/interview/sales). Vietnamese default at `/`, English at `/en`, `localeDetection: false`.
- AI budget: OpenAI only for realtime voice (`gpt-realtime-mini`); Gemini (free tier today) for transcription, notes, Ask AI, memory, embeddings, scoring. Switch Gemini to the paid tier before selling; the privacy policy says the free tier may use data.
- Stream STT has no Vietnamese. Recordings are re-transcribed by Gemini using Stream's speaker timeline.
- Payments: Polar (merchant of record, USD). Vietnamese QR provider (SePay/PayOS) later behind `PaymentProvider` (`src/server/billing/payment-provider.ts`).
- Hosting: Vercel (web), Railway/Docker (`worker/`), Neon us-west-2, optional Cloudflare R2, Inngest, Resend.

## Code conventions
- Domain modules in `src/modules/<domain>/{server/procedures.ts, ui/views, ui/components, lib}`; register routers in `src/trpc/routers/_app.ts`.
- Authorization through `src/server/authz.ts` (`getOwnedAgent`, `getMeetingForUser(userId, meetingId, minRole)`, roles owner/host/participant). NOT_FOUND instead of FORBIDDEN for others' resources.
- Every input is zod-validated with length limits; rate limits via `enforceRateLimit`/`consumeRateLimit` (`src/server/rate-limit.ts`, Postgres fixed window).
- UI: design tokens only (no hex), dark/light, responsive from 360 px, all strings in `messages/{vi,en}.json`, `@/i18n/navigation` for Link/router/redirect, `requireSession()` on dashboard pages.
- Model ids and limits from `src/config/ai.ts` (env overrides `GEMINI_TEXT_MODEL`, `GEMINI_FAST_MODEL`, `GEMINI_EMBED_MODEL`, `OPENAI_REALTIME_MODEL`). Quotas only from `src/config/plans.ts`. Marketing prices only from `src/config/pricing.ts`.
- Gemini calls go through `src/server/ai/gemini.ts` (`generateJson` with model fallback and 429 → Inngest `RetryAfterError`; `generateText`; `uploadFileFromUrl`) and `embeddings.ts`.
- Pure, testable rules sit in separate files (`quota-rules.ts`, `chunking.ts`, `html.ts`, `authz-rules.ts`, `plans.ts`); Vitest tests sit next to them.

## Billing (Phase 6)
- Plan = local `subscriptions` cache (statuses active/trialing/past_due grant Pro). `getUserPlan` (`src/server/billing/plan.ts`) backfills from Polar once per user (`billing_customers`), then relies on the webhook (`/api/auth/polar/webhooks`, via `@polar-sh/better-auth` `webhooks()`, only when `POLAR_WEBHOOK_SECRET` is set) and the billing page "Sync" (`billing.sync`, also grants paid credit packs).
- Any recurring Polar product = Pro (product metadata `plan=team` reserved). One-time products with metadata `voice_minutes` = AI minute packs → `credits` (unique `external_id` = order id, idempotent).
- `usage_events` is an append-only ledger; quotas count it per UTC month; deletes never refund.
- AI voice: monthly allowance first, then credits oldest-first via one `UPDATE … WITH ordered` statement (`ledger.ts`). Worker and app share `ledger.ts`.
- Quotas: `assertQuota(userId, kinds)` → `TRPCError FORBIDDEN` with `cause: QuotaExceededError(info)`; `errorFormatter` in `src/trpc/init.ts` adds `data.quota`; `MutationCache.onError` in `src/trpc/query-client.ts` opens `QuotaDialog` (mounted in the dashboard layout). Callers skip toasts with `getQuotaInfo(error)`.
- Lifecycle emails deduped by `email_log (user_id, kind, dedupe_key)`: welcome, 80% quota warning (once per kind per month), payment succeeded/failed.

## Memory / search (Phase 7)
- pgvector (`CREATE EXTENSION vector` in migration 0007), `vector(768)` columns, HNSW cosine indexes; embeddings `gemini-embedding-001` with `outputDimensionality: 768`, batches of 50.
- Tables: `memories` (types decision/fact/preference/todo/glossary; agent-scoped or shared when `agent_id` is null; `archived_at` excludes from prompts), `knowledge_documents` + `knowledge_chunks` (text only, never the original file), `meeting_chunks` (~1200-char transcript windows with `start_ms`).
- After processing: `index-transcript` and `extract-memories` steps (memory only if `agents.memory_enabled`). Dedupe: cosine ≥ 0.92 with same type → update instead of insert.
- Voice-agent briefing (`src/server/memory/briefing.ts`, alias-free, used by worker and app): latest 15 memories + 8 open action items, ≤ 3000 chars; no vector search (the worker has no Gemini dependency).
- Ask AI adds memory/knowledge background and, for long meetings, semantic transcript windows; keyword selection is the fallback.
- `/dashboard/search` triggers `memory/backfill` (throttled 1/h per user) for completed meetings that have `transcript_segments` but no chunks.
- Knowledge ingestion: upload route (`/api/knowledge/upload`, ≤ 4 MB, PDF by magic bytes → Gemini Files; UTF-8 .txt/.md), URL via `fetchPublicPage` (http/https only, DNS check against private ranges on every redirect, ≤ 2 MB), Inngest `knowledge/process`. Free plan has 0 documents (Pro 20).

## Practice (Phase 8)
- Scenarios in `src/config/practice.ts` reuse agent templates. One practice agent per template (`agents.practice_scenario`), memory off, not counted toward the agent quota, excluded from the "Meet now" default.
- `meetings.practice_kind` + `meetings.scorecard` (jsonb, `scorecardSchema`). Scored in the Inngest `score-practice` step only when the meeting had speech; only the candidate's lines are scored; scores are always labelled as estimates.

## Marketing / SEO (Phase 5)
- Marketing pages are static (`(marketing)` group), session-aware CTAs on the client (`AuthCta`). `buildAlternates()` for canonical + hreflang; JSON-LD builders in `src/modules/marketing/lib/structured-data.ts`; OG images via `next/og` with Be Vietnam Pro fetched from Google Fonts (Vietnamese glyphs); middleware matcher excludes `opengraph-image`.
- Legal pages (`src/content/legal.ts`) are DRAFTS shown with a draft banner; they need lawyer review.
