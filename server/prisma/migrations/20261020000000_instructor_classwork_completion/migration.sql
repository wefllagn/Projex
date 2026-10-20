-- Prepared for review only. Apply solely to an explicitly approved target.
BEGIN;
-- CreateEnum
CREATE TYPE "class_program" AS ENUM ('INFORMATION_TECHNOLOGY', 'COMPUTER_SCIENCE');

-- CreateEnum
CREATE TYPE "activity_grading_mode" AS ENUM ('GRADED', 'COMPLETION');

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "program" "class_program",
ADD COLUMN     "topic_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "programming_activities" ADD COLUMN     "grading_mode" "activity_grading_mode" NOT NULL DEFAULT 'GRADED',
ADD COLUMN     "topic_id" UUID,
ALTER COLUMN "total_points" DROP NOT NULL;

-- AlterTable
ALTER TABLE "test_cases" ALTER COLUMN "points" DROP NOT NULL;

-- AlterTable
ALTER TABLE "activity_submissions" ADD COLUMN     "grading_mode_snapshot" "activity_grading_mode" NOT NULL DEFAULT 'GRADED',
ALTER COLUMN "total_points_snapshot" DROP NOT NULL,
ALTER COLUMN "automated_maximum" DROP NOT NULL,
ALTER COLUMN "instructor_maximum" DROP NOT NULL,
ALTER COLUMN "instructor_points" DROP NOT NULL;

-- AlterTable
ALTER TABLE "test_case_results" ALTER COLUMN "maximum_points" DROP NOT NULL,
ALTER COLUMN "automated_points" DROP NOT NULL;

-- CreateTable
CREATE TABLE "class_topics" (
    "topic_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "class_topics_pkey" PRIMARY KEY ("topic_id")
);

-- CreateIndex
CREATE INDEX "class_topics_class_id_position_topic_id_idx" ON "class_topics"("class_id", "position", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_topics_topic_id_class_id_key" ON "class_topics"("topic_id", "class_id");

-- CreateIndex
CREATE INDEX "programming_activities_class_id_topic_id_created_at_activit_idx" ON "programming_activities"("class_id", "topic_id", "created_at", "activity_id");

-- AddForeignKey
ALTER TABLE "class_topics" ADD CONSTRAINT "class_topics_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programming_activities" ADD CONSTRAINT "programming_activities_topic_id_class_id_fkey" FOREIGN KEY ("topic_id", "class_id") REFERENCES "class_topics"("topic_id", "class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep all historical records GRADED; never invent a Program or Topic.
ALTER TABLE "programming_activities" DROP CONSTRAINT "programming_activities_total_points_check";
ALTER TABLE "programming_activities" ADD CONSTRAINT "programming_activities_total_points_check" CHECK (
  (grading_mode = 'COMPLETION' AND total_points IS NULL) OR
  (grading_mode = 'GRADED' AND total_points IS NOT NULL AND total_points > 0 AND total_points <= 1000)
);
ALTER TABLE "classes" ADD CONSTRAINT "classes_topic_version_check" CHECK (topic_version >= 0);
ALTER TABLE "class_topics" ADD CONSTRAINT "class_topics_values_check" CHECK (position >= 0 AND length(btrim(name)) BETWEEN 1 AND 200);
-- Defer uniqueness so swapping adjacent positions is atomic and safe.
ALTER TABLE class_topics ADD CONSTRAINT class_topics_class_position_key UNIQUE (class_id, position) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "activity_submissions" DROP CONSTRAINT "activity_submissions_score_component_bounds_check";
ALTER TABLE "activity_submissions" ADD CONSTRAINT "activity_submissions_score_component_bounds_check" CHECK (
  (grading_mode_snapshot = 'COMPLETION' AND total_points_snapshot IS NULL AND automated_maximum IS NULL
   AND instructor_maximum IS NULL AND instructor_points IS NULL AND original_automated_score IS NULL AND released_final_score IS NULL)
  OR (grading_mode_snapshot = 'GRADED' AND total_points_snapshot IS NOT NULL AND automated_maximum IS NOT NULL
   AND instructor_maximum IS NOT NULL AND instructor_points IS NOT NULL AND total_points_snapshot > 0
   AND automated_maximum >= 0 AND instructor_maximum >= 0 AND automated_maximum + instructor_maximum = total_points_snapshot
   AND (original_automated_score IS NULL OR original_automated_score BETWEEN 0 AND automated_maximum)
   AND instructor_points BETWEEN 0 AND instructor_maximum
   AND (released_final_score IS NULL OR released_final_score BETWEEN 0 AND total_points_snapshot))
);
ALTER TABLE "activity_submissions" DROP CONSTRAINT "activity_submissions_release_state_check";
ALTER TABLE "activity_submissions" ADD CONSTRAINT "activity_submissions_release_state_check" CHECK (
  (submission_status = 'RELEASED' AND released_at IS NOT NULL AND (grading_mode_snapshot = 'COMPLETION' OR released_final_score IS NOT NULL)) OR
  (submission_status <> 'RELEASED' AND released_at IS NULL AND released_final_score IS NULL)
);
-- Cross-table constraints are deferred to permit an atomic draft mode change.
CREATE FUNCTION check_activity_case_grading() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  target := NEW.activity_id;
  IF EXISTS (SELECT 1 FROM test_cases t JOIN programming_activities a ON a.activity_id = t.activity_id
    WHERE a.activity_id = target AND ((a.grading_mode = 'GRADED' AND t.points IS NULL) OR (a.grading_mode = 'COMPLETION' AND t.points IS NOT NULL)))
  THEN RAISE EXCEPTION 'Test case grading configuration mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER test_cases_grading_check AFTER INSERT OR UPDATE ON test_cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_activity_case_grading();
CREATE CONSTRAINT TRIGGER activities_case_grading_check AFTER UPDATE ON programming_activities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_activity_case_grading();
CREATE FUNCTION check_result_grading() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode activity_grading_mode;
BEGIN
  SELECT s.grading_mode_snapshot INTO mode FROM submission_executions e JOIN activity_submissions s ON s.submission_id = e.submission_id WHERE e.execution_id = NEW.execution_id;
  IF (mode = 'COMPLETION' AND (NEW.maximum_points IS NOT NULL OR NEW.automated_points IS NOT NULL)) OR
     (mode = 'GRADED' AND (NEW.maximum_points IS NULL OR NEW.automated_points IS NULL))
  THEN RAISE EXCEPTION 'Result grading configuration mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_case_results_grading_check BEFORE INSERT OR UPDATE ON test_case_results FOR EACH ROW EXECUTE FUNCTION check_result_grading();
COMMIT;
