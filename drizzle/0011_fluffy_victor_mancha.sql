CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_name" varchar(255) NOT NULL,
	"question" varchar(255) NOT NULL,
	"type" smallint DEFAULT 0 NOT NULL,
	"enum_possibilities" varchar(511),
	"points" varchar(255),
	"timestamp_added" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "point_distribution" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_point_submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "point_distribution" CASCADE;--> statement-breakpoint
DROP TABLE "user_point_submissions" CASCADE;--> statement-breakpoint
ALTER TABLE "tracked_contributions" ADD CONSTRAINT "tracked_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_contributions" ADD CONSTRAINT "tracked_contributions_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracked_contributions_user_id_idx" ON "tracked_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracked_contributions_meeting_id_idx" ON "tracked_contributions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "tracked_contributions_meeting_user_idx" ON "tracked_contributions" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_contributions_user_meeting_idx" ON "tracked_contributions" USING btree ("user_id","meeting_id");--> statement-breakpoint
CREATE INDEX "powerup_utilization_user_meeting_usage_idx" ON "powerup_utilization" USING btree ("user_id","meeting_id","usage_timestamp");