export const runtime = "nodejs";
export const maxDuration = 60;

import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";
import { auth } from "@/lib/auth";
import { buildAgentInstructions } from "@/modules/agents/lib/realtime";
import { gemini } from "@/server/ai/gemini";
import { getOwnedAgent } from "@/server/authz";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";

const bodySchema = z.object({
  language: z.enum(["vi", "en"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

// Text preview of an agent's persona (Gemini), so owners can tune the
// instructions without spending OpenAI voice minutes.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { agentId } = await params;
  let agent;
  try {
    agent = await getOwnedAgent(session.user.id, agentId);
  } catch (error) {
    if (error instanceof TRPCError) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    throw error;
  }

  const limit = await consumeRateLimit(
    `agentTestChat:${session.user.id}`,
    RATE_LIMITS.agentTestChat,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limited", retryAfterSec: limit.retryAfterSec },
      { status: 429 },
    );
  }

  const systemInstruction = buildAgentInstructions({
    mode: "conversational",
    agentName: agent.name,
    agentInstructions: agent.instructions,
    voice: agent.voice,
    meetingName: "Test chat",
    agenda: null,
    language: parsed.data.language,
  });

  try {
    const stream = await gemini.models.generateContentStream({
      model: AI_CONFIG.gemini.fastModel,
      contents: parsed.data.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: { systemInstruction, temperature: 0.7, maxOutputTokens: 1024 },
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[agent-test-chat]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The AI is busy right now." }, { status: 502 });
  }
}
