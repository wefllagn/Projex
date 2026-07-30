# Projex Database Schema

## Scope

Phase 2 establishes the core PostgreSQL schema and its initial Prisma migration. It does not implement authentication, HTTP endpoints, Java execution, Git integration, seed data, or frontend integration.

The authoritative sources are:

- `server/prisma/schema.prisma` for Prisma models, enums, relations, and Prisma-managed indexes.
- `server/prisma/migrations/20260730000000_init_core_schema/migration.sql` for the applied PostgreSQL schema, including SQL-only checks and the partial unique index.

## Core models

| Prisma model | PostgreSQL table | Purpose |
| --- | --- | --- |
| `User` | `users` | Academic identity, role, and account status. |
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

## Database-enforced invariants

- Activity `maxAttempts` and submission `attemptNumber` are each limited to 1 through 3.
- Test-case points, automated scores, final scores, automated points, optional instructor points, execution time, and optional repository grades cannot be negative where specified.
- Submission execution completion cannot precede its start.
- A similarity record cannot compare a submission with itself, and its percentage is limited to 0 through 100.
- A `CLASS_PROJECT` repository requires `projectTaskId`; a `PERSONAL` repository forbids it.
- A partial unique index permits multiple personal repositories while allowing only one repository per non-null `(projectTaskId, ownerId)` pair.
- Compound unique constraints protect class membership, submission attempt numbering, test ordering/results, similarity pairs, and repository membership.

Prisma cannot represent the `CHECK` constraints or partial unique repository index in the data model. They are intentionally maintained in the migration SQL and must be preserved during future migration review.

## Service-layer rules

The following rules require transactional application services because they depend on roles, related-row state, historical state, or cross-row calculations that cannot be fully expressed by the current schema alone.

1. Only users with role `INSTRUCTOR` may own classes or create programming activities and project tasks.
2. Only users with role `STUDENT` may be class members, own activity submissions, or be student repository members.
3. The backend assigns `attemptNumber` atomically; clients never choose the authoritative value.
4. A submission's `attemptNumber` must not exceed its activity's `maxAttempts`. The service verifies and allocates the next number in the same concurrency-safe transaction.
5. After submission, `activityId`, `studentId`, `attemptNumber`, `sourceCode`, and `submittedAt` are immutable.
6. Activity test cases are locked once submissions exist. Test-case content must not be edited in a way that invalidates preserved historical results.
7. `automatedScore` is the sum of `automatedPoints` from the selected completed execution.
8. When an instructor edits per-test points:
   - `instructorPoints` stores the reviewed points for that test case.
   - `instructorAdjustment` is recalculated as the sum of each `instructorPoints - automatedPoints` difference.
   - `finalScore` equals `automatedScore + instructorAdjustment`.
   - `finalScore` cannot be negative.
9. Scores are stored assessment snapshots and must not be silently recalculated after feedback is released.
10. Similarity comparisons must involve two different submissions, normally from the same programming activity, and use a consistent source/compared ordering to prevent reverse duplicate pairs.
11. A `CLASS_PROJECT` repository requires `projectTaskId`.
12. A `PERSONAL` repository must not have `projectTaskId`.
13. A repository owner must also have an active `RepositoryMember` record with role `OWNER`.
14. For a class project, the owner and members must be actively enrolled in the class connected to the project task.
15. A student may belong to only one repository for the same project task. The service enforces this cross-repository rule transactionally.
16. Main academic records use archive, inactive, removed, closed, or other lifecycle transitions instead of routine permanent deletion.
17. `storagePath` is a server-owned internal identifier/path. APIs must never accept it from clients or expose it as unrestricted host filesystem access.

## Transaction boundaries

Submission attempt allocation, score review, repository creation with owner membership, and class-project membership validation must be atomic. Role and membership checks must occur inside or immediately adjacent to the authoritative transaction so concurrent requests cannot bypass them.

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
