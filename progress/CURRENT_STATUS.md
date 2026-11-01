# MeetAI — Current status (2026-11-01)

- **Branch:** `main`. Code @ `7e9313d` (= `origin/main`, deployed); one local docs-only commit on top (`CLAUDE.md`, `progress/*`), not pushed.
- **Shipped:** Phases 0–8 of [docs/MASTER_PROMPT.md](../docs/MASTER_PROMPT.md), merged and deployed to https://meetai-assistant.vercel.app (public pages verified 200).
- **Database:** migrations 0000–0008 applied on the Neon DB used by local `.env` and production; pgvector enabled.
- **Checks on `main`:** typecheck clean, lint 0 errors (2 known warnings), 85/85 tests, production build passes.
- **Waiting on the owner:** approve the pricing proposal (Pro $7.99/199k monthly, $79 yearly, 600 recorded min; AI packs 60 min $6.99, 200 min $19.99) → then [TASKS.md](TASKS.md) item 1.
- **Owner-side setup still needed:** Polar production (products, webhook, env), clear sandbox billing cache, Vercel Pro, Inngest resync check, agent worker redeploy, paid Gemini tier, local OAuth callbacks.
- **Not yet verified:** a full real meeting through the new post-meeting pipeline on production, interactive UI flows, Polar webhook end-to-end.

Details: [SESSION_HANDOFF.md](SESSION_HANDOFF.md) · [BUGS.md](BUGS.md) · [DECISIONS.md](DECISIONS.md)
