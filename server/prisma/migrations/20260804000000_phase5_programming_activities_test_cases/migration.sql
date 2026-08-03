BEGIN;

CREATE TYPE "activity_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

ALTER TABLE "programming_activities"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "programming_activities"
ALTER COLUMN "status" TYPE "activity_status"
USING ("status"::text::"activity_status");

ALTER TABLE "programming_activities"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "programming_activities"
ADD COLUMN "entry_class_name" TEXT,
ADD COLUMN "starter_code" TEXT,
ADD COLUMN "total_points" DECIMAL(8,2),
ADD COLUMN "updated_at" TIMESTAMPTZ(3),
ADD COLUMN "published_at" TIMESTAMPTZ(3),
ADD COLUMN "closed_at" TIMESTAMPTZ(3),
ADD COLUMN "archived_at" TIMESTAMPTZ(3);

ALTER TABLE "test_cases"
ADD COLUMN "name" TEXT,
ADD COLUMN "created_at" TIMESTAMPTZ(3),
ADD COLUMN "updated_at" TIMESTAMPTZ(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "test_cases"
    WHERE "test_case_order" < 1
  ) THEN
    RAISE EXCEPTION 'Phase 5 migration requires every existing test-case order to be positive.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "programming_activities" AS activity
    WHERE COALESCE(
      (
        SELECT SUM(test_case."points")
        FROM "test_cases" AS test_case
        WHERE test_case."activity_id" = activity."activity_id"
      ),
      0
    ) > 1000
  ) THEN
    RAISE EXCEPTION 'Phase 5 migration cannot safely backfill an activity whose test-case points exceed 1000.';
  END IF;
END
$$;

UPDATE "programming_activities" AS activity
SET
  "entry_class_name" = 'Main',
  "starter_code" = 'public class Main { public static void main(String[] args) { } }',
  "total_points" = GREATEST(
    COALESCE(
      (
        SELECT SUM(test_case."points")
        FROM "test_cases" AS test_case
        WHERE test_case."activity_id" = activity."activity_id"
      ),
      0
    ),
    1
  ),
  "updated_at" = activity."created_at",
  "published_at" = CASE
    WHEN activity."status" IN ('PUBLISHED', 'CLOSED', 'ARCHIVED')
      THEN activity."created_at"
    ELSE NULL
  END,
  "closed_at" = CASE
    WHEN activity."status" IN ('CLOSED', 'ARCHIVED')
      THEN activity."due_date"
    ELSE NULL
  END,
  "archived_at" = CASE
    WHEN activity."status" = 'ARCHIVED'
      THEN activity."created_at"
    ELSE NULL
  END;

UPDATE "test_cases" AS test_case
SET
  "name" = 'Test case ' || test_case."test_case_order"::text,
  "created_at" = activity."created_at",
  "updated_at" = activity."created_at"
FROM "programming_activities" AS activity
WHERE activity."activity_id" = test_case."activity_id";

ALTER TABLE "programming_activities"
ALTER COLUMN "entry_class_name" SET NOT NULL,
ALTER COLUMN "entry_class_name" SET DEFAULT 'Main',
ALTER COLUMN "starter_code" SET NOT NULL,
ALTER COLUMN "total_points" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "test_cases"
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "programming_activities"
ADD CONSTRAINT "programming_activities_total_points_check"
CHECK ("total_points" > 0 AND "total_points" <= 1000),
ADD CONSTRAINT "programming_activities_entry_class_name_check"
CHECK ("entry_class_name" ~ '^[A-Za-z_$][A-Za-z0-9_$]*$'),
ADD CONSTRAINT "programming_activities_starter_code_nonempty_check"
CHECK (char_length(btrim("starter_code")) > 0),
ADD CONSTRAINT "programming_activities_archive_state_check"
CHECK (
  ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
  OR ("status" <> 'ARCHIVED' AND "archived_at" IS NULL)
),
ADD CONSTRAINT "programming_activities_publication_state_check"
CHECK (
  "status" NOT IN ('PUBLISHED', 'CLOSED')
  OR "published_at" IS NOT NULL
),
ADD CONSTRAINT "programming_activities_closed_state_check"
CHECK (
  "status" <> 'CLOSED'
  OR "closed_at" IS NOT NULL
);

ALTER TABLE "test_cases"
ADD CONSTRAINT "test_cases_order_positive_check"
CHECK ("test_case_order" >= 1),
ADD CONSTRAINT "test_cases_name_nonempty_check"
CHECK (char_length(btrim("name")) > 0);

CREATE INDEX "programming_activities_class_id_status_created_at_activity_id_idx"
ON "programming_activities"("class_id", "status", "created_at" DESC, "activity_id" ASC);

COMMIT;
