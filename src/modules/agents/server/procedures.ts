import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { AgentInsertSchema } from "../schemas/schemas";
import { z } from "zod";
import { eq, getTableColumns, sql } from "drizzle-orm";

export const agentsRouter = createTRPCRouter({
    getOne : protectedProcedure.input(z.object({id: z.string()})).query(async ({ input }) => {
        const [existingAgent] = await db
            .select({
                // ToDo change actual count of meetings
                meetingCount: sql<number>`5`,
                ...getTableColumns(agents),  
            }
            )
            .from(agents)
            .where(eq(agents.id, input.id))
            .limit(1);
            
        return existingAgent;
    }),
    // TODO: Change `getMany` to use `protectedProcedure`
    getMany: protectedProcedure.query(async () => {
        const data = await db.select().from(agents);

        return data;
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
        })
    
});