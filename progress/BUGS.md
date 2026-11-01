# MeetAI — Known issues & technical debt

As of 2026-11-01 (`main` @ `7e9313d`). Severity: High / Medium / Low.

## Configuration / ops (not code bugs)
- **High — Sandbox subscription cache.** The owner's main account has an `active` row in `subscriptions` from Polar sandbox. After switching `POLAR_SERVER=production`, clear `subscriptions`, `billing_customers` and purchased `credits`, otherwise that account stays Pro for free. See TASKS.md item 2.
- **High — Polar products don't match the site.** Sandbox has old products Monthly $29 / Yearly $259 / Enterprise $999 and no AI minute packs; the site advertises 149.000đ (~$6). Every recurring Polar product shows as a Pro upgrade button on `/dashboard/billing`.
- **High — Selling on Vercel Hobby is not allowed.** Upgrade to Vercel Pro before taking payments.
- **Medium — Inngest Cloud sync of new functions unverified.** `knowledge/process` and `memory/backfill` were added; `GET /api/inngest` returns 401 in production (expected for signed mode). Check the Inngest dashboard and Resync if missing.
- **Medium — Agent worker status unknown.** If `AGENT_WORKER_URL` is not set on Vercel, the voice agent runs in-process (dev fallback, can drop on serverless). The worker image must be rebuilt (Dockerfile now copies `src/config/plans.ts`, `src/server/billing/ledger.ts`, `src/server/memory/briefing.ts`).
- **Medium — Local OAuth.** GitHub ("redirect_uri is not associated") and Google fail on `localhost:3000`: the provider apps only allow the production callback. The app sends the correct `http://localhost:3000/api/auth/callback/{github,google}`. Facebook works.
- **Low — Gemini free tier** may use submitted data for training (the privacy policy discloses this). Move to the paid tier before selling.

## Product / code
- **Medium — Stream cost per recorded minute.** Stream transcription ($8/1000 call min) and video recording run for every meeting, including 1:1 practice. Heavy Pro users can cost more than $7.99. Fix in TASKS.md item 4.
- **Medium — Legacy meetings not searchable.** Meetings processed before Phase 2 have no `transcript_segments`, so no chunks or memories; their Stream transcripts are tiny or expired (one returned 403).
- **Low — Facebook sign-in creates a separate user.** Only Google/GitHub are trusted for automatic account linking (verified emails). By design.
- **Low — "Not scored" for very short practice sessions** (no speech → no scorecard, correct) is unclear in the UI. TASKS.md item 6.
- **Low — `recordingRetentionDays`** is shown on the billing page but not enforced (no deletion job).
- **Low — Lint warnings:** 2 × `react-hooks/incompatible-library` (TanStack Table in `src/components/data-table.tsx`, react-hook-form `watch` in `agent-form.tsx`). Informational.
- **Low — `/dashboard/*` pages with `loading.tsx` return HTTP 200 with a streamed redirect when signed out** (no data is leaked; `requireSession()` runs before any prefetch).
- **Low — DOCX knowledge upload unsupported** (only PDF/TXT/MD/URL/text).
- **Low — Practice page bundle** is ~112 kB first-load because of recharts.

## Dev environment gotchas
- Deleting `.next` while `next dev` runs breaks the dev server (`ENOENT routes-manifest.json`); restart `npm run dev`.
- A stale `.next/types/validator.ts` error can appear in `tsc` after adding a route while dev runs; it disappears after the dev server recompiles. Not a code error.
- Local pages feel slow: every Neon query from Vietnam takes ~185–665 ms (us-west-2), and `next dev` compiles each route on first visit (1–13 s). Production is much faster.
- Running server modules from scripts: `npx tsx --conditions=react-server --env-file=.env -e '…'` (otherwise `server-only` throws).
