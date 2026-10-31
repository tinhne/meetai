import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const agents = pgTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instructions: text("instructions").notNull(),
  // OpenAI Realtime voice used when the agent speaks
  voice: text("voice").notNull().default("alloy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Better Auth rate limiting (rateLimit.storage = "database")
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const meetingStatus = pgEnum("meeting_status", [
  "upcoming",
  "active",
  "completed",
  "processing",
  "cancelled",
  "failed",
]);

export const meetings = pgTable(
  "meetings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    status: meetingStatus("status").notNull().default("upcoming"),
    // Spoken language of the meeting: "vi" | "en" | "auto"
    language: text("language").notNull().default("vi"),
    scheduledAt: timestamp("scheduled_at"),
    agenda: text("agenda"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    transcriptUrl: text("transcript_url"),
    recordingUrl: text("recording_url"),
    summary: text("summary"),
    // Output template for the summary: "general" | "minutes" | "standup" | ...
    template: text("template").notNull().default("general"),
    recordingEnabled: boolean("recording_enabled").notNull().default(true),
    // Structured AI output (see src/server/ai/schemas.ts)
    insights: jsonb("insights"),
    transcriptKey: text("transcript_key"),
    recordingKey: text("recording_key"),
    processingAttempts: integer("processing_attempts").notNull().default(0),
    failedReason: text("failed_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      userIdIdx: index("user_id_idx").on(table.userId),
      statusIdx: index("meetings_status_idx").on(table.status),
      nameIdx: index("meetings_name_idx").on(table.name),
    };
  },
);

export const usageKind = pgEnum("usage_kind", [
  "meeting_created",
  "agent_created",
  // Seconds of AI speech (OpenAI Realtime output audio)
  "ai_voice_seconds",
  "realtime_input_tokens",
  "realtime_output_tokens",
]);

// Append-only ledger used for quotas. Rows are never deleted when the
// related meeting/agent is deleted, so deleting does not refund quota.
export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: usageKind("kind").notNull(),
    quantity: integer("quantity").notNull().default(1),
    meetingId: text("meeting_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("usage_events_user_kind_created_idx").on(
      table.userId,
      table.kind,
      table.createdAt,
    ),
  ],
);

// Idempotency for incoming webhooks (Stream retries deliveries).
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

// Fixed-window rate limiting for app endpoints (tRPC, webhooks).
export const appRateLimits = pgTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start").notNull(),
});

export const transcriptSource = pgEnum("transcript_source", [
  "stream",
  "gemini",
]);

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    speakerId: text("speaker_id"),
    speakerName: text("speaker_name").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    // Cleaned-up text from the AI correction / re-transcription pass
    textCorrected: text("text_corrected"),
    source: transcriptSource("source").notNull().default("stream"),
  },
  (table) => [
    index("transcript_segments_meeting_position_idx").on(
      table.meetingId,
      table.position,
    ),
  ],
);

export const actionItemStatus = pgEnum("action_item_status", ["open", "done"]);

export const actionItems = pgTable(
  "action_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    owner: text("owner"),
    dueDate: text("due_date"),
    sourceMs: integer("source_ms"),
    status: actionItemStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("action_items_meeting_idx").on(table.meetingId)],
);

export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: chatRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("ai_chat_messages_meeting_created_idx").on(
      table.meetingId,
      table.createdAt,
    ),
  ],
);
