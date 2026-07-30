-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "class_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "class_member_status" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "programming_language" AS ENUM ('JAVA');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('SUBMITTED', 'GRADED', 'RELEASED');

-- CreateEnum
CREATE TYPE "compile_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "runtime_status" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED', 'TIMEOUT', 'ERROR');

-- CreateEnum
CREATE TYPE "test_case_pass_status" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'ERROR');

-- CreateEnum
CREATE TYPE "repository_type" AS ENUM ('CLASS_PROJECT', 'PERSONAL');

-- CreateEnum
CREATE TYPE "repository_visibility" AS ENUM ('PRIVATE', 'CLASS_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "repository_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "repository_member_role" AS ENUM ('OWNER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "repository_member_status" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "repository_activity_type" AS ENUM ('COMMIT', 'PUSH', 'MERGE', 'BRANCH', 'PULL', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "class_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "class_name" TEXT NOT NULL,
    "class_code" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "status" "class_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("class_id")
);

-- CreateTable
CREATE TABLE "class_members" (
    "class_member_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "class_member_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_member_id")
);

-- CreateTable
CREATE TABLE "programming_activities" (
    "activity_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "language" "programming_language" NOT NULL DEFAULT 'JAVA',
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "status" "assignment_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programming_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "test_case_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "test_case_order" INTEGER NOT NULL,
    "input_data" TEXT,
    "expected_output" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT true,
    "points" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("test_case_id")
);

-- CreateTable
CREATE TABLE "activity_submissions" (
    "submission_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "source_code" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_status" "submission_status" NOT NULL DEFAULT 'SUBMITTED',
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "automated_score" DECIMAL(8,2),
    "instructor_adjustment" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "final_score" DECIMAL(8,2),
    "reviewed_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "activity_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "submission_executions" (
    "execution_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "compile_status" "compile_status" NOT NULL DEFAULT 'PENDING',
    "runtime_status" "runtime_status" NOT NULL DEFAULT 'NOT_RUN',
    "compiler_output" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "submission_executions_pkey" PRIMARY KEY ("execution_id")
);

-- CreateTable
CREATE TABLE "test_case_results" (
    "test_case_result_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "test_case_id" UUID NOT NULL,
    "pass_status" "test_case_pass_status" NOT NULL DEFAULT 'PENDING',
    "actual_output" TEXT,
    "error_message" TEXT,
    "automated_points" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "instructor_points" DECIMAL(8,2),
    "execution_time_ms" INTEGER,

    CONSTRAINT "test_case_results_pkey" PRIMARY KEY ("test_case_result_id")
);

-- CreateTable
CREATE TABLE "similarity_results" (
    "similarity_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "compared_submission_id" UUID NOT NULL,
    "similarity_percentage" DECIMAL(5,2) NOT NULL,
    "remarks" TEXT,
    "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similarity_results_pkey" PRIMARY KEY ("similarity_id")
);

-- CreateTable
CREATE TABLE "submission_feedback" (
    "feedback_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "feedback_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "submission_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "project_task_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "assignment_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("project_task_id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "repository_id" UUID NOT NULL,
    "project_task_id" UUID,
    "owner_id" UUID NOT NULL,
    "repository_type" "repository_type" NOT NULL,
    "repository_name" TEXT NOT NULL,
    "description" TEXT,
    "storage_path" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "visibility" "repository_visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "repository_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("repository_id")
);

-- CreateTable
CREATE TABLE "repository_members" (
    "repository_member_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "member_role" "repository_member_role" NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "repository_member_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "repository_members_pkey" PRIMARY KEY ("repository_member_id")
);

-- CreateTable
CREATE TABLE "repository_activity" (
    "repository_activity_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" "repository_activity_type" NOT NULL,
    "commit_hash" TEXT,
    "branch_name" TEXT,
    "file_path" TEXT,
    "old_path" TEXT,
    "new_path" TEXT,
    "message" TEXT,
    "metadata_json" JSONB,
    "activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_activity_pkey" PRIMARY KEY ("repository_activity_id")
);

-- CreateTable
CREATE TABLE "repository_feedback" (
    "feedback_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "feedback_text" TEXT NOT NULL,
    "grade" DECIMAL(8,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "repository_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- AddCheckConstraint
ALTER TABLE "programming_activities"
ADD CONSTRAINT "programming_activities_max_attempts_check"
CHECK ("max_attempts" BETWEEN 1 AND 3);

-- AddCheckConstraint
ALTER TABLE "test_cases"
ADD CONSTRAINT "test_cases_points_nonnegative_check"
CHECK ("points" >= 0);

-- AddCheckConstraint
ALTER TABLE "activity_submissions"
ADD CONSTRAINT "activity_submissions_attempt_number_check"
CHECK ("attempt_number" BETWEEN 1 AND 3);

-- AddCheckConstraint
ALTER TABLE "activity_submissions"
ADD CONSTRAINT "activity_submissions_automated_score_nonnegative_check"
CHECK ("automated_score" IS NULL OR "automated_score" >= 0);

-- AddCheckConstraint
ALTER TABLE "activity_submissions"
ADD CONSTRAINT "activity_submissions_final_score_nonnegative_check"
CHECK ("final_score" IS NULL OR "final_score" >= 0);

-- AddCheckConstraint
ALTER TABLE "submission_executions"
ADD CONSTRAINT "submission_executions_completed_at_check"
CHECK ("completed_at" IS NULL OR "completed_at" >= "started_at");

-- AddCheckConstraint
ALTER TABLE "test_case_results"
ADD CONSTRAINT "test_case_results_automated_points_nonnegative_check"
CHECK ("automated_points" >= 0);

-- AddCheckConstraint
ALTER TABLE "test_case_results"
ADD CONSTRAINT "test_case_results_instructor_points_nonnegative_check"
CHECK ("instructor_points" IS NULL OR "instructor_points" >= 0);

-- AddCheckConstraint
ALTER TABLE "test_case_results"
ADD CONSTRAINT "test_case_results_execution_time_ms_nonnegative_check"
CHECK ("execution_time_ms" IS NULL OR "execution_time_ms" >= 0);

-- AddCheckConstraint
ALTER TABLE "similarity_results"
ADD CONSTRAINT "similarity_results_distinct_submissions_check"
CHECK ("submission_id" <> "compared_submission_id");

-- AddCheckConstraint
ALTER TABLE "similarity_results"
ADD CONSTRAINT "similarity_results_percentage_range_check"
CHECK ("similarity_percentage" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "repositories"
ADD CONSTRAINT "repositories_project_task_type_check"
CHECK (
    ("repository_type" = 'CLASS_PROJECT' AND "project_task_id" IS NOT NULL)
    OR ("repository_type" = 'PERSONAL' AND "project_task_id" IS NULL)
);

-- AddCheckConstraint
ALTER TABLE "repository_feedback"
ADD CONSTRAINT "repository_feedback_grade_nonnegative_check"
CHECK ("grade" IS NULL OR "grade" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "classes_class_code_key" ON "classes"("class_code");

-- CreateIndex
CREATE INDEX "classes_instructor_id_idx" ON "classes"("instructor_id");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "classes_semester_school_year_idx" ON "classes"("semester", "school_year");

-- CreateIndex
CREATE INDEX "class_members_student_id_idx" ON "class_members"("student_id");

-- CreateIndex
CREATE INDEX "class_members_class_id_status_idx" ON "class_members"("class_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "class_members_class_id_student_id_key" ON "class_members"("class_id", "student_id");

-- CreateIndex
CREATE INDEX "programming_activities_class_id_status_idx" ON "programming_activities"("class_id", "status");

-- CreateIndex
CREATE INDEX "programming_activities_due_date_idx" ON "programming_activities"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_activity_id_test_case_order_key" ON "test_cases"("activity_id", "test_case_order");

-- CreateIndex
CREATE INDEX "activity_submissions_student_id_submitted_at_idx" ON "activity_submissions"("student_id", "submitted_at");

-- CreateIndex
CREATE INDEX "activity_submissions_activity_id_submission_status_idx" ON "activity_submissions"("activity_id", "submission_status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_submissions_activity_id_student_id_attempt_number_key" ON "activity_submissions"("activity_id", "student_id", "attempt_number");

-- CreateIndex
CREATE INDEX "submission_executions_submission_id_started_at_idx" ON "submission_executions"("submission_id", "started_at");

-- CreateIndex
CREATE INDEX "test_case_results_test_case_id_idx" ON "test_case_results"("test_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_case_results_execution_id_test_case_id_key" ON "test_case_results"("execution_id", "test_case_id");

-- CreateIndex
CREATE INDEX "similarity_results_compared_submission_id_idx" ON "similarity_results"("compared_submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "similarity_results_submission_id_compared_submission_id_key" ON "similarity_results"("submission_id", "compared_submission_id");

-- CreateIndex
CREATE INDEX "submission_feedback_submission_id_idx" ON "submission_feedback"("submission_id");

-- CreateIndex
CREATE INDEX "project_tasks_class_id_status_idx" ON "project_tasks"("class_id", "status");

-- CreateIndex
CREATE INDEX "project_tasks_due_date_idx" ON "project_tasks"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_storage_path_key" ON "repositories"("storage_path");

-- CreateIndex
CREATE INDEX "repositories_owner_id_idx" ON "repositories"("owner_id");

-- CreateIndex
CREATE INDEX "repositories_project_task_id_idx" ON "repositories"("project_task_id");

-- CreateIndex
CREATE INDEX "repositories_repository_type_status_idx" ON "repositories"("repository_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_project_task_id_owner_id_key"
ON "repositories"("project_task_id", "owner_id")
WHERE "project_task_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "repository_members_student_id_status_idx" ON "repository_members"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "repository_members_repository_id_student_id_key" ON "repository_members"("repository_id", "student_id");

-- CreateIndex
CREATE INDEX "repository_activity_repository_id_activity_at_idx" ON "repository_activity"("repository_id", "activity_at");

-- CreateIndex
CREATE INDEX "repository_activity_user_id_activity_at_idx" ON "repository_activity"("user_id", "activity_at");

-- CreateIndex
CREATE INDEX "repository_feedback_repository_id_idx" ON "repository_feedback"("repository_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programming_activities" ADD CONSTRAINT "programming_activities_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programming_activities" ADD CONSTRAINT "programming_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_submissions" ADD CONSTRAINT "activity_submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "programming_activities"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_submissions" ADD CONSTRAINT "activity_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_executions" ADD CONSTRAINT "submission_executions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_case_results" ADD CONSTRAINT "test_case_results_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "submission_executions"("execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_case_results" ADD CONSTRAINT "test_case_results_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("test_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_results" ADD CONSTRAINT "similarity_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_results" ADD CONSTRAINT "similarity_results_compared_submission_id_fkey" FOREIGN KEY ("compared_submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_feedback" ADD CONSTRAINT "submission_feedback_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "activity_submissions"("submission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_feedback" ADD CONSTRAINT "submission_feedback_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks"("project_task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_members" ADD CONSTRAINT "repository_members_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_members" ADD CONSTRAINT "repository_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_activity" ADD CONSTRAINT "repository_activity_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_activity" ADD CONSTRAINT "repository_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_feedback" ADD CONSTRAINT "repository_feedback_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_feedback" ADD CONSTRAINT "repository_feedback_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
