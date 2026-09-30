CREATE TYPE "academic_period" AS ENUM ('FIRST_SEMESTER', 'SECOND_SEMESTER');
CREATE TYPE "class_teaching_staff_status" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');

CREATE TABLE "courses" (
  "course_id" UUID NOT NULL,
  "course_number" VARCHAR(40) NOT NULL,
  "course_name" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);
CREATE UNIQUE INDEX "courses_course_number_key" ON "courses"("course_number");

ALTER TABLE "classes"
  ALTER COLUMN "instructor_id" DROP NOT NULL,
  ALTER COLUMN "section" DROP NOT NULL,
  ALTER COLUMN "semester" DROP NOT NULL,
  ALTER COLUMN "school_year" DROP NOT NULL,
  ADD COLUMN "course_id" UUID,
  ADD COLUMN "course_number_snapshot" VARCHAR(40),
  ADD COLUMN "course_name_snapshot" VARCHAR(200),
  ADD COLUMN "official_class_code" VARCHAR(100),
  ADD COLUMN "academic_period" "academic_period",
  ADD COLUMN "schedule" VARCHAR(200),
  ADD COLUMN "days" VARCHAR(100),
  ADD COLUMN "room" VARCHAR(100);

ALTER TABLE "classes" ADD CONSTRAINT "classes_active_primary_check"
  CHECK ("status" <> 'ACTIVE' OR "instructor_id" IS NOT NULL);
ALTER TABLE "classes" ADD CONSTRAINT "classes_prepared_inactive_check"
  CHECK ("status" <> 'PREPARED' OR
    ("instructor_id" IS NULL AND "class_code_active" = FALSE AND "official_class_code" IS NOT NULL));
ALTER TABLE "classes" ADD CONSTRAINT "classes_official_metadata_check"
  CHECK ("official_class_code" IS NULL OR
    ("course_id" IS NOT NULL AND "academic_period" IS NOT NULL AND
     "school_year" IS NOT NULL AND length(trim("school_year")) > 0));
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_snapshot_check"
  CHECK (("course_id" IS NULL AND "course_number_snapshot" IS NULL AND "course_name_snapshot" IS NULL)
     OR ("course_id" IS NOT NULL AND "course_number_snapshot" IS NOT NULL AND "course_name_snapshot" IS NOT NULL));

CREATE INDEX "classes_course_id_academic_period_school_year_idx"
  ON "classes"("course_id", "academic_period", "school_year");
CREATE INDEX "classes_official_class_code_idx" ON "classes"("official_class_code");
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "class_teaching_staff" (
  "class_teaching_staff_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "instructor_id" UUID NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "status" "class_teaching_staff_status" NOT NULL DEFAULT 'INVITED',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "removed_at" TIMESTAMPTZ(3),
  CONSTRAINT "class_teaching_staff_pkey" PRIMARY KEY ("class_teaching_staff_id"),
  CONSTRAINT "class_teaching_staff_state_check" CHECK (
    ("status" = 'INVITED' AND "accepted_at" IS NULL AND "removed_at" IS NULL) OR
    ("status" = 'ACTIVE' AND "accepted_at" IS NOT NULL AND "removed_at" IS NULL) OR
    ("status" = 'REMOVED' AND "removed_at" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "class_teaching_staff_class_id_instructor_id_key"
  ON "class_teaching_staff"("class_id", "instructor_id");
CREATE INDEX "class_teaching_staff_instructor_id_status_idx"
  ON "class_teaching_staff"("instructor_id", "status");
ALTER TABLE "class_teaching_staff" ADD CONSTRAINT "class_teaching_staff_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_teaching_staff" ADD CONSTRAINT "class_teaching_staff_instructor_id_fkey"
  FOREIGN KEY ("instructor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_teaching_staff" ADD CONSTRAINT "class_teaching_staff_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "class_staff_events" (
  "class_staff_event_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "subject_instructor_id" UUID NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "details_json" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_staff_events_pkey" PRIMARY KEY ("class_staff_event_id")
);
CREATE INDEX "class_staff_events_class_id_created_at_idx"
  ON "class_staff_events"("class_id", "created_at");
ALTER TABLE "class_staff_events" ADD CONSTRAINT "class_staff_events_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_staff_events" ADD CONSTRAINT "class_staff_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
