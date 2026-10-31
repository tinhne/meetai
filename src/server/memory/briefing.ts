// Pre-meeting briefing for the voice agent. Shared with the agent worker, so
// relative imports only and the database client is passed in.

import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { AI_CONFIG } from "../../config/ai";
import { actionItems, agents, meetings, memories } from "../../db/schema";

const TYPE_LABEL: Record<string, string> = {
  decision: "Decision",
  fact: "Fact",
  preference: "Preference",
  todo: "Open item",
  glossary: "Term",
};

export async function buildBriefing(
  db: NeonHttpDatabase,
  params: { userId: string; agentId: string },
): Promise<string | null> {
  const [agent] = await db
    .select({ memoryEnabled: agents.memoryEnabled })
    .from(agents)
    .where(eq(agents.id, params.agentId));
  if (!agent?.memoryEnabled) return null;

  const [remembered, openItems] = await Promise.all([
    db
      .select({ type: memories.type, content: memories.content, detail: memories.detail })
      .from(memories)
      .where(
        and(
          eq(memories.userId, params.userId),
          or(eq(memories.agentId, params.agentId), isNull(memories.agentId)),
          isNull(memories.archivedAt),
        ),
      )
      .orderBy(desc(memories.updatedAt))
      .limit(AI_CONFIG.memory.briefingMemories),
    db
      .select({ text: actionItems.text, owner: actionItems.owner, dueDate: actionItems.dueDate })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(
        and(
          eq(meetings.userId, params.userId),
          eq(meetings.agentId, params.agentId),
          eq(actionItems.status, "open"),
        ),
      )
      .orderBy(desc(actionItems.createdAt))
      .limit(AI_CONFIG.memory.briefingActionItems),
  ]);

  const lines = [
    ...remembered.map(
      (memory) =>
        `- ${TYPE_LABEL[memory.type] ?? memory.type}: ${memory.content}${memory.detail ? ` (${memory.detail})` : ""}`,
    ),
    ...openItems.map(
      (item) =>
        `- Open action item: ${item.text}${item.owner ? ` (owner: ${item.owner})` : ""}${item.dueDate ? ` (due: ${item.dueDate})` : ""}`,
    ),
  ];
  if (lines.length === 0) return null;

  let briefing = "";
  for (const line of lines) {
    if (briefing.length + line.length + 1 > AI_CONFIG.memory.briefingMaxChars) break;
    briefing += `${briefing ? "\n" : ""}${line}`;
  }
  return briefing;
}
