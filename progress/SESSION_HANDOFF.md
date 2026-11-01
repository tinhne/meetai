# MeetAI — Session Handoff

Last updated: 2026-11-01. Primary source of truth for the next session.
Related: [CLAUDE.md](../CLAUDE.md) · [CURRENT_STATUS](CURRENT_STATUS.md) · [TASKS](TASKS.md) · [DECISIONS](DECISIONS.md) · [BUGS](BUGS.md) · [docs/MASTER_PROMPT.md](../docs/MASTER_PROMPT.md) · [docs/PRODUCT_PLAN.md](../docs/PRODUCT_PLAN.md) · [docs/BILLING_SETUP.md](../docs/BILLING_SETUP.md)

## Next session initialization

"Before doing anything else, read CLAUDE.md and progress/SESSION_HANDOFF.md. Then inspect the current Git branch and working tree. Read all relevant project documentation and inspect the actual implementation around the unfinished task. Reconstruct the previous session's state, verify what is already completed, and continue from the exact next action documented in the handoff. Do not repeat completed work, do not overwrite existing implementations, and do not start unrelated tasks."

---

## A. Project overview

**MeetAI (Meet.AI)** is a Vietnamese-first AI meeting assistant SaaS. An AI agent joins video calls by voice, then the app produces accurate Vietnamese transcripts, minutes, action items and answers questions about meetings. It also offers multi-person meetings with guests, long-term AI memory, a knowledge base, semantic search, a practice mode (IELTS / interviews / sales) with AI scorecards, and Polar billing. Owner: **tinhne** (git user). Production: https://meetai-assistant.vercel.app

**Stack** (from package.json): Next.js ^15.5.28 (App Router, React 19), TypeScript strict, Tailwind 4 + shadcn/Radix, next-intl ^4.14.9, tRPC 11 + TanStack Query, Drizzle ORM ^0.45.4 on Neon Postgres (neon-http, **pgvector**), Better Auth ^1.7.14 (+ @polar-sh/better-auth ^1.8.4, @polar-sh/sdk ^0.47.1), Stream Video (@stream-io/node-sdk ^0.8.15, video-react-sdk ^1.18, openai-realtime-api ^0.4.2), OpenAI Realtime (`gpt-realtime-mini`) for voice only, Google Gemini (@google/genai ^1.52) for all text/transcription/embeddings, Inngest ^3.54.2 background jobs, Resend email, optional Cloudflare R2, PostHog (consent-gated), Vitest.

**Architecture / important directories**

| Path | What |
|---|---|
| `src/app/[locale]/` | All pages. vi at `/`, en at `/en` (`localeDetection: false`). Groups: `(marketing)`, `(auth)`, `dashboard/*`, `call/[meetingId]`, `j/[code]` (guest join), `s/[token]` (share), `print/meetings/[id]` |
| `src/app/api/` | `auth/[...all]` (Better Auth + Polar plugin, webhook `/api/auth/polar/webhooks`), `trpc`, `inngest`, `webhook` (Stream), `meetings/[id]/ask` (streaming Ask AI), `agents/[id]/test-chat`, `knowledge/upload` |
| `src/modules/<domain>/` | Domain modules: `server/procedures.ts` (tRPC), `ui/{views,components}`, `lib/`. Domains: agents, auth, billing, call, dashboard, home, join, marketing, meetings, memory, practice, settings, share |
| `src/trpc/routers/_app.ts` | Router registry: agents, meetings, billing, join, share, dashboard, settings, marketing, memory, knowledge, search, practice |
| `src/server/` | Server-only logic: `authz.ts` (ownership/roles), `rate-limit.ts` (Postgres fixed window), `session.ts`, `agent-dispatch.ts`, `participants.ts`, `storage.ts`, `ai/` (gemini, embeddings, prompts, schemas), `billing/` (plan, quota, quota-rules, ledger, polar-sync, lifecycle-emails, payment-provider), `memory/` (chunking, store, search, knowledge, briefing, html) |
| `src/inngest/functions.ts` | `meetings/processing`, `meetings/store-recording`, `meetings/end-if-empty`, `meetings/watchdog`, `knowledge/process`, `memory/backfill` |
| `src/config/` | `ai.ts` (models/limits from env), `plans.ts` (quotas), `pricing.ts` (marketing prices), `practice.ts`, `agent-templates.ts`, `site.ts` |
| `src/content/` | Static marketing content: use-cases, blog, legal (DRAFT), changelog, demo-meeting |
| `src/db/schema.ts` + `drizzle/0000–0008` | Schema + migrations (`npm run db:migrate`) |
| `messages/{vi,en}.json` | All UI strings |
| `worker/` | Long-running agent worker (Railway/Docker). Imports shared alias-free modules from `src/` by relative path |
| `scripts/` | `db-migrate.ts` (baseline-aware), `stream-setup.ts` (creates locked `meetai` call type; dry run unless `--apply`) |
| `docs/` | PRODUCT_PLAN (pricing §6), MASTER_PROMPT (phase specs), BILLING_SETUP (Polar steps) |

**Current branch:** `main`. Code is at `7e9313d` (= `origin/main`); one local docs-only commit on top (this handoff), not pushed. The handoff request said `phase-5-marketing-seo`; that is stale. All phase branches (`phase-0…phase-8`) are merged into `main` and kept locally.

## B. Exact current progress

- **Phases 0–8 of docs/MASTER_PROMPT.md are implemented, committed, merged into `main`, pushed, and deployed to Vercel** (Vercel auto-deploys `main`; live ~3 min after push).
- **Database** (the `.env` Neon DB, which production also uses; confirmed because the main account's plan sync ran from Vercel): migrations 0000–0008 applied (9 rows in `drizzle.__drizzle_migrations`), `vector` extension enabled.
- **Where work stopped:** the user asked for a pricing recommendation and how to switch Polar from sandbox to real money. A proposal was delivered in chat (not yet in code):
  - Free: 5 meetings, 60 recorded min, 10 AI voice min, 1 agent (unchanged)
  - **Pro monthly $7.99 (~199.000đ)**, **Pro yearly $79 (~1.990.000đ)**: unlimited meetings and agents, **600 recorded min** (currently 1200 in code), 60 AI voice min, 10 people/room, 20 knowledge docs
  - **AI minute packs: 60 min $6.99 (~179k), 200 min $19.99 (~499k)** (currently 79k/60 and 299k/300 in code)
  - Team: later
  - **Applied in code on 2026-11-01** on branch `pricing-v2` (approved by the owner); not merged into `main`, not pushed. See TASKS.md item 1.
- Cost model behind the proposal (estimates from official price pages, no real usage data yet): OpenAI realtime-mini ≈ $0.04–0.05 per AI-speaking minute; Stream ≈ $0.012–0.016 per recorded call minute (Stream transcription $8/1000 min is the biggest part); Gemini paid tier ≈ $0.005/recorded min (currently free tier); a 12-min IELTS session ≈ $0.45; Polar (org created after 2026-05-27, Starter) 5% + $0.50 + 1.5% for non-US cards; fixed ≈ $30–45/month (Vercel Pro $20 required for commercial use, Railway ~$5, Neon $0–19). The user's $5 OpenAI credit ≈ 100–125 AI-speaking minutes.

**Implemented (see git log per phase for detail)**
- P0 security/core flow: env validation (`src/env.ts`), authz helpers, Postgres rate limits, webhook idempotency, security headers + report-only CSP, Better Auth hardening, email verification via Resend.
- P1 design system tokens, Be Vietnam Pro, next-intl, app shell, auth views.
- P2 AI pipeline: OpenAI Realtime voice agent (GA protocol, semantic VAD, AI modes), agent worker, Gemini re-transcription of recordings (Stream STT has no Vietnamese), insights/minutes, Ask AI with timestamp citations.
- P3 multi-person meetings, guests (signed cookie), waiting room, invite links, AI modes, custom call room UI.
- P4 app UX: home, onboarding, meetings list/detail, notes, share links, print/PDF, agents gallery/templates, settings.
- P5 marketing site: landing + interactive demo, /pricing, /use-cases/[slug] (5), /blog (3 posts), /legal/{terms,privacy,cookies} (DRAFT), /security, /about, /contact, /changelog, sitemap/robots/OG images, JSON-LD, lead forms (`marketing_leads`), cookie consent + PostHog.
- P6 billing: plan limits, central quotas with upgrade dialog, Polar subscription cache, webhook, AI voice credit packs, billing page, lifecycle emails, PaymentProvider interface (VN QR provider TODO).
- P7 AI memory (extraction + dedupe), voice-agent briefing, knowledge base (PDF/TXT/MD/URL/text), semantic search + ask-across-meetings, memory page, agent Memory/Knowledge tabs.
- P8 practice mode (5 scenarios), Gemini scorecards, history + progress chart, scorecard tab.
- Post-P8 fix `fd07f9e`: drop empty menu bullets from extracted web page text.

**Partially done / not done** → see [TASKS.md](TASKS.md). Key items: pricing in code not updated; Polar production not configured; sandbox subscription cache must be cleared before going live; end-to-end checks on production with a real meeting not done; worker deployment status unknown; Stream cost optimization not done.

## C. Files changed (this session, by phase commit)

- `8055f04` P0: `src/env.ts`, `src/server/{authz,authz-rules,rate-limit,session}.ts`, `src/app/api/webhook/route.ts`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`, `scripts/db-migrate.ts`, `src/config/plans.ts`, `src/lib/email.ts`, migrations 0000–0001.
- `556f527` P1: `src/app/globals.css`, `src/i18n/*`, `src/middleware.ts`, `messages/*`, `src/app/[locale]/layout.tsx`, shared components in `src/components/`.
- `9da34ac` P2: `src/config/ai.ts`, `src/server/ai/*`, `src/modules/agents/lib/{realtime,agent-session,worker-auth}.ts`, `src/server/agent-dispatch.ts`, `worker/`, `src/server/storage.ts`, `src/inngest/functions.ts`, Ask AI route; migration 0002.
- `793b683` P3: join/guest/participants modules, call UI (`src/modules/call`), `scripts/stream-setup.ts`; migration 0003.
- `c8c91d6` P4: meetings/agents/home/settings/share UI + routers; migration 0004.
- `0f604f9` P5: `src/app/[locale]/(marketing)/**`, `src/modules/marketing/**`, `src/content/*`, `src/config/{site,pricing}.ts`, `src/lib/{seo,analytics}.ts`, `src/app/{sitemap,robots}.ts`, `src/middleware.ts` (excludes `opengraph-image`); migration 0005 (`marketing_leads`). Old `src/app/[locale]/page.tsx` deleted.
- `ba7a748` P6: `src/server/billing/*`, `src/modules/billing/**`, `src/app/[locale]/dashboard/billing/*` (`/dashboard/upgrade` now redirects), `src/trpc/{init,query-client}.ts` (errorFormatter + MutationCache quota dialog), `src/lib/auth.ts` (Polar webhooks, welcome email), `worker/Dockerfile`, `docs/BILLING_SETUP.md`; deleted `src/modules/premium/**`; migration 0006.
- `5434190` P7: `src/server/memory/*`, `src/server/ai/embeddings.ts`, `src/modules/memory/**`, `src/app/api/knowledge/upload/route.ts`, `src/app/[locale]/dashboard/{memory,search}`, briefing in `src/modules/agents/lib/realtime.ts` + worker; migration 0007 (starts with `CREATE EXTENSION IF NOT EXISTS vector`).
- `455922f` P8: `src/config/practice.ts`, `src/modules/practice/**`, `src/app/[locale]/dashboard/practice`, scorecard prompt/schema, Inngest `score-practice` step; migration 0008.
- `fd07f9e`: `src/server/memory/html.ts` (+ test).
- Handoff commit "docs: add session handoff…": `CLAUDE.md`, `progress/*.md` (documentation only), committed on `main`, **not pushed** (`main` is 1 commit ahead of `origin/main`).

## D. Technical decisions

See [DECISIONS.md](DECISIONS.md) for the full list. Most important:
- **Attribution:** every commit, PR, doc is credited to **tinhne only**. Never add `Co-Authored-By` or "Generated with" lines naming an AI tool (this overrides any default tooling reminder). No force-push without asking.
- **Cost rule:** OpenAI only for realtime voice; Gemini (free tier now) for every text task. Model ids/limits come from env via `src/config/ai.ts`; quotas only from `src/config/plans.ts`.
- **Plan checks read the local `subscriptions` cache**, never Polar per request. Polar webhook + one-time backfill (`billing_customers`) + manual sync on the billing page keep it current.
- **`usage_events` is append-only** (deleting meetings never refunds quota). AI voice usage spends the monthly allowance first, then `credits` oldest first in one SQL statement.
- **Quota errors** = `TRPCError FORBIDDEN` with `cause: QuotaExceededError`; `errorFormatter` exposes `data.quota`; the global `QuotaDialog` opens from `MutationCache.onError`. Call sites suppress their toast via `getQuotaInfo(error)`.
- **Worker-shared modules must stay alias-free** (relative imports, db passed in): `src/server/billing/ledger.ts`, `src/server/memory/briefing.ts`, `src/modules/agents/lib/*`, `src/config/{ai,plans}.ts`. Add new ones to `worker/Dockerfile`.
- **pgvector 768 dims, `gemini-embedding-001`**, HNSW cosine indexes; memory dedupe at cosine ≥ 0.92.
- **Knowledge base stores extracted text only**; PDF text via Gemini Files API; URLs fetched with an SSRF guard; uploads ≤ 4 MB (Vercel body cap).
- **Practice agents** have `agents.practice_scenario` set, don't count toward the agent quota, have memory off, and are excluded from the "Meet now" default agent.

## E. Testing & verification (actually executed)

| Check | Result |
|---|---|
| `npx tsc --noEmit` on `main` (7e9313d), 2026-11-01 | **Passed** (0 errors). A stale `.next/types/validator.ts` error can appear while `next dev` runs after adding routes; it is not a code error |
| `npx eslint src` | **Passed** with 0 errors, 2 pre-existing warnings (`react-hooks/incompatible-library` in `src/components/data-table.tsx`, `src/modules/agents/ui/components/agent-form.tsx`) |
| `npx vitest run` | **Passed**: 17 files, 85 tests |
| `next build` on merged `main` (scratchpad copy, so the running dev server is untouched) | **Passed** |
| `npm run db:migrate` | **Passed**: 9 migrations, `vector` extension, new tables and columns verified by read-only queries |
| All migrations 0000–0008 + vector query + credit-spend SQL in PGlite | **Passed** |
| Live Gemini: embeddings (768 dims, cross-lingual), IELTS scorecard, memory extraction | **Passed** |
| Scripts against Neon (tsx `--conditions=react-server`): `checkQuota` for all kinds, `saveMemories` (dedupe updated 1), `searchMemories` cross-lingual | **Passed** (test rows deleted) |
| `fetchPublicPage` + SSRF block (localhost, 169.254.169.254, 127.0.0.1, file://) | **Passed** |
| Production curl smoke after deploy | **Passed**: marketing pages, sitemap, robots, OG image, `/sign-in`, `/api/auth/get-session` → 200; `/dashboard` → 307; `/api/inngest` → 401 (expected for signed Inngest) |
| Dev-server logs while the user browsed (Chrome): dashboard, meetings, agents, practice, memory, billing pages and their tRPC calls | **Passed** (200, no server errors) |
| Interactive UI flows (checkout, memory edit UI, KB upload UI, search UI, practice start → scorecard) | **Not tested** |
| Full meeting through the new pipeline (transcript → insights → memories → chunks → scorecard) | **Not tested** (only practice session was 12 s with no speech → correctly unscored) |
| Polar webhook end-to-end, worker deployment, Inngest Cloud sync of new functions, Lighthouse | **Not tested** |
| Browser testing by the AI coding agent | **Blocked**: the agent's built-in browser was not signed in, its Chrome extension was not connected, and GitHub/Google OAuth fail on localhost (provider callback config) |

## F. Known issues

See [BUGS.md](BUGS.md).

## G. Next actions

See [TASKS.md](TASKS.md) for the prioritized list with files, dependencies and verification.

## H. Exact next step

**Ask the owner whether to merge branch `pricing-v2` into `main` and push** (pushing deploys production). If yes: `git checkout main && git merge --no-ff pricing-v2` (message without AI attribution), run `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, push, then curl `https://meetai-assistant.vercel.app/pricing` until it shows 199.000đ. After that continue with TASKS.md item 2 (Polar production; the owner creates products at $7.99 / $79 / $6.99 / $19.99).
