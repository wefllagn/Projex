# Projex Server

Phase 7 provides the Projex API foundation, PostgreSQL schema, provisioned-account authentication, user/class/membership management, programming activities/test cases, immutable submissions and controlled-local Java assessment, plus project tasks, metadata-only personal/class-project repositories, synchronized teams/collaborators, invitations, textual project feedback, review, monitoring, and archive protection. It remains backend-only and does not contain public registration, frontend integration, password reset, project rubric/grade calculation, post-release submission correction, seed data, hosted Java execution, repository filesystem provisioning, or Git integration.

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
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
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
```

There is no public registration endpoint. Cookie-authenticated mutations require `Content-Type: application/json`, the readable `projex_csrf` cookie, and the same value in `X-CSRF-Token`.

Global user listing/detail is admin-only. Class APIs are scoped to admins, owning instructors, and students with ACTIVE membership. Student roster responses contain only user ID and full name. Join codes are available only to the owning instructor or admin and are never logged.

Phase 7 repository visibility is server-owned: class-project repositories are `CLASS_ONLY`, personal repositories are `PRIVATE`, and `PUBLIC` is unavailable. Phase 7 stores metadata only; it does not create repository directories or invoke Git. See `docs/architecture/PROJECT_REPOSITORY_COLLABORATION.md` for lifecycle, authorization, invitation, review, and archive rules.

Activity authoring is restricted to the owning instructor or an administrator. Students with ACTIVE membership may read only PUBLISHED or CLOSED activities and visible test cases. Hidden test rows and counts are excluded from student responses. Published scoring/test configuration is immutable.

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
