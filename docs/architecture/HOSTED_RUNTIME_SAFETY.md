# Hosted Runtime Safety

## Phase 11A boundary

Phase 11A establishes deployment prerequisites; it does not deploy Projex. The backend derives two profiles from validated configuration:

- `LOCAL_FULL` is for a controlled developer machine. Java and Git capabilities are advertised only when their local-process modes are actually enabled.
- `HOSTED_SAFE` is the production profile. Java execution, Git provisioning/inspection, and native Git Smart HTTP remain disabled until separately approved hosted isolation exists.

Clients cannot select a profile or enable a capability. `GET /api/v1/capabilities` returns only the effective profile and booleans for Java execution plus Git provisioning, inspection, and Smart HTTP. It omits modes, paths, hosts, executables, limits, and environment values.

## Fail-closed behavior

- Disabled Java rejects practice, official submission, and assessment-retry enqueue operations before a job is created.
- Disabled Git rejects personal and class-project repository creation before repository or provisioning-job persistence.
- Existing academic records and repository metadata remain readable under their normal authorization rules.
- Git inspection and credential issuance retain backend capability gates. Frontend states are explanatory only; backend checks remain authoritative.

## Session and proxy rules

- Production requires secure cookies and exactly one trusted reverse-proxy hop. Blanket `trust proxy=true` is forbidden.
- Refresh rotation retains the original session-family absolute expiration. A configurable idle limit uses persisted `lastUsedAt`, falling back to `createdAt`; it must exceed the access-token lifetime and cannot exceed absolute refresh expiry. No schema change is needed.
- The reverse proxy terminates TLS, serves the built frontend, proxies `/api/*` to loopback, and adds baseline browser security headers.
- The Phase 11A proxy template deliberately does not forward `/api/v1/git/*`. Native Git Smart HTTP remains controlled-local only.

## Deployment preflight

Run `npm run deployment:preflight` from `server/` after private hosted variables and required directories are prepared. It validates configuration, database reachability, committed migration application, and enabled Git/Java prerequisites. It prints only stable check names, statuses, and safe codes. Any `BLOCKING` result exits nonzero. It never applies migrations, creates storage, prints secrets, or starts workers.

`server/.env.hosted-safe.example` contains placeholders only. Hosted secrets must be injected by the selected host. `deploy/Caddyfile.example` is a provider-neutral reference, not evidence that deployment occurred.

Prisma remains pinned at `6.19.3`. The current Windows dependency tree contains the matching schema engine in `@prisma/engines`, while the CLI-local engine copy is missing and causes an attempted network download. This is an installation-artifact problem, not a schema or version incompatibility. A reproducible hosted build must repair/verify the pinned install before migration deployment; Phase 11A does not upgrade Prisma or hide the problem with a committed host path.

The Phase 11A dependency audit is evidence, not authorization to upgrade. The backend audit reports high-severity transitive findings only in development tooling (`brace-expansion`, `js-yaml`, and `nanoid`). The frontend audit reports development-tool findings (`brace-expansion`, `nanoid`, and `postcss`) plus the direct `react-router-dom`/`react-router` advisory. Projex uses the SPA data-router APIs rather than React Server Components, which narrows the known router advisory's reachable mode, but the dependency still requires a separately approved update and regression review before hosted exposure.

## Deferred boundaries

Phase 11B owns backup/restore and operational runbooks. Phase 11C owns controlled hosted deployment and exposure. Phase 11D owns acceptance, load, security evidence, and capstone evaluation. Hosted Java and Git execution remain unavailable until their isolation boundaries are separately approved and verified.
