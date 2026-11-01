# MeetAI — Next actions (prioritized)

Status as of 2026-11-01, `main` @ `7e9313d`. Context: [SESSION_HANDOFF.md](SESSION_HANDOFF.md).
Rules: ask before pushing `main` (it deploys production), before running migrations on the Neon DB, and before changing external dashboards (Polar, Stream, Vercel, Google/GitHub OAuth).

## 1. Apply the agreed pricing in code — WAITING FOR USER DECISION
- **Objective:** make the app match the proposal: Pro $7.99 (~199.000đ)/month, $79 (~1.990.000đ)/year; Pro recorded minutes 1200 → 600; AI packs 60 min $6.99 (~179k), 200 min $19.99 (~499k). Free plan unchanged.
- **Files:** `src/config/pricing.ts` (PRICING_PLANS monthly/yearly VND+USD, VOICE_CREDIT_PACKS), `src/config/plans.ts` (`pro.recordingMinutesPerMonth`), `messages/{vi,en}.json` (`landing.pricing`, `landing.pages.pricing.faq`, any copy quoting 149k/$6/79k), `src/content/blog.ts` and `src/content/demo-meeting.ts` (mention 149k; this is demo content, so keep it or change it on purpose), `src/modules/marketing/lib/structured-data.ts` (reads PRICING_PLANS), `docs/BILLING_SETUP.md` (product table), `docs/PRODUCT_PLAN.md` §6. (`src/config/plans.test.ts` does not assert these numbers.)
- **Dependencies:** the user approves the numbers.
- **Expected result:** pricing page, billing compare table and JSON-LD show the new prices; quotas enforce 600 recorded minutes for Pro.
- **Verify:** `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, open `/pricing` and `/en/pricing` locally, then commit (no AI attribution) and **ask before pushing**.

## 2. Switch Polar to production (user does the dashboard part)
- **Objective:** collect real money.
- **Steps (user):** create the org on polar.sh, then KYC and Stripe Connect Express payout (Vietnam is supported). Create products: Pro monthly and yearly (recurring), and AI packs (one-time with metadata `voice_minutes` = `60` / `200`). Create an Organization Access Token. Add a webhook to `https://meetai-assistant.vercel.app/api/auth/polar/webhooks` (Raw; events `subscription.created/updated/active/canceled/uncanceled/revoked`, `order.paid`). Then set Vercel production env `POLAR_ACCESS_TOKEN`, `POLAR_SERVER=production`, `POLAR_WEBHOOK_SECRET` and redeploy. Upgrade Vercel to Pro (Hobby forbids commercial use). Enable paid Gemini tier (privacy policy promises no training on paid tier).
- **Agent part (only with the user's go-ahead):** clear sandbox billing cache, or the main account keeps a sandbox "active" Pro: `DELETE FROM subscriptions; DELETE FROM billing_customers; DELETE FROM credits WHERE source = 'purchase';` against the production DB.
- **Files:** none required. `src/lib/polar.ts` reads `POLAR_SERVER`; `src/lib/auth.ts` registers webhooks only when `POLAR_WEBHOOK_SECRET` is set.
- **Verify:** buy Pro with a real card or a 100% discount code → `/dashboard/billing` shows Pro and the order; refund afterwards (fees are not returned).

## 3. End-to-end verification on production
- **Objective:** prove the post-meeting pipeline works live.
- **Steps:** sign in on production → Practice → IELTS → talk ≥ 3 min → end → wait for processing → scorecard tab appears; a normal meeting with an agent → summary, action items, `memories` rows, `meeting_chunks` rows; `/dashboard/search` finds it; Ask AI cites `[mm:ss]`; knowledge upload works on a Pro account.
- **Dependencies:** the user checks in the Inngest dashboard that `knowledge/process` and `memory/backfill` are synced (Resync if not); `AGENT_WORKER_URL` / `WORKER_SHARED_SECRET` on Vercel and the Railway worker are redeployed with the latest `worker/Dockerfile` (otherwise the agent runs in-process, which is unreliable on serverless).
- **Verify:** read-only SQL counts (`meeting_chunks`, `memories`, `meetings.scorecard is not null`, `usage_events` kind `ai_voice_seconds`), then compare real cost per AI minute with the estimate.

## 4. Cut Stream cost for 1:1 practice
- **Objective:** Stream transcription ($8/1000 call min) + video recording dominate per-minute cost.
- **Files:** `src/modules/meetings/server/procedures.ts` (`createMeetingForUser` → `transcriptionSettings`, `recording.mode/quality`), `src/inngest/functions.ts` (the processing path uses Stream's speaker timeline; for practice use `freeTranscriptionPrompt` diarization or "user vs AI" from agent speech events instead).
- **Dependencies:** item 3 passes, so there is a baseline.
- **Expected:** practice calls skip Stream transcription and record audio-only; notes and scorecards are unchanged.
- **Verify:** run a practice session; transcript and scorecard are still produced; Stream dashboard shows no transcription minutes for it.

## 5. Vercel function region near Neon (us-west-2)
- **Objective:** lower DB latency; Neon round-trip from functions in iad1 is ~70 ms per query.
- **Files:** new `vercel.json` with `{ "regions": ["pdx1"] }` (or the user changes Project Settings → Functions → Region).
- **Verify:** `x-vercel-id` header / Vercel logs show pdx1; dashboard tRPC latency drops.

## 6. Small UX follow-ups
- Practice history: show "too short to score" when a completed session has no scorecard and lasted under ~60 s (`src/modules/practice/server/procedures.ts` returns duration; `src/modules/practice/ui/practice-view.tsx`; `messages` `practice.*`).
- Billing page lists every recurring Polar product as an upgrade button. After production products exist, consider filtering by product metadata `plan`.
- Local OAuth: user registers `http://localhost:3000/api/auth/callback/{github,google}` (separate GitHub OAuth app for dev).

## 7. Deferred features (not started)
DOCX knowledge upload (needs a new package such as `mammoth`; ask first), Team plan + workspaces/seats, VN QR payments via SePay/PayOS (interface in `src/server/billing/payment-provider.ts`), recording retention enforcement (`plans.recordingRetentionDays` is display-only), referral credits, Google Calendar / Slack / Notion / Zalo integrations, "economy voice" (STT → Gemini → TTS), legacy-meeting backfill (pre-Phase-2 meetings have no `transcript_segments`), Lighthouse pass, lawyer review of `src/content/legal.ts`.
