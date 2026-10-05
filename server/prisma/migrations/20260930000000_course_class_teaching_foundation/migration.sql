-- Add academic catalog and teaching-staff relationships without rewriting legacy classes.
ALTER TYPE "class_status" ADD VALUE 'PREPARED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'CLASS_OFFICIAL_METADATA_CORRECTED';