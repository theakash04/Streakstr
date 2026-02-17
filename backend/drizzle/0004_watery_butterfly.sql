ALTER TABLE "streak_settings" RENAME COLUMN "timezone" TO "reminder_offset_hours";--> statement-breakpoint
ALTER TABLE "bot_followers" ALTER COLUMN "followed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bot_followers" ALTER COLUMN "followed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "completed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "streak_break_posts" ALTER COLUMN "posted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streak_break_posts" ALTER COLUMN "posted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "streak_history" ALTER COLUMN "started_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streak_history" ALTER COLUMN "broken_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streak_history" ALTER COLUMN "broken_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "streak_history" ALTER COLUMN "restored_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streak_settings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streak_settings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "invite_sent_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "invite_accepted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "invite_declined_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "last_activity_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "started_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "ended_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streaks" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bot_followers" ADD COLUMN "do_not_keep_streak" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "streaks" ADD COLUMN "deadline" timestamp with time zone;