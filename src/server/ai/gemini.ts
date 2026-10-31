import "server-only";

import {
  ApiError,
  GoogleGenAI,
  type MediaResolution,
  type Part,
  type ThinkingLevel,
} from "@google/genai";
import { RetryAfterError } from "inngest";
import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";
import { env } from "@/env";

export const gemini = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });

const GEMINI_API = "https://generativelanguage.googleapis.com";

function isRetryable(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 429 || error.status === 500 || error.status === 503)
  );
}

// Gemini rejects the "$schema" meta keyword.
function jsonSchemaFor(schema: z.ZodType) {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

// Structured generation with a fallback to the lighter model when the main
// one is rate limited or overloaded (free tier). When both fail, Inngest is
// told to retry the step later instead of burning attempts immediately.
export async function generateJson<T extends z.ZodType>(params: {
  schema: T;
  system: string;
  parts: Part[];
  maxOutputTokens?: number;
  mediaResolution?: MediaResolution;
  // Lower thinking = much faster transcription. Dropped automatically when
  // the model behind the alias does not support it.
  thinkingLevel?: ThinkingLevel;
  models?: string[];
}): Promise<z.infer<T>> {
  const models = params.models ?? [
    AI_CONFIG.gemini.textModel,
    AI_CONFIG.gemini.fastModel,
  ];
  let lastError: unknown;

  const request = (model: string, withThinking: boolean) =>
    gemini.models.generateContent({
      model,
      contents: [{ role: "user", parts: params.parts }],
      config: {
        systemInstruction: params.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(params.schema),
        maxOutputTokens: params.maxOutputTokens,
        mediaResolution: params.mediaResolution,
        temperature: 0.2,
        ...(withThinking && params.thinkingLevel
          ? { thinkingConfig: { thinkingLevel: params.thinkingLevel } }
          : {}),
      },
    });

  for (const model of models) {
    try {
      let response;
      try {
        response = await request(model, true);
      } catch (error) {
        const unsupportedThinking =
          error instanceof ApiError &&
          error.status === 400 &&
          /thinking/i.test(error.message);
        if (!unsupportedThinking) throw error;
        response = await request(model, false);
      }

      return params.schema.parse(JSON.parse(response.text ?? ""));
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }

  if (isRetryable(lastError)) {
    throw new RetryAfterError("Gemini is rate limited", "60s", {
      cause: lastError,
    });
  }

  throw lastError;
}

// Streams a remote file (e.g. a Stream recording) into the Gemini Files API
// without buffering it in memory.
export async function uploadFileFromUrl(params: {
  sourceUrl: string;
  mimeType: string;
  displayName: string;
}) {
  const source = await fetch(params.sourceUrl);
  const size = source.headers.get("content-length");

  if (!source.ok || !source.body || !size) {
    throw new Error(`Could not download source file (${source.status})`);
  }

  const start = await fetch(`${GEMINI_API}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": env.GOOGLE_AI_API_KEY,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": size,
      "X-Goog-Upload-Header-Content-Type": params.mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: params.displayName } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");

  if (!start.ok || !uploadUrl) {
    throw new Error(`Could not start Gemini upload (${start.status})`);
  }

  const uploaded = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": size,
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: source.body,
    // Required by Node's fetch for streaming request bodies.
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  if (!uploaded.ok) {
    throw new Error(`Gemini upload failed (${uploaded.status})`);
  }

  const { file } = (await uploaded.json()) as {
    file: { name: string; uri: string; mimeType: string; state: string };
  };

  return file;
}
