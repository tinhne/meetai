import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().default(8080),
  DATABASE_URL: z.url(),
  NEXT_PUBLIC_STREAM_VIDEO_API_KEY: z.string().min(1),
  STREAM_VIDEO_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_REALTIME_MODEL: z.string().optional(),
  WORKER_SHARED_SECRET: z.string().min(32),
  AI_VOICE_ENABLED: z.stringbool().default(true),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const keys = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing environment variables: ${keys}`);
}

export const env = result.data;
