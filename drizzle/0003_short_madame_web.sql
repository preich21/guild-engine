CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image" varchar(65535) NOT NULL,
	"criteria" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"modifying_user" uuid NOT NULL,
	"point_system_enabled" boolean DEFAULT false NOT NULL,
	"point_system_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"individual_leaderboard_enabled" boolean DEFAULT false NOT NULL,
	"individual_leaderboard_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"team_leaderboard_enabled" boolean DEFAULT false NOT NULL,
	"team_leaderboard_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level_system_enabled" boolean DEFAULT false NOT NULL,
	"level_system_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badges_enabled" boolean DEFAULT false NOT NULL,
	"badges_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cooperative_progress_bar_enabled" boolean DEFAULT false NOT NULL,
	"cooperative_progress_bar_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quests_enabled" boolean DEFAULT false NOT NULL,
	"quests_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"streaks_enabled" boolean DEFAULT false NOT NULL,
	"streaks_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minigames_enabled" boolean DEFAULT false NOT NULL,
	"minigames_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"powerups_enabled" boolean DEFAULT false NOT NULL,
	"powerups_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"home_page_path" varchar(1023)
);
--> statement-breakpoint
CREATE TABLE "manual_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"points" smallint NOT NULL,
	"reason" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"language_code" varchar(3) NOT NULL,
	"content" text
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "description" varchar(1023);--> statement-breakpoint
ALTER TABLE "feature_config" ADD CONSTRAINT "feature_config_modifying_user_users_id_fk" FOREIGN KEY ("modifying_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_points" ADD CONSTRAINT "manual_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_config_timestamp_idx" ON "feature_config" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "feature_config_modifying_user_idx" ON "feature_config" USING btree ("modifying_user");--> statement-breakpoint
CREATE INDEX "manual_points_user_id_idx" ON "manual_points" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "manual_points_timestamp_idx" ON "manual_points" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "rules_language_code_timestamp_idx" ON "rules" USING btree ("language_code","timestamp");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievements_user_achievement_idx" ON "user_achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "guild_meetings_timestamp_idx" ON "guild_meetings" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "point_distribution_active_from_idx" ON "point_distribution" USING btree ("active_from");--> statement-breakpoint
CREATE INDEX "user_point_submissions_user_id_idx" ON "user_point_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_point_submissions_guild_meeting_id_idx" ON "user_point_submissions" USING btree ("guild_meeting_id");--> statement-breakpoint
CREATE INDEX "user_point_submissions_user_guild_meeting_idx" ON "user_point_submissions" USING btree ("user_id","guild_meeting_id");--> statement-breakpoint
CREATE INDEX "user_point_submissions_eval_lookup_idx" ON "user_point_submissions" USING btree ("user_id","guild_meeting_id","attendance","protocol","moderation","working_group","twl","presentations");--> statement-breakpoint
CREATE INDEX "users_team_id_idx" ON "users" USING btree ("team_id");