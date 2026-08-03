# Projex Database Schema

## Scope

Phase 2 established the core PostgreSQL schema. Phase 3 added account setup and refresh-session records, Phase 4 added user/class/membership lifecycle state, and Phase 5 adds the programming-activity publication and test-authoring foundation. Java execution, submissions, scoring, Git integration, seed data, and frontend integration remain outside Phase 5.

The authoritative sources are:

- `server/prisma/schema.prisma` for Prisma models, enums, relations, and Prisma-managed indexes.
- `server/prisma/migrations/20260730000000_init_core_schema/migration.sql` for the applied PostgreSQL schema, including SQL-only checks and the partial unique index.
- `server/prisma/migrations/20260730044437_auth_status_setup_pending/migration.sql` and `20260730044438_auth_account_sessions/migration.sql` for Phase 3 authentication state.
- `server/prisma/migrations/20260731000000_phase4_user_class_management/migration.sql` for additive Phase 4 lifecycle fields and safe backfills.
- `server/prisma/migrations/20260804000000_phase5_programming_activities_test_cases/migration.sql` for Phase 5 activity/test-case lifecycle fields, constraints, and safe backfills.

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
| `TestCaseResult` | `test_case_results` | Preserved automated and instructor-reviewed test result. |
| `SimilarityResult` | `similarity_results` | Directed comparison between two submissions. |
| `SubmissionFeedback` | `submission_feedback` | Instructor feedback and release state. |
| `ProjectTask` | `project_tasks` | Class project work linked to repositories. |
| `Repository` | `repositories` | Server-owned repository metadata and project linkage. |
| `RepositoryMember` | `repository_members` | Student repository membership and role. |
| `RepositoryActivity` | `repository_activity` | Repository contribution and activity record. |
| `RepositoryFeedback` | `repository_feedback` | Instructor repository feedback and grade snapshot. |

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

## Database-enforced invariants

- Activity `maxAttempts` and submission `attemptNumber` are each limited to 1 through 3.
- Activity total points are greater than zero and no more than 1000; Java entry-class names and starter code satisfy minimum database safety checks.
- Test-case order is positive and unique per activity, and test-case names are non-empty.
- Test-case points, automated scores, final scores, automated points, optional instructor points, execution time, and optional repository grades cannot be negative where specified.
- Submission execution completion cannot precede its start.
- A similarity record cannot compare a submission with itself, and its percentage is limited to 0 through 100.
- A `CLASS_PROJECT` repository requires `projectTaskId`; a `PERSONAL` repository forbids it.
- A partial unique index permits multiple personal repositories while allowing only one repository per non-null `(projectTaskId, ownerId)` pair.
- Compound unique constraints protect class membership, submission attempt numbering, test ordering/results, similarity pairs, and repository membership.

Prisma cannot represent the `CHECK` constraints or partial unique repository index in the data model. They are intentionally maintained in the migration SQL and must be preserved during future migration review.

## Service-layer rules

The following rules require transactional application services because they depend on roles, related-row state, historical state, or cross-row calculations that cannot be fully expressed by the current schema alone.

1. Only ACTIVE instructors may own classes. Programming-activity creation and management require the owning ACTIVE instructor or an ACTIVE administrator.
2. Only users with role `STUDENT` may be class members, own activity submissions, or be student repository members.
3. The backend assigns `attemptNumber` atomically; clients never choose the authoritative value.
4. A submission's `attemptNumber` must not exceed its activity's `maxAttempts`. The service verifies and allocates the next number in the same concurrency-safe transaction.
5. After submission, `activityId`, `studentId`, `attemptNumber`, `sourceCode`, and `submittedAt` are immutable.
6. Activity test cases, starter code, language/entry-class settings, and scoring configuration are locked at publication, before submissions exist.
7. `automatedScore` and original per-test automated results are immutable assessment evidence.
8. Phase 6 may expose a professor-facing `Edit Automated Score` action only by storing the corrected value separately and preserving the original result, correction reason, instructor identity, and correction timestamp. Phase 5 does not implement these correction fields or behavior.
9. Scores are stored assessment snapshots and must not be silently recalculated after feedback is released.
10. Similarity comparisons must involve two different submissions, normally from the same programming activity, and use a consistent source/compared ordering to prevent reverse duplicate pairs.
11. A `CLASS_PROJECT` repository requires `projectTaskId`.
12. A `PERSONAL` repository must not have `projectTaskId`.
13. A repository owner must also have an active `RepositoryMember` record with role `OWNER`.
14. For a class project, the owner and members must be actively enrolled in the class connected to the project task.
15. A student may belong to only one repository for the same project task. The service enforces this cross-repository rule transactionally.
16. Main academic records use archive, inactive, removed, closed, or other lifecycle transitions instead of routine permanent deletion.
17. `storagePath` is a server-owned internal identifier/path. APIs must never accept it from clients or expose it as unrestricted host filesystem access.
18. Only an ACTIVE instructor may own a newly created class; instructor ownership cannot be transferred in Phase 4.
19. Class codes are server-generated, normalized, unique, bounded-retry capabilities. Archive disables the code atomically and restore leaves it disabled.
20. Joining with an existing ACTIVE membership is idempotent. A REMOVED membership cannot be replaced or rejoined; the existing unique row requires explicit owner/admin reactivation.
21. PENDING class membership remains reserved and is not created by Phase 4 services.
22. Only ACTIVE membership grants student access to active or archived class records.
23. Draft activities and all hidden test cases are inaccessible to students. Student test-case queries include only visible rows and visible-row pagination totals.
24. Draft test-case replacement assigns one-based order from the request array and updates the parent activity version in the same transaction.
25. Publishing requires a future due date, at least one visible test case, positive combined test points, and combined test points no greater than `totalPoints`.
26. Published due dates may only increase, published `maxAttempts` may only increase, and closed/archived activities are read-only.
27. Restoring a never-published activity produces DRAFT; restoring a previously published activity produces CLOSED and never silently reopens it.

## Transaction boundaries

Activity publication, complete draft test-case replacement, lifecycle transitions, submission attempt allocation, score review, repository creation with owner membership, class-project membership validation, class archive/code deactivation, join-by-code, and membership transitions must be atomic. Activity and test-case mutations use `expectedUpdatedAt`; every successful write advances the parent timestamp by at least one millisecond so concurrent writes cannot both consume the same version. Role and membership checks must occur inside or immediately adjacent to the authoritative transaction so concurrent requests cannot bypass them.

External Git, Java, filesystem, or network work must not execute inside database transactions. Later phases should commit durable job/outbox state first and perform external work separately.

## Archive and deletion policy

Classes, users, memberships, activities, submissions, assessments, feedback, project tasks, repositories, and repository history are academic records. Normal product actions transition their status or archive state; they do not hard-delete history. Cascade deletion is reserved for dependent records whose parent deletion has already passed an explicit exceptional hard-delete policy.

## Migration safety

- Never use `prisma migrate reset` or `prisma db push` for the Projex development database.
- Create and review migration SQL before application.
- Stop if Prisma reports drift or asks to reset the database.
- Preserve manually authored constraints and indexes when generating later migrations.
- Do not place credentials in schema, migration, documentation, or command output.
- Seed data is not part of Phase 2.
