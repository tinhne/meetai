import { after } from "next/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import JSONL from "jsonl-parse-stringify";

import { db } from "@/db";
import {
  actionItems,
  agents,
  aiChatMessages,
  meetingFeedback,
  meetingParticipants,
  meetings,
  shareLinks,
  transcriptSegments,
  usageEvents,
  user,
} from "@/db/schema";
import { AI_CONFIG, AI_MODES, JOIN_MODES } from "@/config/ai";
import { APP_TIME_ZONE } from "@/i18n/routing";
import { buildIcsInvite } from "@/lib/ics";
import { sendMeetingInviteEmail } from "@/lib/email";
import { createInvitePass } from "@/modules/meetings/lib/invite-pass";
import { warnIfNearQuota } from "@/server/billing/quota";
import {
  askAgentInMeeting,
  setAgentModeInMeeting,
  startAgentForMeeting,
  toAiMode,
} from "@/server/agent-dispatch";
import { assertRoomForMore, participantDisplayName } from "@/server/participants";
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
import { omit } from "@/lib/utils";
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
  MEETING_LANGUAGES,
  streamCallCid,
  toStreamTranscriptionLanguage,
} from "../lib/stream";
import { env } from "@/env";
import type { PracticeKind } from "@/config/practice";

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

type MeetingCreateInput = z.infer<typeof meetingInsertSchema>;

export async function createMeetingForUser(
  userId: string,
  input: MeetingCreateInput,
  options: { practiceKind?: PracticeKind } = {},
) {
  const agent = await getOwnedAgent(userId, input.agentId);
  const meetingId = nanoid();

  await upsertAgentStreamUser(agent);

  const callType = env.STREAM_CALL_TYPE;
  const call = streamVideo.video.call(callType, meetingId);
  await call.create({
    data: {
      created_by_id: userId,
      // Host actions (end, mute, remove) run server-side, so members
      // only need the call type's basic grants.
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
        aiMode: input.aiMode,
        callType,
        agenda: input.agenda ? input.agenda : null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        practiceKind: options.practiceKind ?? null,
      })
      .returning(),
    db
      .insert(usageEvents)
      .values({ userId, kind: "meeting_created", meetingId }),
    db.insert(meetingParticipants).values({
      id: `host_${meetingId}`,
      meetingId,
      userId,
      streamUserId: userId,
      role: "host",
      status: "admitted",
    }),
  ]);

  // Free plans get an email when 80% of the month's meetings are used.
  after(() => warnIfNearQuota(userId, ["meetings"]));

  return createdMeeting;
}

export const meetingsRouter = createTRPCRouter({
  getTranscription: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting: existingMeeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "owner",
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
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "owner",
      );

      if (meeting.recordingKey) {
        const url = await getSignedDownloadUrl(meeting.recordingKey);
        if (url) return { url };
      }

      if (!meeting.recordingUrl) return { url: null };

      // Stream URLs expire; ask Stream for a fresh one.
      const { recordings } = await streamVideo.video
        .call(meeting.callType, meeting.id)
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
        "owner",
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
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "owner",
      );

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
  // ---- Live meeting: participants and host controls ----
  getParticipants: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "host");

      const rows = await db
        .select({
          id: meetingParticipants.id,
          role: meetingParticipants.role,
          status: meetingParticipants.status,
          streamUserId: meetingParticipants.streamUserId,
          guestName: meetingParticipants.guestName,
          userName: user.name,
          createdAt: meetingParticipants.createdAt,
        })
        .from(meetingParticipants)
        .leftJoin(user, eq(user.id, meetingParticipants.userId))
        .where(eq(meetingParticipants.meetingId, meeting.id))
        .orderBy(asc(meetingParticipants.createdAt));

      return rows.map((row) => ({
        id: row.id,
        role: row.role,
        status: row.status,
        streamUserId: row.streamUserId,
        name: participantDisplayName(row),
        isGuest: row.role === "guest",
      }));
    }),
  setParticipantStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        participantId: z.string(),
        status: z.enum(["admitted", "denied", "removed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "host");

      const [participant] = await db
        .select()
        .from(meetingParticipants)
        .where(
          and(
            eq(meetingParticipants.id, input.participantId),
            eq(meetingParticipants.meetingId, meeting.id),
          ),
        );

      if (!participant || participant.role === "host") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
      }

      if (input.status === "admitted" && participant.status !== "admitted") {
        await assertRoomForMore(meeting);
      }

      await db
        .update(meetingParticipants)
        .set({ status: input.status })
        .where(eq(meetingParticipants.id, participant.id));

      if (input.status === "removed") {
        await streamVideo.video
          .call(meeting.callType, meeting.id)
          .kickUser({
            user_id: participant.streamUserId,
            block: true,
            kicked_by_id: ctx.auth.user.id,
          })
          .catch(() => undefined);
      }

      return { id: participant.id, status: input.status };
    }),
  muteParticipants: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // Omit to mute everyone except the host.
        streamUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "host");

      await streamVideo.video.call(meeting.callType, meeting.id).muteUsers({
        audio: true,
        muted_by_id: ctx.auth.user.id,
        ...(input.streamUserId
          ? { user_ids: [input.streamUserId] }
          : { mute_all_users: true }),
      });

      return { ok: true };
    }),
  setJoinMode: protectedProcedure
    .input(z.object({ id: z.string(), joinMode: z.enum(JOIN_MODES) }))
    .mutation(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "host");
      await db
        .update(meetings)
        .set({ joinMode: input.joinMode })
        .where(eq(meetings.id, meeting.id));
      return { joinMode: input.joinMode };
    }),
  setAiMode: protectedProcedure
    .input(z.object({ id: z.string(), aiMode: z.enum(AI_MODES) }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "host");

      await db
        .update(meetings)
        .set({ aiMode: input.aiMode })
        .where(eq(meetings.id, meeting.id));

      if (meeting.status === "active") {
        const wasSilent = toAiMode(meeting.aiMode) === "silent";
        const running = wasSilent
          ? false
          : await setAgentModeInMeeting(meeting.id, input.aiMode);

        if (!running && input.aiMode !== "silent") {
          const [agent] = await db
            .select()
            .from(agents)
            .where(eq(agents.id, meeting.agentId));
          if (agent) {
            await startAgentForMeeting({ ...meeting, aiMode: input.aiMode }, agent);
          }
        }
      }

      return { aiMode: input.aiMode };
    }),
  askAgent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("askAgent", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id);

      if (meeting.status !== "active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The meeting is not live.",
        });
      }

      await askAgentInMeeting(meeting.id, ctx.auth.user.name || "Someone");
      return { ok: true };
    }),
  regenerateInviteCode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");
      const [updated] = await db
        .update(meetings)
        .set({ inviteCode: nanoid(10) })
        .where(eq(meetings.id, meeting.id))
        .returning({ inviteCode: meetings.inviteCode });
      return updated;
    }),
  inviteByEmail: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        emails: z.array(z.email()).min(1).max(10),
        locale: z.enum(["vi", "en"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("invite", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");

      const localePrefix = input.locale === "en" ? "/en" : "";
      const url = `${env.NEXT_PUBLIC_APP_URL}${localePrefix}/j/${meeting.inviteCode}`;
      const when = meeting.scheduledAt
        ? new Intl.DateTimeFormat(input.locale === "en" ? "en-US" : "vi-VN", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: APP_TIME_ZONE,
          }).format(meeting.scheduledAt)
        : null;
      const unique = [...new Set(input.emails.map((email) => email.toLowerCase()))];
      await Promise.all(
        unique.map((to) => {
          // Personal link: this person skips the waiting room.
          const personalUrl = `${url}?invite=${createInvitePass({
            secret: env.BETTER_AUTH_SECRET,
            meetingId: meeting.id,
            inviteCode: meeting.inviteCode,
            email: to,
          })}`;
          return sendMeetingInviteEmail({
            to,
            hostName: ctx.auth.user.name || "Meet.AI",
            meetingName: meeting.name,
            url: personalUrl,
            language: input.locale,
            when,
            ics: meeting.scheduledAt
              ? buildIcsInvite({
                  uid: meeting.id,
                  title: meeting.name,
                  description: meeting.agenda ?? "",
                  url: personalUrl,
                  start: meeting.scheduledAt,
                  durationMinutes: 60,
                })
              : null,
          });
        }),
      );

      return { sent: unique.length };
    }),
  submitFeedback: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id);

      await db
        .insert(meetingFeedback)
        .values({
          meetingId: meeting.id,
          userId: ctx.auth.user.id,
          rating: input.rating,
          comment: input.comment || null,
        })
        .onConflictDoUpdate({
          target: [meetingFeedback.meetingId, meetingFeedback.userId],
          set: { rating: input.rating, comment: input.comment || null },
        });

      return { ok: true };
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
        call_cids: [streamCallCid(meeting.callType, meeting.id)],
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

      await streamVideo.video.call(meeting.callType, meeting.id).end();

      return { id: meeting.id };
    }),
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
        "owner",
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
      const { meeting } = await getMeetingForUser(userId, input.id, "owner");

      const plan = planMeetingUpdate(meeting, input);
      if (!plan.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: plan.reason });
      }

      if (plan.agentChanged) {
        const agent = await getOwnedAgent(userId, input.agentId);
        await upsertAgentStreamUser(agent);
      }

      if (plan.languageChanged) {
        await streamVideo.video.call(meeting.callType, meeting.id).update({
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
      await enforceRateLimit("createMeeting", ctx.auth.user.id);
      return createMeetingForUser(ctx.auth.user.id, input);
    }),
  // "Meet now": sensible defaults and the most recently used agent.
  createInstant: premiumProcedure("meetings")
    .input(
      z.object({
        agentId: z.string().optional(),
        name: z.string().trim().min(1).max(100),
        language: z.enum(MEETING_LANGUAGES).default("vi"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("createMeeting", userId);

      const agentId =
        input.agentId ??
        (
          await db
            .select({ id: agents.id })
            .from(agents)
            // Practice personas are only used from the Practice page.
            .where(and(eq(agents.userId, userId), isNull(agents.practiceScenario)))
            .orderBy(desc(agents.updatedAt))
            .limit(1)
        )[0]?.id;

      if (!agentId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Create an agent first.",
        });
      }

      return createMeetingForUser(userId, {
        name: input.name,
        agentId,
        language: input.language,
        template: "general",
        aiMode: "conversational",
      });
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
      const { search, page, pageSize, status, agentId, view } = input;

      const viewFilter =
        view === "upcoming"
          ? inArray(meetings.status, ["upcoming", "active"])
          : view === "past"
            ? inArray(meetings.status, ["completed", "processing", "failed", "cancelled"])
            : undefined;

      const filter = and(
        eq(meetings.userId, ctx.auth.user.id),
        search ? ilike(meetings.name, `%${search}%`) : undefined,
        status ? eq(meetings.status, status) : undefined,
        agentId ? eq(meetings.agentId, agentId) : undefined,
        viewFilter,
      );

      // Lists do not need the full summary / insights payload.
      const listColumns = omit(getTableColumns(meetings), ["summary", "insights"]);

      const data = await db
        .select({
          ...listColumns,
          agent: agents,
          tldr: sql<string | null>`${meetings.insights}->>'tldr'`,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as(
            "duration",
          ),
        })
        .from(meetings)
        .innerJoin(agents, eq(agents.id, meetings.agentId))
        .where(filter)
        .orderBy(
          ...(view === "upcoming"
            ? [
                sql`${meetings.status} = 'active' DESC`,
                sql`${meetings.scheduledAt} ASC NULLS LAST`,
                desc(meetings.createdAt),
              ]
            : [desc(meetings.createdAt), desc(meetings.id)]),
        )
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
  getActionItems: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");
      return db
        .select()
        .from(actionItems)
        .where(eq(actionItems.meetingId, meeting.id))
        .orderBy(asc(actionItems.createdAt));
    }),
  setActionItemStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        actionItemId: z.string(),
        status: z.enum(["open", "done"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");
      const [item] = await db
        .update(actionItems)
        .set({ status: input.status })
        .where(
          and(
            eq(actionItems.id, input.actionItemId),
            eq(actionItems.meetingId, meeting.id),
          ),
        )
        .returning();

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Action item not found" });
      }
      return item;
    }),
  getShareLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");
      const [link] = await db
        .select({ token: shareLinks.token })
        .from(shareLinks)
        .where(and(eq(shareLinks.meetingId, meeting.id), isNull(shareLinks.revokedAt)))
        .orderBy(desc(shareLinks.createdAt))
        .limit(1);
      return link ?? null;
    }),
  createShareLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("meetingAction", ctx.auth.user.id);
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");

      if (meeting.status !== "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only finished meetings can be shared.",
        });
      }

      const [link] = await db
        .insert(shareLinks)
        .values({ meetingId: meeting.id, createdBy: ctx.auth.user.id })
        .returning({ token: shareLinks.token });
      return link;
    }),
  revokeShareLinks: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { meeting } = await getMeetingForUser(ctx.auth.user.id, input.id, "owner");
      await db
        .update(shareLinks)
        .set({ revokedAt: new Date() })
        .where(and(eq(shareLinks.meetingId, meeting.id), isNull(shareLinks.revokedAt)));
      return { ok: true };
    }),
});
