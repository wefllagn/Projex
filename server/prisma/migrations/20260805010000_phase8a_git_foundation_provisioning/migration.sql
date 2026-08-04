-- Phase 8A records provisioning work only. Filesystem and Git operations are
-- intentionally performed by the separately enabled provisioning worker.

CREATE TYPE "repository_activity_actor_type" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "repository_storage_status" AS ENUM ('PENDING', 'PROVISIONING', 'READY', 'FAILED', 'QUARANTINED');
CREATE TYPE "repository_provisioning_job_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TYPE "repository_activity_type" ADD VALUE 'REPOSITORY_PROVISIONED' BEFORE 'COMMIT';

ALTER TABLE "repositories"
  ADD COLUMN "storage_status" "repository_storage_status" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "provisioned_at" TIMESTAMPTZ(3),
  ADD COLUMN "storage_verified_at" TIMESTAMPTZ(3),
  ADD COLUMN "storage_size_bytes" BIGINT,
  ADD COLUMN "storage_failure_code" TEXT;

ALTER TABLE "repositories"
  ADD CONSTRAINT "repositories_storage_lifecycle_check" CHECK (
    (
      "storage_status" = 'READY'
      AND "storage_path" IS NOT NULL
      AND "provisioned_at" IS NOT NULL
      AND "storage_verified_at" IS NOT NULL
      AND "storage_size_bytes" IS NOT NULL
      AND "storage_size_bytes" >= 0
      AND "storage_failure_code" IS NULL
    )
    OR (
      "storage_status" <> 'READY'
      AND "storage_path" IS NULL
      AND "provisioned_at" IS NULL
      AND "storage_verified_at" IS NULL
      AND "storage_size_bytes" IS NULL
    )
  );
CREATE TABLE "repository_provisioning_jobs" (
  "provisioning_job_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repository_id" UUID NOT NULL,
  "status" "repository_provisioning_job_status" NOT NULL DEFAULT 'PENDING',
  "claim_attempt" INTEGER NOT NULL DEFAULT 0,
  "max_claim_attempts" INTEGER NOT NULL DEFAULT 3,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMPTZ(3),
  "lease_expires_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "worker_id" TEXT,
  "last_failure_code" TEXT,
  "quarantine_key" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "repository_provisioning_jobs_pkey" PRIMARY KEY ("provisioning_job_id"),
  CONSTRAINT "repository_provisioning_jobs_repository_id_key" UNIQUE ("repository_id"),
  CONSTRAINT "repository_provisioning_jobs_attempts_check" CHECK (
    "claim_attempt" >= 0 AND "max_claim_attempts" BETWEEN 1 AND 10
      AND "claim_attempt" <= "max_claim_attempts"
  ),
  CONSTRAINT "repository_provisioning_jobs_lease_check" CHECK (
    (
      "status" = 'RUNNING'
      AND "worker_id" IS NOT NULL
      AND "claimed_at" IS NOT NULL
      AND "lease_expires_at" IS NOT NULL
      AND "completed_at" IS NULL
    )
    OR (
      "status" <> 'RUNNING'
      AND "worker_id" IS NULL
      AND "lease_expires_at" IS NULL
    )
  ),
  CONSTRAINT "repository_provisioning_jobs_completion_check" CHECK (
    ("status" IN ('SUCCEEDED', 'FAILED') AND "completed_at" IS NOT NULL)
    OR ("status" IN ('PENDING', 'RUNNING') AND "completed_at" IS NULL)
  )
);

CREATE INDEX "repository_provisioning_jobs_status_available_at_idx"
  ON "repository_provisioning_jobs"("status", "available_at");
CREATE INDEX "repository_provisioning_jobs_lease_expires_at_idx"
  ON "repository_provisioning_jobs"("lease_expires_at");

ALTER TABLE "repository_provisioning_jobs"
  ADD CONSTRAINT "repository_provisioning_jobs_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "repository_provisioning_jobs" (
  "repository_id", "status", "claim_attempt", "max_claim_attempts",
  "available_at", "created_at", "updated_at"
)
SELECT
  "repository_id", 'PENDING', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "repositories"
ON CONFLICT ("repository_id") DO NOTHING;

ALTER TABLE "repository_activity"
  ADD COLUMN "actor_type" "repository_activity_actor_type" NOT NULL DEFAULT 'USER',
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "repository_activity"
  ADD CONSTRAINT "repository_activity_actor_check" CHECK (
    ("actor_type" = 'USER' AND "user_id" IS NOT NULL)
    OR ("actor_type" = 'SYSTEM' AND "user_id" IS NULL)
  );
