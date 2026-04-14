CREATE TABLE "get_points_submissions" (
	"user" varchar(255) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"attendance" smallint NOT NULL,
	"protocol" smallint NOT NULL,
	"moderation" boolean NOT NULL,
	"working_group" boolean NOT NULL,
	"twl" smallint NOT NULL,
	"presentations" smallint NOT NULL,
	CONSTRAINT "get_points_submissions_user_length" CHECK (char_length("get_points_submissions"."user") <= 255),
	CONSTRAINT "get_points_submissions_attendance_range" CHECK ("get_points_submissions"."attendance" between 0 and 2),
	CONSTRAINT "get_points_submissions_protocol_range" CHECK ("get_points_submissions"."protocol" between 0 and 2),
	CONSTRAINT "get_points_submissions_twl_range" CHECK ("get_points_submissions"."twl" between 0 and 99),
	CONSTRAINT "get_points_submissions_presentations_range" CHECK ("get_points_submissions"."presentations" between 0 and 99)
);
