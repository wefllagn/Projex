-- Opt-in authoring version. NULL preserves every existing Activity and draft.
ALTER TABLE "programming_activities" ADD COLUMN "grading_configuration" JSONB;
ALTER TABLE "test_cases" ADD COLUMN "importance" VARCHAR(16);
ALTER TABLE "activity_submissions" ADD COLUMN "grading_configuration_snapshot" JSONB;
ALTER TABLE "programming_activities" ADD CONSTRAINT "activity_grading_configuration_object" CHECK (grading_configuration IS NULL OR jsonb_typeof(grading_configuration) = 'object');
ALTER TABLE "activity_submissions" ADD CONSTRAINT "submission_grading_configuration_object" CHECK (grading_configuration_snapshot IS NULL OR jsonb_typeof(grading_configuration_snapshot) = 'object');
ALTER TABLE "test_cases" ADD CONSTRAINT "test_case_importance_valid" CHECK (importance IS NULL OR importance IN ('NORMAL', 'HIGH', 'VERY_HIGH'));
