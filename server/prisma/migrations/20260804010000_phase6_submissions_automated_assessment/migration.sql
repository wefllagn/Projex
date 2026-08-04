BEGIN;

-- Phase 2 created placeholder assessment tables, but no product workflow wrote to
-- them. Stop instead of guessing if any environment contains unexpected rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "activity_submissions" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "submission_executions" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "test_case_results" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "submission_feedback" LIMIT 1) THEN
    RAISE EXCEPTION 'Phase 6 migration requires explicit review of legacy submission data';
  END IF;
END $$;

ALTER TABLE "activity_submissions" ALTER COLUMN "submission_status" DROP DEFAULT;
ALTER TYPE "submission_status" RENAME TO "submission_status_legacy";
CREATE TYPE "submission_status" AS ENUM (
  'QUEUED',
  'ASSESSING',
  'ASSESSED',
  'ASSESSMENT_FAILED',
  'REVIEWED',
  'RELEASED',
  'FAILED_RESOLVED'
);
ALTER TABLE "activity_submissions"
  ALTER COLUMN "submission_status" TYPE "submission_status"
  USING (
    CASE "submission_status"::text
      WHEN 'SUBMITTED' THEN 'QUEUED'
      WHEN 'GRADED' THEN 'REVIEWED'
      WHEN 'RELEASED' THEN 'RELEASED'
    END
  )::"submission_status";
ALTER TABLE "activity_submissions"
  ALTER COLUMN "submission_status" SET DEFAULT 'QUEUED';
DROP TYPE "submission_status_legacy";

ALTER TABLE "submission_executions" ALTER COLUMN "compile_status" DROP DEFAULT;
ALTER TYPE "compile_status" RENAME TO "compile_status_legacy";
CREATE TYPE "compile_status" AS ENUM (
  'PENDING',
  'SUCCESS',
  'STUDENT_ERROR',
  'INFRASTRUCTURE_ERROR'
);
ALTER TABLE "submission_executions"
  ALTER COLUMN "compile_status" TYPE "compile_status"
  USING (
    CASE "compile_status"::text
      WHEN 'PENDING' THEN 'PENDING'
      WHEN 'SUCCESS' THEN 'SUCCESS'
      WHEN 'FAILED' THEN 'STUDENT_ERROR'
    END
  )::"compile_status";
ALTER TABLE "submission_executions"
  ALTER COLUMN "compile_status" SET DEFAULT 'PENDING';
DROP TYPE "compile_status_legacy";

ALTER TABLE "submission_executions" ALTER COLUMN "runtime_status" DROP DEFAULT;
ALTER TYPE "runtime_status" RENAME TO "runtime_status_legacy";
CREATE TYPE "runtime_status" AS ENUM (
  'NOT_RUN',
  'PASSED',
  'FAILED',
  'TIMEOUT',
  'ERROR',
  'OUTPUT_LIMIT'
);
ALTER TABLE "submission_executions"
  ALTER COLUMN "runtime_status" TYPE "runtime_status"
  USING ("runtime_status"::text::"runtime_status");
ALTER TABLE "submission_executions"
  ALTER COLUMN "runtime_status" SET DEFAULT 'NOT_RUN';
DROP TYPE "runtime_status_legacy";

ALTER TABLE "test_case_results" ALTER COLUMN "pass_status" DROP DEFAULT;
ALTER TYPE "test_case_pass_status" RENAME TO "test_case_pass_status_legacy";
CREATE TYPE "test_case_pass_status" AS ENUM (
  'PENDING',
  'PASSED',
  'FAILED',
  'ERROR',
  'TIMEOUT',
  'OUTPUT_LIMIT'
);
ALTER TABLE "test_case_results"
  ALTER COLUMN "pass_status" TYPE "test_case_pass_status"
  USING ("pass_status"::text::"test_case_pass_status");
ALTER TABLE "test_case_results"
  ALTER COLUMN "pass_status" SET DEFAULT 'PENDING';
DROP TYPE "test_case_pass_status_legacy";

CREATE TYPE "execution_job_type" AS ENUM (
  'OFFICIAL_ASSESSMENT',
  'VISIBLE_TEST_RUN'
);
CREATE TYPE "execution_job_status" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED'
);
CREATE TYPE "failure_resolution_type" AS ENUM (
  'CLOSED_WITHOUT_REPLACEMENT',
  'REPLACEMENT_GRANTED'
);
CREATE TYPE "practice_execution_status" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'TIMEOUT'
);

ALTER TABLE "activity_submissions"
  DROP CONSTRAINT "activity_submissions_attempt_number_check",
  DROP CONSTRAINT "activity_submissions_automated_score_nonnegative_check",
  DROP CONSTRAINT "activity_submissions_final_score_nonnegative_check";

ALTER TABLE "activity_submissions"
  RENAME COLUMN "automated_score" TO "original_automated_score";
ALTER TABLE "activity_submissions"
  RENAME COLUMN "instructor_adjustment" TO "instructor_points";
ALTER TABLE "activity_submissions"
  RENAME COLUMN "final_score" TO "released_final_score";

ALTER TABLE "activity_submissions"
  ADD COLUMN "source_hash" TEXT NOT NULL,
  ADD COLUMN "activity_title_snapshot" TEXT NOT NULL,
  ADD COLUMN "due_date_snapshot" TIMESTAMPTZ(3) NOT NULL,
  ADD COLUMN "total_points_snapshot" DECIMAL(8,2) NOT NULL,
  ADD COLUMN "automated_maximum" DECIMAL(8,2) NOT NULL,
  ADD COLUMN "instructor_maximum" DECIMAL(8,2) NOT NULL,
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "counts_toward_attempt_limit" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "activity_submissions"
  ADD CONSTRAINT "activity_submissions_attempt_number_positive_check"
    CHECK ("attempt_number" > 0),
  ADD CONSTRAINT "activity_submissions_score_component_bounds_check"
    CHECK (
      "total_points_snapshot" > 0
      AND "automated_maximum" >= 0
      AND "instructor_maximum" >= 0
      AND "automated_maximum" + "instructor_maximum" = "total_points_snapshot"
      AND (
        "original_automated_score" IS NULL
        OR "original_automated_score" BETWEEN 0 AND "automated_maximum"
      )
      AND "instructor_points" BETWEEN 0 AND "instructor_maximum"
      AND (
        "released_final_score" IS NULL
        OR "released_final_score" BETWEEN 0 AND "total_points_snapshot"
      )
    ),
  ADD CONSTRAINT "activity_submissions_source_hash_check"
    CHECK ("source_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "activity_submissions_release_state_check"
    CHECK (
      ("submission_status" = 'RELEASED' AND "released_at" IS NOT NULL AND "released_final_score" IS NOT NULL)
      OR ("submission_status" <> 'RELEASED' AND "released_at" IS NULL AND "released_final_score" IS NULL)
    );

ALTER TABLE "submission_executions"
  DROP CONSTRAINT "submission_executions_completed_at_check";
ALTER TABLE "submission_executions"
  ALTER COLUMN "started_at" DROP DEFAULT,
  ALTER COLUMN "started_at" DROP NOT NULL,
  ADD COLUMN "infrastructure_failure_code" TEXT;
ALTER TABLE "submission_executions"
  ADD CONSTRAINT "submission_executions_completed_at_check"
    CHECK (
      "completed_at" IS NULL
      OR ("started_at" IS NOT NULL AND "completed_at" >= "started_at")
    );
CREATE UNIQUE INDEX "submission_executions_submission_id_key"
  ON "submission_executions"("submission_id");

ALTER TABLE "test_case_results"
  DROP CONSTRAINT "test_case_results_instructor_points_nonnegative_check",
  DROP COLUMN "instructor_points",
  ADD COLUMN "test_name_snapshot" TEXT NOT NULL,
  ADD COLUMN "test_order_snapshot" INTEGER NOT NULL,
  ADD COLUMN "input_snapshot" TEXT,
  ADD COLUMN "expected_output_snapshot" TEXT NOT NULL,
  ADD COLUMN "is_hidden_snapshot" BOOLEAN NOT NULL,
  ADD COLUMN "maximum_points" DECIMAL(8,2) NOT NULL;
ALTER TABLE "test_case_results"
  ADD CONSTRAINT "test_case_results_snapshot_check"
    CHECK (
      length(btrim("test_name_snapshot")) > 0
      AND "test_order_snapshot" > 0
      AND "maximum_points" >= 0
      AND "automated_points" BETWEEN 0 AND "maximum_points"
    );
CREATE UNIQUE INDEX "test_case_results_execution_id_test_order_snapshot_key"
  ON "test_case_results"("execution_id", "test_order_snapshot");

ALTER TABLE "submission_feedback"
  ADD COLUMN "released_by_id" UUID,
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "submission_feedback_submission_id_key"
  ON "submission_feedback"("submission_id");
ALTER TABLE "submission_feedback"
  ADD CONSTRAINT "submission_feedback_release_check"
    CHECK (
      ("released_at" IS NULL AND "released_by_id" IS NULL)
      OR ("released_at" IS NOT NULL AND "released_by_id" IS NOT NULL)
    );

CREATE TABLE "submission_idempotencies" (
  "submission_idempotency_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "activity_id" UUID NOT NULL,
  "key_hash" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "submission_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "submission_idempotencies_pkey" PRIMARY KEY ("submission_idempotency_id"),
  CONSTRAINT "submission_idempotencies_hash_check"
    CHECK ("key_hash" ~ '^[0-9a-f]{64}$' AND "payload_hash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "submission_idempotencies_student_activity_key_key"
  ON "submission_idempotencies"("student_id", "activity_id", "key_hash");
CREATE UNIQUE INDEX "submission_idempotencies_submission_id_key"
  ON "submission_idempotencies"("submission_id");

CREATE TABLE "submission_score_corrections" (
  "score_correction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "correction_number" INTEGER NOT NULL,
  "original_automated_score" DECIMAL(8,2) NOT NULL,
  "previous_effective_score" DECIMAL(8,2) NOT NULL,
  "new_effective_score" DECIMAL(8,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "corrected_by_id" UUID NOT NULL,
  "corrected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "submission_score_corrections_pkey" PRIMARY KEY ("score_correction_id"),
  CONSTRAINT "submission_score_corrections_values_check"
    CHECK (
      "correction_number" > 0
      AND "original_automated_score" >= 0
      AND "previous_effective_score" >= 0
      AND "new_effective_score" >= 0
      AND length(btrim("reason")) > 0
    )
);
CREATE UNIQUE INDEX "submission_score_corrections_submission_number_key"
  ON "submission_score_corrections"("submission_id", "correction_number");
CREATE INDEX "submission_score_corrections_corrected_by_at_idx"
  ON "submission_score_corrections"("corrected_by_id", "corrected_at");

CREATE TABLE "submission_failure_resolutions" (
  "failure_resolution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "failed_submission_id" UUID NOT NULL,
  "resolution_type" "failure_resolution_type" NOT NULL,
  "reason" TEXT NOT NULL,
  "resolved_by_id" UUID NOT NULL,
  "resolved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replacement_expires_at" TIMESTAMPTZ(3),
  "replacement_submission_id" UUID,
  "replacement_consumed_at" TIMESTAMPTZ(3),
  CONSTRAINT "submission_failure_resolutions_pkey" PRIMARY KEY ("failure_resolution_id"),
  CONSTRAINT "submission_failure_resolutions_state_check"
    CHECK (
      length(btrim("reason")) > 0
      AND (
        (
          "resolution_type" = 'CLOSED_WITHOUT_REPLACEMENT'
          AND "replacement_expires_at" IS NULL
          AND "replacement_submission_id" IS NULL
          AND "replacement_consumed_at" IS NULL
        )
        OR (
          "resolution_type" = 'REPLACEMENT_GRANTED'
          AND "replacement_expires_at" IS NOT NULL
          AND "replacement_expires_at" > "resolved_at"
          AND (
            ("replacement_submission_id" IS NULL AND "replacement_consumed_at" IS NULL)
            OR ("replacement_submission_id" IS NOT NULL AND "replacement_consumed_at" IS NOT NULL)
          )
        )
      )
    )
);
CREATE UNIQUE INDEX "submission_failure_resolutions_failed_submission_key"
  ON "submission_failure_resolutions"("failed_submission_id");
CREATE UNIQUE INDEX "submission_failure_resolutions_replacement_submission_key"
  ON "submission_failure_resolutions"("replacement_submission_id");
CREATE INDEX "submission_failure_resolutions_resolved_by_at_idx"
  ON "submission_failure_resolutions"("resolved_by_id", "resolved_at");
CREATE INDEX "submission_failure_resolutions_expiry_idx"
  ON "submission_failure_resolutions"("replacement_expires_at");

CREATE TABLE "practice_executions" (
  "practice_execution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "source_code" TEXT NOT NULL,
  "source_hash" TEXT NOT NULL,
  "entry_class_name" TEXT NOT NULL,
  "status" "practice_execution_status" NOT NULL DEFAULT 'QUEUED',
  "compile_status" "compile_status" NOT NULL DEFAULT 'PENDING',
  "runtime_status" "runtime_status" NOT NULL DEFAULT 'NOT_RUN',
  "compiler_output" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "practice_executions_pkey" PRIMARY KEY ("practice_execution_id"),
  CONSTRAINT "practice_executions_state_check"
    CHECK (
      "source_hash" ~ '^[0-9a-f]{64}$'
      AND "expires_at" > "created_at"
      AND ("completed_at" IS NULL OR ("started_at" IS NOT NULL AND "completed_at" >= "started_at"))
    )
);
CREATE INDEX "practice_executions_student_created_idx"
  ON "practice_executions"("student_id", "created_at");
CREATE INDEX "practice_executions_activity_status_idx"
  ON "practice_executions"("activity_id", "status");
CREATE INDEX "practice_executions_expires_at_idx"
  ON "practice_executions"("expires_at");

CREATE TABLE "practice_execution_cases" (
  "practice_execution_case_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "practice_execution_id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  "test_name_snapshot" TEXT NOT NULL,
  "test_order_snapshot" INTEGER NOT NULL,
  "input_snapshot" TEXT,
  "expected_output_snapshot" TEXT NOT NULL,
  "pass_status" "test_case_pass_status" NOT NULL DEFAULT 'PENDING',
  "actual_output" TEXT,
  "error_message" TEXT,
  "execution_time_ms" INTEGER,
  CONSTRAINT "practice_execution_cases_pkey" PRIMARY KEY ("practice_execution_case_id"),
  CONSTRAINT "practice_execution_cases_values_check"
    CHECK (
      length(btrim("test_name_snapshot")) > 0
      AND "test_order_snapshot" > 0
      AND ("execution_time_ms" IS NULL OR "execution_time_ms" >= 0)
    )
);
CREATE UNIQUE INDEX "practice_execution_cases_execution_test_key"
  ON "practice_execution_cases"("practice_execution_id", "test_case_id");
CREATE UNIQUE INDEX "practice_execution_cases_execution_order_key"
  ON "practice_execution_cases"("practice_execution_id", "test_order_snapshot");

CREATE TABLE "execution_jobs" (
  "execution_job_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_type" "execution_job_type" NOT NULL,
  "submission_id" UUID,
  "practice_execution_id" UUID,
  "status" "execution_job_status" NOT NULL DEFAULT 'QUEUED',
  "claim_attempt" INTEGER NOT NULL DEFAULT 0,
  "max_claim_attempts" INTEGER NOT NULL DEFAULT 3,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMPTZ(3),
  "lease_expires_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "worker_id" TEXT,
  "last_failure_code" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execution_jobs_pkey" PRIMARY KEY ("execution_job_id"),
  CONSTRAINT "execution_jobs_target_check"
    CHECK (
      ("job_type" = 'OFFICIAL_ASSESSMENT' AND "submission_id" IS NOT NULL AND "practice_execution_id" IS NULL)
      OR ("job_type" = 'VISIBLE_TEST_RUN' AND "submission_id" IS NULL AND "practice_execution_id" IS NOT NULL)
    ),
  CONSTRAINT "execution_jobs_claim_check"
    CHECK (
      "claim_attempt" >= 0
      AND "max_claim_attempts" BETWEEN 1 AND 10
      AND "claim_attempt" <= "max_claim_attempts"
      AND ("lease_expires_at" IS NULL OR "claimed_at" IS NOT NULL)
      AND ("completed_at" IS NULL OR "completed_at" >= "created_at")
    )
);
CREATE UNIQUE INDEX "execution_jobs_submission_id_key"
  ON "execution_jobs"("submission_id");
CREATE UNIQUE INDEX "execution_jobs_practice_execution_id_key"
  ON "execution_jobs"("practice_execution_id");
CREATE INDEX "execution_jobs_status_available_idx"
  ON "execution_jobs"("status", "available_at");
CREATE INDEX "execution_jobs_lease_expires_at_idx"
  ON "execution_jobs"("lease_expires_at");

ALTER TABLE "submission_idempotencies"
  ADD CONSTRAINT "submission_idempotencies_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "submission_idempotencies_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "submission_idempotencies_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_score_corrections"
  ADD CONSTRAINT "submission_score_corrections_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "submission_score_corrections_corrected_by_id_fkey"
    FOREIGN KEY ("corrected_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "submission_failure_resolutions"
  ADD CONSTRAINT "submission_failure_resolutions_failed_submission_id_fkey"
    FOREIGN KEY ("failed_submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "submission_failure_resolutions_replacement_submission_id_fkey"
    FOREIGN KEY ("replacement_submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "submission_failure_resolutions_resolved_by_id_fkey"
    FOREIGN KEY ("resolved_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practice_executions"
  ADD CONSTRAINT "practice_executions_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "practice_executions_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practice_execution_cases"
  ADD CONSTRAINT "practice_execution_cases_execution_id_fkey"
    FOREIGN KEY ("practice_execution_id") REFERENCES "practice_executions"("practice_execution_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "practice_execution_cases_test_case_id_fkey"
    FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("test_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "execution_jobs"
  ADD CONSTRAINT "execution_jobs_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "execution_jobs_practice_execution_id_fkey"
    FOREIGN KEY ("practice_execution_id") REFERENCES "practice_executions"("practice_execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_feedback"
  ADD CONSTRAINT "submission_feedback_released_by_id_fkey"
    FOREIGN KEY ("released_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
