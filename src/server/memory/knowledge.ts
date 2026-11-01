import "server-only";

import { lookup } from "node:dns/promises";

import { and, count, eq } from "drizzle-orm";

import { AI_CONFIG } from "@/config/ai";
import { db } from "@/db";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { embedTexts } from "@/server/ai/embeddings";
import { gemini } from "@/server/ai/gemini";
import { chunkText } from "./chunking";
import { htmlToText, isPrivateAddress } from "./html";

const MAX_URL_BYTES = 2 * 1024 * 1024;

export async function countKnowledgeDocuments(userId: string) {
  const [row] = await db
    .select({ count: count(knowledgeDocuments.id) })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.userId, userId));
  return row?.count ?? 0;
}

export async function createKnowledgeDocument(values: typeof knowledgeDocuments.$inferInsert) {
  const [document] = await db.insert(knowledgeDocuments).values(values).returning();
  await inngest.send({ name: "knowledge/document.created", data: { documentId: document.id } });
  return document;
}

// SSRF guard: only public http(s) hosts, re-checked on every redirect.
async function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) links are supported");
  if (url.username || url.password) throw new Error("Links with credentials are not allowed");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("This address is not allowed");
  }
  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("This address is not allowed");
  }
}

export async function fetchPublicPage(rawUrl: string) {
  let url = new URL(rawUrl);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "MeetAI-KnowledgeBot/1.0", accept: "text/html,text/plain;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without location");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`The page returned ${response.status}`);

    const type = response.headers.get("content-type") ?? "";
    if (!/text\/(html|plain|markdown)|application\/xhtml/.test(type)) {
      throw new Error("Only web pages and plain text are supported");
    }

    // Read at most MAX_URL_BYTES.
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_URL_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => undefined);
    const raw = new TextDecoder().decode(Buffer.concat(parts));

    if (type.includes("html")) {
      const page = htmlToText(raw);
      return { title: page.title ?? url.hostname, text: page.text };
    }
    return { title: url.pathname.split("/").pop() || url.hostname, text: raw };
  }
  throw new Error("Too many redirects");
}

async function extractPdfText(fileName: string) {
  let file = await gemini.files.get({ name: fileName });
  for (let attempt = 0; file.state === "PROCESSING" && attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    file = await gemini.files.get({ name: fileName });
  }
  if (file.state !== "ACTIVE" || !file.uri) throw new Error("The PDF could not be read");

  const response = await gemini.models.generateContent({
    model: AI_CONFIG.gemini.textModel,
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: file.uri, mimeType: "application/pdf" } },
          {
            text: "Extract all readable text of this document as Markdown, in reading order, in its original language. Keep headings, lists and table rows. Output only the document text.",
          },
        ],
      },
    ],
    config: { maxOutputTokens: 32_000, temperature: 0 },
  });
  await gemini.files.delete({ name: fileName }).catch(() => undefined);
  return response.text ?? "";
}

// Inngest step body: get the text, chunk, embed, store.
export async function processKnowledgeDocument(documentId: string) {
  const [document] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId));
  if (!document || document.status !== "processing") return { skipped: true };

  let { content, title } = document;
  if (!content && document.pendingFile) content = await extractPdfText(document.pendingFile);
  if (!content && document.sourceUrl) {
    const page = await fetchPublicPage(document.sourceUrl);
    content = page.text;
    title = document.title || page.title;
  }

  content = (content ?? "").slice(0, AI_CONFIG.knowledge.maxContentChars).trim();
  if (!content) throw new Error("No readable text found");

  const chunks = chunkText(content, AI_CONFIG.knowledge.chunkChars, AI_CONFIG.knowledge.chunkOverlapChars);
  const vectors = await embedTexts(
    chunks.map((chunk) => `${title}\n\n${chunk}`),
    "RETRIEVAL_DOCUMENT",
  );

  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
  await db.insert(knowledgeChunks).values(
    chunks.map((chunk, position) => ({
      documentId,
      userId: document.userId,
      agentId: document.agentId,
      position,
      content: chunk,
      embedding: vectors[position],
    })),
  );
  await db
    .update(knowledgeDocuments)
    .set({ status: "ready", title, content, pendingFile: null, chunkCount: chunks.length, error: null })
    .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.userId, document.userId)));

  return { chunks: chunks.length };
}

export async function failKnowledgeDocument(documentId: string, message: string) {
  await db
    .update(knowledgeDocuments)
    .set({ status: "failed", error: message.slice(0, 300) })
    .where(eq(knowledgeDocuments.id, documentId));
}
