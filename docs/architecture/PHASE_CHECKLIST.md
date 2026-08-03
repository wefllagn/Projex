# Projex Full-Stack Phase Checklist

## Purpose and authority

This checklist gates the transition from the hardcoded UI to a functional full-stack system. It does not authorize implementation beyond the phase explicitly requested and accepted.

The earlier UI implementation checklist under `docs/PROJEX_IMPLEMENTATION_CHECKLIST.md` uses a separate historical phase numbering scheme. It remains an accurate record of the UI build, but this file is authoritative for the current full-stack roadmap.

Status markers:

- `[x]` completed and accepted.
- `[ ]` pending.
- `[~]` approved or partially complete but not yet implemented and accepted.

## Current status

| Phase | Scope | Status | Baseline commit |
| --- | --- | --- | --- |
| 0 | Architecture and planning | Complete | `55b65e9` |
| 1 | Backend foundation | Complete | `bd45349` |
| 2 | Database foundation | Complete | `3cf0354` |
| 3 | Authentication and authorization | Complete | `bf45efd` |
| 4 | User and Class Management | Complete | `985f101` |
| 5 | Programming Activities and Test Cases | Implemented; test-database verification complete, development migration/live verification pending | Working tree |
| 6-11 | Later functionalization, integration, and hardening | Pending | Pending |

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

## Phase 5: programming activities and test cases — implementation complete, pending review and commit

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

## Phase 6: submissions and automated assessment — pending

- [ ] Implement immutable attempts, server-assigned numbering, idempotency, due-state checks, and concurrency-safe attempt limits.
- [ ] Implement the PostgreSQL-backed execution queue and separate Java worker.
- [ ] Compile once per assessment and enforce time, memory, CPU, process, disk, network, and output limits.
- [ ] Preserve source snapshots, execution results, test-case results, automated scores, and attempt history.
- [ ] Implement instructor review, preserved original automated results, separately recorded score corrections/adjustments with actor/reason/time, feedback drafts, and controlled release.
- [ ] Add Docker/container isolation before internet-hosted Java execution.

## Phase 7: project and repository collaboration — pending

- [ ] Implement project tasks, teams, memberships, repository metadata, collaborator invitations, and feedback workflows.
- [ ] Enforce class, project, team, owner, and collaborator authorization.
- [ ] Keep core Git operations pending for Phase 8.

## Phase 8: local Git operations — pending

- [ ] Provision server-owned bare repositories without GitHub or GitLab APIs.
- [ ] Execute the local Git CLI through argument arrays without shell-string concatenation.
- [ ] Validate repository names, paths, refs, branches, and tags.
- [ ] Use temporary worktrees, bounded process execution, safe configuration, and guaranteed cleanup.
- [ ] Implement per-repository write locks and preserve commit, branch, diff, and contribution history.

## Phase 9: Admin functionalization — pending

- [ ] Bind the existing Admin UI to approved account, class, repository, storage, archive, and health operations.
- [ ] Preserve explicit authorization, data minimization, confirmation, and security logging.
- [ ] Add narrowly approved maintenance controls only.

## Phase 10: frontend integration — pending

- [ ] Integrate the existing React/JavaScript UI with completed backend features without redesign.
- [ ] Replace mocks one approved workflow at a time through adapters and view models.
- [ ] Integrate login, session refresh, CSRF, logout, role routing, protected states, and safe errors.
- [ ] Preserve current routes, CSS, responsive behavior, and unrelated mocks until replaced.
- [ ] Add persisted notifications, canonical analytics, and role-appropriate similarity projections when their backend support exists.

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
