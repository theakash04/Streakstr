CREATE TABLE "bot_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pubkey" text NOT NULL,
	"auto_streak_created" boolean DEFAULT false,
	"followed_at" timestamp DEFAULT now(),
	CONSTRAINT "bot_followers_pubkey_unique" UNIQUE("pubkey")
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streak_id" uuid NOT NULL,
	"date" date NOT NULL,
	"user1_completed" boolean DEFAULT false,
	"user2_completed" boolean DEFAULT false,
	"user1_event_id" text,
	"user2_event_id" text,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streak_id" uuid NOT NULL,
	"target_pubkey" text NOT NULL,
	"abuse_level" integer NOT NULL,
	"nostr_event_id" text,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "streak_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streak_id" uuid NOT NULL,
	"count_before_break" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"broken_at" timestamp DEFAULT now(),
	"restored_at" timestamp,
	"restored" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "streak_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"streak_id" uuid,
	"dm_reminder" boolean DEFAULT true,
	"reminder_time" time,
	"abuse_level" integer DEFAULT 2,
	"timezone" text DEFAULT 'UTC',
	"show_in_leaderboard" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "streak_settings_streak_id_unique" UNIQUE("streak_id")
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"user1_pubkey" text NOT NULL,
	"user2_pubkey" text,
	"inviter_pubkey" text,
	"invite_status" varchar(50) DEFAULT 'none',
	"invite_sent_at" timestamp,
	"invite_accepted_at" timestamp,
	"invite_declined_at" timestamp,
	"status" varchar(100) DEFAULT 'pending',
	"current_count" integer DEFAULT 0,
	"highest_count" integer DEFAULT 0,
	"last_activity_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pubkey" text NOT NULL,
	"name" text,
	"picture" text,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_pubkey_unique" UNIQUE("pubkey")
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_history" ADD CONSTRAINT "streak_history_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_settings" ADD CONSTRAINT "streak_settings_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_streak_date_idx" ON "daily_logs" USING btree ("streak_id","date");