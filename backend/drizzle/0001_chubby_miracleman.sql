CREATE TABLE "streak_break_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streak_id" uuid NOT NULL,
	"pubkey" text NOT NULL,
	"abuse_level" integer NOT NULL,
	"event_id" text NOT NULL,
	"posted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "streak_break_posts" ADD CONSTRAINT "streak_break_posts_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;