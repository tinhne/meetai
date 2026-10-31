import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { actionItems, agents, meetings } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const dashboardRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    const [upcoming, recent, openItems, [agentCount], [meetingCounts]] =
      await Promise.all([
        db
          .select({
            id: meetings.id,
            name: meetings.name,
            status: meetings.status,
            scheduledAt: meetings.scheduledAt,
            agentName: agents.name,
          })
          .from(meetings)
          .innerJoin(agents, eq(agents.id, meetings.agentId))
          .where(
            and(eq(meetings.userId, userId), inArray(meetings.status, ["upcoming", "active"])),
          )
          .orderBy(
            sql`${meetings.status} = 'active' DESC`,
            sql`${meetings.scheduledAt} ASC NULLS LAST`,
            desc(meetings.createdAt),
          )
          .limit(5),
        db
          .select({
            id: meetings.id,
            name: meetings.name,
            status: meetings.status,
            endedAt: meetings.endedAt,
            tldr: sql<string | null>`${meetings.insights}->>'tldr'`,
          })
          .from(meetings)
          .where(
            and(
              eq(meetings.userId, userId),
              inArray(meetings.status, ["completed", "processing", "failed"]),
            ),
          )
          .orderBy(desc(meetings.endedAt), desc(meetings.createdAt))
          .limit(5),
        db
          .select({
            id: actionItems.id,
            text: actionItems.text,
            owner: actionItems.owner,
            dueDate: actionItems.dueDate,
            meetingId: meetings.id,
            meetingName: meetings.name,
          })
          .from(actionItems)
          .innerJoin(meetings, eq(meetings.id, actionItems.meetingId))
          .where(and(eq(meetings.userId, userId), eq(actionItems.status, "open")))
          .orderBy(desc(actionItems.createdAt))
          .limit(8),
        db.select({ count: count() }).from(agents).where(eq(agents.userId, userId)),
        db
          .select({
            total: count(),
            completed: sql<number>`count(*) filter (where ${meetings.status} = 'completed')`,
            withEnd: count(meetings.endedAt),
          })
          .from(meetings)
          .where(eq(meetings.userId, userId)),
      ]);

    return {
      upcoming,
      recent,
      openActionItems: openItems,
      // Getting-started checklist, from real data.
      progress: {
        hasAgent: (agentCount?.count ?? 0) > 0,
        hasMeeting: (meetingCounts?.total ?? 0) > 0,
        hasHeldMeeting: (meetingCounts?.withEnd ?? 0) > 0,
        hasNotes: Number(meetingCounts?.completed ?? 0) > 0,
      },
    };
  }),
});
