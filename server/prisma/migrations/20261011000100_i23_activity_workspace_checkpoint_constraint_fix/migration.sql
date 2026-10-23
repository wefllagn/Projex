ALTER TABLE "repository_checkpoint_jobs"
  DROP CONSTRAINT "repository_checkpoint_entry_file_check";

ALTER TABLE "repository_checkpoint_jobs"
  ADD CONSTRAINT "repository_checkpoint_entry_file_check"
  CHECK ("entry_file_path" ~ '^[A-Za-z_$][A-Za-z0-9_$]*\.java$');
