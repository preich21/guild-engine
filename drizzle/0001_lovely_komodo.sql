CREATE TABLE "point_distribution" (
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL
);
