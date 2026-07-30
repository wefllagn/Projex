# Projex Server

Phase 2 provides the Projex API foundation, PostgreSQL health check, core Prisma data model, and initial database migration. It does not contain authentication, business endpoints, seed data, Java execution, or Git integration.

## Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL 18 running locally on Windows
- The existing `projex` database and `projex_user` database user

Docker is not required for Phase 2.

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
npm test
npm run build
npm start
```

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
