CREATE TYPE "public"."action_item_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."transcript_source" AS ENUM('stream', 'gemini');--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'ai_voice_seconds';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'realtime_input_tokens';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'realtime_output_tokens';--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"text" text NOT NULL,
	"owner" text,
	"due_date" text,
	"source_ms" integer,
	"status" "action_item_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"position" integer NOT NULL,
	"speaker_id" text,
	"speaker_name" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"text_corrected" text,
	"source" "transcript_source" DEFAULT 'stream' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "voice" text DEFAULT 'alloy' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "template" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "recording_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "insights" jsonb;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "transcript_key" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "recording_key" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "processing_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_items_meeting_idx" ON "action_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "ai_chat_messages_meeting_created_idx" ON "ai_chat_messages" USING btree ("meeting_id","created_at");--> statement-breakpoint
CREATE INDEX "transcript_segments_meeting_position_idx" ON "transcript_segments" USING btree ("meeting_id","position");