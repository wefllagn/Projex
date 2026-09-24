# Instructor Review Rerun — accepted Freiser checkpoint

Status: **accepted for Freiser's Instructor Rerun checkpoint** on `iteration-2/freiser-work-01` after ChatGPT Checker review. Protected-branch integration remains a separate gate. Julius's original handoff on `iteration-2/julius-i2-1-academic-workspace` was unaccepted WIP; its historical evidence is retained below.

The historical transfer plan is [`../INSTRUCTOR_RERUN_TEAM_HANDOFF.md`](../INSTRUCTOR_RERUN_TEAM_HANDOFF.md); the Freiser continuation and acceptance evidence in this report supersede its pending-work status.

## Behavior

An ACTIVE owning Instructor can request a fresh execution from the canonical submission-review page, including after result release or activity close. The API accepts no new source or custom stdin. It copies the accepted submission's original visible and hidden test-input snapshots into a separate review-run record, then queues `INSTRUCTOR_REVIEW_RUN` for the existing separate Java worker. The worker reads `ActivitySubmission.sourceCode`, supplies each saved stdin input, and stores new compiler/runtime/output diagnostics in review-run tables. The original submission, assessment, score, feedback, release and attempt count are not changed. Students and Admins cannot read or create review runs; a wrong submission/run pair fails closed. Archive prevents new runs but allows the owning Instructor to read an existing run.

The UI labels fresh results separately from original assessment evidence, uses bounded non-overlapping polling with manual refresh, and does not present rerun output as a new grade. The client sends an empty JSON body; source, test selection, paths, command arguments and execution limits remain server-owned. One active run per Instructor and at most ten starts per minute cap requests. The existing controlled-local Java runner retains its compile/test timeouts, output and heap limits, process-tree termination and temporary-directory cleanup. This is still not an OS-level hostile-code sandbox.

## Database and migration gate at Julius's handoff (historical)

Two non-destructive migrations add the enum value in one committed step, then create `ReviewExecution` / `ReviewExecutionCase` and the exclusive `ExecutionJob` target/check constraint. PostgreSQL rejected the first draft's same-transaction enum use (`55P04`); the failed transaction left no enum/table changes in `projex_test`. That failed attempt was marked rolled back only in `projex_test`, the migration was split, and both corrected migrations were successfully applied there. The normal local `projex` database was read-only checked: zero Iteration 2 migrations applied. No migration was applied to it.

The guarded test database was confirmed empty across 30 existing application models before migration/tests and empty across all 32 models after tests. Migration history was preserved. No normal application records were mutated by verification.

## Verification at Julius's handoff (historical)

- Guarded PostgreSQL suite: 19 files, 89 tests passed, including real Java rerun, saved stdin, compiler error, infrastructure failure, immutable released result and attempt state, archive/cross-owner/Student/Admin denial, and authenticated HTTP/CSRF/body/identity checks.
- Client suite: 46 files, 294 tests passed. Existing route-test warning remains; Instructor review rerun uses backend-shaped results and does not trigger review, correction or release mutations.
- Server isolated suite: 36 files, 224 tests passed.
- Final rerun: client 46 files/294 tests, server isolated 36/224, Java 3/24; client/server lint, server type checks, server build, and client build passed. Client build retains the known >500 kB chunk warning. `git diff --check` passed at the initial pre-commit review; the logical rerun slice is 27 files (23 modified and four new) with no package, lockfile, credential, environment, network, or unrelated feature changes.
- No authenticated normal-local visual walkthrough was attempted: the new schema is intentionally not migrated to `projex`. The responsive review panel reuses existing Instructor review/card styles and the existing narrow breakpoint; an authenticated desktop/narrow walkthrough remains an acceptance check after an approved normal-local migration.

## Remaining limits

- Rerun uses saved activity test inputs; it does not provide an arbitrary Instructor stdin console or Student manual stdin.
- Julius decided that review-run diagnostic/history records remain durable throughout Iteration 2, with no automatic expiration or cleanup yet. They remain separate from official attempts, assessment evidence, feedback, corrections, and released scores.
- Protected-branch integration and hosted Java isolation remain separate gates. The normal-local migration and Freiser checkpoint acceptance were subsequently completed as recorded below.

## Freiser continuation — September 24, 2026

Freiser continued from handoff `90d8c4a3864d2d9b8bc41ca9b1570c1f52d5b096`. A focused frontend test reproduced overlapping automatic and manual rerun requests after a bounded stop. The review page now holds automatic polling while a manual refresh is in flight, resumes it only after an active response, and clears the stopped message after a terminal response. Two frontend regression tests cover the overlap and terminal response. A guarded integration test covers the ten-starts-per-minute limit.

Freiser's guarded `projex_test` suite passed 19 files/90 tests. Its two rerun migrations are finished, with no unresolved migration; all 32 application tables were empty after the suite. Client tests passed 46 files/296 tests; Java tests passed 3 files/24 tests outside the Windows sandbox. Client and server lint, server type checks (including integration), and both builds passed; the client build retains its known chunk-size warning. The server isolated suite passed 221/224 tests. Three failures in unchanged repository-storage and restore-verifier tests concern Windows temporary-path canonicalization; they also failed outside the sandbox and are not claimed as a passing check. The rerun logical diff and `git diff --check` passed review without package, lockfile, credential, environment, network, or unrelated feature changes in Freiser's edits.

At the earlier Freiser verification checkpoint, normal `projex` was read-only checked: 13 migration records, no rerun migration, no unresolved migration. No normal-data migration or write occurred at that checkpoint. The subsequently approved local continuation and walkthrough are recorded below. I2.2 has not started.

## Freiser controlled-local continuation — September 24, 2026

Julius authorized the already-reviewed migrations and minimum local walkthrough prerequisites. Before `npx.cmd prisma migrate deploy --schema prisma/schema.prisma`, Freiser verified the normal target was loopback `projex`, the expected local user, 13 completed migrations, no pending drift/unresolved failure, and exactly the two committed rerun migrations pending. Deploy applied only `20260922000000_instructor_review_run_type` and `20260922000100_instructor_review_runs`; both now have finished migration records. No reset, `db push`, or other migration was used. Existing normal records were preserved.

Using the supported Admin bootstrap, Admin provisioning/setup, Instructor class/activity authoring, and Student submission APIs, Freiser established one fresh local Admin, ACTIVE Instructor, ACTIVE Student, and class membership. The controlled class has two Java activities and two immutable Student submissions: the first assessment failed while the Java worker ran inside the restricted Windows process sandbox; the second was assessed successfully after the controlled-local worker was run outside that sandbox. The first activity remains published and supplies a separate failure view. The second has a released 10/10 result and was archived after closed/released rerun validation. Credentials reside only in a Git-ignored private local file; setup previews and `server/.env` remain ignored. The API and Vite bound to `127.0.0.1` with process-only settings; no persistent Java/network configuration changed.

Authenticated desktop (1280 px) and narrow (390 px) Instructor review walkthroughs completed. The Instructor saw read-only submitted source, original visible/hidden assessment evidence, a separately labelled fresh diagnostic, queued and terminal rerun states, bounded polling stop, manual refresh, and resumed polling to success. The worker's claim/completion logs established the running transition; execution finished too quickly for a separate stable running-frame screenshot. A released result remained 10/10 after further reruns, including when the activity was closed. The narrow archived view removed the start control and explained why; an existing archived run remained readable to the owning Instructor, while a new start returned `SUBMISSION_NOT_FOUND`. A separate controlled rerun displayed compiler success with runtime error without changing the original failed assessment.

The Student desktop UI displayed the released result and only the visible-test outcome; hidden definitions, count, and Instructor rerun diagnostics were absent. Live API reads returned 403 for Student and Admin and 200 for the owning Instructor. Guarded integration tests cover cross-owner and wrong submission/run pairing. Read-only normal-database checks found one unchanged attempt, two original passing assessment cases, unchanged released feedback timestamp and 10/10 score after the closed/released rerun, copied visible/hidden stdin snapshots, and no score corrections. The post-release submission update timestamp preceded the later reruns.

The walkthrough found horizontal overflow in the Instructor review grid at 1280 px and in the class header at 390 px. A scoped CSS correction now keeps the review content within the viewport (`scrollWidth` 1265 at 1280 px and 375 at 390 px); narrow case summaries use two readable columns. This is the only new source change in the local-continuation step. Client lint and build and `git diff --check` passed after the CSS change. Earlier Freiser-run guarded integration 19/90, client 46/296, Java 3/24, server lint/type/build, and the separate server-isolated 221/224 result remain valid because their related code did not change. The three Windows repository-storage/restore-verifier failures remain unresolved and unchanged.

ChatGPT Checker approved Instructor Rerun for **Freiser's checkpoint**. Julius decided to retain its diagnostic/history records for Iteration 2 without automatic cleanup or expiration; these records remain separate from official academic records. No retention job or expiration duration was implemented. The three unchanged Windows server-isolated failures are tracked separately as inherited repository-storage/restore-verifier work:

- `restore-verifier.test.ts` — `validates artifacts and creates safe restore/fsck argument arrays`: `GIT_REPOSITORY_OUTSIDE_RESTORE_ROOT`.
- `repository-storage.test.ts` — `resolves exact legacy locators through UUID-derived components and verifies the marker`: `STORAGE_ROOT_CANONICAL_MISMATCH`.
- `repository-storage.test.ts` — `rejects a managed path redirected through a link or junction`: expected `STORAGE_REPARSE_POINT_REJECTED`, received `STORAGE_ROOT_CANONICAL_MISMATCH`.

The storage/restore files were unchanged by Freiser; the same three failures recurred outside the Windows sandbox. Protected-branch integration, hostile-code Java isolation, and I2.2 remain separate work and approval gates.
