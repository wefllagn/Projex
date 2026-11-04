-- AlterTable
ALTER TABLE "practice_executions" ADD COLUMN     "activity_practice_workspace_id" UUID;

-- CreateTable
CREATE TABLE "activity_practice_workspaces" (
    "practice_workspace_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "entry_class_name" TEXT NOT NULL,
    "initialized_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_practice_workspaces_pkey" PRIMARY KEY ("practice_workspace_id")
);

-- CreateTable
CREATE TABLE "activity_practice_git_jobs" (
    "practice_git_job_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "expected_head" TEXT,
    "resulting_head" TEXT,
    "key_hash" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "status" "repository_checkpoint_job_status" NOT NULL DEFAULT 'PENDING',
    "publish_started" BOOLEAN NOT NULL DEFAULT false,
    "claim_attempt" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_expires_at" TIMESTAMPTZ(3),
    "worker_id" TEXT,
    "failure_code" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "activity_practice_git_jobs_pkey" PRIMARY KEY ("practice_git_job_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_practice_workspaces_repository_id_key" ON "activity_practice_workspaces"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_practice_workspaces_activity_id_student_id_key" ON "activity_practice_workspaces"("activity_id", "student_id");

-- CreateIndex
CREATE INDEX "activity_practice_git_jobs_status_available_at_idx" ON "activity_practice_git_jobs"("status", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_practice_git_jobs_workspace_id_key_hash_key" ON "activity_practice_git_jobs"("workspace_id", "key_hash");

-- AddForeignKey
ALTER TABLE "practice_executions" ADD CONSTRAINT "practice_executions_activity_practice_workspace_id_fkey" FOREIGN KEY ("activity_practice_workspace_id") REFERENCES "activity_practice_workspaces"("practice_workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_practice_workspaces" ADD CONSTRAINT "activity_practice_workspaces_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_practice_workspaces" ADD CONSTRAINT "activity_practice_workspaces_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_practice_workspaces" ADD CONSTRAINT "activity_practice_workspaces_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_practice_git_jobs" ADD CONSTRAINT "activity_practice_git_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "activity_practice_workspaces"("practice_workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
