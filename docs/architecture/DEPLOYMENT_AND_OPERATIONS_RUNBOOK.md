# Projex Deployment and Operations Runbook

## Scope

This is the canonical operator procedure for a temporary, controlled Projex deployment. Architecture and trust policy remain in `SYSTEM_ARCHITECTURE.md`, `SECURITY_RULES.md`, and `HOSTED_RUNTIME_SAFETY.md`.

The supported hosted profile is `HOSTED_SAFE`: Caddy terminates HTTPS and serves the React SPA, proxies `/api/*` to the loopback Express API, and rejects `/api/v1/git/*`. PostgreSQL is private. Java execution, Git provisioning/inspection, and native Smart HTTP remain disabled. Phase 11B.1 supplies tooling and procedure; it is not evidence that a backup, restore, migration, deployment, or public exposure occurred.

## Host prerequisites

- A supported Linux host with an unprivileged `projex` service account.
- Node.js 20.19 or newer and npm.
- PostgreSQL 18 client/server tools, including `pg_dump` and `pg_restore`.
- Git, `tar`, SHA-256 tooling, systemd, and Caddy for the later approved deployment.
- Persistent disk sized for live PostgreSQL, managed Git state, one backup, one isolated restore, and operating headroom.
- A hostname whose HTTPS origin exactly matches `FRONTEND_ORIGIN`.

No host package, account, directory, DNS record, certificate, or firewall rule is created by this repository.

## Host layout and ownership

Recommended layout:

```text
/etc/projex/projex.env          root:projex 0640, private runtime configuration
/opt/projex/releases/<commit>/  immutable commit-addressed releases
/opt/projex/current             operator-managed pointer to the active release
/var/lib/projex/                persistent server-owned state
/var/backups/projex/            restricted paired backups
```

The API runs as `projex`, not root. The public web root contains only the built client. PostgreSQL data, Git storage, backups, environment files, logs, and credentials must never be below that web root.

## Prepare a release

1. Check out the exact approved commit in a clean Linux checkout.
2. Set only `PROJEX_SOURCE_ROOT` and `PROJEX_RELEASES_ROOT` for the release-preparation process.
3. Review `deploy/scripts/prepare-release.sh` and run it as the deployment operator.
4. The script uses `git archive`, `npm ci`, Prisma generation/validation, backend compilation, and the client production build. The release retains the exact verified server install because the pinned Prisma CLI is required for controlled migrations; dependency pruning is not performed implicitly.
5. Confirm `release.json` contains the expected commit.

The script never reads a hosted `.env`, applies migrations, starts services, or exposes a port. It rejects dirty/untracked source and existing release targets. Build on Linux; do not copy Windows Prisma engines into a Linux release.

## Private configuration

Base the inventory on `server/.env.hosted-safe.example`, but inject real values through `/etc/projex/projex.env`. Keep it out of Git, release artifacts, backups, command arguments, and logs.

- Frontend build time: `VITE_API_BASE_URL=/api/v1`; no secret.
- Runtime: origin, loopback host/port, exact proxy hop, logging, and limits.
- Secrets: `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, and SMTP credentials where approved.
- Capabilities: Java disabled, Git disabled, Smart HTTP false.
- Bootstrap: initial-admin values exist only for the one-time command and are removed afterward.

Production currently rejects preview mail and the configuration validator therefore requires a real SMTP transport and credentials even when all synthetic tester accounts were pre-provisioned. The preferred acceptance method remains pre-provisioned synthetic accounts with controlled out-of-band credential distribution, but a no-SMTP hosted process is not currently startable. Phase 11C must either supply dedicated low-volume SMTP or obtain separate approval for a production configuration change; Phase 11B.1 does not weaken validation. Do not use fake production SMTP values or personal credentials.

## Controlled migrations

Migrations are a manual release action, never an API or systemd startup action:

1. Prepare and inspect the exact release.
2. Verify the target-platform Prisma `6.19.3` engine.
3. Run `npm run prisma:generate` and `npx --no-install prisma validate` from the release server directory.
4. Build the release and stop public writes.
5. Create and verify a paired pre-migration backup under a separately approved backup execution boundary.
6. Run `npx --no-install prisma migrate status` and confirm only reviewed migrations are pending.
7. Run `npx --no-install prisma migrate deploy` only with explicit hosted-migration approval.
8. Run migration status again; stop on drift, incomplete migrations, or any reset request.
9. Run `node dist/scripts/deployment-preflight.js` from the installed release.
10. Start the API and proxy, then perform smoke checks.

Never use `prisma db push`, `prisma migrate reset`, down migrations, or edited applied migrations.

## systemd and Caddy

Review and install `deploy/systemd/projex-api.service.example` only during an approved host-configuration task. Replace placeholders through the documented host layout, not by embedding secrets. It runs only the API, explicitly overrides `HOST` to loopback, uses the private environment file, restarts on failure, and sends `SIGTERM` for the API's existing graceful shutdown. It does not migrate.

Use `deploy/Caddyfile.example` as the HTTPS/static/proxy template. Only ports 80/443 should normally be public; restrict SSH. Never expose the API port, PostgreSQL, workers, Git storage, or native Smart HTTP.

Start order: PostgreSQL, controlled migration/preflight, API, then Caddy. `HOSTED_SAFE` has no Java or Git worker service.

Shutdown order: stop new traffic at Caddy, stop the API and wait for graceful completion, stop any separately approved workers, then stop PostgreSQL only if host maintenance requires it.

## Health and smoke checks

After a separately approved deployment, verify:

1. HTTPS and certificate validation.
2. SPA load and direct-route refresh.
3. security headers.
4. `/api/v1/health` API/database success.
5. current migration status.
6. `/api/v1/capabilities` reports `HOSTED_SAFE` with Java and every Git capability false.
7. Caddy rejects `/api/v1/git/*`.
8. protected routes deny unauthenticated access.
9. synthetic role logins, CSRF, authorization, and logout.
10. redacted API/Caddy logs.

## Paired backup preparation

PostgreSQL and the complete managed Git root form one recovery point. Before backup:

1. Stop public traffic and gracefully stop the API and workers.
2. Ensure no execution or provisioning job is `RUNNING` and no repository is `PROVISIONING`.
3. Ensure Git `staging/` is empty.
4. Ensure `transport/requests/` is empty after accepted-push recovery.
5. Validate the canonical Git root and backup output roots: absolute, non-overlapping, outside the source/test roots, and free of symlink/junction traversal.
6. Record the exact application commit, migration state, and tool versions.

Persisted unclaimed jobs may be included. Transitional work blocks backup and must be resolved normally; the tooling never mutates jobs to force success.

## Backup procedure

`node dist/scripts/operations-backup.js --execute` from the installed release is intentionally difficult to invoke. (`npm run operations:backup -- --execute` is the source-checkout equivalent.) It requires private process environment values including explicit `OPERATIONS_BACKUP_CONFIRM=CREATE_PAIRED_BACKUP`, a safe backup ID, absolute PostgreSQL/tar executables, controlled roots, application/tool metadata, and the database URL. Never place these values in source or shell history.

The tool:

- performs read-only quiescence and path checks;
- invokes `pg_dump` with a fixed argument array using custom format, no owner, and no privileges;
- passes PostgreSQL connection fields only through the child environment;
- archives the complete Git root using a fixed tar argument array;
- writes a secret-free manifest and SHA-256 checksums;
- removes only its marker-owned incomplete output directory on failure.

Phase 11B.1 must not run this command. Real backup execution requires explicit Phase 11B.2 approval.

## Restore-verification procedure

Restore proof is isolated from normal data. Use an explicit database matching `projex_restore_verify_<id>`, a separate Git root, loopback-only configuration, and disabled Java/Git capabilities. `RESTORE_VERIFY_DATABASE_URL` never falls back to `DATABASE_URL`.

`node dist/scripts/operations-restore-preflight.js` from the installed release validates the manifest, artifact hashes, database name, source/destination containment, and planned `pg_restore`/`git fsck` argument arrays. (`npm run operations:restore:preflight` is the source-checkout equivalent.) It does not execute `pg_restore`.

A later Phase 11B.2 proof must separately approve database/root creation and verify migrations, safe row counts, representative relationships, repository markers, DB/filesystem correspondence, orphan absence, `git fsck --full`, API health/capabilities, and synthetic authentication. Evidence contains booleans, safe counts, IDs only where needed, and stable codes—never credentials, paths, source, tests, feedback, or personal data.

Before any Windows-created managed Git state is restored onto Linux, audit the database `storagePath` values for path-separator portability. Existing repository paths were generated with the host path library and may contain Windows separators. Do not silently rewrite those authoritative values during restore; cross-platform normalization requires a separately reviewed compatibility correction before a Windows-to-Linux recovery can be accepted.

## Rollback

- Application-only failure: stop the failed release, repoint `/opt/projex/current` to the previous known-good commit, run preflight, restart.
- Configuration failure: restore the previous private host configuration and restart.
- Migration/data failure: stop all writes and restore the matching PostgreSQL and Git pair.
- Git-storage failure: restore the paired Git and database snapshot when metadata may have advanced.

Never perform a partial arbitrary restore into an active system. Destructive replacement of database or Git state requires separate approval.

## Logging and maintenance

Use existing structured logs through journald with a bounded disk limit and roughly 7–14 days of retention for the temporary test window. Do not add a monitoring platform. Logs must never contain request bodies with sensitive data, cookies, authorization headers, database URLs, SMTP credentials, source, hidden tests, feedback, Git credentials, or host storage paths.

Operator checks should cover disk space, migration status, session/setup-token/Git-credential growth, failed jobs and expired leases, quarantine inventory, temporary directories, and logs. Quarantine is recovery evidence and is never deleted automatically. Automated destructive cleanup and production-scale monitoring remain deferred.

## Troubleshooting

- Configuration blocked: correct only the named private variable; never print the environment.
- Migration blocked: stop on drift/incomplete state; do not reset.
- Backup blocked: resolve the reported running job, staging, transport-recovery, or path issue through its owning workflow.
- Restore blocked: confirm the dedicated name, empty isolated destination, manifest/checksums, and non-overlapping roots.
- Startup blocked: keep Caddy offline, inspect redacted journald output, rerun preflight.
- Capability mismatch: stop; never weaken HOSTED_SAFE to make a smoke check pass.

## Teardown

Teardown is destructive and separately approved: stop traffic, take an optional final paired backup, revoke temporary sessions/credentials, stop services, retain only approved redacted evidence, remove participant data under the approved retention decision, revoke SMTP/cloud credentials, remove DNS/host resources, and confirm no unnecessary backups, logs, or personal information remain.
