# Projex Full-Stack Phase Checklist

## Purpose and authority

This checklist gates the transition from the hardcoded UI to a functional full-stack system. It does not authorize implementation beyond the phase explicitly requested and accepted.

The earlier UI implementation checklist under `docs/PROJEX_IMPLEMENTATION_CHECKLIST.md` uses a separate historical phase numbering scheme. It remains an accurate record of the UI build, but this file is authoritative for the current full-stack roadmap.

This file tracks accepted milestones and remaining roadmap gates. It does not own the live branch, HEAD, worktree, migration status, database contents, runtime configuration, or current test result; verify those facts from Git, Prisma, the environment, and checks that were actually run.

Status markers:

- `[x]` completed and accepted.
- `[ ]` pending.
- `[~]` approved or partially complete but not yet implemented and accepted.

## Accepted milestone status

| Phase | Scope | Status | Baseline commit |
| --- | --- | --- | --- |
| 0 | Architecture and planning | Complete | `55b65e9` |
| 1 | Backend foundation | Complete | `bd45349` |
| 2 | Database foundation | Complete | `3cf0354` |
| 3 | Authentication and authorization | Complete | `bf45efd` |
| 4 | User and Class Management | Complete | `985f101` |
| 5 | Programming Activities and Test Cases | Complete | `1aa1525` |
| 6 | Submissions and Automated Assessment | Complete | `2ff3e4e` |
| 7 | Project and Repository Collaboration | Complete | `741ba60` |
| 8 | Local Git Operations (8A provisioning, 8B Smart HTTP, 8C inspection) | Complete | `893443a` |
| 9 | Admin backend capabilities | In progress: 9A implemented for review | Pending |
| 10 | Frontend integration | Pending | Pending |
| 11 | Hardening, deployment, and evaluation | Pending | Pending |

## Phase 0: architecture and planning — complete

- [x] Preserve the React 19, Vite, JavaScript/JSX, React Router, and existing CSS frontend.
- [x] Exclude a frontend TypeScript migration.
- [x] Select Node.js, Express, TypeScript, Zod, Prisma ORM, and PostgreSQL for the backend.
- [x] Select a feature-based modular-monolith architecture and `/api/v1` API prefix.
- [x] Define standard response envelopes, errors, validation, logging, and database conventions.
- [x] Define `STUDENT`, `INSTRUCTOR`, and `ADMIN` authorization roles.
- [x] Define one to three immutable, server-numbered submission attempts.
- [x] Define local, isolated Java execution without an external compiler API.
- [x] Define local Git CLI operations without GitHub or GitLab APIs.
- [x] Record local-first, cloud-provider-neutral, controlled deployment boundaries.
- [x] Create the architecture documents under `docs/architecture/`.
- [x] Preserve `docs/FUNCTIONALIZATION_AUDIT.md` as a dated historical audit.

The original Phase 0 condition that no backend code existed was true when Phase 0 closed. It is historical and does not describe the current repository.

## Phase 1: backend foundation — complete

- [x] Move the protected frontend into `client/` without changing its behavior.
- [x] Add the Express/TypeScript backend under `server/`.
- [x] Add Zod-validated environment configuration and placeholder-only `.env.example`.
- [x] Add JSON parsing, restricted CORS, request IDs, structured logging, and error handling.
- [x] Add graceful shutdown.
- [x] Add Prisma/PostgreSQL connectivity and `GET /api/v1/health`.
- [x] Add lint, type-check, test, build, and Prisma scripts.
- [x] Preserve the frontend and verify its lint/build checks.

## Phase 2: database foundation — complete

- [x] Define the initial PostgreSQL/Prisma academic schema and enums.
- [x] Use UUID primary keys, snake_case database mappings, timestamps, indexes, and constraints.
- [x] Define users, classes, memberships, programming activities, test cases, submissions, execution results, feedback, project tasks, and repository records.
- [x] Preserve academic records through status/archive semantics rather than broad hard deletion.
- [x] Create and apply the committed initial migration without `prisma db push` or destructive reset.
- [x] Document cross-model invariants that services and transactions must enforce.

## Phase 3: authentication and authorization — complete

- [x] Implement provisioned accounts with no public registration.
- [x] Implement `SETUP_PENDING`, single-use account setup, and Argon2id password hashing.
- [x] Implement access, refresh, and CSRF cookies.
- [x] Implement refresh rotation, reuse detection, separate sessions, logout, and logout-all.
- [x] Revoke other sessions after password changes and account-status changes.
- [x] Enforce current database role, status, session, ownership, and CSRF checks on the backend.
- [x] Implement provider-neutral preview and SMTP email transports.
- [x] Implement controlled initial-administrator creation.
- [x] Keep frontend authentication integration pending for Phase 10.
- [x] Verify the isolated authentication/security suite and reported live admin login, `/auth/me`, and protected logout flows.

## Phase 4: User and Class Management — complete

### Scope boundaries

- [x] Backend only; do not modify or integrate anything under `client/`.
- [x] Add an admin-only user directory and safe user detail while preserving existing provisioning/status endpoints.
- [x] Add class create, role-scoped list, detail, metadata update, archive, and restore operations.
- [x] Add class roster listing, student join by code, membership removal, and explicit reactivation.
- [x] Keep public registration, profile editing, role changes, CSV enrollment, invitations, activities, submissions, Java, Git, repositories, and Admin UI out of scope.

### Class and join-code lifecycle

- [x] Retain the unique server-owned `Class.classCode` field.
- [x] Add `classCodeActive` and `classCodeChangedAt`; do not add a class-code history or invitation table.
- [x] Generate approximately ten uppercase characters with cryptographic randomness and an unambiguous human-readable alphabet.
- [x] Normalize codes before storage and lookup, retry unique collisions within a strict bound, exclude codes from student responses, and never log them.
- [x] Restrict join-code view, rotation, and revocation to the class owner or administrator.
- [x] Archive atomically disables the current code; restore does not reactivate it.
- [x] Backfill existing ACTIVE classes with `classCodeActive = true` and ARCHIVED existing classes with `classCodeActive = false`.
- [x] Safely backfill new `updatedAt` fields and configure Prisma `@updatedAt` where applicable.

### Membership lifecycle and projections

- [x] ACTIVE membership grants student class and roster access, including read-only archived-class access.
- [x] REMOVED membership preserves history but grants no class, roster, activity, or archived-class access.
- [x] Reuse the unique `(classId, studentId)` row and require owner/admin reactivation after removal.
- [x] Keep PENDING reserved for a future invitation workflow and do not create it in Phase 4.
- [x] Student roster entries expose only `userId` and `fullName`.
- [x] Instructor/admin roster entries may also expose university email, user status, membership status, `joinedAt`, `removedAt`, and `lastActivatedAt`.
- [x] Log class and membership lifecycle events structurally without a persistent audit-event table.
- [x] Document durable administrative auditing as deferred hardening work.

### Approved API surface

- [x] `GET /api/v1/users`
- [x] `GET /api/v1/users/:userId`
- [x] `POST /api/v1/classes`
- [x] `GET /api/v1/classes`
- [x] `GET /api/v1/classes/:classId`
- [x] `PATCH /api/v1/classes/:classId`
- [x] `POST /api/v1/classes/:classId/archive`
- [x] `POST /api/v1/classes/:classId/restore`
- [x] `GET /api/v1/classes/:classId/join-code`
- [x] `POST /api/v1/classes/:classId/join-code/rotate`
- [x] `POST /api/v1/classes/:classId/join-code/revoke`
- [x] `POST /api/v1/classes/join`
- [x] `GET /api/v1/classes/:classId/members`
- [x] `PATCH /api/v1/classes/:classId/members/:memberId`

### Real PostgreSQL integration tests

- [x] Add a separate `npm run test:integration` suite and keep `npm test` isolated.
- [x] Require `TEST_DATABASE_URL`; never fall back to `DATABASE_URL`.
- [x] Abort immediately unless the URL names exactly the recognized `projex_test` database.
- [x] Configure the guarded runner to apply committed migrations with `prisma migrate deploy` and run serially.
- [x] Never run `prisma db push` or `prisma migrate reset`.
- [x] Add PostgreSQL coverage for transactions, concurrency, ownership, membership, projections, archive, removal, and reactivation.
- [x] Execute the suite against a privately configured `projex_test` database and record the result.

### Verification record

- The committed Phase 4 migration was deployed to the normal development database without reset, `db push`, drift, data loss, or migration failure; all four migrations are applied.
- The existing ACTIVE administrator account was preserved. The live verification fixtures leave three users, one class, and one membership in the development database.
- The isolated backend suite passes with seven test files and 59 tests.
- The guarded PostgreSQL suite passes with three test files and ten tests against exactly `projex_test`; suite cleanup leaves application tables empty while preserving Prisma migration history.
- Live API verification passes the approved administrator, instructor, and student workflows, including projection boundaries, ownership and membership checks, class-code lifecycle, archive/restore behavior, and structured-log redaction.
- Backend lint, main and integration type-checks, tests, and build pass. The unchanged frontend lint and build also pass.

## Phase 5: programming activities and test cases — complete

- [x] Keep Phase 5 backend-only and preserve every file under `client/`.
- [x] Implement activity metadata, due-state projection, Java starter/entry-class settings, total points, and `maxAttempts` from one through three.
- [x] Implement `DRAFT`, `PUBLISHED`, `CLOSED`, and `ARCHIVED` lifecycle state with conservative restore behavior.
- [x] Implement atomic ordered visible/hidden test-case replacement while the activity is a draft.
- [x] Freeze starter code, language/entry class, total points, and test-case content/visibility/points at publication.
- [x] Permit only published title/instruction corrections, due-date extensions, and attempt-limit increases.
- [x] Prevent hidden test rows, values, IDs, visibility flags, and counts from reaching student responses.
- [x] Enforce active caller, class ownership/membership, class archive, activity visibility, and optimistic-version rules in backend services/repositories.
- [x] Keep submissions, Java execution, automated scoring, score correction, rubric grading, and final grades out of Phase 5.
- [x] Preserve the future rule that a professor-facing automated-score correction retains the original result, corrected result, reason, instructor identity, and correction timestamp.
- [x] Apply the committed Phase 5 migration and pass the guarded serial integration suite against exactly `projex_test`.
- [x] Apply the migration to the normal development database only after test-database verification, then complete live role verification and final regression checks.

### Verification record

- The committed `20260804000000_phase5_programming_activities_test_cases` migration was deployed first to exactly `projex_test` and then to the normal development database without reset, `db push`, drift, data loss, or migration failure; all five migrations are applied in both databases.
- The guarded PostgreSQL suite passes with five integration files and 18 tests. Suite cleanup leaves all application tables empty in `projex_test` while preserving five Prisma migration-history rows.
- The isolated backend suite passes with nine test files and 71 tests. Backend lint, main and integration type-checks, and build pass.
- Live API verification passes the administrator, instructor, and student workflows for draft visibility, test-case projection, publication, immutable scoring configuration, safe post-publication updates, optimistic concurrency, close/archive/restore, archived-class behavior, and logout.
- Structured lifecycle events were present and sensitive log-redaction checks passed. The existing ACTIVE administrator remains preserved.
- The normal development database contains five users, two classes, two memberships, one programming activity, and two test cases after the intentionally retained live-verification fixtures.
- The unchanged frontend lint and build pass, and `git diff -- client` is empty.

## Phase 6: submissions and automated assessment — complete

- [x] Keep Phase 6 backend-only and preserve every file under `client/`.
- [x] Implement immutable source/activity/test snapshots, server-assigned chronological attempt numbering, scoped idempotency, deadline checks, and concurrency-safe usable-attempt limits.
- [x] Implement a PostgreSQL-backed durable execution queue with atomic claim, lease recovery, bounded retries, and a separate worker process.
- [x] Compile Java once per job with JDK `--release 17`; execute only server-owned test snapshots through argument arrays without a shell.
- [x] Keep `JAVA_EXECUTION_MODE=disabled` by default; reject `local_process` in production and document it as controlled-local development only.
- [x] Implement Run Visible Tests using only visible cases, without custom stdin, submission creation, attempt consumption, score creation, or hidden-test leakage.
- [x] Preserve original automated results and implement bounded append-only score corrections, instructor points, feedback drafts, review, and controlled release.
- [x] Keep all numeric grading data and feedback hidden from students until release, and omit hidden-test definitions, results, points, IDs, names, and counts at every stage.
- [x] Retry infrastructure failures on the same immutable submission; require explicit instructor resolution after retry exhaustion.
- [x] Implement time-limited, single-use replacement grants that may cross the deadline or CLOSED state but never archive, inactive-user, or removed-membership boundaries.
- [x] Atomically consume a grant, persist idempotency, create the replacement submission/job, and link it to the preserved failed submission.
- [x] Block activity/class archive while accepted work or an active unconsumed replacement remains; expired grants no longer block archive.
- [x] Keep administrators read-only for submission views and keep released submissions immutable during Phase 6.
- [x] Verify isolated code, real Java execution, and the guarded serial PostgreSQL suite against exactly `projex_test`.
- [x] Apply the committed Phase 6 migration to the normal development database after test-database verification.
- [x] Verify cookie/CSRF HTTP role workflows and the durable queue through actual Express routes against `projex_test`, plus controlled-local Java compilation/execution separately.
- [ ] Add container or equivalent isolation before any internet-hosted Java execution.

### Verification record

- The committed `20260804010000_phase6_submissions_automated_assessment` migration was deployed first to exactly `projex_test` and then to the normal development database without reset, `db push`, drift, data loss, or migration failure; all six migrations are applied in both databases.
- The normal development database preserved one ACTIVE administrator and the existing five users, two classes, two memberships, one activity, and two test cases. The migration created no submission, job, practice, correction, or failure-resolution fixtures.
- The guarded PostgreSQL suite passes with seven integration files and 26 tests. Suite cleanup leaves all checked application tables empty in `projex_test` while preserving six Prisma migration-history rows.
- The isolated backend suite passes with 11 test files and 74 tests, including execution-mode and structured-log-redaction checks.
- The real Java suite passes with one file and four tests covering Java 17 target compilation, deterministic visible/hidden inputs, compiler rejection, timeout, output overflow, unavailable toolchain classification, process termination, and temporary-directory cleanup.
- Backend lint, main and integration type-checks, Prisma validation, and production build pass. The unchanged frontend lint and build pass, and `git diff -- client` is empty.

## Phase 7: project and repository collaboration — complete

- [x] Keep Phase 7 backend-only and preserve every file under `client/`.
- [x] Implement instructor-owned class project tasks with DRAFT, PUBLISHED, CLOSED, and ARCHIVED lifecycle, optimistic concurrency, role-scoped listing, team summaries, and monitoring.
- [x] Implement student-created metadata-only personal and class-project repositories with server-owned `PRIVATE` and `CLASS_ONLY` visibility respectively; reject all client visibility/path control.
- [x] Create class-project team, lead, repository, and owner membership atomically and keep ACTIVE/REMOVED team and repository membership synchronized.
- [x] Keep the owner/team lead immutable and document ownership transfer as deferred.
- [x] Implement collaborator invitation eligibility, one-active-team protection, one active pending invitation per invitee/task, capacity including pending invitations, and earlier-of-seven-days-or-deadline expiry.
- [x] Enforce project deadline/CLOSED restrictions and permit only reasoned owning-instructor corrective removal/reactivation after cutoff.
- [x] Implement WORKING, READY_FOR_REVIEW, CHANGES_REQUESTED, and APPROVED review lifecycle with optimistic concurrency.
- [x] Require PUBLISHED pre-deadline review work for REQUEST_CHANGES and atomically release non-empty textual feedback.
- [x] Permit approval of previously submitted review work after deadline or while CLOSED, with optional textual feedback release; exclude project grades and rubrics.
- [x] Block project-task and class archive for unexpired invitations, nonterminal repository review, or membership invariant failure.
- [x] Add PostgreSQL constraints, partial unique indexes, composite foreign keys, and deferred invariant triggers for repository type/visibility and synchronized ownership/membership.
- [x] Verify the committed Phase 7 migration and collaboration/API integration suite against exactly `projex_test` without reset or `db push`.
- [x] Apply the reviewed Phase 7 migration to the normal development database after explicit test-database approval.
- [x] Complete live role/API verification and the final independent pre-commit review.
- [x] Leave `RepositoryActivity` unchanged and unused; keep all Git CLI and filesystem repository operations pending for Phase 8.

## Phase 8A: Git foundation and provisioning — complete

- [x] Phase 8A validates an absolute Git for Windows executable at version 2.55.0 or later and records the detected version.
- [x] Phase 8A keeps Git disabled by default and rejects local-process execution in production.
- [x] Add durable storage states and leased provisioning jobs without filesystem work in the migration.
- [x] Derive server-owned UUID paths and reject traversal, Windows ambiguity, links, junctions, and reparse escapes.
- [x] Create verified empty bare repositories whose HEAD is `refs/heads/main`, with no refs or synthetic history.
- [x] Recover idempotently across leases and atomic rename; quarantine unsafe state without overwrite or deletion.
- [x] Guard `projex_test` and run-specific `projex_git_test` storage independently from normal database/storage.
- [x] Apply the reviewed Phase 8A migration to the normal development database after explicit approval.
- [x] Start the normal provisioning worker only after a second explicit approval and provision the six retained development repositories.

## Phase 8B: authenticated Git Smart HTTP — complete

The remaining persistent normal-loopback enablement item is a deferred operational approval gate and is not required for the accepted Phase 8B implementation milestone.

- [x] Add short-lived, repository/operation-scoped credentials with one-time secret display, verifier-only persistence, expiry, and revocation.
- [x] Add loopback-only authenticated clone/fetch/push through the configured absolute `git-http-backend`, with dynamic authorization on every request.
- [x] Enforce heads-only, fast-forward, protected-main, atomic multi-ref, case-collision, branch/ref/commit/blob/repository limits through server-owned hooks.
- [x] Stream bounded CGI requests/responses with backpressure, timeout, concurrency, process-tree termination, and guarded request cleanup.
- [x] Record exactly one safe user-attributed activity per accepted push and none for rejected pushes.
- [x] Apply the explicit migration only to `projex_test` and verify guarded real-Git Smart HTTP workflows under `projex_git_test`.
- [x] Apply the reviewed Phase 8B migration to the normal development database after separate approval.
- [ ] Enable and validate persistent normal loopback Smart HTTP only after a second separate approval.
- [x] Complete controlled normal-development read-only clone/fetch validation with one revoked short-lived READ credential and unchanged repository fingerprints.

## Phase 8C: repository inspection — complete

- [x] Add authenticated safe summary, branch, paginated history, reachable commit, tree, bounded UTF-8 file, and bounded diff endpoints.
- [x] Reuse dynamic Phase 8 source authorization and READY marker-owned storage resolution; retain instructor-read/admin-metadata-only and removed/inactive fail-closed rules.
- [x] Accept only conservative branch names, full reachable commit IDs, normalized repository-relative paths, and bounded pagination/output.
- [x] Reject binary files, oversized text/diffs/commit-file lists, traversal, Git internals, arbitrary revisions, raw commands/configuration, and host paths.
- [x] Preserve empty repositories without synthetic branches, commits, history, files, or activities.
- [x] Keep all Git mutations on the existing Phase 8B path; defer server-created branch/commit/merge/delete and contributor attribution pending separate lock/worktree/audit/identity design.
- [x] Add guarded real-Git/PostgreSQL/API coverage under `projex_test` and sentinel-owned `projex_git_test` storage.
- [x] Complete the full Phase 8A/8B, PostgreSQL, Java, backend, unchanged-client, cleanup, and security regression sequence.
- [x] Review, commit, push, and fast-forward-integrate Phase 8C after explicit approval.

## Phase 9: Admin backend capabilities — complete and integrated

### Phase 9A: authorization and accountability foundation

- [x] Add a dedicated admin backend module with active-admin checks at route and service boundaries.
- [x] Add safe account/setup/session-count/membership summaries and idempotent target-session revocation.
- [x] Add an allowlisted transactional `AdminAuditEvent` ledger with bounded reasons and action-specific safe metadata.
- [x] Protect status changes with optimistic concurrency, self-disable rejection, and a transaction lock that preserves one ACTIVE administrator under concurrent requests.
- [x] Remove administrator activity/test-case authoring, hidden test definitions, starter source, practice outcomes, and repository feedback bodies while preserving safe metadata oversight.
- [x] Deploy and verify the additive migration through the separately approved guarded-test and normal-development boundaries.
- [x] Complete the Phase 9A regression/security review, commit, push, and normal-development validation.

### Phase 9B: read-only academic and operational oversight

- [x] Add active-admin-only overview, safe academic lists, health/storage/job/credential inspection, and allowlisted audit-event listing.
- [x] Derive aggregates from authoritative records without cached counters or unsupported health/capacity claims.
- [x] Use explicit safe database projections, bounded filters/sorting/pagination, released-score rules, sanitized job failures, and typed audit metadata.
- [x] Keep the milestone read-only with no schema change, migration, dependency, environment, normal-database, client, or Phase 9C work.
- [x] Complete final Phase 9B review, staging, commit, and push; retain authenticated normal-environment acceptance for the complete Phase 9 boundary.

### Phase 9C: controlled operational recovery

- [x] Add ACTIVE-admin-only monotonic Git-credential revocation with idempotent compare-and-set behavior and immediate dynamic Smart HTTP denial.
- [x] Add optimistic, bounded requeue of the existing eligible failed repository-provisioning job without Git/filesystem work in the API.
- [x] Persist both successful state changes with allowlisted audit metadata in the same transaction and prove rollback on audit failure.
- [x] Add focused, PostgreSQL, guarded real-Git, and loopback Smart HTTP coverage, including concurrency and real cookie/CSRF authentication.
- [x] Apply the additive Phase 9C enum migration to normal development through its separately approved boundary.
- [x] Complete final Phase 9C review, staging, commit, push, normal live acceptance, and Phase 9 integration.
- [x] Keep Phase 9 backend-focused and treat the current admin frontend only as a temporary feature inventory.

## Phase 10: frontend integration — in progress

### Phase 10A.1: shared frontend foundation and authentication

- [x] Inventory every public, student, instructor, and admin route plus its mocks, local-only actions, backend contract/gap, milestone, and visual disposition.
- [x] Add the native-fetch API client, standard envelope/error handling, credentials, abort support, CSRF mutation handling, and single-flight refresh.
- [x] Integrate login, logout, current-user bootstrap, account setup, safe role routing, and protected loading/account/error states without browser credential persistence.
- [x] Establish development-only frontend tests compatible with React 19 and Vite 8.
- [x] Complete Phase 10A.1 final verification, review, commit, and push through their separate boundaries.

### Phase 10A.2: classes and memberships — complete

- [x] Load role-scoped active and archived classes from the backend and use explicit `classId` URL selection without choosing an arbitrary first class.
- [x] Connect instructor class creation, supported metadata updates, archive, and restore.
- [x] Connect student class-code join without persisting, logging, or redisplaying the submitted code.
- [x] Connect student-safe and instructor-detailed roster projections with bounded pagination.
- [x] Connect instructor membership removal/reactivation and authoritative conflict recovery.
- [x] Connect server-owned join-code view, rotation, revocation, inactive state, and usable-code-only copy.
- [x] Retire browser class-code generation, fallback codes, fake class invitations, local class stream/comments, local roster deletion, fabricated class schedules/counts, and hardcoded dashboard identities.
- [x] Preserve Phase 10B/10C prototypes as clearly labeled previews without representing them as records for a selected real class.
- [x] Establish and update the bidirectional feature-parity inventory in `FRONTEND_INTEGRATION.md`.
- [x] Complete Phase 10A.2 final verification, review, commit, and push through their separate boundaries.

### Phase 10B: activities, submissions, and assessment — complete

- [x] Integrate activity and test-case authoring and lifecycle in Phase 10B.1.
- [x] Integrate student visible-test practice, immutable submissions, history, and released results in Phase 10B.2.
- [x] Integrate instructor assessment, correction, review, feedback, failure resolution, and release in Phase 10B.3.

### Phase 10C: projects, repositories, and Git — in progress

- [x] Implement Phase 10C.1 project-task authoring/lifecycle, student catalogs, repository creation/catalog/detail/metadata, provisioning state, and archived-record presentation; final review remains a separate boundary.
- [ ] In Phase 10C.2, integrate collaboration invitations, synchronized membership, review transitions, and project feedback.
- [ ] In Phase 10C.3, integrate safe Git inspection, short-lived credentials, and local-client guidance.

### Remaining Phase 10 milestones

- [ ] Preserve current routes, CSS, responsive behavior, and unrelated mocks until their owning workflow replaces them.
- [ ] Add persisted notifications, canonical analytics, and role-appropriate similarity projections when their backend support exists.
- [ ] In Phase 10D, redesign and integrate the admin frontend using the student/instructor visual language, spacing, typography, navigation, components, tables, chips, drawers, dialogs, and interaction patterns.

## Phase 11: hardening, deployment, and evaluation — pending

- [ ] Complete security hardening, durable administrative auditing, integration/end-to-end tests, and laboratory evaluation.
- [ ] Add hosted TLS, reverse proxy, secret injection, backups, restore testing, health monitoring, and incident/shutdown procedures.
- [ ] Deploy portably to a temporary VPS, student cloud credit, or approved SLU host for controlled testing and defense.
- [ ] Enable Java execution only after hosted isolation and resource-limit tests pass.
- [ ] Keep university-wide rollout, high availability, multi-server failover, and 24/7 service out of scope.
- [ ] Remove or disable the temporary environment after the approved period.

## Every-phase regression gate

- [ ] Scope matches the explicit approved request.
- [ ] The selected base contains every accepted prior phase.
- [ ] Existing application behavior remains operational.
- [ ] Existing UI, routing, CSS, layout, and responsive behavior remain unchanged unless explicitly approved.
- [ ] Unrelated mocks remain intact.
- [ ] New input is validated and backend authorization is tested at service/resource boundaries.
- [ ] Database constraints and transactions cover concurrency and academic-history invariants.
- [ ] No external compiler, GitHub, or GitLab API is used for core behavior.
- [ ] No `prisma db push`, `prisma migrate reset`, secret disclosure, or unapproved destructive database action occurs.
- [ ] `.env`, credentials, tokens, cookies, preview mail, database URLs, and private data are absent from tracked changes and logs.
- [ ] Relevant Prisma, migration, lint, type-check, test, build, API, and live checks pass.
- [ ] Every changed file, migration, endpoint, environment variable, command, manual step, and known risk is reported.
- [ ] Work stops after the requested phase.
