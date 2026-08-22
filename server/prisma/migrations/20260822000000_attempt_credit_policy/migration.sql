CREATE TYPE "attempt_credit_policy" AS ENUM ('LATEST', 'HIGHEST');

ALTER TABLE "programming_activities"
  ADD COLUMN "credit_policy" "attempt_credit_policy" NOT NULL DEFAULT 'LATEST';
