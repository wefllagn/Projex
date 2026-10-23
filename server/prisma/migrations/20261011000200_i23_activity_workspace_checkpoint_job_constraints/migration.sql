ALTER TABLE "repository_checkpoint_jobs"
  ADD CONSTRAINT "repository_checkpoint_jobs_attempts_check"
  CHECK (
    "claim_attempt" >= 0
    AND "max_claim_attempts" BETWEEN 1 AND 10
    AND "claim_attempt" <= "max_claim_attempts"
  ),
  ADD CONSTRAINT "repository_checkpoint_jobs_lease_check"
  CHECK (
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
  ADD CONSTRAINT "repository_checkpoint_jobs_completion_check"
  CHECK (
    ("status" IN ('SUCCEEDED', 'FAILED', 'CONFLICTED') AND "completed_at" IS NOT NULL)
    OR ("status" IN ('PENDING', 'RUNNING') AND "completed_at" IS NULL)
  ),
  ADD CONSTRAINT "repository_checkpoint_jobs_result_check"
  CHECK (
    ("status" = 'SUCCEEDED' AND "resulting_commit_hash" IS NOT NULL)
    OR ("status" <> 'SUCCEEDED' AND "resulting_commit_hash" IS NULL)
  );
