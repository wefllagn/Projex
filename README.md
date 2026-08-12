# Projex

Projex is a local-first academic programming and repository collaboration platform for Saint Louis University.

## Frontend

The existing React 19, Vite, and JavaScript/JSX frontend is located in [`client/`](client/).

Install its dependencies:

```powershell
cd client
npm install
```

Run the frontend locally:

```powershell
cd client
npm run dev
```

## Backend

The Node.js, Express, TypeScript, Prisma, and PostgreSQL backend is located in [`server/`](server/).

PostgreSQL 18 is currently installed directly on Windows. Docker is not required for controlled local development.

Configure the backend with private local environment variables using [`server/.env.example`](server/.env.example) as the placeholder reference, then run:

```powershell
cd server
npm install
npm run prisma:generate
npm run dev
```

No real database credentials are stored in the repository. See [`server/README.md`](server/README.md) for current commands and health-check instructions. Phase 11A provides hosted-safety prerequisites only; no deployment has been performed.

The product and architecture documentation remains in [`docs/`](docs/).
