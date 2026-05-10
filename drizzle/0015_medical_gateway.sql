CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modified_by" uuid,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" varchar(255) NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone DEFAULT now() + interval '4 weeks',
	"points" smallint DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "quizzes_points_non_negative" CHECK ("quizzes"."points" >= 0),
	CONSTRAINT "quizzes_valid_range" CHECK ("quizzes"."valid_to" is null or "quizzes"."valid_to" > "quizzes"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quizzes_valid_from_idx" ON "quizzes" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "quizzes_valid_to_idx" ON "quizzes" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX "quizzes_modified_by_idx" ON "quizzes" USING btree ("modified_by");