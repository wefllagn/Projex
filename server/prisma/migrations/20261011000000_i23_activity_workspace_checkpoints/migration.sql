CREATE TYPE "repository_checkpoint_job_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CONFLICTED'
);

CREATE TABLE "repository_checkpoint_jobs" (
  "checkpoint_job_id" UUID NOT NULL,
  "repository_id" UUID NOT NULL,
  "activity_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "status" "repository_checkpoint_job_status" NOT NULL DEFAULT 'PENDING',
  "source_code" TEXT NOT NULL,
  "source_hash" TEXT NOT NULL,
  "idempotency_key_hash" TEXT NOT NULL,
  "expected_head_commit_hash" TEXT,
  "resulting_commit_hash" TEXT,
  "entry_file_path" TEXT NOT NULL,
  "claim_attempt" INTEGER NOT NULL DEFAULT 0,
  "max_claim_attempts" INTEGER NOT NULL DEFAULT 3,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMPTZ(3),
  "lease_expires_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "worker_id" TEXT,
  "last_failure_code" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "repository_checkpoint_jobs_pkey" PRIMARY KEY ("checkpoint_job_id"),
  CONSTRAINT "repository_checkpoint_jobs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "repository_checkpoint_jobs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "repository_checkpoint_jobs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "repository_checkpoint_entry_file_check" CHECK ("entry_file_path" ~ '^[A-Za-z_$][A-Za-z0-9_$]*\\.java$'),
  CONSTRAINT "repository_checkpoint_expected_head_check" CHECK ("expected_head_commit_hash" IS NULL OR "expected_head_commit_hash" ~ '^[0-9a-f]{40}$'),
  CONSTRAINT "repository_checkpoint_result_head_check" CHECK ("resulting_commit_hash" IS NULL OR "resulting_commit_hash" ~ '^[0-9a-f]{40}$')
);

CREATE UNIQUE INDEX "repository_checkpoint_jobs_student_id_activity_id_idempotency_key_hash_key"
  ON "repository_checkpoint_jobs"("student_id", "activity_id", "idempotency_key_hash");
CREATE UNIQUE INDEX "repository_checkpoint_jobs_one_active_per_repository"
  ON "repository_checkpoint_jobs"("repository_id")
  WHERE "status" IN ('PENDING', 'RUNNING');
CREATE INDEX "repository_checkpoint_jobs_status_available_at_idx"
  ON "repository_checkpoint_jobs"("status", "available_at");
CREATE INDEX "repository_checkpoint_jobs_lease_expires_at_idx"
  ON "repository_checkpoint_jobs"("lease_expires_at");
CREATE INDEX "repository_checkpoint_jobs_repository_id_created_at_idx"
  ON "repository_checkpoint_jobs"("repository_id", "created_at");
