import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { AI_CONFIG } from "@/config/ai";
import { auth } from "@/lib/auth";
import { gemini } from "@/server/ai/gemini";
import { getOwnedAgent } from "@/server/authz";
import { assertQuota } from "@/server/billing/quota";
import { QuotaExceededError } from "@/server/billing/quota-rules";
import { createKnowledgeDocument } from "@/server/memory/knowledge";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";

const jsonError = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

// Knowledge files: PDF (text extracted by Gemini) or UTF-8 .txt/.md. The
// original file is never stored; only its text is kept.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return jsonError(401, "Unauthorized");
  const userId = session.user.id;

  const limit = await consumeRateLimit(`knowledgeAdd:${userId}`, RATE_LIMITS.knowledgeAdd);
  if (!limit.allowed) return jsonError(429, "Too many uploads, please try again later.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const agentId = form?.get("agentId");
  if (!(file instanceof File) || typeof agentId !== "string" || agentId.length > 64) {
    return jsonError(400, "Invalid upload");
  }
  if (file.size === 0 || file.size > AI_CONFIG.knowledge.maxFileBytes) {
    return jsonError(413, "File is empty or larger than 4 MB");
  }

  try {
    await getOwnedAgent(userId, agentId);
    await assertQuota(userId, ["knowledgeDocuments"]);
  } catch (error) {
    if (error instanceof TRPCError && error.cause instanceof QuotaExceededError) {
      return jsonError(403, "Quota exceeded", { quota: error.cause.info });
    }
    if (error instanceof TRPCError) return jsonError(404, "Agent not found");
    throw error;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const title = file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Document";
  // Trust the content, not the declared MIME type.
  const isPdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const isText = /\.(txt|md|markdown)$/i.test(file.name);

  if (isPdf) {
    const uploaded = await gemini.files.upload({
      file: new Blob([bytes], { type: "application/pdf" }),
      config: { mimeType: "application/pdf", displayName: title },
    });
    if (!uploaded.name) return jsonError(502, "Could not read the PDF, please try again.");
    const document = await createKnowledgeDocument({
      userId,
      agentId,
      title,
      sourceType: "file",
      mimeType: "application/pdf",
      sizeBytes: file.size,
      pendingFile: uploaded.name,
    });
    return NextResponse.json({ id: document.id });
  }

  if (isText) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return jsonError(415, "The text file must be UTF-8");
    }
    const document = await createKnowledgeDocument({
      userId,
      agentId,
      title,
      sourceType: "file",
      mimeType: "text/plain",
      sizeBytes: file.size,
      content: text.slice(0, AI_CONFIG.knowledge.maxContentChars),
    });
    return NextResponse.json({ id: document.id });
  }

  return jsonError(415, "Only PDF, TXT and Markdown files are supported");
}
