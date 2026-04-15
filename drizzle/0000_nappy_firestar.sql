CREATE TABLE "guild_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_distribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active_from" timestamp with time zone DEFAULT now() NOT NULL,
	"attendance_virtual" smallint NOT NULL,
	"attendance_on_site" smallint NOT NULL,
	"protocol_forced" smallint NOT NULL,
	"protocol_voluntarily" smallint NOT NULL,
	"moderation" smallint NOT NULL,
	"working_group" smallint NOT NULL,
	"twl" smallint NOT NULL,
	"presentation" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_point_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"guild_meeting_id" uuid NOT NULL,
	"attendance" smallint NOT NULL,
	"protocol" smallint NOT NULL,
	"moderation" boolean NOT NULL,
	"working_group" boolean NOT NULL,
	"twl" smallint NOT NULL,
	"presentations" smallint NOT NULL,
	CONSTRAINT "user_point_submissions_attendance_range" CHECK ("user_point_submissions"."attendance" between 0 and 2),
	CONSTRAINT "user_point_submissions_protocol_range" CHECK ("user_point_submissions"."protocol" between 0 and 2),
	CONSTRAINT "user_point_submissions_twl_range" CHECK ("user_point_submissions"."twl" between 0 and 99),
	CONSTRAINT "user_point_submissions_presentations_range" CHECK ("user_point_submissions"."presentations" between 0 and 99)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_guild_meeting_id_guild_meetings_id_fk" FOREIGN KEY ("guild_meeting_id") REFERENCES "public"."guild_meetings"("id") ON DELETE no action ON UPDATE no action;