import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import JSONL from "jsonl-parse-stringify";

import { db } from "@/db";
import {
  agents,
  aiChatMessages,
  meetings,
  transcriptSegments,
  usageEvents,
  user,
} from "@/db/schema";
import { AI_CONFIG } from "@/config/ai";
import { inngest } from "@/inngest/client";
import { deleteFromStorage, getSignedDownloadUrl } from "@/server/storage";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { streamVideo } from "@/lib/stream-video";
import { generateAvatar } from "@/lib/avatar";
import { getMeetingForUser, getOwnedAgent } from "@/server/authz";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  meetingFilterSchema,
  meetingInsertSchema,
  meetingUpdateSchema,
} from "../schemas/schemas";
import { StreamTranscriptItem } from "../types";
import { canJoinMeeting, planMeetingUpdate } from "../lib/rules";
import {
  STREAM_CALL_TYPE,
  streamCallCid,
  toStreamTranscriptionLanguage,
} from "../lib/stream";

const STREAM_TOKEN_TTL_SEC = 60 * 60;

async function upsertAgentStreamUser(agent: { id: string; name: string }) {
  await streamVideo.upsertUsers([
    {
      id: agent.id,
      name: agent.name,
      role: "user",
      image: generateAvatar(agent.name, "botttsNeutral"),
    },
  ]);
}

function transcriptionSettings(language: string) {
  return {
    language: toStreamTranscriptionLanguage(language),
    mode: "auto-on" as const,
    closed_caption_mode: "auto-on" as const,
  };
}

export const meetingsRouter = createTRPCRouter({
  getTranscription: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting: existingMeeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
      );

      const segments = await db
        .select()
        .from(transcriptSegments)
        .where(eq(transcriptSegments.meetingId, existingMeeting.id))
        .orderBy(asc(transcriptSegments.position));

      // Meetings processed before transcripts were stored in the database.
      const items: StreamTranscriptItem[] =
        segments.length > 0
          ? segments.map((segment) => ({
              speaker_id: segment.speakerId ?? segment.speakerName,
              type: "speech",
              text: segment.textCorrected ?? segment.text,
              start_ts: segment.startMs,
              end_ts: segment.endMs,
              user: { name: segment.speakerName, image: "" },
            }))
          : existingMeeting.transcriptUrl
            ? await fetch(existingMeeting.transcriptUrl)
                .then((res) => res.text())
                .then((text) => JSONL.parse<StreamTranscriptItem>(text))
                .catch(() => [])
            : [];

      const speakerIds = [...new Set(items.map((item) => item.speaker_id))];
      if (speakerIds.length === 0) return items;

      const [userRows, agentRows] = await Promise.all([
        db.select().from(user).where(inArray(user.id, speakerIds)),
        db.select().from(agents).where(inArray(agents.id, speakerIds)),
      ]);

      const speakersMap = new Map<string, { name: string; image: string }>();
      userRows.forEach((u) => {
        speakersMap.set(u.id, {
          name: u.name,
          image: u.image ?? generateAvatar(u.name, "initials"),
        });
      });
      agentRows.forEach((a) => {
        speakersMap.set(a.id, {
          name: a.name,
          image: generateAvatar(a.name, "botttsNeutral"),
        });
      });

      return items.map((item) => {
        const fallbackName = item.user?.name || "Unknown Speaker";
        return {
          ...item,
          user: speakersMap.get(item.speaker_id) ?? {
            name: fallbackName,
            image: generateAvatar(fallbackName, "initials"),
          },
        };
      });
    }),
  // Short-lived URL for the recording, only after the access check.
  getRecordingUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id);

      if (meeting.recordingKey) {
        const url = await getSignedDownloadUrl(meeting.recordingKey);
        if (url) return { url };
      }

      if (!meeting.recordingUrl) return { url: null };

      // Stream URLs expire; ask Stream for a fresh one.
      const { recordings } = await streamVideo.video
        .call(STREAM_CALL_TYPE, meeting.id)
        .listRecordings()
        .catch(() => ({ recordings: [] as { url: string; end_time?: Date }[] }));
      const latest = recordings.at(-1);

      return { url: latest?.url ?? meeting.recordingUrl };
    }),
  retryProcessing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "host",
      );

      const [updated] = await db
        .update(meetings)
        .set({ status: "processing", failedReason: null, processingAttempts: 0 })
        .where(and(eq(meetings.id, meeting.id), eq(meetings.status, "failed")))
        .returning({ id: meetings.id });

      if (!updated) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only failed meetings can be processed again.",
        });
      }

      await inngest.send({
        id: `meeting-processing-${meeting.id}-retry-${Date.now()}`,
        name: "meetings/processing",
        data: { meetingId: meeting.id },
      });

      return updated;
    }),
  getAskAiMessages: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id);

      return db
        .select({
          id: aiChatMessages.id,
          role: aiChatMessages.role,
          content: aiChatMessages.content,
          createdAt: aiChatMessages.createdAt,
        })
        .from(aiChatMessages)
        .where(
          and(
            eq(aiChatMessages.meetingId, meeting.id),
            eq(aiChatMessages.userId, ctx.auth.user.id),
          ),
        )
        .orderBy(asc(aiChatMessages.createdAt))
        .limit(200);
    }),
  // Issues a call token scoped to this meeting's call only.
  generateToken: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, name, image } = ctx.auth.user;
      await enforceRateLimit("streamToken", id);

      const { meeting } = await getMeetingForUser(id, input.meetingId);

      if (!canJoinMeeting(meeting.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This meeting can no longer be joined.",
        });
      }

      await streamVideo.upsertUsers([
        {
          id,
          name: name || "Unknown User",
          role: "user",
          image: image ?? generateAvatar(name || "Unknown User", "initials"),
        },
      ]);

      const issuedAt = Math.floor(Date.now() / 1000) - 60; // clock skew

      return streamVideo.generateCallToken({
        user_id: id,
        call_cids: [streamCallCid(meeting.id)],
        iat: issuedAt,
        exp: issuedAt + 60 + STREAM_TOKEN_TTL_SEC,
      });
    }),
  // Ends the call for everyone (host only). Status moves to "processing"
  // through the call.session_ended webhook.
  endCall: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "host",
      );

      if (meeting.status !== "active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only an active meeting can be ended.",
        });
      }

      await streamVideo.video.call(STREAM_CALL_TYPE, meeting.id).end();

      return { id: meeting.id };
    }),
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "host",
      );

      const [cancelledMeeting] = await db
        .update(meetings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(meetings.id, meeting.id), eq(meetings.status, "upcoming")))
        .returning();

      if (!cancelledMeeting) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only upcoming meetings can be cancelled.",
        });
      }

      return cancelledMeeting;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [removedMeeting] = await db
        .delete(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
        )
        .returning();

      if (!removedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      await deleteFromStorage([
        removedMeeting.recordingKey,
        removedMeeting.transcriptKey,
      ]).catch(() => undefined);

      return removedMeeting;
    }),
  update: protectedProcedure
    .input(meetingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const { meeting } = await getMeetingForUser(userId, input.id, "host");

      const plan = planMeetingUpdate(meeting, input);
      if (!plan.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: plan.reason });
      }

      if (plan.agentChanged) {
        const agent = await getOwnedAgent(userId, input.agentId);
        await upsertAgentStreamUser(agent);
      }

      if (plan.languageChanged) {
        await streamVideo.video.call(STREAM_CALL_TYPE, meeting.id).update({
          settings_override: {
            transcription: transcriptionSettings(input.language),
          },
        });
      }

      const [updatedMeeting] = await db
        .update(meetings)
        .set(plan.changes)
        .where(and(eq(meetings.id, meeting.id), eq(meetings.userId, userId)))
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return updatedMeeting;
    }),
  create: premiumProcedure("meetings")
    .input(meetingInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("createMeeting", userId);

      const agent = await getOwnedAgent(userId, input.agentId);
      const meetingId = nanoid();

      await upsertAgentStreamUser(agent);

      const call = streamVideo.video.call(STREAM_CALL_TYPE, meetingId);
      await call.create({
        data: {
          created_by_id: userId,
          members: [{ user_id: userId }],
          custom: {
            meetingId,
            meetingName: input.name,
          },
          settings_override: {
            transcription: transcriptionSettings(input.language),
            recording: {
              mode: "auto-on",
              quality: AI_CONFIG.recordingQuality,
            },
          },
        },
      });

      const [[createdMeeting]] = await db.batch([
        db
          .insert(meetings)
          .values({
            id: meetingId,
            name: input.name,
            agentId: agent.id,
            userId,
            language: input.language,
            template: input.template,
            agenda: input.agenda ? input.agenda : null,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          })
          .returning(),
        db
          .insert(usageEvents)
          .values({ userId, kind: "meeting_created", meetingId }),
      ]);

      return createdMeeting;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as(
            "duration",
          ),
        })
        .from(meetings)
        .innerJoin(agents, eq(agents.id, meetings.agentId))
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return existingMeeting;
    }),
  getMany: protectedProcedure
    .input(meetingFilterSchema)
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize, status, agentId } = input;

      const filter = and(
        eq(meetings.userId, ctx.auth.user.id),
        search ? ilike(meetings.name, `%${search}%`) : undefined,
        status ? eq(meetings.status, status) : undefined,
        agentId ? eq(meetings.agentId, agentId) : undefined,
      );

      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as(
            "duration",
          ),
        })
        .from(meetings)
        .innerJoin(agents, eq(agents.id, meetings.agentId))
        .where(filter)
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(agents.id, meetings.agentId))
        .where(filter);

      const totalPages = Math.ceil(Number(total) / pageSize);

      return {
        items: data,
        total: total,
        totalPages,
      };
    }),
});
