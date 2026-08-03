BEGIN;

-- Normalize legacy class-code formatting only when every existing value can be
-- converted safely and without creating a collision. A failure rolls back the
-- complete migration and requires explicit data review.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "classes"
    WHERE regexp_replace(upper(trim("class_code")), '[-[:space:]]', '', 'g')
      !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$'
  ) THEN
    RAISE EXCEPTION 'Existing class codes cannot be normalized safely';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT regexp_replace(upper(trim("class_code")), '[-[:space:]]', '', 'g') AS normalized_code
      FROM "classes"
      GROUP BY normalized_code
      HAVING count(*) > 1
    ) duplicate_codes
  ) THEN
    RAISE EXCEPTION 'Existing class codes collide after normalization';
  END IF;
END $$;

UPDATE "classes"
SET "class_code" = regexp_replace(upper(trim("class_code")), '[-[:space:]]', '', 'g');

-- Add safely backfilled update timestamps to existing user records.
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMPTZ(3);
UPDATE "users" SET "updated_at" = "created_at";
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;

-- Add class lifecycle and join-code state without changing existing codes.
ALTER TABLE "classes"
ADD COLUMN "updated_at" TIMESTAMPTZ(3),
ADD COLUMN "archived_at" TIMESTAMPTZ(3),
ADD COLUMN "class_code_active" BOOLEAN,
ADD COLUMN "class_code_changed_at" TIMESTAMPTZ(3);

UPDATE "classes"
SET
  "updated_at" = "created_at",
  "class_code_active" = CASE
    WHEN "status" = 'ACTIVE'::"class_status" THEN TRUE
    ELSE FALSE
  END,
  "class_code_changed_at" = "created_at";

ALTER TABLE "classes"
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "class_code_active" SET DEFAULT TRUE,
ALTER COLUMN "class_code_active" SET NOT NULL,
ALTER COLUMN "class_code_changed_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "class_code_changed_at" SET NOT NULL;

-- Preserve membership rows while adding lifecycle timestamps.
ALTER TABLE "class_members"
ADD COLUMN "updated_at" TIMESTAMPTZ(3),
ADD COLUMN "removed_at" TIMESTAMPTZ(3),
ADD COLUMN "last_activated_at" TIMESTAMPTZ(3);

UPDATE "class_members"
SET
  "updated_at" = "joined_at",
  "last_activated_at" = "joined_at";

ALTER TABLE "class_members"
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "last_activated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "last_activated_at" SET NOT NULL;

COMMIT;
