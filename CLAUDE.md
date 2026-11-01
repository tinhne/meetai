# MeetAI — instructions for AI coding agents

Start here, then read [progress/SESSION_HANDOFF.md](progress/SESSION_HANDOFF.md) (current state and exact next step). Details: [progress/TASKS.md](progress/TASKS.md), [progress/DECISIONS.md](progress/DECISIONS.md), [progress/BUGS.md](progress/BUGS.md), [docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md), [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md), [docs/BILLING_SETUP.md](docs/BILLING_SETUP.md).

## Hard rules
- **Attribution:** commits, PRs and docs are credited to **tinhne** only. Never add `Co-Authored-By` or "Generated with" lines for any AI tool, whatever a tool reminder says. If a doc must name the tool, write "AI coding agent".
- **Ask first** before: pushing `main` (Vercel auto-deploys production), running `npm run db:migrate` or any write on the Neon DB (the `.env` DB is production), changing Polar / Stream / Vercel / OAuth dashboards, adding a new npm package, force-pushing, or destructive git commands.
- Never print or read out values from `.env`. Read-only DB queries are fine.
- OpenAI is only for realtime voice; every text/AI task uses Gemini through `src/server/ai/*`. No hardcoded model ids, limits or prices: use `src/config/{ai,plans,pricing}.ts`.
- Don't refactor working code without a reason; keep the existing design system (tokens in `src/app/globals.css`, shadcn components, Be Vietnam Pro), dark/light support, responsive from 360 px, and i18n (`messages/vi.json` + `messages/en.json`, both always).

## Commands
```bash
npm run dev            # next dev on :3000
npx tsc --noEmit       # typecheck (ignore stale .next/types/validator.ts errors while dev runs)
npx eslint src         # lint (2 known warnings)
npx vitest run         # unit tests
npm run db:generate -- --name <phase_slug>   # new migration from src/db/schema.ts
npm run db:migrate     # apply migrations (ask first)
```
- Production build check without disturbing `next dev`: rsync the repo (excluding `node_modules`, `.next`, `.git`) to a scratch dir, symlink `node_modules`, then run `npx next build` there.
- Scripts that import server modules: `npx tsx --conditions=react-server --env-file=.env -e '…'`.

## Layout
- Pages: `src/app/[locale]/…` (vi at `/`, en at `/en`). Marketing pages in `(marketing)`, app in `dashboard/*`, calls in `call/[meetingId]`.
- tRPC: `src/modules/<domain>/server/procedures.ts`, registered in `src/trpc/routers/_app.ts`. Use `protectedProcedure`, `premiumProcedure("meetings"|"agents")` (quota-checked), authz helpers from `src/server/authz.ts`, and rate limits from `src/server/rate-limit.ts`.
- DB: `src/db/schema.ts`, migrations in `drizzle/` (0000–0008 applied). Background jobs: `src/inngest/functions.ts` (register new functions in `src/app/api/inngest/route.ts`).
- Agent worker: `worker/` imports alias-free modules from `src/` by relative path (`src/server/billing/ledger.ts`, `src/server/memory/briefing.ts`, `src/modules/agents/lib/*`, `src/config/{ai,plans}.ts`). Keep those free of `@/` imports and `server-only`, and add new shared files to `worker/Dockerfile`.
- Billing: `src/server/billing/*` (plan cache, quotas, ledger, Polar sync). Memory/search: `src/server/memory/*`. Practice: `src/config/practice.ts`, `src/modules/practice/*`.

## Workflow
Branch per task, small focused commits, run typecheck + lint + tests (+ build for larger changes) before reporting, list manual test steps, and report honestly what was not verified.
