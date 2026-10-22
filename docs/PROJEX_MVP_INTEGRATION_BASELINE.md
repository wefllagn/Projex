# Projex integrated functional baseline — Windows handoff

This is a local functional baseline for review and later Mac transfer. It does not authorize publishing, deployment, migration of a preserved database, or the Origin application redesign.

## Source identity and reconciliation

- Branch: `integration/projex-mvp`.
- First parent: Student/Instructor checkpoint `c99934d5ed32232fad9a7ca75c2282242b9f8346`, based on `19fb0f33bbef532af902c8b056a9bc98cfdcc2cd`.
- Second parent: verified Group editor candidate `10c6333b6c78386905f036e573904854abd6ea9e`.
- The merge commit is the final integration checkpoint; obtain its exact identity with `git rev-parse HEAD`. The owner handoff records the SHA after commit.
- Both original source branches and worktrees remain preserved. The Group branch's approved, uncommitted toolbar changes are also included here without moving that original branch.
- The only textual merge conflict was in `StudentPages.jsx`: retain the newer class-aware repository wrapper and the Group editor route. The Group repository component merged both the newer presentation and real editor entry points.
- Retained: compact Git access, shared panel proportions, Activity → submissions → settings navigation, tabbed settings/review/returned results, clickable Group lists, critical-action confirmation, editor help and opt-out preference, protected-main authority, worker-backed Git mutations, Activity Java assessment, submissions, and Admin workflows.
- The asynchronous Instructor review-dialog test now waits for its loaded controls. No production policy was weakened.

## Combined verification, 2026-10-23

| Check executed from integrated source | Result |
| --- | --- |
| Frontend | 633 passed, 79 files |
| Backend unit | 420 passed, 1 pre-existing Windows skip, 51 files |
| PostgreSQL integration | 121 passed, 24 files |
| Real Git | 48 passed, 4 files |
| Smart HTTP | 12 passed, 1 file |
| Java regressions | 26 passed, 3 files |
| Client/server lint | Passed |
| Server application/integration TypeScript | Passed |
| Client/server/worker builds | Passed |
| Prisma schema validation | Passed |
| Fresh test and demo databases | 27 migrations each; every applied SHA-256 matches source |

Frontend build retains the existing large-bundle advisory. The trusted Windows runtime used Node 24.18.0, Git 2.55.0.windows.3, PostgreSQL 18.4, and JDK 23.0.1 compiling with `--release 17`. These results do not establish public Java sandbox safety or native Mac execution compatibility.

Persisted HTTP/worker verification used newly created fictional accounts and fresh isolated storage:

- Instructor created a Class, Student joined, Instructor authored/tested/published a graded Java Activity, Student ran visible tests, saved a real Activity Git checkpoint, officially submitted, and received a released 100/100 result. The actual checkpoint is `45afdf73b61f966410b10b8e746ca0c145243929`. Its `Main.java` exactly matches the immutable submission. Hidden test definitions remain absent from the Student response.
- Instructor created/published a Group project, Maintainer created a team/repository, Developer accepted an invitation, and the Git worker initialized the empty repository. Maintainer and Developer each created actual feature branches. Developer committed, was denied main, and Maintainer reviewed/fast-forwarded the feature branch into main.
- Authenticated native Smart HTTP clone/fetch confirmed main and `feature/developer-proof-final` at `9f4a45b5061d2f33876b64aea0675d0fc0aad545`, with the server-bound Developer author. Private receipts were hidden; the temporary READ credential was revoked. Actual divergence was rejected.
- Anonymous, unrelated Student, Instructor/Admin mutation, missing-CSRF, invalid-ref and Developer-main denials were verified. Real-Git suites additionally verify duplicate/concurrent creates, source/target CAS races, late authority withdrawal, class/team/member/deadline/review/closed restrictions and interrupted publication recovery.
- An actual review freeze rejected new branch creation. Instructor request-changes reopened collaboration through the existing policy. Admin oversight routes and actual session revocation passed; Student Admin access was denied.
- Final audit: zero pending Group ref/commit jobs, zero active temporary Git credentials, and all terminal browser-commit source payloads cleared.
- Browser checks covered desktop and 390×844 layouts, Student returned result/source/test sections, Instructor Activity → submissions → settings and review, Group list → groups → repository → editor/back navigation, compact Code menu, question-mark help, branch dialog Escape/focus restoration, and keyboard tab navigation. Checked mobile documents did not overflow horizontally. Temporary viewport overrides were reset.

## Database and worker requirements

The existing ordered migration chain must include both:

1. `20261023000000_group_browser_commits` — `GroupBrowserCommitJob`.
2. `20261023010000_group_browser_refs` — `GroupBrowserRefJob`.

Use committed SQL and Prisma migrations; never `db push` or reset. `server/src/server.ts` registers browser commit/ref APIs. `server/src/git-worker.ts` services provisioning, Activity checkpoints, Group commits and Group ref jobs. The separate Java worker handles practice, official assessment and authorized Instructor reruns. API, Git worker and Java worker must use the same database and corresponding private runtime configuration.

Group changes require supported Git and managed storage, not Java. Smart HTTP requires the absolute Git executable and Git HTTP backend executable, the compiled receive-hook script, managed storage, and `GIT_SMART_HTTP_ENABLED=true`. Create the new empty managed storage root before API startup. Do not replace an existing transport marker or hook to resolve startup failure; inspect the owning configuration/build instead.

## Local startup and health checks

Keep all listeners on loopback. Prepare private server configuration using `server/.env.example` and the actual local binaries. Keep secrets, mail previews, Java jobs and Git storage out of Git. Frontend configuration contains only the browser-visible API base URL.

On a transferred checkout, install the existing lockfile versions with `npm ci` separately in `client` and `server`, then `npm run prisma:generate` in `server`. Windows used ignored dependency junctions to the unchanged existing local dependencies; those junctions are not part of the Git transfer. Mac must create its own native dependencies and Prisma client.

Before any migration, verify that `DATABASE_URL` points to a newly created disposable database and that it shares no data/storage with preserved environments. Only then, in `server`:

```text
npx prisma validate
npx prisma migrate deploy
npm run build
```

Run in separate terminals with the same private server configuration:

```text
# server
npm start
npm run start:git-worker
npm run start:worker

# client, with its browser-visible API URL configured
npm run dev -- --host 127.0.0.1 --port <free-ui-port> --strictPort
```

For the current Windows demo, use `http://localhost:5214`; its API is `http://localhost:5355/api/v1` and PostgreSQL is on loopback port 55515. These are new disposable resources. Private credentials, runtime configuration, process IDs and fixture URLs are recorded outside Git in the owner handoff. Existing previews and presentation fixtures were not migrated or removed.

Use the same hostname for frontend/API browser access and the configured `FRONTEND_ORIGIN`. Browser cookies are scoped by hostname, not TCP port. This demo uses `localhost` to avoid session-cookie collisions with older previews on `127.0.0.1`. Do not operate unrelated environments on the same cookie hostname simultaneously. Port selection must be checked with sufficient local permissions before binding; the initially planned API port was occupied and was preserved.

Health check: `GET /api/v1/health` should return HTTP 200 with database health. Confirm UI loads, both worker processes are alive, and a harmless authorized status read succeeds. API health alone does not prove workers are running. Confirm real worker completion before a presentation. Do not generate credentials just to inspect the UI.

Verification commands:

```text
# client
npm test
npm run lint
npm run build

# server
npm test
npm run lint
npm run type-check
npm run type-check:integration
npm run build
npm run test:integration
npm run test:git
npm run test:smart-http
npm run test:java
```

The mutable database/Git suites require a separate, newly verified `projex_test` database and guarded `TEST_GIT_STORAGE_ROOT` ending in `projex_git_test`. They delete test application rows; never point them at a running demo or a preserved database. The demo and mutable suites use distinct databases/storage even within the disposable cluster.

## Presentation and recovery

The isolated demo has Instructor, Maintainer, Developer, unrelated Student and Admin accounts; a graded/released Activity; Git-backed Activity source; and Group branch/commit/merge history. Use Maintainer for initial main and merge-to-main. Developer may edit/commit/create authorized feature branches but cannot update protected main. The Group demo currently has Changes Requested after the freeze/recovery check, so authorized Student collaboration remains possible.

Before demonstration: check health, worker PIDs, current database/storage identity and available disk space; sign into one role at a time on this hostname; inspect the returned result and Group history. Retain all private QA files and managed Git storage for recovery. Do not rerun one-shot proof scripts blindly: their creates and native clone destinations are deliberate fixtures.

If a service stops, verify the saved PID and command belong to this environment, inspect its private safe logs and restart only that service with the same configuration. If PostgreSQL stops, restart its exact owned cluster, never a guessed/global service. If a Git job outcome is unknown, use its status/idempotency recovery; do not enqueue a different mutation, force refs, delete receipts, clear job rows or replace managed storage. Browser drafts are memory-only and may be lost by reload; preserve them before navigation/restart.

A persistent presentation environment must receive a verified restorable backup and separate approval before migration. Database and matching managed Git storage, receipts and private configuration must be recovered consistently. Existing operational backup/restore preflight tooling is available, but this integration did not run a persistent backup, restore or migration. Keep a working isolated local demo when public deployment is blocked.

## Mac / Origin transfer gate

Do not push yet. After Product Owner approval, publish exactly `integration/projex-mvp` and record the approved SHA. On Mac, fetch and verify the SHA/ancestry before creating a separate Origin application-design branch. Preserve the existing approved Origin landing/login commits; reconcile their UI with this functional baseline without overwriting their history.

The next Mac task should start from this exact integrated functionality and bring forward the approved Origin landing/login presentation. Preserve login/role routes, cookie/CSRF/session handling, API contracts, class/query context, editor drafts and navigation guards, credential clearing, Git job protocols and academic evidence. Changes must remain React/JSX/CSS. The Mac account's design history was not inspected or modified in Windows; its exact design refs need verification there.

Revalidate native dependency installation, Prisma generation, Git/HTTP-backend paths, filesystem permissions/case behavior, Java binaries and release 17, and service environment handling on Mac. Keep databases and managed Git repositories separate from application source. No passwords, generated accounts, runtime environments, databases, Git fixture repositories, logs or screenshots are included in Git transfer.

Deliberate limits: fast-forward merge only; one bounded text file per Group commit; memory-only unsaved drafts; no broad file management or full Git client; no public Java execution approval; no Origin reskin performed here.
