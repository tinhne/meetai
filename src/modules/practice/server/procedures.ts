import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { getAgentTemplate } from "@/config/agent-templates";
import { getPracticeScenario } from "@/config/practice";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { createMeetingForUser } from "@/modules/meetings/server/procedures";
import type { Scorecard } from "@/server/ai/schemas";
import { enforceRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";

export const practiceRouter = createTRPCRouter({
  // Starts a 1:1 practice call with the scenario's persona. One practice
  // agent per template is created on first use (not counted as an agent).
  start: premiumProcedure("meetings")
    .input(z.object({ scenarioId: z.string().max(64), locale: z.enum(["vi", "en"]).default("vi") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("createMeeting", userId);
      const scenario = getPracticeScenario(input.scenarioId);
      const template = scenario ? getAgentTemplate(scenario.templateId) : null;
      if (!scenario || !template) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

      let [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.userId, userId), eq(agents.practiceScenario, template.id)));
      if (!agent) {
        [agent] = await db
          .insert(agents)
          .values({
            userId,
            name: template.name[input.locale],
            instructions: template.instructions[input.locale],
            voice: template.voice,
            practiceScenario: template.id,
            // Practice sessions are evaluated, not remembered.
            memoryEnabled: false,
          })
          .returning({ id: agents.id });
      }

      return createMeetingForUser(
        userId,
        {
          name: scenario.name[input.locale],
          agentId: agent.id,
          language: scenario.language,
          template: template.meetingTemplate,
          aiMode: "conversational",
          agenda: scenario.brief,
        },
        { practiceKind: scenario.kind },
      );
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: meetings.id,
        name: meetings.name,
        kind: meetings.practiceKind,
        status: meetings.status,
        startedAt: meetings.startedAt,
        createdAt: meetings.createdAt,
        scorecard: meetings.scorecard,
      })
      .from(meetings)
      .where(and(eq(meetings.userId, ctx.auth.user.id), isNotNull(meetings.practiceKind)))
      .orderBy(desc(meetings.createdAt))
      .limit(100);

    return rows.map(({ scorecard, ...row }) => {
      const card = scorecard as Scorecard | null;
      return {
        ...row,
        startedAt: row.startedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        overall: card?.overall ?? null,
        scale: card?.scale ?? null,
      };
    });
  }),
});
