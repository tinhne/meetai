CREATE TYPE "public"."usage_kind" AS ENUM('meeting_created', 'agent_created');--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE 'failed';--> statement-breakpoint
CREATE TABLE "app_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "usage_kind" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"meeting_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "language" text DEFAULT 'vi' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "agenda" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "failed_reason" text;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_events_user_kind_created_idx" ON "usage_events" USING btree ("user_id","kind","created_at");--> statement-breakpoint
-- Backfill: meetings created before this migration were transcribed in English.
UPDATE "meetings" SET "language" = 'en';--> statement-breakpoint
-- Backfill: meetings already created this month count against the new monthly quota.
INSERT INTO "usage_events" ("id", "user_id", "kind", "quantity", "meeting_id", "created_at")
SELECT 'backfill_' || "id", "user_id", 'meeting_created', 1, "id", "created_at"
FROM "meetings"
WHERE "created_at" >= date_trunc('month', now());
