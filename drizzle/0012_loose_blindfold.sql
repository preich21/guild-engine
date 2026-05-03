ALTER TABLE "feature_config" DROP CONSTRAINT "feature_config_modifying_user_users_id_fk";
--> statement-breakpoint
ALTER TABLE "feature_config" ALTER COLUMN "modifying_user" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "feature_config" ADD CONSTRAINT "feature_config_modifying_user_users_id_fk" FOREIGN KEY ("modifying_user") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;