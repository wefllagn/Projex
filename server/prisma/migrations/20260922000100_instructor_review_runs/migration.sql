-- A review run has its own durable target. It never reuses or updates the
-- official assessment target and cannot change a submitted attempt or score.
CREATE TABLE "review_executions" (
  "review_execution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "instructor_id" UUID NOT NULL,
  "entry_class_name" TEXT NOT NULL,
  "status" "practice_execution_status" NOT NULL DEFAULT 'QUEUED',
  "compile_status" "compile_status" NOT NULL DEFAULT 'PENDING',
  "runtime_status" "runtime_status" NOT NULL DEFAULT 'NOT_RUN',
  "compiler_output" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "review_executions_pkey" PRIMARY KEY ("review_execution_id")
);
CREATE INDEX "review_executions_submission_id_created_at_idx" ON "review_executions"("submission_id", "created_at");
CREATE INDEX "review_executions_instructor_id_created_at_idx" ON "review_executions"("instructor_id", "created_at");
CREATE INDEX "review_executions_status_created_at_idx" ON "review_executions"("status", "created_at");
ALTER TABLE "review_executions" ADD CONSTRAINT "review_executions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_executions" ADD CONSTRAINT "review_executions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "review_execution_cases" (
  "review_execution_case_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "review_execution_id" UUID NOT NULL,
  "test_name_snapshot" TEXT NOT NULL,
  "test_order_snapshot" INTEGER NOT NULL,
  "input_snapshot" TEXT,
  "expected_output_snapshot" TEXT NOT NULL,
  "is_hidden_snapshot" BOOLEAN NOT NULL,
  "pass_status" "test_case_pass_status" NOT NULL DEFAULT 'PENDING',
  "actual_output" TEXT,
  "error_message" TEXT,
  "execution_time_ms" INTEGER,
  CONSTRAINT "review_execution_cases_pkey" PRIMARY KEY ("review_execution_case_id")
);
CREATE UNIQUE INDEX "review_execution_cases_review_execution_id_test_order_snapshot_key" ON "review_execution_cases"("review_execution_id", "test_order_snapshot");
ALTER TABLE "review_execution_cases" ADD CONSTRAINT "review_execution_cases_review_execution_id_fkey" FOREIGN KEY ("review_execution_id") REFERENCES "review_executions"("review_execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "execution_jobs" ADD COLUMN "review_execution_id" UUID;
CREATE UNIQUE INDEX "execution_jobs_review_execution_id_key" ON "execution_jobs"("review_execution_id");
ALTER TABLE "execution_jobs" ADD CONSTRAINT "execution_jobs_review_execution_id_fkey" FOREIGN KEY ("review_execution_id") REFERENCES "review_executions"("review_execution_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_jobs" DROP CONSTRAINT "execution_jobs_target_check";
ALTER TABLE "execution_jobs" ADD CONSTRAINT "execution_jobs_target_check" CHECK (
  ("job_type" = 'OFFICIAL_ASSESSMENT' AND "submission_id" IS NOT NULL AND "practice_execution_id" IS NULL AND "review_execution_id" IS NULL)
  OR ("job_type" = 'VISIBLE_TEST_RUN' AND "submission_id" IS NULL AND "practice_execution_id" IS NOT NULL AND "review_execution_id" IS NULL)
  OR ("job_type" = 'INSTRUCTOR_REVIEW_RUN' AND "submission_id" IS NULL AND "practice_execution_id" IS NULL AND "review_execution_id" IS NOT NULL)
);
