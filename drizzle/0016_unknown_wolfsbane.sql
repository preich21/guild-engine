CREATE TABLE "quiz_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_submissions_user_id_idx" ON "quiz_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_submissions_quiz_id_idx" ON "quiz_submissions" USING btree ("quiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_submissions_user_quiz_idx" ON "quiz_submissions" USING btree ("user_id","quiz_id");