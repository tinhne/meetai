// Meet.AI agent worker: keeps OpenAI Realtime voice agents connected to
// Stream calls. Serverless functions cannot hold these WebSockets open, so the
// web app hands each live meeting to this long-running process.
import "./env";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamClient } from "@stream-io/node-sdk";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { AI_CONFIG } from "../../src/config/ai";
import { agents, meetings, usageEvents } from "../../src/db/schema";
import {
  startAgentSession,
  type AgentSessionHandle,
} from "../../src/modules/agents/lib/agent-session";
import { verifyWorkerRequest } from "../../src/modules/agents/lib/worker-auth";
import { db } from "./db";
import { env } from "./env";

const streamVideo = new StreamClient(
  env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY,
  env.STREAM_VIDEO_SECRET_KEY,
);

const sessions = new Map<string, AgentSessionHandle>();

const startSchema = z.object({
  meetingId: z.string().min(1),
  voiceSecondsRemaining: z.number().nonnegative(),
});
const stopSchema = z.object({ meetingId: z.string().min(1) });

const log = (message: string) => console.info(new Date().toISOString(), message);

function send(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 16 * 1024) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function startSession(meetingId: string, voiceSecondsRemaining: number) {
  if (sessions.has(meetingId)) return { status: "already-running" };

  // Never trust the payload beyond the meeting id: load everything from the DB.
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));
  if (!meeting) return { status: "meeting-not-active" };

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, meeting.agentId), eq(agents.userId, meeting.userId)));
  if (!agent) return { status: "agent-not-found" };

  const handle = await startAgentSession({
    streamVideo,
    openAiApiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_REALTIME_MODEL || AI_CONFIG.realtime.model,
    meetingId,
    agentId: agent.id,
    voiceSecondsRemaining,
    context: {
      agentName: agent.name,
      agentInstructions: agent.instructions,
      voice: agent.voice,
      meetingName: meeting.name,
      agenda: meeting.agenda,
      language: meeting.language,
    },
    onUsage: async (usage) => {
      const rows: (typeof usageEvents.$inferInsert)[] = [
        { userId: meeting.userId, meetingId, kind: "ai_voice_seconds", quantity: Math.ceil(usage.voiceSeconds) },
        { userId: meeting.userId, meetingId, kind: "realtime_input_tokens", quantity: usage.inputTokens },
        { userId: meeting.userId, meetingId, kind: "realtime_output_tokens", quantity: usage.outputTokens },
      ];
      const nonEmpty = rows.filter((row) => (row.quantity ?? 0) > 0);
      if (nonEmpty.length > 0) await db.insert(usageEvents).values(nonEmpty);
    },
    log,
  });

  sessions.set(meetingId, handle);
  void handle.done.then(() => sessions.delete(meetingId));

  return { status: "started" };
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, sessions: sessions.size });
    }

    if (req.method !== "POST" || !req.url?.startsWith("/sessions")) {
      return send(res, 404, { error: "Not found" });
    }

    const body = await readBody(req);
    const authorized = verifyWorkerRequest({
      secret: env.WORKER_SHARED_SECRET,
      body,
      timestamp: req.headers["x-worker-timestamp"] as string | null,
      signature: req.headers["x-worker-signature"] as string | null,
    });
    if (!authorized) return send(res, 401, { error: "Unauthorized" });

    const json: unknown = JSON.parse(body);

    if (req.url === "/sessions") {
      if (!env.AI_VOICE_ENABLED) return send(res, 200, { status: "disabled" });
      const { meetingId, voiceSecondsRemaining } = startSchema.parse(json);
      return send(res, 200, await startSession(meetingId, voiceSecondsRemaining));
    }

    if (req.url === "/sessions/stop") {
      const { meetingId } = stopSchema.parse(json);
      sessions.get(meetingId)?.stop("call ended");
      return send(res, 200, { status: "stopped" });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    log(`request failed: ${error instanceof Error ? error.message : "unknown"}`);
    return send(res, 400, { error: "Bad request" });
  }
});

server.listen(env.PORT, () => log(`agent worker listening on :${env.PORT}`));

const shutdown = () => {
  log("shutting down");
  for (const handle of sessions.values()) handle.stop("worker shutdown");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
