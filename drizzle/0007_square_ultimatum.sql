CREATE TABLE "powerup_utilization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"powerup" varchar(255) NOT NULL,
	"usage_timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "powerup_utilization" ADD CONSTRAINT "powerup_utilization_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powerup_utilization" ADD CONSTRAINT "powerup_utilization_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "powerup_utilization_meeting_id_idx" ON "powerup_utilization" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "powerup_utilization_user_id_idx" ON "powerup_utilization" USING btree ("user_id");