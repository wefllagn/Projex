-- Phase 7: project tasks, teams, repository collaboration, invitations, and feedback.

-- RenameEnum
ALTER TYPE "assignment_status" RENAME TO "project_task_status";

-- CreateEnum
CREATE TYPE "team_status" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "team_member_role" AS ENUM ('LEAD', 'MEMBER');
CREATE TYPE "team_member_status" AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE "repository_review_status" AS ENUM ('WORKING', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');
CREATE TYPE "repository_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');
CREATE TYPE "repository_feedback_status" AS ENUM ('DRAFT', 'RELEASED');

-- AlterTable: project_tasks
ALTER TABLE "project_tasks"
  ADD COLUMN "max_team_size" INTEGER,
  ADD COLUMN "updated_at" TIMESTAMPTZ(3),
  ADD COLUMN "published_at" TIMESTAMPTZ(3),
  ADD COLUMN "closed_at" TIMESTAMPTZ(3),
  ADD COLUMN "archived_at" TIMESTAMPTZ(3);

UPDATE "project_tasks"
SET
  "max_team_size" = 4,
  "updated_at" = "created_at",
  "published_at" = CASE WHEN "status" <> 'DRAFT' THEN "created_at" ELSE NULL END,
  "closed_at" = CASE WHEN "status" IN ('CLOSED', 'ARCHIVED') THEN "created_at" ELSE NULL END,
  "archived_at" = CASE WHEN "status" = 'ARCHIVED' THEN "created_at" ELSE NULL END;

ALTER TABLE "project_tasks"
  ALTER COLUMN "max_team_size" SET DEFAULT 4,
  ALTER COLUMN "max_team_size" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "project_tasks"
  ADD CONSTRAINT "project_tasks_max_team_size_check"
    CHECK ("max_team_size" BETWEEN 2 AND 8),
  ADD CONSTRAINT "project_tasks_title_nonempty_check"
    CHECK (length(btrim("title")) > 0),
  ADD CONSTRAINT "project_tasks_instructions_nonempty_check"
    CHECK (length(btrim("instructions")) > 0),
  ADD CONSTRAINT "project_tasks_lifecycle_check"
    CHECK (
      ("status" = 'DRAFT' AND "published_at" IS NULL AND "closed_at" IS NULL AND "archived_at" IS NULL)
      OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "closed_at" IS NULL AND "archived_at" IS NULL)
      OR ("status" = 'CLOSED' AND "published_at" IS NOT NULL AND "closed_at" IS NOT NULL AND "archived_at" IS NULL)
      OR ("status" = 'ARCHIVED' AND "published_at" IS NOT NULL AND "closed_at" IS NOT NULL AND "archived_at" IS NOT NULL)
    );

-- CreateTable: teams
CREATE TABLE "teams" (
  "team_id" UUID NOT NULL,
  "project_task_id" UUID NOT NULL,
  "lead_student_id" UUID NOT NULL,
  "team_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "status" "team_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "archived_at" TIMESTAMPTZ(3),
  CONSTRAINT "teams_pkey" PRIMARY KEY ("team_id"),
  CONSTRAINT "teams_team_id_project_task_id_key" UNIQUE ("team_id", "project_task_id"),
  CONSTRAINT "teams_team_id_lead_student_id_key" UNIQUE ("team_id", "lead_student_id"),
  CONSTRAINT "teams_project_task_id_normalized_name_key" UNIQUE ("project_task_id", "normalized_name"),
  CONSTRAINT "teams_name_nonempty_check" CHECK (length(btrim("team_name")) > 0),
  CONSTRAINT "teams_normalized_name_nonempty_check" CHECK (length(btrim("normalized_name")) > 0),
  CONSTRAINT "teams_lifecycle_check" CHECK (
    ("status" = 'ACTIVE' AND "archived_at" IS NULL)
    OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  )
);

-- CreateTable: team_members
CREATE TABLE "team_members" (
  "team_member_id" UUID NOT NULL,
  "team_id" UUID NOT NULL,
  "project_task_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "member_role" "team_member_role" NOT NULL,
  "status" "team_member_status" NOT NULL DEFAULT 'ACTIVE',
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "removed_at" TIMESTAMPTZ(3),
  "last_activated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_member_id"),
  CONSTRAINT "team_members_team_id_student_id_key" UNIQUE ("team_id", "student_id"),
  CONSTRAINT "team_members_lifecycle_check" CHECK (
    ("status" = 'ACTIVE' AND "removed_at" IS NULL)
    OR ("status" = 'REMOVED' AND "removed_at" IS NOT NULL)
  )
);

-- AlterTable: repositories
ALTER TABLE "repositories"
  ADD COLUMN "team_id" UUID,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "review_status" "repository_review_status" NOT NULL DEFAULT 'WORKING',
  ADD COLUMN "ready_for_review_at" TIMESTAMPTZ(3),
  ADD COLUMN "approved_at" TIMESTAMPTZ(3),
  ADD COLUMN "archived_at" TIMESTAMPTZ(3),
  ALTER COLUMN "storage_path" DROP NOT NULL;

UPDATE "repositories"
SET
  "visibility" = CASE
    WHEN "repository_type" = 'CLASS_PROJECT' THEN 'CLASS_ONLY'::"repository_visibility"
    ELSE 'PRIVATE'::"repository_visibility"
  END,
  "slug" = COALESCE(
    NULLIF(btrim(regexp_replace(lower("repository_name"), '[^a-z0-9]+', '-', 'g'), '-'), ''),
    'repository-' || left("repository_id"::text, 8)
  ),
  "archived_at" = CASE WHEN "status" = 'ARCHIVED' THEN "updated_at" ELSE NULL END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "repository_members"
    WHERE "status" = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Phase 7 migration requires explicit review of legacy PENDING repository members';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "repositories" r
    LEFT JOIN "users" u ON u."user_id" = r."owner_id"
    LEFT JOIN "project_tasks" pt ON pt."project_task_id" = r."project_task_id"
    LEFT JOIN "class_members" cm
      ON cm."class_id" = pt."class_id"
      AND cm."student_id" = r."owner_id"
      AND cm."status" = 'ACTIVE'
    LEFT JOIN "repository_members" rm
      ON rm."repository_id" = r."repository_id"
      AND rm."student_id" = r."owner_id"
      AND rm."member_role" = 'OWNER'
      AND rm."status" = 'ACTIVE'
    WHERE r."repository_type" = 'CLASS_PROJECT'
      AND (u."role" <> 'STUDENT' OR u."status" <> 'ACTIVE' OR cm."class_member_id" IS NULL OR rm."repository_member_id" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Phase 7 migration found an invalid class-project repository owner';
  END IF;

  IF EXISTS (
    SELECT rm."student_id", r."project_task_id"
    FROM "repository_members" rm
    JOIN "repositories" r ON r."repository_id" = rm."repository_id"
    WHERE r."repository_type" = 'CLASS_PROJECT' AND rm."status" = 'ACTIVE'
    GROUP BY rm."student_id", r."project_task_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase 7 migration found a student in multiple repositories for one project task';
  END IF;

  IF EXISTS (
    SELECT r."repository_id"
    FROM "repositories" r
    JOIN "project_tasks" pt ON pt."project_task_id" = r."project_task_id"
    LEFT JOIN "repository_members" rm
      ON rm."repository_id" = r."repository_id" AND rm."status" = 'ACTIVE'
    WHERE r."repository_type" = 'CLASS_PROJECT'
    GROUP BY r."repository_id", pt."max_team_size"
    HAVING count(rm."repository_member_id") > pt."max_team_size"
  ) THEN
    RAISE EXCEPTION 'Phase 7 migration found a repository above the project team-size limit';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "repositories"
    WHERE "repository_type" = 'CLASS_PROJECT'
    GROUP BY "project_task_id", "slug"
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM "repositories"
    WHERE "repository_type" = 'PERSONAL'
    GROUP BY "owner_id", "slug"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase 7 repository slug normalization produced a collision';
  END IF;
END $$;

INSERT INTO "teams" (
  "team_id", "project_task_id", "lead_student_id", "team_name", "normalized_name",
  "status", "created_at", "updated_at", "archived_at"
)
SELECT
  r."repository_id", r."project_task_id", r."owner_id", r."repository_name", r."slug",
  CASE WHEN r."status" = 'ARCHIVED' THEN 'ARCHIVED'::"team_status" ELSE 'ACTIVE'::"team_status" END,
  r."created_at", r."updated_at",
  CASE WHEN r."status" = 'ARCHIVED' THEN r."updated_at" ELSE NULL END
FROM "repositories" r
WHERE r."repository_type" = 'CLASS_PROJECT';

INSERT INTO "team_members" (
  "team_member_id", "team_id", "project_task_id", "student_id", "member_role", "status",
  "joined_at", "updated_at", "removed_at", "last_activated_at"
)
SELECT
  rm."repository_member_id", r."repository_id", r."project_task_id", rm."student_id",
  CASE WHEN rm."member_role" = 'OWNER' THEN 'LEAD'::"team_member_role" ELSE 'MEMBER'::"team_member_role" END,
  CASE WHEN rm."status" = 'ACTIVE' THEN 'ACTIVE'::"team_member_status" ELSE 'REMOVED'::"team_member_status" END,
  rm."joined_at", rm."joined_at",
  CASE WHEN rm."status" = 'REMOVED' THEN rm."joined_at" ELSE NULL END,
  rm."joined_at"
FROM "repository_members" rm
JOIN "repositories" r ON r."repository_id" = rm."repository_id"
WHERE r."repository_type" = 'CLASS_PROJECT';

UPDATE "repositories"
SET "team_id" = "repository_id"
WHERE "repository_type" = 'CLASS_PROJECT';

ALTER TABLE "repositories"
  ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "repositories"
  DROP CONSTRAINT "repositories_project_task_type_check";

ALTER TABLE "repositories"
  ADD CONSTRAINT "repositories_type_visibility_check" CHECK (
    ("repository_type" = 'CLASS_PROJECT' AND "project_task_id" IS NOT NULL AND "team_id" IS NOT NULL AND "visibility" = 'CLASS_ONLY')
    OR ("repository_type" = 'PERSONAL' AND "project_task_id" IS NULL AND "team_id" IS NULL AND "visibility" = 'PRIVATE')
  ),
  ADD CONSTRAINT "repositories_name_nonempty_check" CHECK (length(btrim("repository_name")) > 0),
  ADD CONSTRAINT "repositories_slug_nonempty_check" CHECK (length(btrim("slug")) > 0),
  ADD CONSTRAINT "repositories_review_lifecycle_check" CHECK (
    ("review_status" = 'WORKING' AND "ready_for_review_at" IS NULL AND "approved_at" IS NULL)
    OR ("review_status" IN ('READY_FOR_REVIEW', 'CHANGES_REQUESTED') AND "ready_for_review_at" IS NOT NULL AND "approved_at" IS NULL)
    OR ("review_status" = 'APPROVED' AND "ready_for_review_at" IS NOT NULL AND "approved_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "repositories_archive_lifecycle_check" CHECK (
    ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
    OR ("status" <> 'ARCHIVED' AND "archived_at" IS NULL)
  );

-- AlterTable: repository_members
ALTER TABLE "repository_members"
  ADD COLUMN "updated_at" TIMESTAMPTZ(3),
  ADD COLUMN "removed_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_activated_at" TIMESTAMPTZ(3);

UPDATE "repository_members"
SET
  "updated_at" = "joined_at",
  "removed_at" = CASE WHEN "status" = 'REMOVED' THEN "joined_at" ELSE NULL END,
  "last_activated_at" = "joined_at";

ALTER TABLE "repository_members"
  ALTER COLUMN "updated_at" SET NOT NULL,
  ALTER COLUMN "last_activated_at" SET NOT NULL,
  ADD CONSTRAINT "repository_members_no_pending_check" CHECK ("status" <> 'PENDING'),
  ADD CONSTRAINT "repository_members_lifecycle_check" CHECK (
    ("status" = 'ACTIVE' AND "removed_at" IS NULL)
    OR ("status" = 'REMOVED' AND "removed_at" IS NOT NULL)
  );

-- CreateTable: repository_invitations
CREATE TABLE "repository_invitations" (
  "invitation_id" UUID NOT NULL,
  "repository_id" UUID NOT NULL,
  "team_id" UUID NOT NULL,
  "project_task_id" UUID NOT NULL,
  "invitee_id" UUID NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "status" "repository_invitation_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "declined_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "expired_at" TIMESTAMPTZ(3),
  "resolution_reason" TEXT,
  CONSTRAINT "repository_invitations_pkey" PRIMARY KEY ("invitation_id"),
  CONSTRAINT "repository_invitations_expiry_check" CHECK (
    "expires_at" > "created_at" AND "expires_at" <= "created_at" + INTERVAL '7 days'
  ),
  CONSTRAINT "repository_invitations_lifecycle_check" CHECK (
    ("status" = 'PENDING' AND "accepted_at" IS NULL AND "declined_at" IS NULL AND "revoked_at" IS NULL AND "expired_at" IS NULL)
    OR ("status" = 'ACCEPTED' AND "accepted_at" IS NOT NULL AND "declined_at" IS NULL AND "revoked_at" IS NULL AND "expired_at" IS NULL)
    OR ("status" = 'DECLINED' AND "accepted_at" IS NULL AND "declined_at" IS NOT NULL AND "revoked_at" IS NULL AND "expired_at" IS NULL)
    OR ("status" = 'REVOKED' AND "accepted_at" IS NULL AND "declined_at" IS NULL AND "revoked_at" IS NOT NULL AND "expired_at" IS NULL)
    OR ("status" = 'EXPIRED' AND "accepted_at" IS NULL AND "declined_at" IS NULL AND "revoked_at" IS NULL AND "expired_at" IS NOT NULL)
  )
);

-- AlterTable: repository_feedback
ALTER TABLE "repository_feedback"
  ADD COLUMN "released_by_id" UUID,
  ADD COLUMN "status" "repository_feedback_status" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "updated_at" TIMESTAMPTZ(3);

UPDATE "repository_feedback"
SET
  "status" = CASE WHEN "released_at" IS NULL THEN 'DRAFT'::"repository_feedback_status" ELSE 'RELEASED'::"repository_feedback_status" END,
  "released_by_id" = CASE WHEN "released_at" IS NULL THEN NULL ELSE "instructor_id" END,
  "updated_at" = "created_at";

ALTER TABLE "repository_feedback"
  ALTER COLUMN "updated_at" SET NOT NULL,
  ADD CONSTRAINT "repository_feedback_text_nonempty_check" CHECK (length(btrim("feedback_text")) > 0),
  ADD CONSTRAINT "repository_feedback_release_check" CHECK (
    ("status" = 'DRAFT' AND "released_at" IS NULL AND "released_by_id" IS NULL)
    OR ("status" = 'RELEASED' AND "released_at" IS NOT NULL AND "released_by_id" IS NOT NULL)
  );

-- DropIndex
DROP INDEX "repositories_project_task_id_owner_id_key";

-- CreateIndex
CREATE INDEX "teams_project_task_id_status_idx" ON "teams"("project_task_id", "status");
CREATE INDEX "teams_lead_student_id_status_idx" ON "teams"("lead_student_id", "status");
CREATE INDEX "team_members_project_task_id_student_id_status_idx" ON "team_members"("project_task_id", "student_id", "status");
CREATE INDEX "team_members_student_id_status_idx" ON "team_members"("student_id", "status");
CREATE UNIQUE INDEX "team_members_one_active_team_per_task_key"
  ON "team_members"("project_task_id", "student_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "team_members_one_active_lead_key"
  ON "team_members"("team_id") WHERE "status" = 'ACTIVE' AND "member_role" = 'LEAD';
CREATE UNIQUE INDEX "repositories_team_id_key" ON "repositories"("team_id");
CREATE UNIQUE INDEX "repositories_team_id_project_task_id_key" ON "repositories"("team_id", "project_task_id");
CREATE UNIQUE INDEX "repositories_repository_id_team_task_key" ON "repositories"("repository_id", "team_id", "project_task_id");
CREATE UNIQUE INDEX "repositories_class_project_slug_key"
  ON "repositories"("project_task_id", "slug") WHERE "repository_type" = 'CLASS_PROJECT';
CREATE UNIQUE INDEX "repositories_personal_slug_key"
  ON "repositories"("owner_id", "slug") WHERE "repository_type" = 'PERSONAL';
CREATE INDEX "repositories_project_task_id_review_status_idx" ON "repositories"("project_task_id", "review_status");
CREATE UNIQUE INDEX "repository_members_one_active_owner_key"
  ON "repository_members"("repository_id") WHERE "status" = 'ACTIVE' AND "member_role" = 'OWNER';
CREATE INDEX "repository_invitations_repository_id_status_expires_at_idx"
  ON "repository_invitations"("repository_id", "status", "expires_at");
CREATE INDEX "repository_invitations_invitee_id_status_expires_at_idx"
  ON "repository_invitations"("invitee_id", "status", "expires_at");
CREATE INDEX "repository_invitations_project_task_id_status_expires_at_idx"
  ON "repository_invitations"("project_task_id", "status", "expires_at");
CREATE UNIQUE INDEX "repository_invitations_one_pending_per_task_invitee_key"
  ON "repository_invitations"("project_task_id", "invitee_id") WHERE "status" = 'PENDING';
DROP INDEX "repository_feedback_repository_id_idx";
CREATE INDEX "repository_feedback_repository_id_status_created_at_idx"
  ON "repository_feedback"("repository_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_project_task_id_fkey"
  FOREIGN KEY ("project_task_id") REFERENCES "project_tasks"("project_task_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_lead_student_id_fkey"
  FOREIGN KEY ("lead_student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_task_fkey"
  FOREIGN KEY ("team_id", "project_task_id") REFERENCES "teams"("team_id", "project_task_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_team_task_fkey"
  FOREIGN KEY ("team_id", "project_task_id") REFERENCES "teams"("team_id", "project_task_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_team_owner_fkey"
  FOREIGN KEY ("team_id", "owner_id") REFERENCES "teams"("team_id", "lead_student_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repository_invitations" ADD CONSTRAINT "repository_invitations_repository_team_task_fkey"
  FOREIGN KEY ("repository_id", "team_id", "project_task_id") REFERENCES "repositories"("repository_id", "team_id", "project_task_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_invitations" ADD CONSTRAINT "repository_invitations_team_task_fkey"
  FOREIGN KEY ("team_id", "project_task_id") REFERENCES "teams"("team_id", "project_task_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_invitations" ADD CONSTRAINT "repository_invitations_project_task_id_fkey"
  FOREIGN KEY ("project_task_id") REFERENCES "project_tasks"("project_task_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repository_invitations" ADD CONSTRAINT "repository_invitations_invitee_id_fkey"
  FOREIGN KEY ("invitee_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repository_invitations" ADD CONSTRAINT "repository_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repository_feedback" ADD CONSTRAINT "repository_feedback_released_by_id_fkey"
  FOREIGN KEY ("released_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cross-table academic-team/repository membership synchronization is checked at commit.
CREATE OR REPLACE FUNCTION "check_phase7_membership_invariants"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "teams" t
    LEFT JOIN "repositories" r ON r."team_id" = t."team_id"
    WHERE r."repository_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Phase 7 invariant: every team requires exactly one repository';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "repositories" r
    JOIN "teams" t ON t."team_id" = r."team_id"
    LEFT JOIN "team_members" tm
      ON tm."team_id" = t."team_id"
      AND tm."student_id" = t."lead_student_id"
      AND tm."member_role" = 'LEAD'
      AND tm."status" = 'ACTIVE'
    LEFT JOIN "repository_members" rm
      ON rm."repository_id" = r."repository_id"
      AND rm."student_id" = r."owner_id"
      AND rm."member_role" = 'OWNER'
      AND rm."status" = 'ACTIVE'
    WHERE r."repository_type" = 'CLASS_PROJECT'
      AND (r."owner_id" <> t."lead_student_id" OR tm."team_member_id" IS NULL OR rm."repository_member_id" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Phase 7 invariant: team lead and repository owner must remain synchronized';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "repositories" r
    JOIN "team_members" tm ON tm."team_id" = r."team_id"
    LEFT JOIN "repository_members" rm
      ON rm."repository_id" = r."repository_id" AND rm."student_id" = tm."student_id"
    WHERE r."repository_type" = 'CLASS_PROJECT'
      AND (rm."repository_member_id" IS NULL OR rm."status"::text <> tm."status"::text)
  ) OR EXISTS (
    SELECT 1
    FROM "repositories" r
    JOIN "repository_members" rm ON rm."repository_id" = r."repository_id"
    LEFT JOIN "team_members" tm
      ON tm."team_id" = r."team_id" AND tm."student_id" = rm."student_id"
    WHERE r."repository_type" = 'CLASS_PROJECT'
      AND (tm."team_member_id" IS NULL OR tm."status"::text <> rm."status"::text)
  ) THEN
    RAISE EXCEPTION 'Phase 7 invariant: team and repository membership must remain synchronized';
  END IF;

  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER "team_members_phase7_invariant"
AFTER INSERT OR UPDATE OR DELETE ON "team_members"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_phase7_membership_invariants"();

CREATE CONSTRAINT TRIGGER "repository_members_phase7_invariant"
AFTER INSERT OR UPDATE OR DELETE ON "repository_members"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_phase7_membership_invariants"();

CREATE CONSTRAINT TRIGGER "repositories_phase7_invariant"
AFTER INSERT OR UPDATE OR DELETE ON "repositories"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_phase7_membership_invariants"();

CREATE CONSTRAINT TRIGGER "teams_phase7_invariant"
AFTER INSERT OR UPDATE OR DELETE ON "teams"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_phase7_membership_invariants"();
