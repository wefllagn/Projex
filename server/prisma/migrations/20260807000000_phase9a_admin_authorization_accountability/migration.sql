-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM (
  'USER_STUDENT_PROVISIONED',
  'USER_INSTRUCTOR_PROVISIONED',
  'USER_SETUP_REISSUED',
  'USER_STATUS_CHANGED',
  'USER_SESSIONS_REVOKED',
  'CLASS_CREATED',
  'CLASS_UPDATED',
  'CLASS_ARCHIVED',
  'CLASS_RESTORED',
  'CLASS_JOIN_CODE_ROTATED',
  'CLASS_JOIN_CODE_REVOKED',
  'CLASS_MEMBER_REMOVED',
  'CLASS_MEMBER_REACTIVATED'
);

-- CreateEnum
CREATE TYPE "AdminAuditTargetType" AS ENUM ('USER', 'CLASS', 'CLASS_MEMBER');

-- CreateTable
CREATE TABLE "admin_audit_events" (
  "admin_audit_event_id" UUID NOT NULL,
  "actor_admin_id" UUID NOT NULL,
  "action" "AdminAuditAction" NOT NULL,
  "target_type" "AdminAuditTargetType" NOT NULL,
  "target_id" UUID,
  "reason" VARCHAR(500),
  "request_id" UUID NOT NULL,
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("admin_audit_event_id")
);

-- CreateIndex
CREATE INDEX "admin_audit_events_actor_admin_id_created_at_idx"
ON "admin_audit_events"("actor_admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_events_action_created_at_idx"
ON "admin_audit_events"("action", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_events_target_type_target_id_created_at_idx"
ON "admin_audit_events"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "admin_audit_events"
ADD CONSTRAINT "admin_audit_events_actor_admin_id_fkey"
FOREIGN KEY ("actor_admin_id") REFERENCES "users"("user_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
