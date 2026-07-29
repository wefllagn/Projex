# Projex Server

Phase 1 provides the Projex API foundation and PostgreSQL health check only. It does not contain authentication or academic domain features.

## Prerequisites

- Node.js 20.19 or newer
- npm
- PostgreSQL 18 running locally on Windows
- The existing `projex` database and `projex_user` database user

Docker is not required for Phase 1.

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

Do not run a database reset. Phase 1 does not run migrations or create business tables.

## Development commands

```powershell
npm run dev
npm run lint
npm run type-check
npm test
npm run build
npm start
```

Prisma scripts are available for later approved phases:

```powershell
npm run prisma:migrate:dev
npm run prisma:studio
```

Do not run the migration command during Phase 1.

## Health check

After setting valid local environment variables and starting the server:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
```

A connected local PostgreSQL instance returns `status: ok` and `database: connected` in the standard API envelope. If PostgreSQL is unreachable, the endpoint returns a safe `503` response without credentials, database URLs, filesystem paths, or stack traces.

Automated tests inject a database-health dependency and do not require private PostgreSQL credentials.
