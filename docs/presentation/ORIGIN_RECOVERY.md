# Origin startup, shutdown and recovery — 23 October 2026

Private operations root: `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023`.
Commands below assume `cd` to this directory. No command resets, drops or replaces a database.
The original Projex presentation at localhost:5196 and its PostgreSQL cluster on 55490 are preserved. Never run its controller to manage Origin.

## Primary operation

```sh
cd /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023
python3 scripts/manage.py status
python3 scripts/manage.py start
python3 scripts/manage.py stop
```

Start/status verify the pinned clean Origin worktree, the exact database/role/port and cluster directory, 28 migrations, four process identities and API/frontend HTTP health. An occupied port is refused. Stop sends SIGTERM only to matching recorded Origin processes and leaves every PostgreSQL cluster running.

Primary URL: **http://127.0.0.1:5198/**; API health: **http://127.0.0.1:3024/api/v1/health**.
Keep the exact IP hostname: the frozen Projex demo uses `localhost` and therefore retains separate host-only cookies. Ordinary tabs on the same hostname share cookies, even across ports. Use a separate browser profile for simultaneously authenticating primary and rehearsal/standby. Do not substitute `localhost` for the configured Origin URL.

Private credentials: `private/accounts.json` (600), copied consistently with the restored password hashes. Private backend configuration: `private/server.env` (600). Never project or commit these files. `.gitignore` excludes the entire runtime.

After reboot, check and start only the exact new Origin cluster:

```sh
pg_ctl -D /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023/pgdata status
pg_ctl -D /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023/pgdata -l /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023/logs/postgres.log -o '-p 55492 -h 127.0.0.1 -k /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023' start
python3 scripts/manage.py start
```

Run the second command only if that exact cluster is stopped and port 55492 is free. Never stop another listener to obtain a port.

## Workers and health

`manage.py status` checks API, frontend, Java worker and Git worker against recorded commands and working directories. Logs: `logs/api.log`, `frontend.log`, `java-worker.log`, `git-worker.log`; PostgreSQL: `logs/postgres.log`.

The Admin UI intentionally reports **Workers Not monitored**. Verify process ownership and actual completed jobs rather than claiming heartbeat monitoring. The read-only `node scripts/audit-origin.mjs` checks the three prepared resource pairs, markers, Git fsck and expected academic states. It intentionally fails after a live primary submission changes the initial inventory; this does not mean corruption.

## Paired Origin backup and tested restore

With editing closed and jobs idle:

```sh
python3 scripts/backup-origin.py --execute
```

This checks the Origin cluster/database, idle job queues and transient storage, stops only Origin primary writers, takes a custom PostgreSQL dump and matching Git tar, writes a manifest and SHA-256 checksums, then restarts primary in a finally block. A directory without a complete verified manifest is not a valid backup.

Pristine Origin backup: `backups/ready-20261023T053006Z/`. Both archive hashes and manifest hash were verified by restoring into `origin_presentation_standby` with Git fsck, database/repository markers, all migration checksums and matching record counts. The standby also passed cold startup, recovered account authentication, a genuine Scanner run (Level → Palindrome, exit 0), Git source access and backend role restrictions. Standby has zero official Palindrome attempts.

For a fresh repeat, create a new non-existing label (lowercase letters/numbers/underscores, 3–25 characters):

```sh
python3 scripts/restore-origin.py oct30_repeat --backup /Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023/backups/ready-20261023T053006Z --execute
```

Creates `origin_presentation_oct30_repeat` and `restores/oct30_repeat/git-managed`. Existing destinations cause refusal. Restore filters macOS AppleDouble metadata, preserves Git objects/refs and DB IDs, and rebinds only the new transport hook wrappers to the pinned Origin build. No source guards are bypassed. No migration runs during restore/startup.

New restore controllers use ports **5199/3025**, separate from primary **5198/3024**. Stop any other restore controller on those ports first. Do not run two restore controllers simultaneously.

```sh
python3 restores/standby/scripts/manage.py start
python3 restores/standby/scripts/manage.py status
python3 restores/standby/scripts/manage.py stop
```

Standby frontend: http://127.0.0.1:5199/. Same account credentials; signing secrets differ, so sign in again. To activate a newly named restore use its corresponding `restores/<label>/scripts/manage.py`.
Primary can remain online independently. To present a fresh state after using primary, open the standby URL; do not overwrite primary. After using standby, preserve it and restore another uniquely named pair.

The completed destructive rehearsal is retained in `restores/rehearsal/`, database `origin_presentation_rehearsal`, with the new accepted Palindrome submission and real Group branch/commit/merge. It is not a fresh starting state.

## Local-only constraints

All listeners bind 127.0.0.1. No public tunnel, deployment or external compiler is involved. Keep the Mac awake and connected to power; `caffeinate -d -i -t 7200` in a dedicated Terminal prevents sleep for two hours without changing permanent settings. Controllers do not install packages, migrate, provision accounts or reset data.
