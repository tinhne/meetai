import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  actionItems,
  agents,
  aiChatMessages,
  meetings,
  transcriptSegments,
} from "@/db/schema";
import { enforceRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const settingsRouter = createTRPCRouter({
  // Everything the user owns, as JSON (right to data portability).
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    await enforceRateLimit("meetingAction", userId);

    const [userAgents, userMeetings] = await Promise.all([
      db.select().from(agents).where(eq(agents.userId, userId)),
      db.select().from(meetings).where(eq(meetings.userId, userId)),
    ]);
    const meetingIds = userMeetings.map((meeting) => meeting.id);

    const [segments, items, chats] =
      meetingIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            db
              .select()
              .from(transcriptSegments)
              .where(inArray(transcriptSegments.meetingId, meetingIds))
              .orderBy(asc(transcriptSegments.meetingId), asc(transcriptSegments.position)),
            db.select().from(actionItems).where(inArray(actionItems.meetingId, meetingIds)),
            db
              .select()
              .from(aiChatMessages)
              .where(inArray(aiChatMessages.meetingId, meetingIds)),
          ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        email: ctx.auth.user.email,
      },
      agents: userAgents,
      meetings: userMeetings.map((meeting) => ({
        ...meeting,
        transcript: segments.filter((segment) => segment.meetingId === meeting.id),
        actionItems: items.filter((item) => item.meetingId === meeting.id),
        askAi: chats.filter((chat) => chat.meetingId === meeting.id),
      })),
    };
  }),
});
