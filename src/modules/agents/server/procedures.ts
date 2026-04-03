import { db } from "@/db";
import { agents } from "@/db/schema";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import {
  agentFilterSchema,
  agentInsertSchema,
  agentsUpdateSchema,
} from "../schemas/schemas";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const agentsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(agentsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedAgent] = await db
        .update(agents)
        .set(input)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.auth.session.userId),
          ),
        )
        .returning();

      if (!updatedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return updatedAgent;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [removeAgent] = await db
        .delete(agents)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.auth.session.userId),
          ),
        )
        .returning();

      if (!removeAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return removeAgent;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [existingAgent] = await db
        .select({
          // ToDo change actual count of meetings
          meetingCount: sql<number>`3`,
          ...getTableColumns(agents),
        })
        .from(agents)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.auth.session.userId),
          ),
        )
        .limit(1);

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return existingAgent;
    }),
  getMany: protectedProcedure
    .input(agentFilterSchema)
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize } = input;

      const filter = and(
        eq(agents.userId, ctx.auth.session.userId),
        search ? ilike(agents.name, `%${search}%`) : undefined,
      );

      const data = await db
        .select({
          // ToDo change actual count of meetings
          meetingCount: sql<number>`1`,
          ...getTableColumns(agents),
        })
        .from(agents)
        .where(filter)
        .orderBy(desc(agents.createdAt), desc(agents.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(agents)
        .where(filter);

      const totalPages = Math.ceil(Number(total) / pageSize);

      return {
        items: data,
        total: total,
        totalPages,
      };
    }),
  create: premiumProcedure("agents")
    .input(agentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [createdAgent] = await db
        .insert(agents)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      return createdAgent;
    }),
});
