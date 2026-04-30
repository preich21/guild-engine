CREATE TABLE "user_levels" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_level" integer DEFAULT 0 NOT NULL,
	"last_level_up" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;