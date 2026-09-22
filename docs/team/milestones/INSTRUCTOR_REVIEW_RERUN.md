# Instructor Review Rerun — WIP checkpoint evidence

Status: implementation and guarded validation prepared as an **unaccepted WIP checkpoint** on `iteration-2/julius-i2-1-academic-workspace`. The I2.1 core and roadmap/checklist were committed separately before this work. A WIP commit or push does not mark Instructor Rerun complete; normal-database migration, authenticated walkthrough, retention policy, and final feature acceptance remain separate gates.

Team continuation is prepared in [`../INSTRUCTOR_RERUN_TEAM_HANDOFF.md`](../INSTRUCTOR_RERUN_TEAM_HANDOFF.md). That document is a WIP transfer plan, not an acceptance record or permission to migrate normal data.

## Behavior

An ACTIVE owning Instructor can request a fresh execution from the canonical submission-review page, including after result release or activity close. The API accepts no new source or custom stdin. It copies the accepted submission's original visible and hidden test-input snapshots into a separate review-run record, then queues `INSTRUCTOR_REVIEW_RUN` for the existing separate Java worker. The worker reads `ActivitySubmission.sourceCode`, supplies each saved stdin input, and stores new compiler/runtime/output diagnostics in review-run tables. The original submission, assessment, score, feedback, release and attempt count are not changed. Students and Admins cannot read or create review runs; a wrong submission/run pair fails closed. Archive prevents new runs but allows the owning Instructor to read an existing run.

The UI labels fresh results separately from original assessment evidence, uses bounded non-overlapping polling with manual refresh, and does not present rerun output as a new grade. The client sends an empty JSON body; source, test selection, paths, command arguments and execution limits remain server-owned. One active run per Instructor and at most ten starts per minute cap requests. The existing controlled-local Java runner retains its compile/test timeouts, output and heap limits, process-tree termination and temporary-directory cleanup. This is still not an OS-level hostile-code sandbox.

## Database and migration gate

Two non-destructive migrations add the enum value in one committed step, then create `ReviewExecution` / `ReviewExecutionCase` and the exclusive `ExecutionJob` target/check constraint. PostgreSQL rejected the first draft's same-transaction enum use (`55P04`); the failed transaction left no enum/table changes in `projex_test`. That failed attempt was marked rolled back only in `projex_test`, the migration was split, and both corrected migrations were successfully applied there. The normal local `projex` database was read-only checked: zero Iteration 2 migrations applied. No migration was applied to it.

The guarded test database was confirmed empty across 30 existing application models before migration/tests and empty across all 32 models after tests. Migration history was preserved. No normal application records were mutated by verification.

## Verification

- Guarded PostgreSQL suite: 19 files, 89 tests passed, including real Java rerun, saved stdin, compiler error, infrastructure failure, immutable released result and attempt state, archive/cross-owner/Student/Admin denial, and authenticated HTTP/CSRF/body/identity checks.
- Client suite: 46 files, 294 tests passed. Existing route-test warning remains; Instructor review rerun uses backend-shaped results and does not trigger review, correction or release mutations.
- Server isolated suite: 36 files, 224 tests passed.
- Final rerun: client 46 files/294 tests, server isolated 36/224, Java 3/24; client/server lint, server type checks, server build, and client build passed. Client build retains the known >500 kB chunk warning. `git diff --check` passed at the initial pre-commit review; the logical rerun slice is 27 files (23 modified and four new) with no package, lockfile, credential, environment, network, or unrelated feature changes.
- No authenticated normal-local visual walkthrough was attempted: the new schema is intentionally not migrated to `projex`. The responsive review panel reuses existing Instructor review/card styles and the existing narrow breakpoint; an authenticated desktop/narrow walkthrough remains an acceptance check after an approved normal-local migration.

## Remaining limits

- Rerun uses saved activity test inputs; it does not provide an arbitrary Instructor stdin console or Student manual stdin.
- Review-run diagnostic history is durable and currently has no separate retention/cleanup policy. Request rate and active capacity are bounded, but long-term storage policy needs a later operational decision.
- Normal database migration, final feature acceptance, branch integration, and hosted Java isolation remain separate gates. A reviewed WIP handoff commit is not acceptance.
