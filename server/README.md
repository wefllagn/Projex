# Projex Server

Projex includes the Phase 1–10 backend and integrated frontend contracts. Phase 11A adds hosted-safe capability gating and deployment prerequisites; it does not deploy or publicly expose the service. Hosted Java and Git execution, public/SSH Git access, arbitrary infrastructure control, and admin source/grade authority remain unavailable.

## Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL 18 running locally on Windows
- The existing `projex` database and `projex_user` database user
- A local JDK with `javac`/`java` available for `npm run test:java` or controlled-local worker verification (JDK 23 is supported; Projex compiles with `--release 17`)

Docker is not required for controlled local Phase 7 development. Java execution must stay disabled on an internet-accessible deployment until Docker or equivalent isolation is implemented and verified.

## Environment setup

`server/.env.example` contains safe placeholders. Never commit real credentials or create credentials in source files.

For local development, either set the variables in the current PowerShell session or make a local, ignored `server/.env` based on `.env.example`. Replace the placeholder password only in your private environment.

Required variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `FRONTEND_ORIGIN`
- `LOG_LEVEL`
- `REQUEST_BODY_LIMIT`
- `TRUST_PROXY_HOPS` (`0` locally; exactly `1` for the approved single reverse-proxy production shape)
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `SESSION_IDLE_TTL_MINUTES`
- `ACCOUNT_SETUP_TOKEN_TTL_HOURS`
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAME_SITE`
- `MAIL_TRANSPORT`
- `MAIL_FROM_NAME`
- `MAIL_FROM_ADDRESS`
- `MAIL_PREVIEW_DIR`
- `JAVA_EXECUTION_MODE` (`disabled` by default; `local_process` is development-only)
- `JAVA_EXECUTABLE`
- `JAVAC_EXECUTABLE`
- `JAVA_RELEASE` (must be `17`)
- `JAVA_JOB_ROOT`
- `JAVA_SOURCE_LIMIT_BYTES`
- `JAVA_COMPILE_TIMEOUT_MS`
- `JAVA_TEST_TIMEOUT_MS`
- `JAVA_OUTPUT_LIMIT_BYTES`
- `JAVA_MEMORY_LIMIT_MB`
- `EXECUTION_JOB_LEASE_MS`
- `EXECUTION_WORKER_POLL_MS`
- `PRACTICE_RUN_TTL_HOURS`
- `PRACTICE_RUNS_PER_MINUTE`
- `PRACTICE_MAX_ACTIVE_PER_ACTIVITY`

When `MAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD` are also required. Preview transport is rejected in production.

Use `.env.hosted-safe.example` only as a placeholder inventory. Before a hosted process is started, run `npm run deployment:preflight`; any blocking check stops deployment. The command does not apply migrations or start workers.

Prisma remains pinned at `6.19.3`. On the current Windows workstation the matching schema engine is present under `@prisma/engines`, but the Prisma CLI package-local copy may be absent after an incomplete postinstall and then attempts an online engine download. Do not upgrade Prisma to work around this. Repair the pinned installation in the future deployment build or use an explicitly validated process-local engine path for diagnostics; never commit that host path or place it in application environment examples.

## Install and generate Prisma Client

```powershell
cd server
npm install
npm run prisma:generate
```

After any approved Prisma model change, run:

```powershell
npx prisma format
npx prisma validate
npm run prisma:generate
```

## Migration workflow

Create a future migration without applying it immediately:

```powershell
npx prisma migrate dev --name descriptive_migration_name --create-only
```

Inspect the generated `prisma/migrations/<timestamp>_<name>/migration.sql`, including any required PostgreSQL constraints Prisma cannot express. Apply it only after review:

```powershell
npx prisma migrate dev
```

The database user must be able to use a separately configured shadow database for `migrate dev`. The Phase 2 local user could not create databases, so the initial migration was generated from the validated empty schema with `prisma migrate diff` and applied with `prisma migrate deploy`. Do not grant broader database privileges or introduce a shadow database without an explicit environment decision.

Inspect migration status without changing the database:

```powershell
npx prisma migrate status
```

For an already-reviewed migration in a controlled environment, apply pending migrations with:

```powershell
npx prisma migrate deploy
```

Migration safety rules:

- Never run `prisma migrate reset`.
- Never run `prisma db push`.
- Never run `npm audit fix --force` as part of migration work.
- Stop if Prisma reports schema drift or asks to reset the database.
- Never place credentials in schema, migration, documentation, logs, or command output.
- Do not edit an applied migration; add a new reviewed migration in a later approved phase.

## Development commands

```powershell
npm run dev
npm run dev:worker
npm run lint
npm run type-check
npm run type-check:integration
npm test
npm run test:java
npm run test:integration
npm run build
npm start
npm run start:worker
```

## API endpoints

All endpoints use `/api/v1` and JSON response envelopes:

```text
POST  /auth/login
POST  /auth/refresh
POST  /auth/logout
POST  /auth/logout-all
GET   /auth/me
POST  /auth/change-password
POST  /account-setup/complete
POST  /users/students
POST  /users/instructors
POST  /users/:userId/resend-setup
PATCH /users/:userId/status
GET   /admin/users/:userId/account-summary
POST  /admin/users/:userId/sessions/revoke
GET   /admin/overview
GET   /admin/academic/classes
GET   /admin/academic/activities
GET   /admin/academic/submissions
GET   /admin/academic/project-tasks
GET   /admin/academic/repositories
GET   /admin/operations/health
GET   /admin/operations/storage
GET   /admin/operations/execution-jobs
GET   /admin/operations/repository-provisioning-jobs
GET   /admin/operations/git-credentials
POST  /admin/operations/git-credentials/:credentialId/revoke
POST  /admin/operations/repository-provisioning-jobs/:jobId/retry
GET   /admin/audit-events
GET   /users
GET   /users/:userId
POST  /classes
GET   /classes
GET   /classes/:classId
PATCH /classes/:classId
POST  /classes/:classId/archive
POST  /classes/:classId/restore
GET   /classes/:classId/join-code
POST  /classes/:classId/join-code/rotate
POST  /classes/:classId/join-code/revoke
POST  /classes/join
GET   /classes/:classId/members
PATCH /classes/:classId/members/:memberId
POST  /classes/:classId/activities
GET   /classes/:classId/activities
GET   /activities/:activityId
PATCH /activities/:activityId
POST  /activities/:activityId/publish
POST  /activities/:activityId/close
POST  /activities/:activityId/archive
POST  /activities/:activityId/restore
GET   /activities/:activityId/test-cases
PUT   /activities/:activityId/test-cases
POST  /activities/:activityId/submissions
GET   /activities/:activityId/submissions
POST  /activities/:activityId/visible-test-runs
GET   /visible-test-runs/:runId
GET   /submissions/:submissionId
POST  /submissions/:submissionId/score-corrections
PUT   /submissions/:submissionId/review
POST  /submissions/:submissionId/release
POST  /submissions/:submissionId/assessment/retry
POST  /submissions/:submissionId/assessment/resolve-failure
POST  /classes/:classId/project-tasks
GET   /classes/:classId/project-tasks
GET   /project-tasks/:projectTaskId
PATCH /project-tasks/:projectTaskId
POST  /project-tasks/:projectTaskId/publish
POST  /project-tasks/:projectTaskId/close
POST  /project-tasks/:projectTaskId/archive
POST  /project-tasks/:projectTaskId/restore
GET   /project-tasks/:projectTaskId/teams
GET   /project-tasks/:projectTaskId/monitoring
POST  /project-tasks/:projectTaskId/repositories
POST  /repositories/personal
GET   /repositories
GET   /repositories/:repositoryId
PATCH /repositories/:repositoryId
POST  /repositories/:repositoryId/ready-for-review
POST  /repositories/:repositoryId/request-changes
POST  /repositories/:repositoryId/approve
POST  /repositories/:repositoryId/archive
POST  /repositories/:repositoryId/restore
GET   /repositories/:repositoryId/members
PATCH /repositories/:repositoryId/members/:memberId
POST  /repositories/:repositoryId/invitations
GET   /repositories/:repositoryId/invitations
GET   /repository-invitations
POST  /repository-invitations/:invitationId/accept
POST  /repository-invitations/:invitationId/decline
POST  /repository-invitations/:invitationId/revoke
GET   /repositories/:repositoryId/feedback
POST  /repositories/:repositoryId/feedback-drafts
PATCH /repository-feedback/:feedbackId
POST  /repositories/:repositoryId/git-credentials
GET   /repositories/:repositoryId/git-credentials
POST  /git-credentials/:credentialId/revoke
GET   /git/repositories/:repositoryId/info/refs?service=git-upload-pack
GET   /git/repositories/:repositoryId/info/refs?service=git-receive-pack
POST  /git/repositories/:repositoryId/git-upload-pack
POST  /git/repositories/:repositoryId/git-receive-pack
```

There is no public registration endpoint. Cookie-authenticated mutations require `Content-Type: application/json`, the readable `projex_csrf` cookie, and the same value in `X-CSRF-Token`.

Global user listing/detail is admin-only. Class APIs are scoped to admins, owning instructors, and students with ACTIVE membership. Student roster responses contain only user ID and full name. Join codes are available only to the owning instructor or admin and are never logged.

Repository visibility remains server-owned: class-project repositories are `CLASS_ONLY`, personal repositories are `PRIVATE`, and `PUBLIC` is unavailable. The Phase 7 baseline stored metadata only; Phase 8A adds separate-worker provisioning without changing the Phase 7 lifecycle, authorization, invitation, review, or archive rules documented in `docs/architecture/PROJECT_REPOSITORY_COLLABORATION.md`.

## Phase 8A Git provisioning

Git execution is disabled by default and creates no storage directory. Controlled local development requires an absolute `GIT_EXECUTABLE`, an absolute `GIT_STORAGE_ROOT`, and `GIT_EXECUTION_MODE=local_process`. The tested toolchain is Git for Windows `2.55.0.windows.3`; supported Git for Windows versions must be at least `2.55.0`. Production rejects `local_process`.

Run the separate worker only after the target database and storage root are explicitly approved:

```powershell
npm run dev:git-worker
```

Real-Git tests require `TEST_DATABASE_URL` naming `projex_test`, an absolute `GIT_EXECUTABLE`, and a non-overlapping absolute `TEST_GIT_STORAGE_ROOT` ending in `projex_git_test`:

```powershell
npm run test:git
```

The migration records pending jobs only. It does not initialize storage. See `docs/architecture/GIT_FOUNDATION_AND_PROVISIONING.md` for the worker, recovery, quarantine, and test-root rules.

## Phase 8B authenticated Smart HTTP

`GIT_SMART_HTTP_ENABLED=false` is the safe default. Controlled local use additionally requires the exact absolute `GIT_HTTP_BACKEND_EXECUTABLE`, a validated Git for Windows `2.55.0` or later, an approved READY repository root, and a loopback API host. Production local-process mode and insecure non-loopback listeners are rejected.

Credentials expire after 15 minutes by default, are scoped to one user/repository/operation set, store only a verifier, and return their random secret once. Current user, membership, repository, task, deadline, and ref permissions are checked on every transport request. Never put the secret in a URL or Git configuration.

Guarded end-to-end tests require `TEST_DATABASE_URL` naming exactly `projex_test`, a separate `TEST_GIT_STORAGE_ROOT` ending in `projex_git_test`, and absolute Git/backend executables:

```powershell
npm run test:smart-http
```

The test runner deploys committed migrations only to `projex_test`, opens an ephemeral loopback server, and removes only its sentinel-owned run directory. It never falls back to the normal database or Git root. See `docs/architecture/GIT_SMART_HTTP_TRANSPORT.md` for authorization, limits, hook policy, and remaining hosted-isolation limits.

### Phase 8C repository inspection

When controlled local Git execution is enabled, authenticated users with current source READ authority can inspect READY repositories through `/api/v1/repositories/:repositoryId/source/*`. The API supports summary, branches, paginated reachable commits, commit detail, tree browsing, bounded UTF-8 file viewing, and bounded diff. Smart HTTP may remain disabled for inspection.

Default inspection limits are configured through `GIT_INSPECTION_FILE_LIMIT_BYTES`, `GIT_INSPECTION_DIFF_LIMIT_BYTES`, and `GIT_INSPECTION_MAX_CHANGED_FILES`. Client filesystem paths, arbitrary revision expressions, binary output, Git arguments/configuration, and host paths are rejected or omitted. Server-created branches, commits, merges, and branch deletion remain deferred. See `docs/architecture/GIT_REPOSITORY_INSPECTION.md`.

Activity and test-case authoring are restricted to the owning instructor. Administrators receive metadata-only activity oversight and cannot retrieve test-case definitions, starter source, practice outcomes, or instructor-only academic projections. Students with ACTIVE membership may read only PUBLISHED or CLOSED activities and visible test cases. Hidden test rows and counts are excluded from student responses. Published scoring/test configuration is immutable.

Phase 9A admin account summaries expose safe account/setup state, session counts, and class-membership summaries only. Target-session revocation and disruptive status/class/membership actions require bounded reasons and write allowlisted audit events transactionally. The status endpoint also requires `expectedUpdatedAt`, rejects self-disablement, and preserves at least one ACTIVE administrator under concurrency.

Phase 9B adds ACTIVE-admin-only read-only oversight. Academic lists expose lifecycle, identity, ownership, released-score, storage-measurement, and bounded-count metadata through explicit allowlists; they never return source, hidden tests, assessment evidence, feedback text, or host paths. Operational lists expose sanitized job/credential/audit lifecycle metadata. Health distinguishes API, database, and persisted queue observations and reports worker health as `not_observed`. All lists use endpoint-specific filters and pagination capped at 100; no Phase 9B request changes application records.

Phase 9C adds two narrow ACTIVE-admin operations. Credential revocation is monotonic and returns safe metadata only; Smart HTTP denies a revoked credential on its next request. Provisioning retry requires a current version and an eligible exhausted FAILED job, preserves diagnostics, grants one additional claim, and writes its audit event atomically. The API never executes Git or touches storage; only the separate Git worker performs the later claim. Quarantine recovery, generic/Java retry, repository repair, and admin Git/source authority remain unavailable.

Official submissions require Java execution to be enabled, Java source, and an `Idempotency-Key`. Ordinary attempts are limited by the activity's one-to-three usable-attempt setting. Infrastructure retries reuse the original record; an owning instructor may formally grant one future-expiring replacement, which may cross a deadline/CLOSED state but cannot bypass archive, inactive account, removed membership, expiration, or single-use rules.

Run Visible Tests uses only visible server-owned cases, accepts no custom stdin, and creates no official attempt or score. Students see visible outcomes immediately but see numeric scores, instructor points, released final score, and feedback only after release. Hidden-test definitions, IDs, names, outcomes, points, and counts are never returned to students. Administrators have safe read-only submission visibility and cannot grade or resolve failures.

## Controlled-local Java worker

Keep `JAVA_EXECUTION_MODE=disabled` unless running an explicitly controlled local verification. To process accepted jobs locally, set the private environment to `local_process`, run the API and worker as separate processes, and never expose that configuration to the internet:

```powershell
npm run dev
npm run dev:worker
```

The worker compiles with `--release 17`, uses argument arrays without a shell, creates a unique temporary directory per job, bounds time/memory/output, and cleans the directory. These local controls are not container isolation; network, filesystem, CPU, and process boundaries required for hostile internet-submitted code remain deferred.

## PostgreSQL integration tests

Real database tests require a private `TEST_DATABASE_URL` whose database name is exactly `projex_test`. The runner never falls back to `DATABASE_URL` and aborts before migration/test execution for any unrecognized name.

```powershell
npm run test:integration
```

The command applies committed migrations with `prisma migrate deploy`, runs serially, and cleans only the recognized test database through Prisma. It never runs `prisma db push` or `prisma migrate reset`. Do not reuse the development database or place real credentials in `.env.example`.

## Development email previews

With `MAIL_TRANSPORT=preview`, provisioned-account messages are written to the ignored `.mail-preview/` directory instead of being sent. Logs show only the preview filename. Preview files contain the setup link and must remain local and uncommitted.

For SMTP, configure the validated SMTP variables privately. The implementation is provider-neutral and does not assume Gmail, Google Workspace administration, or a personal SLU password.

## Initial administrator

Set the following only in the private CLI environment:

- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

Then run once:

```powershell
npm run admin:create
```

The command creates an active `ADMIN`, refuses duplicate email, never prints the password, and does not run during normal startup. Students and instructors are not seeded.

Prisma Studio is available for local inspection:

```powershell
npm run prisma:studio
```

## Archive-over-delete policy

Main academic records must use their status/archive lifecycle instead of routine hard deletion. Membership removal must not erase submissions, scores, feedback, repository contribution history, or other academic evidence. Cascade deletion is limited to dependent child records and only follows an explicitly approved exceptional parent deletion.

## Health check

After setting valid local environment variables and starting the server:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
```

A connected local PostgreSQL instance returns `status: ok` and `database: connected` in the standard API envelope. If PostgreSQL is unreachable, the endpoint returns a safe `503` response without credentials, database URLs, filesystem paths, or stack traces.

Automated tests inject a database-health dependency and do not require private PostgreSQL credentials.
