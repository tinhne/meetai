import "server-only";

import { and, cosineDistance, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { knowledgeChunks, knowledgeDocuments, meetingChunks, meetings, memories } from "@/db/schema";

const similarity = (distance: unknown) => 1 - Number(distance);

// Transcript windows across the user's own meetings (optionally one meeting).
export async function searchMeetingChunks(params: {
  userId: string;
  vector: number[];
  limit: number;
  meetingId?: string;
}) {
  const distance = cosineDistance(meetingChunks.embedding, params.vector);
  const rows = await db
    .select({
      meetingId: meetingChunks.meetingId,
      meetingName: meetings.name,
      meetingStartedAt: meetings.startedAt,
      startMs: meetingChunks.startMs,
      content: meetingChunks.content,
      distance,
    })
    .from(meetingChunks)
    .innerJoin(meetings, eq(meetingChunks.meetingId, meetings.id))
    .where(
      and(
        eq(meetingChunks.userId, params.userId),
        params.meetingId ? eq(meetingChunks.meetingId, params.meetingId) : undefined,
      ),
    )
    .orderBy(distance)
    .limit(params.limit);
  return rows.map(({ distance: d, ...row }) => ({ ...row, similarity: similarity(d) }));
}

// Active memories of the agent plus the user's shared ones.
export async function searchMemories(params: {
  userId: string;
  agentId: string | null;
  vector: number[];
  limit: number;
}) {
  const distance = cosineDistance(memories.embedding, params.vector);
  const rows = await db
    .select({
      id: memories.id,
      type: memories.type,
      content: memories.content,
      detail: memories.detail,
      sourceMeetingId: memories.sourceMeetingId,
      distance,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, params.userId),
        isNull(memories.archivedAt),
        params.agentId ? or(eq(memories.agentId, params.agentId), isNull(memories.agentId)) : undefined,
        sql`${memories.embedding} is not null`,
      ),
    )
    .orderBy(distance)
    .limit(params.limit);
  return rows.map(({ distance: d, ...row }) => ({ ...row, similarity: similarity(d) }));
}

export async function searchKnowledge(params: {
  userId: string;
  agentId: string | null;
  vector: number[];
  limit: number;
}) {
  const distance = cosineDistance(knowledgeChunks.embedding, params.vector);
  const rows = await db
    .select({
      documentId: knowledgeChunks.documentId,
      title: knowledgeDocuments.title,
      content: knowledgeChunks.content,
      distance,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .where(
      and(
        eq(knowledgeChunks.userId, params.userId),
        eq(knowledgeDocuments.status, "ready"),
        params.agentId
          ? or(eq(knowledgeChunks.agentId, params.agentId), isNull(knowledgeChunks.agentId))
          : undefined,
      ),
    )
    .orderBy(distance)
    .limit(params.limit);
  return rows.map(({ distance: d, ...row }) => ({ ...row, similarity: similarity(d) }));
}

// Formats retrieved memories + documents as a <background> block for prompts.
export function formatBackground(
  memoryHits: { type: string; content: string; detail: string | null }[],
  knowledgeHits: { title: string; content: string }[],
) {
  const lines = [
    ...memoryHits.map((hit) => `[Memory] (${hit.type}) ${hit.content}${hit.detail ? `: ${hit.detail}` : ""}`),
    ...knowledgeHits.map((hit) => `[Document: ${hit.title}]\n${hit.content}`),
  ];
  return lines.length > 0 ? `<background>\n${lines.join("\n\n")}\n</background>` : "";
}

export async function getMeetingNames(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ id: meetings.id, name: meetings.name })
    .from(meetings)
    .where(inArray(meetings.id, ids))
    .orderBy(desc(meetings.createdAt));
  return new Map(rows.map((row) => [row.id, row.name]));
}
