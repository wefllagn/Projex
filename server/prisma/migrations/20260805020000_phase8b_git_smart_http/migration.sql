CREATE TYPE "git_credential_operation" AS ENUM ('READ', 'WRITE');

CREATE TABLE "git_credentials" (
  "git_credential_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "repository_id" UUID NOT NULL,
  "secret_hash" TEXT NOT NULL,
  "allowed_operations" "git_credential_operation"[] NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "last_used_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "git_credentials_pkey" PRIMARY KEY ("git_credential_id"),
  CONSTRAINT "git_credentials_operations_check" CHECK (
    COALESCE(array_length("allowed_operations", 1), 0) BETWEEN 1 AND 2
    AND "allowed_operations" <@ ARRAY['READ', 'WRITE']::"git_credential_operation"[]
  ),
  CONSTRAINT "git_credentials_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "git_credentials_revocation_check" CHECK (
    "revoked_at" IS NULL OR "revoked_at" >= "created_at"
  )
);

CREATE INDEX "git_credentials_user_id_repository_id_expires_at_idx"
  ON "git_credentials"("user_id", "repository_id", "expires_at");
CREATE INDEX "git_credentials_repository_id_expires_at_idx"
  ON "git_credentials"("repository_id", "expires_at");

ALTER TABLE "git_credentials"
  ADD CONSTRAINT "git_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "git_credentials"
  ADD CONSTRAINT "git_credentials_repository_id_fkey"
  FOREIGN KEY ("repository_id") REFERENCES "repositories"("repository_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repository_activity"
  ADD COLUMN "transport_request_id" UUID;

CREATE UNIQUE INDEX "repository_activity_transport_request_id_key"
  ON "repository_activity"("transport_request_id");
