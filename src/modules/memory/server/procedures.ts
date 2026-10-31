import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";
import { db } from "@/db";
import { agents, knowledgeDocuments, meetings, memories } from "@/db/schema";
import { embedQuery, embedTexts } from "@/server/ai/embeddings";
import { generateText } from "@/server/ai/gemini";
import { crossMeetingAskPrompt } from "@/server/ai/prompts";
import { getOwnedAgent } from "@/server/authz";
import { getUserPlan } from "@/server/billing/plan";
import { assertQuota } from "@/server/billing/quota";
import { createKnowledgeDocument } from "@/server/memory/knowledge";
import { formatBackground, searchKnowledge, searchMeetingChunks, searchMemories } from "@/server/memory/search";
import { consumeRateLimit, enforceRateLimit } from "@/server/rate-limit";
import { inngest } from "@/inngest/client";
import { formatTimestamp } from "@/lib/utils";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const MEMORY_TYPES = ["decision", "fact", "preference", "todo", "glossary"] as const;

async function getOwnedMemory(userId: string, id: string) {
  const [memory] = await db
    .select()
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));
  if (!memory) throw new TRPCError({ code: "NOT_FOUND", message: "Memory not found" });
  return memory;
}

export const memoryRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().max(64).nullish(),
        type: z.enum(MEMORY_TYPES).nullish(),
        search: z.string().max(200).nullish(),
        archived: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const filters: (SQL | undefined)[] = [
        eq(memories.userId, ctx.auth.user.id),
        input.archived ? undefined : isNull(memories.archivedAt),
        input.agentId ? or(eq(memories.agentId, input.agentId), isNull(memories.agentId)) : undefined,
        input.type ? eq(memories.type, input.type) : undefined,
        input.search ? ilike(memories.content, `%${input.search.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
      ];
      return db
        .select({
          id: memories.id,
          type: memories.type,
          content: memories.content,
          detail: memories.detail,
          agentId: memories.agentId,
          agentName: agents.name,
          sourceMeetingId: memories.sourceMeetingId,
          sourceMeetingName: meetings.name,
          updatedAt: memories.updatedAt,
          archivedAt: memories.archivedAt,
        })
        .from(memories)
        .leftJoin(agents, eq(memories.agentId, agents.id))
        .leftJoin(meetings, eq(memories.sourceMeetingId, meetings.id))
        .where(and(...filters))
        .orderBy(desc(memories.updatedAt))
        .limit(300);
    }),

  create: protectedProcedure
    .input(
      z.object({
        agentId: z.string().max(64).nullable(),
        type: z.enum(MEMORY_TYPES),
        content: z.string().trim().min(2).max(400),
        detail: z.string().trim().max(400).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("memoryEdit", ctx.auth.user.id);
      if (input.agentId) await getOwnedAgent(ctx.auth.user.id, input.agentId);
      const [embedding] = await embedTexts(
        [input.detail ? `${input.content}: ${input.detail}` : input.content],
        "RETRIEVAL_DOCUMENT",
      );
      const [memory] = await db
        .insert(memories)
        .values({
          userId: ctx.auth.user.id,
          agentId: input.agentId,
          type: input.type,
          content: input.content,
          detail: input.detail ?? null,
          embedding,
        })
        .returning({ id: memories.id });
      return memory;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().max(64),
        content: z.string().trim().min(2).max(400),
        detail: z.string().trim().max(400).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("memoryEdit", ctx.auth.user.id);
      await getOwnedMemory(ctx.auth.user.id, input.id);
      const [embedding] = await embedTexts(
        [input.detail ? `${input.content}: ${input.detail}` : input.content],
        "RETRIEVAL_DOCUMENT",
      );
      await db
        .update(memories)
        .set({ content: input.content, detail: input.detail ?? null, embedding, updatedAt: new Date() })
        .where(and(eq(memories.id, input.id), eq(memories.userId, ctx.auth.user.id)));
      return { id: input.id };
    }),

  // Archived memories are never used in prompts but can be restored.
  setArchived: protectedProcedure
    .input(z.object({ id: z.string().max(64), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedMemory(ctx.auth.user.id, input.id);
      await db
        .update(memories)
        .set({ archivedAt: input.archived ? new Date() : null })
        .where(and(eq(memories.id, input.id), eq(memories.userId, ctx.auth.user.id)));
      return { id: input.id };
    }),

  remove: protectedProcedure.input(z.object({ id: z.string().max(64) })).mutation(async ({ ctx, input }) => {
    await getOwnedMemory(ctx.auth.user.id, input.id);
    await db.delete(memories).where(and(eq(memories.id, input.id), eq(memories.userId, ctx.auth.user.id)));
    return { id: input.id };
  }),

  setAgentMemory: protectedProcedure
    .input(z.object({ agentId: z.string().max(64), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedAgent(ctx.auth.user.id, input.agentId);
      await db
        .update(agents)
        .set({ memoryEnabled: input.enabled, updatedAt: new Date() })
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.auth.user.id)));
      return { enabled: input.enabled };
    }),
});

export const knowledgeRouter = createTRPCRouter({
  list: protectedProcedure.input(z.object({ agentId: z.string().max(64) })).query(async ({ ctx, input }) => {
    await getOwnedAgent(ctx.auth.user.id, input.agentId);
    return db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        sourceType: knowledgeDocuments.sourceType,
        sourceUrl: knowledgeDocuments.sourceUrl,
        sizeBytes: knowledgeDocuments.sizeBytes,
        status: knowledgeDocuments.status,
        error: knowledgeDocuments.error,
        chunkCount: knowledgeDocuments.chunkCount,
        createdAt: knowledgeDocuments.createdAt,
      })
      .from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.userId, ctx.auth.user.id), eq(knowledgeDocuments.agentId, input.agentId)))
      .orderBy(desc(knowledgeDocuments.createdAt));
  }),

  addText: protectedProcedure
    .input(
      z.object({
        agentId: z.string().max(64),
        title: z.string().trim().min(1).max(120),
        text: z.string().trim().min(20).max(AI_CONFIG.knowledge.maxContentChars),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("knowledgeAdd", userId);
      await getOwnedAgent(userId, input.agentId);
      await assertQuota(userId, ["knowledgeDocuments"]);
      const document = await createKnowledgeDocument({
        userId,
        agentId: input.agentId,
        title: input.title,
        sourceType: "text",
        mimeType: "text/plain",
        sizeBytes: new TextEncoder().encode(input.text).byteLength,
        content: input.text,
      });
      return { id: document.id };
    }),

  addUrl: protectedProcedure
    .input(z.object({ agentId: z.string().max(64), url: z.url({ protocol: /^https?$/ }).max(2_000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await enforceRateLimit("knowledgeAdd", userId);
      await getOwnedAgent(userId, input.agentId);
      await assertQuota(userId, ["knowledgeDocuments"]);
      const document = await createKnowledgeDocument({
        userId,
        agentId: input.agentId,
        title: new URL(input.url).hostname,
        sourceType: "url",
        sourceUrl: input.url,
      });
      return { id: document.id };
    }),

  remove: protectedProcedure.input(z.object({ id: z.string().max(64) })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, input.id), eq(knowledgeDocuments.userId, ctx.auth.user.id)))
      .returning({ id: knowledgeDocuments.id });
    if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    return deleted;
  }),
});

export const searchRouter = createTRPCRouter({
  // Called when the search page opens: queues indexing of older meetings.
  // Inngest throttles it to once an hour per user.
  ensureIndexed: protectedProcedure.mutation(async ({ ctx }) => {
    await inngest.send({ name: "memory/backfill.requested", data: { userId: ctx.auth.user.id } });
    return { queued: true };
  }),

  // Semantic search over the user's meetings and memories.
  query: protectedProcedure.input(z.object({ q: z.string().trim().min(2).max(300) })).query(async ({ ctx, input }) => {
    const userId = ctx.auth.user.id;
    await enforceRateLimit("search", userId);
    const vector = await embedQuery(input.q);
    const [moments, remembered] = await Promise.all([
      searchMeetingChunks({ userId, vector, limit: 12 }),
      searchMemories({ userId, agentId: null, vector, limit: 5 }),
    ]);
    return {
      moments: moments.map((moment) => ({
        meetingId: moment.meetingId,
        meetingName: moment.meetingName,
        startedAt: moment.meetingStartedAt?.toISOString() ?? null,
        startMs: moment.startMs,
        content: moment.content,
        similarity: moment.similarity,
      })),
      memories: remembered,
    };
  }),

  // "Ask across meetings": one answer citing [M<n> mm:ss].
  ask: protectedProcedure
    .input(z.object({ question: z.string().trim().min(3).max(1_000), language: z.enum(["vi", "en"]).default("vi") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const plan = await getUserPlan(userId);
      const limit = await consumeRateLimit(`askAi:${userId}`, { limit: plan.askAiPerHour, windowSec: 60 * 60 });
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Ask AI limit reached" });

      const vector = await embedQuery(input.question);
      const [moments, remembered, documents] = await Promise.all([
        searchMeetingChunks({ userId, vector, limit: AI_CONFIG.search.topK }),
        searchMemories({ userId, agentId: null, vector, limit: 4 }),
        searchKnowledge({ userId, agentId: null, vector, limit: 3 }),
      ]);

      const meetingIds = [...new Set(moments.map((moment) => moment.meetingId))];
      const sources = meetingIds.map((meetingId, index) => ({
        tag: `M${index + 1}`,
        meetingId,
        meetingName: moments.find((moment) => moment.meetingId === meetingId)?.meetingName ?? "",
      }));
      const excerpts = moments
        .map((moment) => {
          const tag = sources.find((source) => source.meetingId === moment.meetingId)?.tag;
          return `[${tag} ${formatTimestamp(moment.startMs)}] (${moment.meetingName})\n${moment.content}`;
        })
        .join("\n\n");

      if (!excerpts && remembered.length === 0 && documents.length === 0) {
        return { answer: null, sources: [] };
      }

      const answer = await generateText({
        system: crossMeetingAskPrompt({ language: input.language }),
        prompt: [
          `<transcript>\n${excerpts || "(no meeting excerpts)"}\n</transcript>`,
          formatBackground(remembered, documents),
          `Question: ${input.question}`,
        ].join("\n"),
      });
      return { answer, sources };
    }),
});
