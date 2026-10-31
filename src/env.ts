import "server-only";

import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  FACEBOOK_CLIENT_ID: optionalString,
  FACEBOOK_CLIENT_SECRET: optionalString,

  NEXT_PUBLIC_STREAM_VIDEO_API_KEY: z.string().min(1),
  STREAM_VIDEO_SECRET_KEY: z.string().min(1),
  // Call type for new meetings. "meetai" after running scripts/stream-setup.ts
  // (locked-down permissions for multi-person calls).
  STREAM_CALL_TYPE: z.string().min(1).default("default"),
  // Minutes to wait after the last human leaves before ending the call.
  EMPTY_ROOM_TIMEOUT_MIN: z.coerce.number().int().min(1).max(60).default(2),

  GOOGLE_AI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  // Kill switch for the realtime voice agent (OpenAI cost control).
  AI_VOICE_ENABLED: z.stringbool().default(true),
  // Long-running agent worker (worker/). When unset, the agent is connected
  // from the webhook itself, which is fine for local development only.
  AGENT_WORKER_URL: optionalString.pipe(z.url().optional()),
  WORKER_SHARED_SECRET: optionalString.pipe(z.string().min(32).optional()),

  // Cloudflare R2 (S3 compatible). Optional: without it recordings are
  // served through fresh Stream URLs.
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,

  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),

  // Transactional email (verification, password reset). Optional in dev:
  // when missing, links are printed to the server console instead.
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);

  if (result.success && result.data.AGENT_WORKER_URL && !result.data.WORKER_SHARED_SECRET) {
    throw new Error("WORKER_SHARED_SECRET is required when AGENT_WORKER_URL is set");
  }

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid or missing environment variables: ${invalidKeys}`);
  }

  return result.data;
}

export const env = loadEnv();

export const isStorageEnabled = Boolean(
  env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET,
);

export const isEmailDeliveryEnabled = Boolean(
  env.RESEND_API_KEY && env.EMAIL_FROM,
);
