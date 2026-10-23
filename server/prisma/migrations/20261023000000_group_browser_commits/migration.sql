CREATE TABLE "group_browser_commit_jobs" (
 "browser_commit_id" UUID NOT NULL, "repository_id" UUID NOT NULL, "actor_id" UUID NOT NULL,
 "status" "repository_checkpoint_job_status" NOT NULL DEFAULT 'PENDING',
 "branch_name" TEXT NOT NULL, "file_path" TEXT NOT NULL, "operation" TEXT NOT NULL,
 "content" TEXT NOT NULL, "commit_message" TEXT NOT NULL, "payload_hash" TEXT NOT NULL,
 "idempotency_key_hash" TEXT NOT NULL, "expected_head_commit_hash" TEXT, "resulting_commit_hash" TEXT,
 "publish_started" BOOLEAN NOT NULL DEFAULT false, "claim_attempt" INTEGER NOT NULL DEFAULT 0,
 "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lease_expires_at" TIMESTAMPTZ(3),
 "worker_id" TEXT, "failure_code" TEXT, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completed_at" TIMESTAMPTZ(3), CONSTRAINT "group_browser_commit_jobs_pkey" PRIMARY KEY ("browser_commit_id"),
 CONSTRAINT "group_browser_commit_jobs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "group_browser_commit_jobs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "group_browser_commit_bounds" CHECK (octet_length(content) <= 65536 AND length(file_path) <= 240 AND length(commit_message) <= 300 AND operation IN ('CREATE','UPDATE'))
);
CREATE UNIQUE INDEX "group_browser_commit_jobs_actor_id_repository_id_idempotency__key" ON "group_browser_commit_jobs"("actor_id", "repository_id", "idempotency_key_hash");
CREATE INDEX "group_browser_commit_jobs_status_available_at_idx" ON "group_browser_commit_jobs"("status", "available_at");
