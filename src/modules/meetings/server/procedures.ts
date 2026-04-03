import {
  and,
  count,
  eq,
  getTableColumns,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import JSONL from "jsonl-parse-stringify";

import { db } from "@/db";
import { agents, meetings, user } from "@/db/schema";
import { agentFilterSchema } from "@/modules/agents/schemas/schemas";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { streamVideo } from "@/lib/stream-video";
import { generateAvatar } from "@/lib/avatar";
import { meetingInsertSchema, meetingUpdateSchema } from "../schemas/schemas";
import { StreamTranscriptItem } from "../types";
import { streamChat } from "@/lib/stream-chat";

export const meetingsRouter = createTRPCRouter({
  generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = streamChat.createToken(ctx.auth.user.id);
    await streamChat.upsertUsers([
      {
        id: ctx.auth.user.id,
        role: "admin",
      },
    ]);
    return token;
  }),
  getTranscription: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [existingMeeting] = await db
        .select()
        .from(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

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
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name || "Unknown User",
        role: "admin",
        image:
          ctx.auth.user.image ??
          generateAvatar(ctx.auth.user.name || "Unknown User", "initials"),
      },
    ]);
    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago to account for clock skew

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      iat: issuedAt,
    });
    return token;
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
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
        )
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
      const [createdMeeting] = await db
        .insert(meetings)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      const call = streamVideo.video.call("default", createdMeeting.id);
      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: createdMeeting.id,
            meetingName: createdMeeting.name,
          },
          settings_override: {
            transcription: {
              language: "en",
              mode: "auto-on",
              closed_caption_mode: "auto-on",
            },
            recording: {
              mode: "auto-on",
              quality: "1080p",
            },
          },
        },
      });

      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, createdMeeting.agentId));

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      await streamVideo.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name || "Unknown User",
          role: "user",
          image: generateAvatar(
            existingAgent.name || "Unknown User",
            "initials",
          ),
        },
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
    .input(agentFilterSchema)
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

// http://localhost:8288
