CREATE TABLE "team" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
INSERT INTO "team" ("id", "name") VALUES ('00000000-0000-0000-0000-000000000001', 'Default Team');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_picture" varchar(65535);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;