import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { AgentFilterSchema, AgentInsertSchema } from "../schemas/schemas";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";

export const agentsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [existingAgent] = await db
        .select({
          // ToDo change actual count of meetings
          meetingCount: sql<number>`3`,
          ...getTableColumns(agents),
        })
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      return existingAgent;
    }),
  getMany: protectedProcedure
    .input(AgentFilterSchema)
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
  create: protectedProcedure
    .input(AgentInsertSchema)
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
