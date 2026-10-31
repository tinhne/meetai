import "server-only";

import { AI_CONFIG, type AiMode } from "@/config/ai";
import { db } from "@/db";
import { env } from "@/env";
import { streamVideo } from "@/lib/stream-video";
import {
  startAgentSession,
  type AgentSessionHandle,
} from "@/modules/agents/lib/agent-session";
import { signWorkerRequest } from "@/modules/agents/lib/worker-auth";
import { getVoiceAllowance, recordVoiceUsage as recordVoiceUsageInLedger } from "@/server/billing/ledger";
import { getUserPlan } from "@/server/billing/plan";

interface DispatchMeeting {
  id: string;
  userId: string;
  name: string;
  agenda: string | null;
  language: string;
  aiMode: string;
  callType: string;
}

interface DispatchAgent {
  id: string;
  name: string;
  instructions: string;
  voice: string;
}

// Development fallback only: sessions started in this process.
const localSessions = new Map<string, AgentSessionHandle>();

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
  await recordVoiceUsageInLedger(db, { userId, meetingId, ...usage });
}

export function toAiMode(value: string): AiMode {
  return value === "on_demand" || value === "facilitator" || value === "silent"
    ? value
    : "conversational";
}

// Connects the AI voice agent to a live meeting, respecting the AI mode, the
// kill switch and the owner's monthly voice quota.
export async function startAgentForMeeting(
  meeting: DispatchMeeting,
  agent: DispatchAgent,
) {
  const mode = toAiMode(meeting.aiMode);
  if (mode === "silent") return { started: false, reason: "silent" };
  if (!env.AI_VOICE_ENABLED) return { started: false, reason: "disabled" };

  // Monthly allowance plus any prepaid voice credits.
  const plan = await getUserPlan(meeting.userId);
  const { remainingSeconds: voiceSecondsRemaining } = await getVoiceAllowance(db, meeting.userId, plan);

  if (voiceSecondsRemaining <= 0) {
    return { started: false, reason: "quota" };
  }

  if (env.AGENT_WORKER_URL) {
    await callWorker("/sessions", { meetingId: meeting.id, voiceSecondsRemaining });
    return { started: true, reason: "worker" };
  }

  if (localSessions.has(meeting.id)) return { started: true, reason: "already-running" };

  // Development fallback: the connection lives in this serverless function
  // and may drop when the platform freezes it. Use the worker in production.
  const handle = await startAgentSession({
    streamVideo,
    callType: meeting.callType,
    openAiApiKey: env.OPENAI_API_KEY,
    model: AI_CONFIG.realtime.model,
    meetingId: meeting.id,
    agentId: agent.id,
    voiceSecondsRemaining,
    context: {
      mode,
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
  localSessions.set(meeting.id, handle);
  void handle.done.then(() => localSessions.delete(meeting.id));

  return { started: true, reason: "in-process" };
}

export async function stopAgentForMeeting(meetingId: string) {
  localSessions.get(meetingId)?.stop("call ended");
  await callWorker("/sessions/stop", { meetingId });
}

export async function askAgentInMeeting(meetingId: string, askedBy: string) {
  localSessions.get(meetingId)?.ask(askedBy);
  await callWorker("/sessions/ask", { meetingId, askedBy });
}

// Returns false when no agent session is running (caller may start one).
export async function setAgentModeInMeeting(meetingId: string, mode: AiMode) {
  const local = localSessions.get(meetingId);
  if (local) {
    local.setMode(mode);
    return true;
  }
  if (!env.AGENT_WORKER_URL) return false;
  await callWorker("/sessions/mode", { meetingId, mode });
  return true;
}
