CREATE TABLE "user_powerups" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"lootboxes" smallint DEFAULT 0 NOT NULL,
	"small_point_multiplicators" smallint DEFAULT 0 NOT NULL,
	"medium_point_multiplicators" smallint DEFAULT 0 NOT NULL,
	"large_point_multiplicators" smallint DEFAULT 0 NOT NULL,
	"streak_freezes" smallint DEFAULT 0 NOT NULL,
	"role_presents" smallint DEFAULT 0 NOT NULL,
	"role_shields" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_powerups" ADD CONSTRAINT "user_powerups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;