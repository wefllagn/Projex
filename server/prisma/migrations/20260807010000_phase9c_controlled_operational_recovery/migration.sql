-- Phase 9C extends the existing typed administrative audit vocabulary only.
-- It creates no recovery table, counter, job model, or data backfill.

ALTER TYPE "AdminAuditAction"
  ADD VALUE 'GIT_CREDENTIAL_REVOKED';

ALTER TYPE "AdminAuditAction"
  ADD VALUE 'REPOSITORY_PROVISIONING_RETRY_QUEUED';

ALTER TYPE "AdminAuditTargetType"
  ADD VALUE 'GIT_CREDENTIAL';

ALTER TYPE "AdminAuditTargetType"
  ADD VALUE 'REPOSITORY_PROVISIONING_JOB';
