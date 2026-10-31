CREATE TYPE "public"."participant_role" AS ENUM('host', 'cohost', 'participant', 'guest');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('waiting', 'admitted', 'denied', 'removed');--> statement-breakpoint
CREATE TABLE "meeting_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"user_id" text,
	"guest_name" text,
	"stream_user_id" text NOT NULL,
	"role" "participant_role" DEFAULT 'participant' NOT NULL,
	"status" "participant_status" DEFAULT 'waiting' NOT NULL,
	"consent_at" timestamp,
	"joined_at" timestamp,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "ai_mode" text DEFAULT 'conversational' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "invite_code" text;--> statement-breakpoint
-- Backfill: give existing meetings an unguessable invite code before NOT NULL.
UPDATE "meetings" SET "invite_code" = substr(md5(random()::text || "id"), 1, 12) WHERE "invite_code" IS NULL;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "invite_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "join_mode" text DEFAULT 'approval' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "call_type" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_feedback" ADD CONSTRAINT "meeting_feedback_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_feedback" ADD CONSTRAINT "meeting_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_feedback_meeting_user_idx" ON "meeting_feedback" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_participants_meeting_stream_user_idx" ON "meeting_participants" USING btree ("meeting_id","stream_user_id");--> statement-breakpoint
CREATE INDEX "meeting_participants_user_idx" ON "meeting_participants" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_invite_code_unique" UNIQUE("invite_code");--> statement-breakpoint
-- Backfill: every existing meeting gets its owner as the admitted host.
INSERT INTO "meeting_participants" ("id", "meeting_id", "user_id", "stream_user_id", "role", "status", "created_at")
SELECT 'host_' || "id", "id", "user_id", "user_id", 'host', 'admitted', "created_at"
FROM "meetings"
ON CONFLICT DO NOTHING;
