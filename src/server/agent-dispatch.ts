import "server-only";

import { AI_CONFIG } from "@/config/ai";
import { remainingVoiceSeconds } from "@/config/plans";
import { db } from "@/db";
import { usageEvents } from "@/db/schema";
import { env } from "@/env";
import { streamVideo } from "@/lib/stream-video";
import { startAgentSession } from "@/modules/agents/lib/agent-session";
import { signWorkerRequest } from "@/modules/agents/lib/worker-auth";
import { getMonthlyUsage, getUserPlan } from "@/modules/premium/server/usage";

interface DispatchMeeting {
  id: string;
  userId: string;
  name: string;
  agenda: string | null;
  language: string;
}

interface DispatchAgent {
  id: string;
  name: string;
  instructions: string;
  voice: string;
}

async function callWorker(path: string, payload: Record<string, unknown>) {
  if (!env.AGENT_WORKER_URL || !env.WORKER_SHARED_SECRET) return;

  const body = JSON.stringify(payload);
  const timestamp = Date.now();
  const response = await fetch(new URL(path, env.AGENT_WORKER_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-timestamp": String(timestamp),
      "x-worker-signature": signWorkerRequest(env.WORKER_SHARED_SECRET, body, timestamp),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Agent worker responded ${response.status}`);
  }
}

export async function recordVoiceUsage(
  userId: string,
  meetingId: string,
  usage: { voiceSeconds: number; inputTokens: number; outputTokens: number },
) {
  const rows: (typeof usageEvents.$inferInsert)[] = [
    { userId, meetingId, kind: "ai_voice_seconds", quantity: Math.ceil(usage.voiceSeconds) },
    { userId, meetingId, kind: "realtime_input_tokens", quantity: usage.inputTokens },
    { userId, meetingId, kind: "realtime_output_tokens", quantity: usage.outputTokens },
  ];
  await db.insert(usageEvents).values(rows.filter((row) => (row.quantity ?? 0) > 0));
}

// Connects the AI voice agent to a live meeting, respecting the kill switch
// and the owner's monthly voice quota.
export async function startAgentForMeeting(
  meeting: DispatchMeeting,
  agent: DispatchAgent,
) {
  if (!env.AI_VOICE_ENABLED) return { started: false, reason: "disabled" };

  const plan = await getUserPlan(meeting.userId);
  const used = await getMonthlyUsage(meeting.userId, "ai_voice_seconds");
  const voiceSecondsRemaining = remainingVoiceSeconds(plan, used);

  if (voiceSecondsRemaining <= 0) {
    return { started: false, reason: "quota" };
  }

  if (env.AGENT_WORKER_URL) {
    await callWorker("/sessions", { meetingId: meeting.id, voiceSecondsRemaining });
    return { started: true, reason: "worker" };
  }

  // Development fallback: the connection lives in this serverless function
  // and may drop when the platform freezes it. Use the worker in production.
  await startAgentSession({
    streamVideo,
    openAiApiKey: env.OPENAI_API_KEY,
    model: AI_CONFIG.realtime.model,
    meetingId: meeting.id,
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
    onUsage: (usage) => recordVoiceUsage(meeting.userId, meeting.id, usage),
    log: (message) => console.info(message),
  });

  return { started: true, reason: "in-process" };
}

export async function stopAgentForMeeting(meetingId: string) {
  await callWorker("/sessions/stop", { meetingId });
}
