ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_id_achievements_id_fk";
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;