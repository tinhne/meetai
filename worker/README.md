# Meet.AI agent worker

Keeps OpenAI Realtime voice agents connected to Stream calls. Serverless
functions (Vercel) freeze after responding, which drops the agent mid-call,
so the web app hands each live meeting to this long-running process.

## How it works

1. Stream sends `call.session_started` to the web app.
2. The web app checks the owner's monthly AI voice quota and calls
   `POST /sessions` on the worker (HMAC-signed with `WORKER_SHARED_SECRET`).
3. The worker loads the meeting and agent from the database, connects the
   agent through Stream, applies the session config (semantic VAD, noise
   reduction, language lock, short answers) and records usage after every
   response.
4. When the voice quota runs out, the agent says goodbye and leaves.
5. It leaves when `call.session_ended` arrives (`POST /sessions/stop`) or
   when its 30-second poll sees the call has ended.

## Deploy (Railway)

1. New service → deploy from this GitHub repo.
2. Settings → Build → Dockerfile path: `worker/Dockerfile` (root directory: repo root).
3. Variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_STREAM_VIDEO_API_KEY`, `STREAM_VIDEO_SECRET_KEY`
   - `OPENAI_API_KEY`
   - `WORKER_SHARED_SECRET` (32+ random characters, e.g. `openssl rand -hex 32`)
   - optional: `OPENAI_REALTIME_MODEL` (default `gpt-realtime-mini`), `AI_VOICE_ENABLED`
4. Generate a public domain, then set on the web app (Vercel):
   - `AGENT_WORKER_URL=https://<your-worker-domain>`
   - `WORKER_SHARED_SECRET=<same value>`
5. Check `GET /health`.

## Run locally

```bash
npx tsx worker/src/index.ts
```

It reads the same `.env` variables (load them first, e.g. `set -a; source .env; set +a`).

## Cost safety

- Set a monthly budget on the OpenAI project (Settings → Limits).
- `AI_VOICE_ENABLED=false` on either the app or the worker stops new agents.
