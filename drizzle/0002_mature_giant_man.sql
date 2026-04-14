DO $$
BEGIN
  IF to_regclass('public.get_points_submissions') IS NOT NULL
	AND to_regclass('public.user_point_submissions') IS NULL THEN
	EXECUTE 'ALTER TABLE "get_points_submissions" RENAME TO "user_point_submissions"';
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
	SELECT 1
	FROM information_schema.columns
	WHERE table_schema = 'public'
	  AND table_name = 'user_point_submissions'
	  AND column_name = 'user'
  ) THEN
	EXECUTE 'ALTER TABLE "user_point_submissions" RENAME COLUMN "user" TO "user_id"';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "get_points_submissions_user_length";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "get_points_submissions_attendance_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "get_points_submissions_protocol_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "get_points_submissions_twl_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "get_points_submissions_presentations_range";--> statement-breakpoint

ALTER TABLE "user_point_submissions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "point_distribution" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
	SELECT 1
	FROM information_schema.table_constraints
	WHERE table_schema = 'public'
	  AND table_name = 'user_point_submissions'
	  AND constraint_type = 'PRIMARY KEY'
  ) THEN
	EXECUTE 'ALTER TABLE "user_point_submissions" ADD PRIMARY KEY ("id")';
  END IF;

  IF NOT EXISTS (
	SELECT 1
	FROM information_schema.table_constraints
	WHERE table_schema = 'public'
	  AND table_name = 'point_distribution'
	  AND constraint_type = 'PRIMARY KEY'
  ) THEN
	EXECUTE 'ALTER TABLE "point_distribution" ADD PRIMARY KEY ("id")';
  END IF;
END $$;--> statement-breakpoint

DO $$
DECLARE
  unresolved_count integer;
BEGIN
  IF EXISTS (
	SELECT 1
	FROM information_schema.columns
	WHERE table_schema = 'public'
	  AND table_name = 'user_point_submissions'
	  AND column_name = 'user_id'
	  AND data_type <> 'uuid'
  ) THEN
	ALTER TABLE "user_point_submissions" ADD COLUMN IF NOT EXISTS "user_id_uuid" uuid;

	UPDATE "user_point_submissions"
	SET "user_id_uuid" = "users"."id"
	FROM "users"
	WHERE "user_point_submissions"."user_id" = "users"."username";

	SELECT COUNT(*) INTO unresolved_count
	FROM "user_point_submissions"
	WHERE "user_id_uuid" IS NULL;

	IF unresolved_count > 0 THEN
	  RAISE EXCEPTION 'Cannot convert % rows in user_point_submissions.user_id to UUID (missing users.username mapping)', unresolved_count;
	END IF;

	ALTER TABLE "user_point_submissions" ALTER COLUMN "user_id_uuid" SET NOT NULL;
	ALTER TABLE "user_point_submissions" DROP COLUMN "user_id";
	ALTER TABLE "user_point_submissions" RENAME COLUMN "user_id_uuid" TO "user_id";
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "user_point_submissions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_point_submissions"
  ADD CONSTRAINT "user_point_submissions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "user_point_submissions_attendance_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "user_point_submissions_protocol_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "user_point_submissions_twl_range";--> statement-breakpoint
ALTER TABLE "user_point_submissions" DROP CONSTRAINT IF EXISTS "user_point_submissions_presentations_range";--> statement-breakpoint

ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_attendance_range" CHECK ("user_point_submissions"."attendance" between 0 and 2);--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_protocol_range" CHECK ("user_point_submissions"."protocol" between 0 and 2);--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_twl_range" CHECK ("user_point_submissions"."twl" between 0 and 99);--> statement-breakpoint
ALTER TABLE "user_point_submissions" ADD CONSTRAINT "user_point_submissions_presentations_range" CHECK ("user_point_submissions"."presentations" between 0 and 99);