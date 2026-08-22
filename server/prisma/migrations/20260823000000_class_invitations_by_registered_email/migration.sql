CREATE TYPE "class_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "class_invitations" (
  "class_invitation_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "invitee_id" UUID NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "status" "class_invitation_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMPTZ(3),

  CONSTRAINT "class_invitations_pkey" PRIMARY KEY ("class_invitation_id"),
  CONSTRAINT "class_invitations_response_state_check" CHECK (
    ("status" = 'PENDING' AND "responded_at" IS NULL)
    OR ("status" IN ('ACCEPTED', 'DECLINED') AND "responded_at" IS NOT NULL)
  )
);

CREATE INDEX "class_invitations_invitee_id_status_created_at_idx"
  ON "class_invitations"("invitee_id", "status", "created_at");

CREATE INDEX "class_invitations_class_id_status_created_at_idx"
  ON "class_invitations"("class_id", "status", "created_at");

CREATE UNIQUE INDEX "class_invitations_one_pending_per_student_idx"
  ON "class_invitations"("class_id", "invitee_id")
  WHERE "status" = 'PENDING';

ALTER TABLE "class_invitations"
  ADD CONSTRAINT "class_invitations_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("class_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_invitations"
  ADD CONSTRAINT "class_invitations_invitee_id_fkey"
  FOREIGN KEY ("invitee_id") REFERENCES "users"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_invitations"
  ADD CONSTRAINT "class_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
