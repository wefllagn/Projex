# Mac setup and recovery source reference

This document describes the verified external Mac procedures. Read README.md
first: archived script paths are not executable deployment wiring, private inputs
are absent, and no action here was performed during source publication.

## Startup and shutdown

From an independently prepared **external private operations directory** with
the original audited layout/configuration:

```sh
python3 scripts/manage.py status
python3 scripts/manage.py start
python3 scripts/manage.py stop
```

The Mac profile serves `http://localhost:5196/`; API health is
`http://localhost:3022/api/v1/health`. The original isolated presentation database
is `projex_presentation`, role `presentation_local`, on loopback port 55490. Its
private managed Git root is separate from QA. Use the exact localhost hostname
for frontend/API cookies; the QA environments use 127.0.0.1.

The controller checks source SHA, clean worktree, cluster data directory,
database/user/port, 28 applied migrations, recorded process commands/working
directories and frontend/API HTTP health. It refuses occupied ports and source
or identity drift. It does not migrate/seed/reset, replace unrelated listeners,
stop PostgreSQL, or force-kill unknown processes. The API, frontend, Java worker
and Git worker use explicit private configuration. Do not substitute a plain
development-server command that could load another environment's local config.

The original baseline is hard-pinned to
`70d0304fa848386f30ef6c01081a50defed2c903`. Publishing setup-source files changes
Git HEAD but does not change the active application processes. Before any future
restart from a newer checkout, separately review the operational source pin;
do not edit the active Mac configuration as part of publication.

The existing Admin screen reports workers as **Not monitored**. Use process
ownership checks plus actual completed jobs; do not infer worker heartbeats.

## Consistent paired backup

With no active editor mutation or Java/Git work, the external opt-in source uses:

```sh
python3 scripts/presentation-ops.py backup --execute
```

The script attests the source/database/cluster/Git root and idle queues, stops
only presentation writers, captures a PostgreSQL custom-format dump and matching
Git archive, writes checksums/migration/count metadata, then restarts only the
presentation services. The shared cluster stays online. Inspect failures and
partial artifacts before retrying; do not label a partial backup verified.

No dump, archive, checksum manifest, PID record or private backup pointer is
published. The real prepared Mac backup remains Mac-local and unchanged.

## Restore into new resources

After separately approving and verifying the target, an example external command
is:

```sh
python3 scripts/presentation-ops.py restore new_demo_copy --execute
```

It creates a new `projex_restore_verify_<label>` database and separate Git root,
refuses existing destinations, verifies the paired checksums before restoration,
checks an empty destination's identity, applies `pg_restore --no-owner --no-acl`,
validates counts/migration history/markers/native Git, and writes a
separate private controller/configuration. It does not replace the primary pair.
An explicitly selected named backup can be supplied with `--backup`; the actual
private backup artifacts must already be available and verified locally.

Stop whichever **known presentation controller** owns the ports before starting
the restored controller. Never run both profiles on the same ports or stop an
unrelated service to bypass a guard. The original primary database and Git root
must remain together and preserved. Return by stopping the restored controller
and starting the reviewed primary controller. A pristine new restore supplies
another fresh demonstration; replaying official submissions does not reset one.

The Stage 2 Mac procedure was tested with separate restoration resources,
recovered authentication, real Java assessment, Instructor release, Group Git
commit/merge, and startup/shutdown/return-to-primary checks. No new restore,
backup, migration or service action was run to publish these source recipes.

## Offline demonstration

Local Java, Git, PostgreSQL, Node dependencies and builds must already be present.
No internet or Azure is needed for the local workflows. Do not update dependencies
immediately before presenting. Private strong passwords are prepared locally;
fictional account delivery uses mail preview rather than SMTP.

On macOS, a separately authorized bounded `caffeinate -d -i -t 7200` process can
prevent idle/display sleep for two hours without persistent system-setting
changes. This source publication does not start or alter that process. Windows
process lifecycle and energy settings require separate platform verification.
