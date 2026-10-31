export const runtime = "nodejs";
import { createHash } from "node:crypto";

import { db } from "@/db";
import { agents, meetings, webhookEvents } from "@/db/schema";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { streamVideo } from "@/lib/stream-video";
import { STREAM_CALL_TYPE, meetingIdFromCallCid } from "@/modules/meetings/lib/stream";
import { getUserPlan } from "@/modules/premium/server/usage";
import { consumeRateLimit } from "@/server/rate-limit";

import {
  MessageNewEvent,
  CallEndedEvent,
  CallRecordingReadyEvent,
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
  CallTranscriptionReadyEvent,
} from "@stream-io/node-sdk";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

// Stream retries deliveries with the same body, so the body hash is a stable
// idempotency key. Returns false when the event was already processed.
async function claimWebhookEvent(id: string, type: string) {
  const inserted = await db
    .insert(webhookEvents)
    .values({ id, type })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  return inserted.length > 0;
}

async function releaseWebhookEvent(id: string) {
  await db.delete(webhookEvents).where(eq(webhookEvents.id, id));
}

async function handleSessionStarted(event: CallSessionStartedEvent) {
  const meetingId = event.call.custom?.meetingId;

  if (typeof meetingId !== "string" || !meetingId) {
    return;
  }

  // Atomic transition: only one delivery can move upcoming -> active, so the
  // agent is never connected twice.
  const [meeting] = await db
    .update(meetings)
    .set({ status: "active", startedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "upcoming")))
    .returning();

  if (!meeting) {
    return;
  }

  if (!env.AI_VOICE_ENABLED) {
    console.info("[Webhook] AI voice disabled, skipping agent for", meeting.id);
    return;
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, meeting.agentId), eq(agents.userId, meeting.userId)));

  if (!agent) {
    console.error("[Webhook] Agent not found for meeting", meeting.id);
    return;
  }

  try {
    const call = streamVideo.video.call(STREAM_CALL_TYPE, meeting.id);
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: env.OPENAI_API_KEY,
      agentUserId: agent.id,
    });

    realtimeClient.updateSession({
      instructions: agent.instructions,
    });
  } catch (error) {
    // The meeting continues without the voice agent.
    console.error(
      "[Webhook] Failed to connect agent:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function handleParticipantLeft(event: CallSessionParticipantLeftEvent) {
  const meetingId = meetingIdFromCallCid(event.call_cid);
  if (!meetingId) return;

  // Do not end the call here: a single participant (or the agent) leaving,
  // or a page refresh, must not end the meeting for everyone. A debounced
  // job ends the call once no human has been in the room for a while.
  await inngest.send({
    name: "meetings/participant.left",
    data: { meetingId },
  });
}

async function handleSessionEnded(event: CallEndedEvent) {
  const meetingId = meetingIdFromCallCid(event.call_cid);
  if (!meetingId) return;

  await db
    .update(meetings)
    .set({ status: "processing", endedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));
}

async function handleTranscriptionReady(event: CallTranscriptionReadyEvent) {
  const meetingId = meetingIdFromCallCid(event.call_cid);
  if (!meetingId) return;

  const [updatedMeeting] = await db
    .update(meetings)
    .set({ transcriptUrl: event.call_transcription.url })
    .where(eq(meetings.id, meetingId))
    .returning();

  if (!updatedMeeting) return;

  await inngest.send({
    id: `meeting-processing-${meetingId}`,
    name: "meetings/processing",
    data: {
      meetingId: updatedMeeting.id,
      transcriptUrl: event.call_transcription.url,
    },
  });
}

async function handleRecordingReady(event: CallRecordingReadyEvent) {
  const meetingId = meetingIdFromCallCid(event.call_cid);
  if (!meetingId) return;

  await db
    .update(meetings)
    .set({ recordingUrl: event.call_recording.url })
    .where(eq(meetings.id, meetingId));
}

async function handleMessageNew(event: MessageNewEvent) {
  const userId = event.user?.id ?? event.message?.user?.id;
  const channelId = event.channel_id;
  const text = event.message?.text;
  const messageType = event.message?.type;
  const messageId = event.message?.id;

  if (!userId || !channelId || !text || !messageId) return;
  if (messageType !== "regular") return;

  const [existingMeeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, channelId), eq(meetings.status, "completed")));

  // Only the meeting owner can ask the agent about this meeting.
  if (!existingMeeting || existingMeeting.userId !== userId) return;

  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, existingMeeting.agentId));

  if (!existingAgent || userId === existingAgent.id) return;

  const plan = await getUserPlan(userId);
  const limit = await consumeRateLimit(`askAi:${userId}`, {
    limit: plan.askAiPerHour,
    windowSec: 60 * 60,
  });

  await inngest.send({
    id: `chat-message-${messageId}`,
    name: "chat/message.new",
    data: {
      messageId,
      userId,
      channelId,
      text,
      agentId: existingAgent.id,
      agentName: existingAgent.name,
      agentInstructions: existingAgent.instructions,
      meetingSummary: existingMeeting.summary,
      rateLimited: !limit.allowed,
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature");
  const apiKey = request.headers.get("x-api-key");
  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 },
    );
  }

  const body = await request.text();

  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const eventType = typeof payload.type === "string" ? payload.type : "";
  const eventId = createHash("sha256").update(body).digest("hex");

  if (!(await claimWebhookEvent(eventId, eventType))) {
    return NextResponse.json({ status: "duplicate" });
  }

  try {
    switch (eventType) {
      case "call.session_started":
        await handleSessionStarted(payload as unknown as CallSessionStartedEvent);
        break;
      case "call.session_participant_left":
        await handleParticipantLeft(
          payload as unknown as CallSessionParticipantLeftEvent,
        );
        break;
      case "call.session_ended":
        await handleSessionEnded(payload as unknown as CallEndedEvent);
        break;
      case "call.transcription_ready":
        await handleTranscriptionReady(
          payload as unknown as CallTranscriptionReadyEvent,
        );
        break;
      case "call.recording_ready":
        await handleRecordingReady(
          payload as unknown as CallRecordingReadyEvent,
        );
        break;
      case "message.new":
        await handleMessageNew(payload as unknown as MessageNewEvent);
        break;
    }
  } catch (error) {
    // Let Stream retry: forget the claim so the retry is processed.
    await releaseWebhookEvent(eventId);
    console.error(
      `[Webhook] Failed to process ${eventType}:`,
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "Webhook processed successfully" });
}
