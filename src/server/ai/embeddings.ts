import "server-only";

import { ApiError } from "@google/genai";
import { RetryAfterError } from "inngest";

import { AI_CONFIG } from "@/config/ai";
import { EMBEDDING_DIMENSIONS } from "@/db/schema";
import { gemini } from "./gemini";

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

// Batched Gemini embeddings. A 429 inside Inngest becomes a delayed retry so
// the free-tier per-minute quota can recover.
export async function embedTexts(texts: string[], task: EmbedTask): Promise<number[][]> {
  const results: number[][] = [];
  const size = AI_CONFIG.gemini.embedBatchSize;

  for (let start = 0; start < texts.length; start += size) {
    const batch = texts.slice(start, start + size);
    try {
      const response = await gemini.models.embedContent({
        model: AI_CONFIG.gemini.embedModel,
        contents: batch,
        config: { taskType: task, outputDimensionality: EMBEDDING_DIMENSIONS },
      });
      const vectors = (response.embeddings ?? []).map((embedding) => embedding.values ?? []);
      if (vectors.length !== batch.length || vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error("Unexpected embedding response");
      }
      results.push(...vectors);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new RetryAfterError("Gemini embeddings are rate limited", "60s", { cause: error });
      }
      throw error;
    }
  }

  return results;
}

export async function embedQuery(text: string) {
  const [vector] = await embedTexts([text.slice(0, 2_000)], "RETRIEVAL_QUERY");
  return vector;
}
