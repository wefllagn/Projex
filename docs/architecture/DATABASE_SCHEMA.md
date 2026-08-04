# Projex Database Schema

## Scope

Phase 2 established the core PostgreSQL schema. Phases 3 through 6 added authentication, user/class management, programming activities, immutable submissions, and automated assessment. Phase 7 adds class-linked project tasks, teams, synchronized collaborator membership, repository metadata, invitations, textual feedback, and review lifecycle. Git operations, repository filesystem storage, numeric project grading/rubrics, seed data, and frontend integration remain outside Phase 7.

The authoritative sources are:

- `server/prisma/schema.prisma` for Prisma models, enums, relations, and Prisma-managed indexes.
- `server/prisma/migrations/20260730000000_init_core_schema/migration.sql` for the applied PostgreSQL schema, including SQL-only checks and the partial unique index.
- `server/prisma/migrations/20260730044437_auth_status_setup_pending/migration.sql` and `20260730044438_auth_account_sessions/migration.sql` for Phase 3 authentication state.
- `server/prisma/migrations/20260731000000_phase4_user_class_management/migration.sql` for additive Phase 4 lifecycle fields and safe backfills.
- `server/prisma/migrations/20260804000000_phase5_programming_activities_test_cases/migration.sql` for Phase 5 activity/test-case lifecycle fields, constraints, and safe backfills.
- `server/prisma/migrations/20260804010000_phase6_submissions_automated_assessment/migration.sql` for Phase 6 immutable submission snapshots, execution jobs/results, review/release fields, replacement grants, and visible-test practice records.
- `server/prisma/migrations/20260805000000_phase7_project_repository_collaboration/migration.sql` for Phase 7 project-task lifecycle, teams, synchronized memberships, repository metadata/review state, invitations, feedback release, constraints, indexes, and deferred invariant triggers.

## Core models

| Prisma model | PostgreSQL table | Purpose |
| --- | --- | --- |
| `User` | `users` | Academic identity, role, and account status. |
| `AccountSetupToken` | `account_setup_tokens` | Single-use provisioned-account setup state. |
| `RefreshSession` | `refresh_sessions` | Rotatable, revocable browser/device session state. |
| `Class` | `classes` | Instructor-owned class, section, and term workspace. |
| `ClassMember` | `class_members` | Student enrollment and membership lifecycle. |
| `ProgrammingActivity` | `programming_activities` | Programming workspace definition and attempt limit. |
| `TestCase` | `test_cases` | Ordered visible or hidden activity test. |
| `ActivitySubmission` | `activity_submissions` | Immutable numbered student attempt and score snapshot. |
| `SubmissionExecution` | `submission_executions` | Compile/runtime execution record for a submission. |
| `TestCaseResult` | `test_case_results` | Immutable test definition snapshot plus automated execution result. |
| `SimilarityResult` | `similarity_results` | Directed comparison between two submissions. |
| `SubmissionFeedback` | `submission_feedback` | Instructor feedback and release state. |
| `SubmissionIdempotency` | `submission_idempotencies` | Hashed student/activity request identity linked to one accepted attempt. |
| `SubmissionScoreCorrection` | `submission_score_corrections` | Append-only automated-score correction history. |
| `SubmissionFailureResolution` | `submission_failure_resolutions` | Immutable infrastructure-failure resolution and optional expiring replacement grant. |
| `ExecutionJob` | `execution_jobs` | Durable official/practice queue record with claim, lease, retry, and terminal state. |
| `PracticeExecution` | `practice_executions` | Short-lived Run Visible Tests source/job record that is not a submission. |
| `PracticeExecutionCase` | `practice_execution_cases` | Visible-only practice test snapshot and outcome. |
| `ProjectTask` | `project_tasks` | Class project work linked to repositories. |
| `Team` | `teams` | One class-project team with an immutable lead during Phase 7. |
| `TeamMember` | `team_members` | Team membership lifecycle synchronized with repository membership. |
| `Repository` | `repositories` | Server-owned repository metadata and project linkage. |
| `RepositoryMember` | `repository_members` | Student repository membership and role. |
| `RepositoryInvitation` | `repository_invitations` | Time-limited collaborator invitation and resolution history. |
| `RepositoryActivity` | `repository_activity` | Repository contribution and activity record. |
| `RepositoryFeedback` | `repository_feedback` | Instructor textual feedback draft/release history; numeric grading is unused in Phase 7. |

The schema uses UUID primary keys, snake-case database names, `timestamptz(3)` event timestamps, fixed-precision decimals for points/scores, explicit foreign-key update/delete actions, and text columns for long-form content.

Phase 4 adds:

- `User.updatedAt` with Prisma `@updatedAt`, backfilled from `createdAt`.
- `Class.updatedAt` with Prisma `@updatedAt`, `archivedAt`, `classCodeActive`, and `classCodeChangedAt`.
- `ClassMember.updatedAt` with Prisma `@updatedAt`, `removedAt`, and `lastActivatedAt`.
- ACTIVE existing classes receive an active code; ARCHIVED existing classes receive an inactive code.
- Existing class code change times are backfilled from class creation, and membership activation times from original join time.
- Existing code formatting is normalized transactionally only after preflight validation; invalid legacy codes or normalized collisions abort and roll back the migration for explicit review.

Phase 5 adds:

- A dedicated `ActivityStatus` database enum for programming activities while preserving the historical `AssignmentStatus` used by project tasks.
- `ProgrammingActivity.entryClassName`, `starterCode`, `totalPoints`, `updatedAt`, `publishedAt`, `closedAt`, and `archivedAt`.
- `TestCase.name`, `createdAt`, and `updatedAt`.
- Conservative backfills: entry class `Main`, a safe Java starter template, total points derived from existing test points with a positive minimum, test names derived from order, and lifecycle timestamps derived from existing status/timestamps.
- A composite activity-list index and SQL checks for total-point bounds, Java entry-class syntax, non-empty starter code/test names, positive test order, and lifecycle timestamp consistency.

Phase 6 adds:

- Immutable activity/source/test snapshots on every accepted submission, including SHA-256 source hash, due date, total points, automated/instructor maxima, visibility, test order, inputs, expected outputs, and per-test maximum points.
- Positive chronological `attemptNumber` without an upper bound of three; usable allowance is represented by `countsTowardAttemptLimit` because a replacement record may make the chronological sequence exceed `maxAttempts`.
- A one-to-one submission execution, durable execution job, and hashed idempotency record for each accepted submission.
- Append-only score-correction rows and a one-to-one feedback draft/release record.
- A one-to-one failure resolution with optional single-use replacement linkage, mandatory future expiration for replacement grants, actor, reason, resolution time, and consumption time.
- Short-lived practice execution and visible-only case snapshot tables, with a durable job but no submission, attempt, or score relationship.
- SQL checks for source hashes, scoring component bounds, release state, execution chronology, correction/resolution state, practice chronology, and execution-job target/claim consistency.

Phase 7 adds:

- `ProjectTask.maxTeamSize`, `updatedAt`, and publish/close/archive timestamps, with the dedicated `ProjectTaskStatus` enum retaining the existing database enum name.
- `Team` and `TeamMember` records with immutable lead ownership, active/removed history, and one active team per student/project task.
- Repository team linkage, server-generated slug, nullable Phase 7 `storagePath`, optimistic-concurrency and review timestamps, and server-controlled visibility.
- Repository-member lifecycle timestamps and role/status integrity.
- Repository invitations with inviter/invitee, project/team/repository scope, lifecycle timestamps, expiry, and corrective resolution reason.
- Repository textual feedback draft/release state with instructor and releaser identity.
- SQL checks, partial unique indexes, composite foreign keys, and deferred constraint triggers that reject any committed class-project team/repository membership mismatch or owner/lead mismatch.

## Database-enforced invariants

- Activity `maxAttempts` remains limited to 1 through 3. Submission `attemptNumber` is a positive chronological record sequence and may exceed three only when preserved infrastructure failures and replacements require it.
- Activity total points are greater than zero and no more than 1000; Java entry-class names and starter code satisfy minimum database safety checks.
- Test-case order is positive and unique per activity, and test-case names are non-empty.
- Test-case points, automated scores, final scores, automated points, instructor points, correction values, execution time, and optional repository grades cannot be negative where specified.
- Submission execution completion cannot precede its start.
- A similarity record cannot compare a submission with itself, and its percentage is limited to 0 through 100.
- A `CLASS_PROJECT` repository requires `projectTaskId`; a `PERSONAL` repository forbids it.
- A partial unique index permits multiple personal repositories while allowing only one repository per non-null `(projectTaskId, ownerId)` pair.
- Compound unique constraints protect class membership, submission attempt numbering, test ordering/results, similarity pairs, and repository membership.
- Every `CLASS_PROJECT` repository has one team and project task, uses `CLASS_ONLY`, and has an owner matching the ACTIVE team lead and ACTIVE repository owner member.
- Every `PERSONAL` repository has no team/project task and uses `PRIVATE`; `PUBLIC` is rejected in Phase 7.
- Partial unique indexes allow only one ACTIVE team per student/project task, one ACTIVE lead per team, one ACTIVE repository owner, and one PENDING invitation per invitee/project task.
- Deferred constraint triggers require each class-project `TeamMember` to have a matching `RepositoryMember` with the same ACTIVE/REMOVED state and prohibit unmatched repository members.

Prisma cannot represent the `CHECK` constraints or partial unique repository index in the data model. They are intentionally maintained in the migration SQL and must be preserved during future migration review.

## Service-layer rules

The following rules require transactional application services because they depend on roles, related-row state, historical state, or cross-row calculations that cannot be fully expressed by the current schema alone.

1. Only ACTIVE instructors may own classes. Programming-activity creation and management require the owning ACTIVE instructor or an ACTIVE administrator.
2. Only users with role `STUDENT` may be class members, own activity submissions, or be student repository members.
3. The backend assigns `attemptNumber` atomically; clients never choose the authoritative value.
4. Ordinary attempt eligibility uses the count of submissions with `countsTowardAttemptLimit = true`, not the chronological `attemptNumber`. The service allocates the next number and enforces the usable allowance in the same serializable transaction.
5. After submission, `activityId`, `studentId`, `attemptNumber`, `sourceCode`, and `submittedAt` are immutable.
6. Activity test cases, starter code, language/entry-class settings, and scoring configuration are locked at publication, before submissions exist.
7. `originalAutomatedScore` and original per-test automated results are immutable assessment evidence.
8. A professor-facing `Edit Automated Score` action appends a correction preserving the original score, previous effective score, new effective score, mandatory reason, instructor identity, and timestamp. Earlier corrections remain immutable.
9. `automatedMaximum` equals the snapshotted test-point sum; `instructorMaximum = totalPointsSnapshot - automatedMaximum`; the effective automated score and instructor points stay within their respective maxima, and the released final score stays within the total.
10. Infrastructure retries reuse the original submission/job. A replacement grant changes the failed row to non-counting only through immutable resolution, then atomically links one new counting replacement submission before expiration.
11. Active unconsumed replacement grants and nonterminal accepted work block activity/class archive. An expired unused grant does not block archive and remains preserved.
12. Scores are stored assessment snapshots and must not be silently recalculated after feedback is released.
13. Similarity comparisons must involve two different submissions, normally from the same programming activity, and use a consistent source/compared ordering to prevent reverse duplicate pairs.
14. A `CLASS_PROJECT` repository requires `projectTaskId`.
15. A `PERSONAL` repository must not have `projectTaskId`.
16. A repository owner must also have an active `RepositoryMember` record with role `OWNER`.
17. For a class project, the owner and members must be actively enrolled in the class connected to the project task.
18. A student may belong to only one ACTIVE team/repository for the same project task. The service and partial unique index enforce this rule transactionally.
19. Main academic records use archive, inactive, removed, closed, or other lifecycle transitions instead of routine permanent deletion.
20. `storagePath` is a server-owned internal identifier/path. APIs must never accept it from clients or expose it as unrestricted host filesystem access.
21. Only an ACTIVE instructor may own a newly created class; instructor ownership cannot be transferred in Phase 4.
22. Class codes are server-generated, normalized, unique, bounded-retry capabilities. Archive disables the code atomically and restore leaves it disabled.
23. Joining with an existing ACTIVE membership is idempotent. A REMOVED membership cannot be replaced or rejoined; the existing unique row requires explicit owner/admin reactivation.
24. PENDING class membership remains reserved and is not created by Phase 4 services.
25. Only ACTIVE membership grants student access to active or archived class records.
26. Draft activities and all hidden test cases are inaccessible to students. Student test-case queries include only visible rows and visible-row pagination totals.
27. Draft test-case replacement assigns one-based order from the request array and updates the parent activity version in the same transaction.
28. Publishing requires a future due date, at least one visible test case, positive combined test points, and combined test points no greater than `totalPoints`.
29. Published due dates may only increase, published `maxAttempts` may only increase, and closed/archived activities are read-only.
30. Restoring a never-published activity produces DRAFT; restoring a previously published activity produces CLOSED and never silently reopens it.
31. Class-project team/repository/owner creation, invitation acceptance, and member removal/reactivation update all corresponding rows in one serializable transaction.
32. Invitation eligibility requires an ACTIVE STUDENT with ACTIVE class membership, no other ACTIVE team for the project task, and available capacity including unexpired PENDING invitations.
33. Invitation expiry is the earlier of seven days after creation or the project-task due date. Expiry is recognized transactionally/read-time and needs no scheduler.
34. The owner/lead cannot be removed or transferred in Phase 7. Reactivation can reuse only existing synchronized membership rows and never grants class membership.
35. `REQUEST_CHANGES` requires PUBLISHED, pre-deadline `READY_FOR_REVIEW` state and atomically releases non-empty feedback. `APPROVE` may complete previously submitted work after deadline or while CLOSED.
36. Project-task/class archive rejects unexpired PENDING invitations, nonterminal class-project repositories, and broken membership invariants. A task archives only when every class-project repository is APPROVED or already ARCHIVED.
37. `RepositoryActivity` is unchanged and receives no Phase 7 writes.

## Transaction boundaries

Activity publication, complete draft test-case replacement, lifecycle transitions, submission/idempotency/job allocation, replacement-grant consumption/linkage, score correction, review/release, failure resolution/retry, team/repository/owner creation, invitation acceptance/resolution, synchronized member transitions, repository review/feedback release, class archive/code deactivation, join-by-code, and membership transitions must be atomic. Optimistically locked mutations use `expectedUpdatedAt`; every successful write advances the parent timestamp by at least one millisecond so concurrent writes cannot both consume the same version. Role and membership checks occur inside or immediately adjacent to the authoritative transaction so concurrent requests cannot bypass them.

External Git, Java, filesystem, or network work must not execute inside database transactions. Phase 6 commits durable execution work before the separate Java worker runs. Phase 7 creates metadata only and performs no Git or filesystem work.

## Archive and deletion policy

Classes, users, memberships, activities, submissions, assessments, feedback, project tasks, repositories, and repository history are academic records. Normal product actions transition their status or archive state; they do not hard-delete history. Cascade deletion is reserved for dependent records whose parent deletion has already passed an explicit exceptional hard-delete policy.

## Migration safety

- Never use `prisma migrate reset` or `prisma db push` for the Projex development database.
- Create and review migration SQL before application.
- Stop if Prisma reports drift or asks to reset the database.
- Preserve manually authored constraints and indexes when generating later migrations.
- Do not place credentials in schema, migration, documentation, or command output.
- Seed data is not part of Phase 2.

## Phase 8A additions

- `Repository.storageStatus`, provisioning/verification timestamps, bounded size, and a safe failure code describe server-owned Git storage without exposing its host path.
- `RepositoryProvisioningJob` provides one durable leased provisioning job per repository.
- Existing repositories are backfilled as `PENDING` with idempotent jobs; the migration performs no Git or filesystem work.
- `RepositoryActivity` supports a nullable user only for an explicitly typed system actor. `REPOSITORY_PROVISIONED` is inserted exactly once after final bare-repository verification.
