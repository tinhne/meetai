import "server-only";

import { after } from "next/server";

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
import { buildBriefing } from "@/server/memory/briefing";

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

// True when the agent is already connected to the call, so it is never
// started twice (webhook retries, mode changes from another instance).
async function isAgentInCall(meeting: { id: string; callType: string }, agentId: string) {
  try {
    const { call } = await streamVideo.video.call(meeting.callType, meeting.id).get();
    return (call.session?.participants ?? []).some((participant) => participant.user.id === agentId);
  } catch {
    return false;
  }
}

// Live controls go through the Stream call's custom data, which the agent
// session polls: they reach the agent wherever it runs (the worker or another
// serverless instance). See readAgentControl in modules/agents/lib/realtime.
async function updateCallCustom(
  meeting: { id: string; callType: string },
  patch: (custom: Record<string, unknown>) => Record<string, unknown>,
) {
  const call = streamVideo.video.call(meeting.callType, meeting.id);
  const { call: state } = await call.get();
  const custom = (state.custom ?? {}) as Record<string, unknown>;
  await call.update({ custom: { ...custom, ...patch(custom) } });
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

  if (await isAgentInCall(meeting, agent.id)) {
    return { started: true, reason: "already-in-call" };
  }

  if (env.AGENT_WORKER_URL) {
    await callWorker("/sessions", { meetingId: meeting.id, voiceSecondsRemaining });
    return { started: true, reason: "worker" };
  }

  if (localSessions.has(meeting.id)) return { started: true, reason: "already-running" };

  // Development fallback: the connection lives in this serverless function
  // and may drop when the platform freezes it. Use the worker in production.
  const briefing = await buildBriefing(db, { userId: meeting.userId, agentId: agent.id }).catch(() => null);

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
      briefing,
    },
    onUsage: (usage) => recordVoiceUsage(meeting.userId, meeting.id, usage),
    log: (message) => console.info(message),
  });
  localSessions.set(meeting.id, handle);
  void handle.done.then(() => localSessions.delete(meeting.id));
  // Keep this serverless invocation alive while the agent talks (up to the
  // function's max duration); otherwise the platform may freeze it.
  try {
    after(() => handle.done);
  } catch {
    // outside a request (scripts, tests)
  }

  return { started: true, reason: "in-process" };
}

export async function stopAgentForMeeting(meetingId: string) {
  localSessions.get(meetingId)?.stop("call ended");
  await callWorker("/sessions/stop", { meetingId });
}

// "Ask AI": the agent answers the latest question on its next poll.
export async function askAgentInMeeting(
  meeting: { id: string; callType: string },
  askedBy: string,
) {
  await updateCallCustom(meeting, (custom) => ({
    ai_ask_seq: Number(custom.ai_ask_seq ?? 0) + 1,
    ai_ask_by: askedBy,
  }));
}

// Changes the mode of a running agent, or starts one when none is in the call.
export async function setAgentModeInMeeting(
  meeting: DispatchMeeting,
  agent: DispatchAgent,
  mode: AiMode,
) {
  await updateCallCustom(meeting, () => ({ ai_mode: mode }));
  if (mode !== "silent" && !(await isAgentInCall(meeting, agent.id))) {
    await startAgentForMeeting({ ...meeting, aiMode: mode }, agent);
  }
}
