ALTER TYPE "AdminAuditAction" ADD VALUE 'USER_PASSWORD_RECOVERY_ISSUED';
ALTER TABLE "account_setup_tokens" ADD COLUMN "purpose" VARCHAR(32) NOT NULL DEFAULT 'ACCOUNT_SETUP';
ALTER TABLE "account_setup_tokens" ADD CONSTRAINT "account_setup_token_purpose_check" CHECK (purpose IN ('ACCOUNT_SETUP', 'PASSWORD_RECOVERY'));
ALTER TABLE "programming_activities" ADD COLUMN "grading_period" VARCHAR(16), ADD COLUMN "rubric_criteria" JSONB;
ALTER TABLE "programming_activities" ADD CONSTRAINT "activity_grading_period_check" CHECK (grading_period IS NULL OR grading_period IN ('PRELIM', 'MIDTERM', 'FINAL'));
ALTER TABLE "programming_activities" ADD CONSTRAINT "activity_rubric_array_check" CHECK (rubric_criteria IS NULL OR jsonb_typeof(rubric_criteria) = 'array');
ALTER TABLE "activity_submissions" ADD COLUMN "rubric_snapshot" JSONB, ADD COLUMN "rubric_scores" JSONB;
ALTER TABLE "activity_submissions" ADD CONSTRAINT "submission_rubric_array_check" CHECK (rubric_snapshot IS NULL OR jsonb_typeof(rubric_snapshot) = 'array');
ALTER TABLE "activity_submissions" ADD CONSTRAINT "submission_rubric_scores_array_check" CHECK (rubric_scores IS NULL OR jsonb_typeof(rubric_scores) = 'array');
