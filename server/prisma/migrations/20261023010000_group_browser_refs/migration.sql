CREATE TABLE "group_browser_ref_jobs" (
 "browser_ref_id" UUID NOT NULL, "repository_id" UUID NOT NULL, "actor_id" UUID NOT NULL,
 "status" "repository_checkpoint_job_status" NOT NULL DEFAULT 'PENDING',
 "operation" TEXT NOT NULL, "source_branch_name" TEXT NOT NULL, "target_branch_name" TEXT NOT NULL,
 "expected_source_commit_hash" TEXT NOT NULL, "expected_target_commit_hash" TEXT, "resulting_commit_hash" TEXT,
 "payload_hash" TEXT NOT NULL, "idempotency_key_hash" TEXT NOT NULL,
 "publish_started" BOOLEAN NOT NULL DEFAULT false, "claim_attempt" INTEGER NOT NULL DEFAULT 0,
 "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lease_expires_at" TIMESTAMPTZ(3),
 "worker_id" TEXT, "failure_code" TEXT, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMPTZ(3),
 CONSTRAINT "group_browser_ref_jobs_pkey" PRIMARY KEY ("browser_ref_id"),
 CONSTRAINT "group_browser_ref_jobs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "group_browser_ref_jobs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "group_browser_ref_bounds" CHECK (length(source_branch_name) BETWEEN 1 AND 200 AND length(target_branch_name) BETWEEN 1 AND 200 AND source_branch_name <> target_branch_name AND expected_source_commit_hash ~ '^[0-9a-f]{40}$' AND (expected_target_commit_hash IS NULL OR expected_target_commit_hash ~ '^[0-9a-f]{40}$') AND ((operation = 'CREATE_BRANCH' AND expected_target_commit_hash IS NULL AND lower(target_branch_name) <> 'main') OR (operation = 'FAST_FORWARD' AND expected_target_commit_hash IS NOT NULL))),
 CONSTRAINT "group_browser_ref_claim" CHECK (claim_attempt >= 0 AND (status <> 'RUNNING' OR (worker_id IS NOT NULL AND lease_expires_at IS NOT NULL))),
 CONSTRAINT "group_browser_ref_completion" CHECK ((status IN ('SUCCEEDED','FAILED','CONFLICTED')) = (completed_at IS NOT NULL)),
 CONSTRAINT "group_browser_ref_success" CHECK (status <> 'SUCCEEDED' OR (resulting_commit_hash IS NOT NULL AND resulting_commit_hash = expected_source_commit_hash))
);
CREATE UNIQUE INDEX "group_browser_ref_jobs_actor_repository_key" ON "group_browser_ref_jobs"("actor_id", "repository_id", "idempotency_key_hash");
CREATE INDEX "group_browser_ref_jobs_status_available_at_idx" ON "group_browser_ref_jobs"("status", "available_at");
