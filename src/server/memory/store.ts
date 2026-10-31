import "server-only";

import { and, asc, cosineDistance, desc, eq, isNull, notExists, sql } from "drizzle-orm";
import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";
import { db } from "@/db";
import { meetingChunks, meetings, memories, transcriptSegments } from "@/db/schema";
import { embedTexts } from "@/server/ai/embeddings";
import { generateJson } from "@/server/ai/gemini";
import { memoryExtractionPrompt } from "@/server/ai/prompts";
import { chunkTranscript } from "./chunking";

type MemoryType = (typeof memories.$inferInsert)["type"];

export const memoryExtractionSchema = z.object({
  memories: z
    .array(
      z.object({
        type: z.enum(["decision", "fact", "preference", "todo"]),
        content: z.string().min(3).max(400),
      }),
    )
    .max(10),
  glossary: z
    .array(z.object({ term: z.string().min(1).max(80), definition: z.string().min(3).max(300) }))
    .max(10),
});

// Saves items, updating the closest existing memory of the same type instead
// of adding a near-duplicate.
export async function saveMemories(params: {
  userId: string;
  agentId: string | null;
  sourceMeetingId: string | null;
  items: { type: MemoryType; content: string; detail?: string | null }[];
}) {
  const items = params.items.slice(0, AI_CONFIG.memory.maxPerMeeting);
  if (items.length === 0) return { added: 0, updated: 0 };

  const vectors = await embedTexts(
    items.map((item) => (item.detail ? `${item.content}: ${item.detail}` : item.content)),
    "RETRIEVAL_DOCUMENT",
  );
  let added = 0;
  let updated = 0;

  for (const [index, item] of items.entries()) {
    const embedding = vectors[index];
    const distance = cosineDistance(memories.embedding, embedding);
    const [closest] = await db
      .select({ id: memories.id, distance })
      .from(memories)
      .where(
        and(
          eq(memories.userId, params.userId),
          params.agentId ? eq(memories.agentId, params.agentId) : isNull(memories.agentId),
          eq(memories.type, item.type),
          isNull(memories.archivedAt),
        ),
      )
      .orderBy(distance)
      .limit(1);

    if (closest && 1 - Number(closest.distance) >= AI_CONFIG.memory.dedupeSimilarity) {
      await db
        .update(memories)
        .set({
          content: item.content,
          detail: item.detail ?? null,
          embedding,
          sourceMeetingId: params.sourceMeetingId,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, closest.id));
      updated++;
    } else {
      await db.insert(memories).values({
        userId: params.userId,
        agentId: params.agentId,
        type: item.type,
        content: item.content,
        detail: item.detail ?? null,
        sourceMeetingId: params.sourceMeetingId,
        embedding,
      });
      added++;
    }
  }

  return { added, updated };
}

export async function extractMeetingMemories(params: {
  meetingId: string;
  meetingName: string;
  language: string;
  userId: string;
  agentId: string;
  summary: string;
  transcript: string;
}) {
  const prompt = memoryExtractionPrompt({ language: params.language, meetingName: params.meetingName });
  const result = await generateJson({
    schema: memoryExtractionSchema,
    system: prompt,
    parts: [
      { text: `<transcript>\nSUMMARY:\n${params.summary}\n\nTRANSCRIPT:\n${params.transcript}\n</transcript>` },
    ],
    maxOutputTokens: 4_000,
  });

  return saveMemories({
    userId: params.userId,
    agentId: params.agentId,
    sourceMeetingId: params.meetingId,
    items: [
      ...result.memories,
      ...result.glossary.map((entry) => ({
        type: "glossary" as const,
        content: entry.term,
        detail: entry.definition,
      })),
    ],
  });
}

// (Re)builds the searchable transcript windows of one meeting.
export async function indexMeetingTranscript(params: { meetingId: string; userId: string }) {
  const segments = await db
    .select({
      startMs: transcriptSegments.startMs,
      endMs: transcriptSegments.endMs,
      speakerName: transcriptSegments.speakerName,
      text: sql<string>`coalesce(${transcriptSegments.textCorrected}, ${transcriptSegments.text})`,
    })
    .from(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, params.meetingId))
    .orderBy(asc(transcriptSegments.position));

  const chunks = chunkTranscript(segments, AI_CONFIG.search.meetingChunkChars);
  const vectors = chunks.length > 0 ? await embedTexts(chunks.map((chunk) => chunk.content), "RETRIEVAL_DOCUMENT") : [];

  await db.delete(meetingChunks).where(eq(meetingChunks.meetingId, params.meetingId));
  if (chunks.length > 0) {
    await db.insert(meetingChunks).values(
      chunks.map((chunk, index) => ({
        meetingId: params.meetingId,
        userId: params.userId,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
        content: chunk.content,
        embedding: vectors[index],
      })),
    );
  }
  return chunks.length;
}

// Completed meetings that have a transcript but no search chunks yet.
export async function findUnindexedMeetings(userId: string, limit: number) {
  const rows = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        eq(meetings.status, "completed"),
        notExists(db.select({ id: meetingChunks.id }).from(meetingChunks).where(eq(meetingChunks.meetingId, meetings.id))),
        sql`exists (select 1 from ${transcriptSegments} where ${transcriptSegments.meetingId} = ${meetings.id})`,
      ),
    )
    .orderBy(desc(meetings.createdAt))
    .limit(limit);
  return rows.map((row) => row.id);
}
