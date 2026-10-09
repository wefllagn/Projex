-- Activity workspaces are linked through their Programming Activity, not directly through class_id.
ALTER TABLE "repositories" ADD COLUMN "activity_id" UUID;
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repositories" DROP CONSTRAINT "repositories_type_visibility_check";
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_type_visibility_check" CHECK (
  ("repository_type" = 'CLASS_PROJECT' AND "project_task_id" IS NOT NULL AND "team_id" IS NOT NULL AND "class_id" IS NULL AND "activity_id" IS NULL AND "visibility" = 'CLASS_ONLY')
  OR ("repository_type" = 'PERSONAL' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "class_id" IS NULL AND "activity_id" IS NULL AND "visibility" = 'PRIVATE')
  OR ("repository_type" = 'CLASS_WORKSPACE' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "class_id" IS NOT NULL AND "activity_id" IS NULL AND "visibility" = 'PRIVATE')
  OR ("repository_type" = 'ACTIVITY_WORKSPACE' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "class_id" IS NULL AND "activity_id" IS NOT NULL AND "visibility" = 'PRIVATE')
);

-- PostgreSQL permits multiple NULL pairs, so legacy and non-Activity repositories remain unaffected.
CREATE UNIQUE INDEX "repositories_activity_id_owner_id_key" ON "repositories"("activity_id", "owner_id");
