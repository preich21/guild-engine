ALTER TABLE "activated_streak_freezes" DROP CONSTRAINT "activated_streak_freezes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "activated_streak_freezes" DROP CONSTRAINT "activated_streak_freezes_meeting_id_guild_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "feature_config" DROP CONSTRAINT "feature_config_modifying_user_users_id_fk";
--> statement-breakpoint
ALTER TABLE "manual_points" DROP CONSTRAINT "manual_points_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "powerup_utilization" DROP CONSTRAINT "powerup_utilization_meeting_id_guild_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "powerup_utilization" DROP CONSTRAINT "powerup_utilization_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT "user_point_submissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "feature_config" ALTER COLUMN "modifying_user" SET DEFAULT 'N/A';--> statement-breakpoint
ALTER TABLE "feature_config" ALTER COLUMN "modifying_user" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activated_streak_freezes" ADD CONSTRAINT "activated_streak_freezes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activated_streak_freezes" ADD CONSTRAINT "activated_streak_freezes_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_config" ADD CONSTRAINT "feature_config_modifying_user_users_id_fk" FOREIGN KEY ("modifying_user") REFERENCES "public"."users"("id") ON DELETE set default ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_points" ADD CONSTRAINT "manual_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powerup_utilization" ADD CONSTRAINT "powerup_utilization_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powerup_utilization" ADD CONSTRAINT "powerup_utilization_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;