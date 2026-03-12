import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { agentFilterSchema } from "@/modules/agents/schemas/schemas";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { meetingInsertSchema, meetingUpdateSchema } from "../schemas/schemas";

export const meetingsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(meetingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.session.userId),
          ),
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
  create: protectedProcedure
    .input(meetingInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [createdMeeting] = await db
        .insert(meetings)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      // TODO: Create Stream Call, Upsert Stream Users

      return createdMeeting;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings),
        })
        .from(meetings)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.session.userId),
          ),
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
      const { search, page, pageSize } = input;

      const filter = and(
        eq(meetings.userId, ctx.auth.session.userId),
        search ? ilike(meetings.name, `%${search}%`) : undefined,
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
