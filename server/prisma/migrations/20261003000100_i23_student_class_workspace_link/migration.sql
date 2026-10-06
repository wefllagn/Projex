-- Legacy repositories retain their existing type, project/team links, and null class_id.
ALTER TABLE "repositories" ADD COLUMN "class_id" UUID;
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repositories" DROP CONSTRAINT "repositories_type_visibility_check";
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_type_visibility_check" CHECK (
  ("repository_type" = 'CLASS_PROJECT' AND "project_task_id" IS NOT NULL AND "team_id" IS NOT NULL AND "class_id" IS NULL AND "visibility" = 'CLASS_ONLY')
  OR ("repository_type" = 'PERSONAL' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "class_id" IS NULL AND "visibility" = 'PRIVATE')
  OR ("repository_type" = 'CLASS_WORKSPACE' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "class_id" IS NOT NULL AND "visibility" = 'PRIVATE')
);

-- Historical PERSONAL/CLASS_PROJECT rows have null class_id and remain unaffected.
CREATE UNIQUE INDEX "repositories_class_id_owner_id_key" ON "repositories"("class_id", "owner_id");
