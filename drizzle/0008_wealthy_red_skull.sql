CREATE TABLE "activated_streak_freezes" (
	"user_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activated_streak_freezes_user_id_meeting_id_pk" PRIMARY KEY("user_id","meeting_id")
);
--> statement-breakpoint
ALTER TABLE "activated_streak_freezes" ADD CONSTRAINT "activated_streak_freezes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activated_streak_freezes" ADD CONSTRAINT "activated_streak_freezes_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "activated_streak_freezes_meeting_id_idx" ON "activated_streak_freezes" USING btree ("meeting_id");