import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { agents, meetings, shareLinks, transcriptSegments } from "@/db/schema";
import type { MeetingInsights } from "@/server/ai/schemas";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

// Public, read-only view of shared meeting notes. Never exposes the
// recording, participants' emails or anything else from the account.
export const shareRouter = createTRPCRouter({
  getMeeting: baseProcedure
    .input(z.object({ token: z.string().min(10).max(64) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: meetings.id,
          name: meetings.name,
          status: meetings.status,
          startedAt: meetings.startedAt,
          endedAt: meetings.endedAt,
          language: meetings.language,
          summary: meetings.summary,
          insights: meetings.insights,
          agentName: agents.name,
        })
        .from(shareLinks)
        .innerJoin(meetings, eq(meetings.id, shareLinks.meetingId))
        .innerJoin(agents, eq(agents.id, meetings.agentId))
        .where(and(eq(shareLinks.token, input.token), isNull(shareLinks.revokedAt)));

      if (!row || row.status !== "completed") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const segments = await db
        .select({
          speakerName: transcriptSegments.speakerName,
          startMs: transcriptSegments.startMs,
          text: transcriptSegments.text,
          textCorrected: transcriptSegments.textCorrected,
        })
        .from(transcriptSegments)
        .where(eq(transcriptSegments.meetingId, row.id))
        .orderBy(asc(transcriptSegments.position));

      return {
        name: row.name,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        language: row.language,
        agentName: row.agentName,
        summary: row.summary,
        insights: row.insights as MeetingInsights | null,
        transcript: segments.map((segment) => ({
          speakerName: segment.speakerName,
          startMs: segment.startMs,
          text: segment.textCorrected ?? segment.text,
        })),
      };
    }),
});
