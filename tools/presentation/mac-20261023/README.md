# Projex presentation setup source — 23 October 2026

This bundle preserves the reusable source of the verified Mac adviser dataset.
Application baseline: `70d0304fa848386f30ef6c01081a50defed2c903` on
`demo/projex-presentation`. It adds no application behavior or migrations.

**The populated presentation dataset remains Mac-local.** Git contains the
recipes and academic contracts, not the database, accepted records, live Git
repositories, credentials, private workflow cache, environment or recovery backup.
Publishing this bundle does not provision another machine.

## Included source

| File | Purpose |
| --- | --- |
| `scripts/catalog.mjs` | Two Class descriptions, five Activity specifications, starter/reference Java, exact visible/hidden synthetic test contracts and weights |
| `scripts/group-source.mjs` | Group README and packaged Fraction/FractionArithmetic reference source |
| `scripts/create-dataset.mjs` | Authenticated account setup, Class enrollment, Activity publication, real assessment and Instructor review/release recipes |
| `scripts/create-group.mjs` | Two-person Group provisioning, invitation, genuine actor-authored commits, feature branch and authorized fast-forward |
| `scripts/lib.mjs` | Private input/cache handling, authenticated API/CSRF client, polling, database identity and process-ownership checks |
| `scripts/bootstrap-admin.mjs` | Initial fictional Admin bootstrap using the existing password service |
| `scripts/setup-db.py` | Opt-in creation/identity checks and full committed migration deployment for the isolated Mac target |
| `scripts/manage.py` | Mac process ownership, startup/status/shutdown source; preserves the shared cluster |
| `scripts/presentation-ops.py` | Opt-in paired quiescent backup and non-overwriting restoration into separate resources |

The nine scripts are byte-for-byte source snapshots of the verified external
operations scripts. They are intentionally **not wired into package scripts,
application startup, or CI**. No setup, migration, account creation, backup or
restart was run to publish this commit.

## Original execution layout and reuse boundary

The scripts were tested outside the repository in this sibling-directory layout:

```text
<workspace>/
  projex-presentation/          # built application checkout at the exact baseline
  presentation-qa-20261023/
    pgdata/                    # separately verified local PostgreSQL cluster
  <private-operations-root>/
    scripts/                   # the source scripts from this bundle
    private/                   # private operator-created inputs/cache, never Git
    logs/                      # local generated output, never Git
```

Imports such as `../../projex-presentation/server/dist/...` are relative to
that **external execution layout**, not this archival directory. Do not execute
the archived copies in place. To reproduce later, export only `scripts/` into a
new, separately approved private operations directory next to an independently
prepared checkout named `projex-presentation`, retaining these guard conditions.
Never copy into or overwrite the active Mac operations directory.

These are **Mac-specific** recipes: they retain loopback ports 55490/3022/5196,
the `projex_presentation` database and `presentation_local` role guards, the
dedicated cluster-directory check, Homebrew executables, and macOS process tools.
Windows requires a separately reviewed environment/path/process configuration;
no Windows operational verification is claimed. Do not weaken the guards merely
to make a different environment pass.

Private operator prerequisites are deliberately absent: a private `server.env`,
private distinct strong account passwords in `accounts.json`, identity markers
and runtime process records. Account keys are `admin`, `instructor`, `student`,
`leader` and `member`; each has fictional `email` and `fullName` plus a privately
chosen password. Bootstrap records the Admin ID; authenticated provisioning
records the remaining IDs. Use local mail preview, never external SMTP for these
fictional identities. Do not reuse the existing Mac's credentials or records.

After separately authorized resource preparation, the original workflow order
was database identity/migration setup, Admin bootstrap, isolated services,
`create-dataset.mjs --execute`, then `create-group.mjs --execute`. Its mutations
use existing permission/CSRF/idempotency/assessment/Git contracts. Neither seeding
script invents grades or Git objects directly in PostgreSQL. Completed steps use
a private cache; unknown earlier creations cause refusal rather than duplication.
Retain that cache for reruns. Recreating the initial demonstration state requires
a separate restore, not replaying official submissions or editing released grades.

The source guards intentionally pin the **application baseline**. A new
documentation/source-bundle commit is not automatically an approved operational
SHA. The running Mac controllers remain unchanged outside Git; their exact-HEAD
guard will require review before a future restart from a newer checkout. Do not
silently update the active configuration to bypass it.

## Scope and prior verification

See [ACADEMIC_SPECIFICATIONS.md](ACADEMIC_SPECIFICATIONS.md),
[DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) and [RECOVERY.md](RECOVERY.md).

The original Mac dataset was verified with eleven actual Java reference cases,
authenticated worker-backed workflows, all five account roles, browser Scanner
input, visible tests, Activity Git checkpointing, official assessment/release,
Group branch/commit/fast-forward operations, and separate restored-copy rehearsal.
Setup reruns produced no duplicate academic records or replayed jobs. These are
prior Stage 2 results, not claims that this source-publication task reran them.

No database, credentials, private state, populated Git storage, logs, screenshots,
backups or generated QA evidence is included. No Origin design work, application
reconciliation, deployment or public Java execution is part of this bundle.
