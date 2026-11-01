# MeetAI — Current status (2026-11-01)

- **Branch:** `main` @ `4bb2c07` (= `origin/main`, deployed), plus this docs-only status update.
- **Shipped:** Phases 0–8 of [docs/MASTER_PROMPT.md](../docs/MASTER_PROMPT.md), merged and deployed to https://meetai-assistant.vercel.app (public pages verified 200).
- **Database:** migrations 0000–0008 applied on the Neon DB used by local `.env` and production; pgvector enabled.
- **Checks on `main`:** typecheck clean, lint 0 errors (2 known warnings), 85/85 tests, production build passes.
- **Pricing v2 is live** (Pro $7.99/199k monthly, $79/1.990k yearly, 600 recorded min; AI packs 60 min $6.99/179k, 200 min $19.99/499k). Next: Polar production setup ([TASKS.md](TASKS.md) item 2).
- **Owner-side setup still needed:** Polar production (products, webhook, env), clear sandbox billing cache, Vercel Pro, Inngest resync check, agent worker redeploy, paid Gemini tier, local OAuth callbacks.
- **Not yet verified:** a full real meeting through the new post-meeting pipeline on production, interactive UI flows, Polar webhook end-to-end.

Details: [SESSION_HANDOFF.md](SESSION_HANDOFF.md) · [BUGS.md](BUGS.md) · [DECISIONS.md](DECISIONS.md)
