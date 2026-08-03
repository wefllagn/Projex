# Projex Server

Phase 5 provides the Projex API foundation, PostgreSQL schema, provisioned-account authentication, user/class/membership management, programming-activity lifecycle, and visible/hidden test-case authoring. It remains backend-only and does not contain public registration, frontend integration, password reset, submissions, automated scoring, score correction, rubric grading, repository endpoints, seed data, Java execution, or Git integration.

## Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL 18 running locally on Windows
- The existing `projex` database and `projex_user` database user

Docker is not required for Phase 5.

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
npm run lint
npm run type-check
npm run type-check:integration
npm test
npm run test:integration
npm run build
npm start
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
```

There is no public registration endpoint. Cookie-authenticated mutations require `Content-Type: application/json`, the readable `projex_csrf` cookie, and the same value in `X-CSRF-Token`.

Global user listing/detail is admin-only. Class APIs are scoped to admins, owning instructors, and students with ACTIVE membership. Student roster responses contain only user ID and full name. Join codes are available only to the owning instructor or admin and are never logged.

Activity authoring is restricted to the owning instructor or an administrator. Students with ACTIVE membership may read only PUBLISHED or CLOSED activities and visible test cases. Hidden test rows and counts are excluded from student responses. Published scoring/test configuration is immutable, and Phase 5 does not execute Java or create/grade submissions.

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
