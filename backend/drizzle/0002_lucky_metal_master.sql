CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"related_pubkey_1" text NOT NULL,
	"related_pubkey_2" text,
	"action" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"acknowledged" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_streak_id_streaks_id_fk";
--> statement-breakpoint
ALTER TABLE "streak_history" DROP CONSTRAINT "streak_history_streak_id_streaks_id_fk";
--> statement-breakpoint
ALTER TABLE "streak_settings" DROP CONSTRAINT "streak_settings_streak_id_streaks_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_history" ADD CONSTRAINT "streak_history_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_settings" ADD CONSTRAINT "streak_settings_streak_id_streaks_id_fk" FOREIGN KEY ("streak_id") REFERENCES "public"."streaks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_duo_streak" ON "streaks" USING btree ("user1_pubkey","user2_pubkey") WHERE "streaks"."status" = 'active' AND "streaks"."type" = 'duo';--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_solo_streak" ON "streaks" USING btree ("user1_pubkey") WHERE "streaks"."status" = 'active' AND "streaks"."type" = 'solo';