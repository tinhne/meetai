ALTER TABLE "agents" ADD COLUMN "practice_scenario" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "practice_kind" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "scorecard" jsonb;