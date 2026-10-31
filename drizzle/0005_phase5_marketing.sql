CREATE TYPE "public"."lead_kind" AS ENUM('team_waitlist', 'contact');--> statement-breakpoint
CREATE TABLE "marketing_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "lead_kind" NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"message" text,
	"locale" text DEFAULT 'vi' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "marketing_leads_kind_created_idx" ON "marketing_leads" USING btree ("kind","created_at");