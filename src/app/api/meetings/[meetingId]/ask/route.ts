export const runtime = "nodejs";
export const maxDuration = 60;

import { ApiError, type Content } from "@google/genai";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";
import { db } from "@/db";
import { agents, aiChatMessages, transcriptSegments } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  formatTranscriptForPrompt,
  selectRelevantSegments,
} from "@/modules/meetings/lib/transcript";
import { getUserPlan } from "@/modules/premium/server/usage";
import { gemini } from "@/server/ai/gemini";
import { askAiSystemPrompt } from "@/server/ai/prompts";
import type { MeetingInsights } from "@/server/ai/schemas";
import { getMeetingForUser } from "@/server/authz";
import { consumeRateLimit } from "@/server/rate-limit";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(AI_CONFIG.askAi.maxQuestionChars),
});

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

async function startStream(contents: Content[], systemInstruction: string) {
  let lastError: unknown;
  for (const model of [AI_CONFIG.gemini.textModel, AI_CONFIG.gemini.fastModel]) {
    try {
      return await gemini.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction, temperature: 0.3, maxOutputTokens: 2048 },
      });
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ApiError && [429, 500, 503].includes(error.status);
      if (!retryable) break;
    }
  }
  throw lastError;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return jsonError(401, "Unauthorized");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid message");

  const { meetingId } = await params;
  const userId = session.user.id;

  let meeting;
  try {
    ({ meeting } = await getMeetingForUser(userId, meetingId));
  } catch (error) {
    if (error instanceof TRPCError) return jsonError(404, "Meeting not found");
    throw error;
  }

  if (meeting.status !== "completed") {
    return jsonError(409, "The meeting summary is not ready yet.");
  }

  const plan = await getUserPlan(userId);
  const limit = await consumeRateLimit(`askAi:${userId}`, {
    limit: plan.askAiPerHour,
    windowSec: 60 * 60,
  });
  if (!limit.allowed) {
    return jsonError(429, "Ask AI limit reached", {
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const question = parsed.data.message;

  const [segments, history, agentRows] = await Promise.all([
    db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meeting.id))
      .orderBy(asc(transcriptSegments.position)),
    db
      .select({ role: aiChatMessages.role, content: aiChatMessages.content })
      .from(aiChatMessages)
      .where(
        and(
          eq(aiChatMessages.meetingId, meeting.id),
          eq(aiChatMessages.userId, userId),
        ),
      )
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(AI_CONFIG.askAi.historyMessages),
    db
      .select({ instructions: agents.instructions })
      .from(agents)
      .where(eq(agents.id, meeting.agentId)),
  ]);

  const lines = segments.map((segment) => ({
    speakerName: segment.speakerName,
    startMs: segment.startMs,
    text: segment.textCorrected ?? segment.text,
  }));
  const fullTranscript = formatTranscriptForPrompt(lines);
  const transcript =
    fullTranscript.length <= AI_CONFIG.askAi.fullTranscriptChars
      ? fullTranscript
      : formatTranscriptForPrompt(selectRelevantSegments(lines, question, 400));

  const insights = meeting.insights as MeetingInsights | null;
  const summary = insights?.summaryMarkdown ?? meeting.summary ?? "";

  await db
    .insert(aiChatMessages)
    .values({ meetingId: meeting.id, userId, role: "user", content: question });

  const contents: Content[] = [
    ...history.reverse().map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    {
      role: "user",
      parts: [
        {
          text: [
            `<summary>\n${summary}\n</summary>`,
            `<transcript>\n${transcript || "(no transcript)"}\n</transcript>`,
            `Question: ${question}`,
          ].join("\n"),
        },
      ],
    },
  ];

  const systemInstruction = askAiSystemPrompt({
    meetingName: meeting.name,
    language: meeting.language,
    agentInstructions: agentRows[0]?.instructions ?? "",
  });

  let stream: Awaited<ReturnType<typeof startStream>>;
  try {
    stream = await startStream(contents, systemInstruction);
  } catch (error) {
    console.error("[ask-ai] failed to start:", error instanceof Error ? error.message : error);
    const status = error instanceof ApiError && error.status === 429 ? 429 : 502;
    return jsonError(status, "The AI is busy right now. Please try again shortly.");
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        for await (const chunk of stream) {
          const text = chunk.text ?? "";
          if (!text) continue;
          answer += text;
          controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        console.error("[ask-ai] stream failed:", error instanceof Error ? error.message : error);
      } finally {
        if (answer.trim()) {
          await db.insert(aiChatMessages).values({
            meetingId: meeting.id,
            userId,
            role: "assistant",
            content: answer,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
