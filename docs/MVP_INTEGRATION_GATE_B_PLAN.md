# Gate B — exact isolated verification resources proposed for approval

## macOS continuation proposal — October 20, 2026

PROPOSAL ONLY. The compatibility slice permits no cluster, database, migration,
fixture account or database-dependent test. The Windows inventory below is
historical and is not a Mac resource approval. This section carries forward the
Mac onboarding proposal into this existing source of truth. No resource below
has been created. Recheck absence/ports/canonical paths immediately before any
approved execution; observations are not reservations.

Root **R = `/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7`**.

| Resource | Exact proposed Mac identity |
| --- | --- |
| Exclusive root | R, mode 0700, new task ownership marker |
| New cluster / private socket | R/pgdata; R/pgsocket |
| PostgreSQL listener | 127.0.0.1:55483 only |
| Private log / PID inventory | R/private/postgres.log; R/private/processes.json |
| New cluster operator | projex_macos_gate_b_operator; private generated authentication |
| Destructive DB / restricted owner | projex_test / projex_macos_gate_b_test |
| Separate review DB / restricted owner | projex_mvp_review / projex_macos_gate_b_review |
| Suite temporary parent | R/test-temp, supplied process-locally as TMPDIR/TMP/TEMP |
| Guarded Git suite parent | R/tests/projex_git_test; existing UUID/sentinel cleanup |
| Review Git / Java / mail | R/review/git; R/review/java-jobs; R/review/mail |
| Review client / API | 127.0.0.1:5192 / 127.0.0.1:3321 |
| Private new fictional logins | R/private/review-credentials.json, mode 0600 |

Verified installed tool candidates, to be re-resolved/rechecked before execution:

- PostgreSQL 18.6 under `/opt/homebrew/Cellar/postgresql@18/18.6/bin/`.
- Git `/opt/homebrew/Cellar/git/2.55.0/bin/git` and backend
  `/opt/homebrew/Cellar/git/2.55.0/libexec/git-core/git-http-backend`.
- JDK binaries under
  `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/`.

Use canonical files rather than Homebrew symlinks for Smart HTTP's existing
plain-file checks. The compatibility slice verified real Homebrew detection and
empty-bare execution only; database-backed Git/transport remains unverified.
Use canonical `/private/...` temporary paths without relaxing path guards.

All mandatory identity/cleanup controls in the original proposal below still
apply. Additional exact Mac preconditions:

- R must be new, plain and disjoint from every checkout and existing runtime
  root. Never reuse a collision, follow a link or kill a conflicting listener.
- Create only the approved new cluster with SCRAM and private authentication;
  do not touch the running Homebrew service. Independently attest control system
  ID, canonical data directory, PID/start and listener, then operator SQL settings
  and restricted-role database/user identities before migrations and every suite.
  Explicitly reject the original `/opt/homebrew/var/postgresql@18`, system ID
  `7681333450351963468` and port 5432. Do not connect to the original cluster.
- Test/review roles remain non-superusers without CREATEDB/CREATEROLE. Revoke
  PUBLIC database CONNECT, grant only each role's own DB access, and verify
  cross-database denial. Operator credentials never enter suite/review processes.
- Explicit child environments must exclude original `.env`, original credentials
  and review credentials from destructive suites. Separate review roots from
  all suite temp/storage roots. Inspect active consumers before each serial run.
- Approval must explicitly cover all 24 existing committed migrations on these
  two new databases, migrate-deploy in the existing runners, serial PostgreSQL /
  Java / Git / Smart HTTP suites, fictional fixtures and loopback browser proof.
  Stop on drift or privilege issues; no reset, db-push or silent escalation.
- The reviewed source candidate will include compatibility changes after their
  acceptance. Verify its exact HEAD and reviewed diff; the root's `5da3ef7`
  suffix identifies its proposal origin, not permission to test stale source.
- Stop only recorded task-owned processes; preserve private review evidence.
  Whole-root/cluster deletion and all original storage cleanup remain separate.

This inventory remains technically valid after the bounded compatibility fix;
availability must be rechecked and resource execution still needs explicit
Product Owner approval. No new approval is implied by passing unit checks.

## Historical Windows Gate A proposal — not Mac authority

2026-10-19. PROPOSAL ONLY. None of these resources was created or started in
Gate A. No migration, database test, fixture reconstruction or cleanup ran.
The combined code passed the non-database checks in MVP_INTEGRATION_GATE_A_REPORT.
Gate B requires explicit Product Owner approval before the operations below.

## Proposed resources

All data below is NEW and disposable; never reuse the original normal/shared
database, the old Admin review cluster, or preserved Group/Activity Git storage.

| Resource | Exact proposed location / identity |
| --- | --- |
| Private disposable root | C:/Users/Wefllagn/AppData/Local/Temp/projex-mvp-gate-b-20261019-3105-332e |
| New PostgreSQL data directory | <root>/pgdata |
| New PostgreSQL log | <root>/postgres.log; local-only, never committed or dumped into reports |
| PostgreSQL listener | 127.0.0.1:55483 only |
| Destructive-suite DB | projex_test on that NEW cluster/port only; required exact name by existing runners |
| Destructive-suite DB role | projex_mvp_test; non-superuser, no createdb, access only to the disposable test DB |
| Separate review DB | projex_mvp_review on the same NEW cluster; distinct owner projex_mvp_review and no test-role access |
| Process temporary root | <root>/test-temp; process-local TEMP/TMP/TMPDIR for suite children |
| Guarded Git test parent | <root>/tests/projex_git_test; runner creates unique run-UUID child with sentinel |
| Review Git storage | <root>/review/git; never supplied to destructive runners |
| Review Java/job storage | <root>/review/java-jobs; separate from suite temp roots |
| Review mail preview | <root>/review/mail; not an external mail transport |
| Loopback review client/API | 127.0.0.1:5192 / 127.0.0.1:3321, with exact-origin cookie/CORS settings |
| Private generated credentials | <root>/private/review-credentials.json; user-private access, outside Git; no values in logs/screenshots |

The root did not exist and no listener was observed on 55483/5192/3321 in the
Gate A read-only check. These are not reservations: recheck and bind exclusively
at execution time. If any target exists, is a link/reparse point or is occupied,
STOP and propose a new explicit target; do not delete/reuse it or kill its owner.

Known local executables were found read-only:

- C:/Program Files/PostgreSQL/18/bin/initdb.exe and pg_ctl.exe.
- C:/Program Files/Git/cmd/git.exe.
- C:/Program Files/Git/mingw64/libexec/git-core/git-http-backend.exe.
- java/javac resolve through the existing Java path; verify actual executable
  identities/version and --release 17 compatibility before execution.

No binary installation, upgrade, Windows service, persistent environment edit or
non-loopback listener is proposed. Start any background helper hidden and keep
its PID/log inside the disposable-root inventory. Do not touch existing services.

## Mandatory preflight before any mutable suite

1. Verify integration HEAD is the reviewed Gate A candidate, original milestone
   refs/statuses are unchanged, and no unexpected schema/dependency delta exists.
2. Resolve all absolute paths. Verify new root/pgdata/test-temp/test-Git/review
   roots are not links and do not overlap any project checkout, old runtime data,
   original Git root, original/shared DB cluster or previous Admin review cluster.
3. Initialize/start ONLY the new loopback cluster with private generated auth.
   Bootstrap its two databases/distinct roles without granting test access to
   review data. If a migration needs extra privileges, stop rather than silently
   escalating or weakening isolation. Do not save environment into a repository.
4. Connect read-only before migrations/cleanup and assert current_database(),
   inet_server_addr(), inet_server_port(), current_user and data_directory exactly
   match the approved new resource inventory. Establish cluster identity from its
   own startup/PID/control metadata as well. Never rely on the projex_test name.
   Use the new cluster's operator connection for restricted cluster/settings and
   full activity attestation; separately validate the restricted suite role's
   database/user connection. Do not grant that role superuser merely to inspect
   data_directory or other sessions.
5. Inspect pg_stat_activity and tracked API/worker/test PIDs: no demo/review/normal
   consumer may use projex_test. Migrations and each destructive suite get the
   exact same verified process-local target; assert again before each run.
6. Inspect effective process-local DATABASE_URL/TEST_DATABASE_URL, Git/Java/temp
   roots and runner inheritance in memory, without printing credentials. No
   fallback to original .env or saved private manifests. Review APIs use only the
   review DB; test subprocesses must not inherit review credentials.
7. Check actual runner cleanup scope. cleanIntegrationDatabase deletes application
   rows throughout its target DB, including users/classes/submissions/repositories.
   Global teardown also cleans. That is allowed ONLY in this exclusive test DB.
   Git runner cleanup may remove only its sentinel-verified unique run child.
8. Record redacted identity/PID/path assertions and confirmation that normal/demo
   processes are unaffected. Failure at any check stops execution; no force,
   reset, db push, migration reset, broad recursive delete or guessed repair.

The default DB-name helper checks only the name, not host/port/cluster identity.
A task-specific guarded launcher must assert the exact resource inventory before
calling existing runners; no loosening of their existing checks is needed.
This launcher/fixture work is test safety, not permission to redesign app policy.

## Explicit migration/test authority requested

Allow applying ONLY the 24 existing committed migrations to the NEW test and
review databases. Their count was inspected from source; no database migration
state was queried during Gate A. Use existing migrate-deploy behavior; no new
schema/migration, normal DB migration, drift acceptance or reset is requested.

Then run from the integration server, ONE suite at a time:

1. npm run test:integration — real PostgreSQL/cookie/CSRF, Class/account/staff,
   immutable submission, Group capacity/concurrency/review and safe projections.
2. npm run test:java — controlled local compiler/runner, release 17 and unique
   task-temp directories. These tests use temp source/job files, not the review
   app; they were intentionally not run in Gate A. No hosted isolation claim.
3. npm run test:git — existing guarded root, exact new DB, native Git/checkpoints.
4. npm run test:smart-http — exact new DB/root; runner builds the compiled hook,
   applies committed migrations and exercises transport/auth/ref/review freeze.

The integration/Git/Smart HTTP runners themselves invoke migrate deploy; do NOT
start them under a no-migration approval. Do not parallelize mutable suites,
allow a demo to use their DB, or recreate original demo metadata afterward.
Collect actual results; preserve failed-run evidence and fix only scoped defects.

## Separate browser proof and fictional data

After suite cleanup, create NEW fictional Admin, Primary/Co-Instructor, Maintainer/
Developer and eligible Student fixtures ONLY in projex_mvp_review, with NEW bare
Git repositories under review/git. Seed through existing authorized contracts
where appropriate; never relink guessed IDs to original preserved Git. Generate
private temporary logins only after approval, stored outside Git with restricted
access. These are new fixtures, not restoration of missing records/history.

Launch only loopback review API/client and required existing bounded workers with
process-local test settings. Inspect all three roles at 1366x768, wide desktop and
approximately 390px: Instructor Class creation/join, Activity Run/stdin/tests/
checkpoint/immutable Submit/review, Group search/history/native Git/membership/
review freeze, and all seven compact Admin screens with actual safe data.
Test context/error recovery, unsaved input, freshness and denied-role boundaries.
Close credentials/codes/source before screenshots; keep proof outside Git.

## Completion and limits

Report actual suite/browser results, isolated identity evidence, relevant fixes,
candidate SHA/status, remaining failures and Product Owner acceptance gate.
Re-run affected non-database checks after fixes. Do not silently classify missing
observations as healthy or historical passes as combined proof.

Stop only this task's processes after verification; preserve private review data
for review unless teardown is separately approved. No deletion of a cluster/root
is requested by this plan. No original database/Git cleanup, demo recovery,
deployment, push or protected-branch merge; final promotion is Gate C.

Approval requested: this exact disposable resource creation, existing-migration
application, serial suites, fictional review fixtures/private credentials and
loopback browser validation. None is authorized merely by completing Gate A.
