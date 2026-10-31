import {
  and,
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
import { agents, meetings, usageEvents, user } from "@/db/schema";
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
import { streamChat } from "@/lib/stream-chat";
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
  generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
    const { id, name, image } = ctx.auth.user;
    await enforceRateLimit("streamToken", id);

    await streamChat.upsertUsers([
      {
        id,
        name,
        image: image ?? generateAvatar(name, "initials"),
        role: "user",
      },
    ]);

    return streamChat.createToken(
      id,
      Math.floor(Date.now() / 1000) + STREAM_TOKEN_TTL_SEC,
    );
  }),
  // Creates the Ask AI channel server-side so members are controlled here,
  // not by the client.
  ensureChatChannel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("chatChannel", userId);

      const { meeting } = await getMeetingForUser(userId, input.id, "host");

      if (meeting.status !== "completed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Ask AI is available once the meeting summary is ready.",
        });
      }

      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, meeting.agentId));

      if (agent) {
        await streamChat.upsertUser({
          id: agent.id,
          name: agent.name,
          image: generateAvatar(agent.name, "botttsNeutral"),
          role: "user",
        });
      }

      const allowedMembers = agent ? [userId, agent.id] : [userId];
      const channel = streamChat.channel("messaging", meeting.id, {
        created_by_id: userId,
        members: allowedMembers,
      });
      await channel.create();

      const { members } = await channel.queryMembers({});
      const currentMembers = members
        .map((member) => member.user_id)
        .filter((id): id is string => !!id);

      const unexpected = currentMembers.filter(
        (id) => !allowedMembers.includes(id),
      );
      const missing = allowedMembers.filter(
        (id) => !currentMembers.includes(id),
      );

      if (unexpected.length > 0) {
        await channel.removeMembers(unexpected);
      }
      if (missing.length > 0) {
        await channel.addMembers(missing);
      }

      return { channelId: meeting.id };
    }),
  getTranscription: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { meeting: existingMeeting } = await getMeetingForUser(
        ctx.auth.user.id,
        input.id,
      );

      if (!existingMeeting.transcriptUrl) {
        return [];
      }

      const transcriptResponse = await fetch(existingMeeting.transcriptUrl)
        .then((res) => res.text())
        .then((text) => JSONL.parse<StreamTranscriptItem>(text))
        .catch(() => []);

      const speakerIds = [
        ...new Set(transcriptResponse.map((item) => item.speaker_id)),
      ];
      if (speakerIds.length === 0) return transcriptResponse;

      const [userRows, agentRows] = await Promise.all([
        db.select().from(user).where(inArray(user.id, speakerIds)),
        db.select().from(agents).where(inArray(agents.id, speakerIds)),
      ]);

      const speakersMap = new Map<
        string,
        { id: string; name: string; image: string }
      >();

      // Đưa User vào Map
      userRows.forEach((u) => {
        speakersMap.set(u.id, {
          id: u.id,
          name: u.name,
          image: u.image ?? generateAvatar(u.name, "initials"),
        });
      });

      agentRows.forEach((a) => {
        speakersMap.set(a.id, {
          id: a.id,
          name: a.name,
          image: generateAvatar(a.name, "botttsNeutral"),
        });
      });

      const transcriptWithSpeakers = transcriptResponse.map((item) => {
        const speaker = speakersMap.get(item.speaker_id);

        return {
          ...item,
          user: speaker ?? {
            name: "Unknown Speaker",
            image: generateAvatar("Unknown Speaker", "initials"),
          },
        };
      });
      return transcriptWithSpeakers;
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
              quality: "1080p",
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
