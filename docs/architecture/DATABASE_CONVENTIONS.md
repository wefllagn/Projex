# Projex Database Conventions

## Database stack

Projex will use PostgreSQL with Prisma ORM in the planned TypeScript backend. Prisma migrations are the authoritative schema-change history. Application code must not create or alter production-like tables at runtime.

## Naming

### Prisma schema

- Prisma model names are singular `PascalCase`: `User`, `ClassMember`, `TestCase`, `RepositoryInvitation`.
- Prisma field and relation names are `camelCase`: `createdAt`, `classId`, `repositoryMembers`.
- Prisma enums are singular `PascalCase`: `UserRole`, `SubmissionStatus`.
- Enum members are uppercase snake case in Prisma: `NEEDS_INSTRUCTOR_REVIEW`.

### PostgreSQL

- Tables use plural `snake_case`: `users`, `class_members`, `test_cases`, `repository_invitations`.
- Columns use `snake_case`: `created_at`, `class_id`, `repository_id`.
- Foreign keys end in `_id`.
- Constraint and index names use descriptive snake case, for example `submissions_activity_id_student_id_key`.
- Prisma uses `@map` and `@@map` to bridge idiomatic TypeScript/Prisma names to database names.

Illustrative mapping:

```prisma
model Submission {
  id           String   @id @default(uuid()) @db.Uuid
  activityId   String   @map("activity_id") @db.Uuid
  studentId    String   @map("student_id") @db.Uuid
  attemptNumber Int     @map("attempt_number")
  submittedAt  DateTime @map("submitted_at") @db.Timestamptz(3)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)
  archivedAt   DateTime? @map("archived_at") @db.Timestamptz(3)

  @@unique([activityId, studentId, attemptNumber])
  @@index([studentId, submittedAt])
  @@map("submissions")
}
```

This example records conventions, not a complete production model.

## Primary and foreign keys

- Every persisted domain record uses a UUID primary key stored as PostgreSQL `uuid`.
- Use database-generated UUID defaults through Prisma where supported.
- Foreign key types match their referenced UUID type.
- Public APIs expose opaque UUIDs and never depend on sequential IDs.
- Human-readable class codes, repository slugs, and commit hashes are alternate identifiers, not primary keys.
- Foreign key delete actions must be explicit. Academic records generally use `Restrict` or archival workflows rather than cascade deletion.

## Role model

- The authoritative user-role enum contains `STUDENT`, `INSTRUCTOR`, and `ADMIN` from the authentication foundation.
- Student and Instructor workflows are implemented first, but Admin records/assignments are not removed from the schema.
- Role changes, account activation/deactivation, and sensitive Admin actions retain actor/timestamp audit history.
- Admin authorization does not imply selecting or returning every private field.
- Phase 9A uses `AdminAuditEvent` as a narrow append-only application ledger for successful allowlisted administrative mutations. The mutation and audit insertion share one transaction; no update/delete API exists. Comprehensive retention, export, tamper-evidence, and denied-event analysis remain Phase 11 hardening.

## Timestamps and time

- Persistent event timestamps use PostgreSQL `timestamptz` and are handled as instants.
- Standard mutable records include `createdAt` and `updatedAt`.
- Archivable records include nullable `archivedAt`; when useful, also store `archivedById` and `archiveReason`.
- Domain events use precise names such as `submittedAt`, `releasedAt`, `acceptedAt`, `revokedAt`, and `expiresAt`.
- The application stores timestamps in UTC and formats them for the user's timezone, including Asia/Manila, at the presentation boundary.
- Display strings such as “Just now” or “Aug 27” are never stored as authoritative time values.
- Database time should decide deadline-sensitive transactions to avoid browser clock manipulation.

## Archive and deletion policy

Academic records are archived rather than hard-deleted. This includes classes, memberships with academic history, activities, submissions, assessments, grades, released feedback, teams, repositories, repository membership history, and project tasks tied to assessed work.

- Normal queries exclude `archivedAt != null` unless an archive view explicitly requests them.
- Archiving is a state transition recorded with actor, timestamp, and reason where appropriate.
- Archived repositories become read-only before or during snapshot creation.
- Hard deletion is reserved for approved retention cleanup, disposable unsubmitted drafts, expired sessions/tokens, temporary worker files, and test data.
- A hard-delete process must be explicit, authorized, auditable, and account for related storage/Git data.
- “Remove student” should normally end or archive membership; it must not erase previous submissions, grades, feedback, commits, or audit history.

## Constraints and invariants

Database constraints protect rules that must survive retries, concurrency, bugs, or multiple API instances.

Required examples include:

- Unique normalized user email where active account policy requires it.
- Unique class membership for `(class_id, user_id)` or an explicitly versioned membership-history design.
- Unique active class code value.
- Unique submission attempt number for `(activity_id, student_id, attempt_number)`.
- Unique repository slug within its owner/class namespace.
- Unique repository member for `(repository_id, user_id)`.
- At most one ACTIVE team membership per student/project task and one PENDING repository invitation per invitee/project task.
- Server-controlled repository type/visibility pairs and synchronized team/repository membership at transaction commit.
- Unique branch name within a repository.
- Non-negative scores, test points, counts, sizes, and resource limits.
- Grade/score not exceeding the allowed maximum.
- Valid lifecycle values through Prisma/PostgreSQL enums or check constraints.
- Foreign keys for every authoritative relationship.

Application validation improves errors but never replaces constraints.

## Transactions

Use a transaction whenever an operation must be all-or-nothing or must make a decision against current state.

Examples:

- Atomically allocate and create a numbered immutable submission attempt, source snapshot metadata, and assessment job record.
- Join a class by active class code and create/activate membership while preventing duplicates.
- Release grade and feedback, update submission review state, and create a notification/outbox event.
- Create a Phase 7 team, lead membership, metadata-only repository, and owner membership.
- Accept an invitation or transition a member by updating the invitation, team membership, and repository membership atomically.
- Release a repository feedback draft atomically with `REQUEST_CHANGES` or optional approval feedback.
- Archive a repository and record snapshot/audit metadata.
- Generate or rotate a class code while invalidating the previous active code.

Rules:

- Keep transactions short; do not compile Java, run Git, upload large files, or call a network service inside a database transaction.
- Lock/select rows or use serializable/retry patterns for deadline/attempt-limit checks, class-code joins, and competing state transitions.
- Retry only known transient transaction failures and keep operations idempotent.
- External work uses an outbox/job record committed with the domain transaction, then processed after commit.

## Submission-attempt integrity

Each programming activity configures `maxAttempts` from 1 through 3. Each `Submission` is one immutable academic attempt.

- Enforce unique attempts with `@@unique([activityId, studentId, attemptNumber])`.
- `attemptNumber` begins at 1 and is assigned only by the backend.
- The server derives `studentId` from the authenticated session; it rejects/ignores a client attempt number as authoritative.
- In one concurrency-safe operation, verify active class membership, activity/class lifecycle, deadline or valid replacement exception, and `count(countsTowardAttemptLimit=true) < activity.maxAttempts`; then allocate the next chronological number and create the attempt.
- Use an idempotency record/key plus the unique constraint so double-clicks and retries return the original result or a safe conflict rather than consuming another attempt.
- If competing transactions select the same attempt number, retry the allocation transaction only under a bounded, known unique/serialization conflict policy.
- Snapshot or content-address source so later editor changes cannot alter the attempt.
- A successful attempt is immutable and permanently preserves source, submitted timestamp, late/status values, assessment/execution result, score, and review state.
- Infrastructure retries reuse the same execution job and immutable submission. After exhaustion, an instructor may preserve the failed record as non-counting and grant one expiring replacement; consumption creates a new linked counting attempt atomically with idempotency.

## Assessment and score integrity

- Preserve each deterministic per-test-case result and its `automatedPoints`.
- Store `originalAutomatedScore` as the outcome of deterministic test execution; instructor review must not overwrite it.
- Append score corrections with the original score, previous effective score, new effective score, mandatory reason, instructor, sequence, and timestamp. Never update or delete earlier corrections.
- Keep `effectiveAutomatedScore` within `automatedMaximum`, store distinct nonnegative `instructorPoints` within `instructorMaximum`, and derive `finalScore = effectiveAutomatedScore + instructorPoints` within the activity total.
- Record `reviewedAt`, feedback `releasedAt`/releaser, and submission `releasedAt` independently.
- Unreleased grading and feedback remain instructor-only through authorization and response selection.
- Score/release changes are audited with actor and timestamp.

## Repository and job concurrency

- Phase 7 repository metadata has no client-controlled or provisioned filesystem path. Future storage identifiers remain server-owned and are never arbitrary client paths.
- Class-project creation, invitation acceptance, and member transitions use serializable transactions plus row locks where needed.
- Deferred database constraints reject a committed mismatch between team and repository membership or between lead and owner.
- Invitation capacity counts ACTIVE members and unexpired PENDING invitations; unique indexes and serializable retries protect concurrent invitations/acceptance.
- Optimistic concurrency protects project-task, repository metadata/review, membership, and feedback-draft mutations.
- `RepositoryActivity` was unused through Phase 7. Phase 8A permits only the verified `REPOSITORY_PROVISIONED` system event; later Git activity requires Phase 8B/8C verification rules.
- A database-backed per-repository lock/lease serializes writes that mutate Git refs or worktrees.
- Locks have owner/job ID, acquisition time, expiry/lease, and safe recovery rules.
- Job records have an explicit state machine, attempt count, lease owner/expiry, created/started/finished timestamps, and bounded error summary.
- Claiming a job is atomic. A worker must not execute the same active job concurrently.

For the initial pilot, the execution queue is implemented with PostgreSQL-backed job records. Jobs contain claim/lease owner and expiry, retry count/next-attempt fields, bounded payload/result references, and terminal states. A separate worker claims jobs atomically with bounded concurrency. This remains free, self-hosted, local/server-managed, and cloud-provider-neutral; a dedicated queue product is not required unless later measurements justify it.

## Indexes and query discipline

- Add indexes for foreign keys used in joins and common filters.
- Composite indexes should reflect actual access patterns, such as class plus status, activity plus submitted time, user plus unread notification state, and repository plus branch.
- Archive filters may need composite or partial indexes.
- Pagination order must be backed by a stable index and ID tie-breaker.
- Avoid broad `include` trees. Repositories select only data required by the use case and prevent student endpoints from loading hidden/instructor-only fields unnecessarily.
- Use query logging and `EXPLAIN` during later performance work; do not pre-optimize for university-wide scale, which is out of scope.

## Migrations and seed data

- Every schema change is a reviewed Prisma migration committed with the feature.
- Never edit an already-applied shared migration; create a new migration.
- Production-like deployment runs migrations as a controlled release step, not from every API instance on startup.
- Seed scripts create deterministic local demonstration accounts and records using stable UUIDs or a documented lookup scheme.
- Seed credentials come from local development configuration and are not hardcoded as real secrets.
- Hosted test data is separate from local data and uses clearly non-production academic records.
- Database reset scripts are restricted to local/test environments and must refuse an ambiguous or hosted production-like target.

## Attempt credit derivation

`ProgrammingActivity.creditPolicy` is persisted as the PostgreSQL enum `attempt_credit_policy` with `LATEST` as the non-null default. It may change only while the activity is `DRAFT` and is immutable after publication.

Credited-result selection is a read-time derivation, not a mutable foreign-key pointer or cached score. Candidate queries select only RELEASED submissions with non-null `releasedFinalScore`. `LATEST` orders by greatest chronological `attemptNumber`; `HIGHEST` orders by greatest score and then greatest `attemptNumber`. Release timestamp is not a selection key. A RELEASED replacement participates through its normal submission row, while unreleased or merely failed/resolved records do not.

Attempt allowance remains independent: it counts `countsTowardAttemptLimit=true`, not `attemptNumber` and not credited-result status. Student attempt-state queries use an internally consistent read transaction, while creation remains the serializable authority for allocation, idempotency, replacement consumption, and eligibility.

## Backup and restoration

For controlled hosted testing, establish a simple PostgreSQL backup plus persistent Git/storage backup before defense-critical sessions. Restoration must be tested at least once. This is demonstration resilience, not a claim of university-grade disaster recovery or 24/7 availability.

## Phase 8A provisioning consistency

Repository creation and its unique provisioning job commit atomically. Filesystem work begins only after that transaction. Workers claim with `FOR UPDATE SKIP LOCKED`, bounded attempts, and expiring leases. Completion atomically writes verified storage metadata, job success, and one system provisioning activity. Migrations record work only and must never invoke Git or touch storage.
