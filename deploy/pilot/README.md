# Origin limited Ubuntu/Azure pilot

This is an **application deployment package**, not evidence of an online deployment. The owner handles Azure, SSH, network rules, DNS and certificates. No commands below have been executed on `origin-demo-vm`. Its earlier IP `20.205.63.170` is unverified. **Do not use a Mac preview database, credentials, filesystem or Git root on the VM.** Start with a new pilot database and provision pilot accounts through Admin.

Use Ubuntu **24.04 LTS**, systemd, Python 3.12+, Node **24**, PostgreSQL **16** (Ubuntu package), nginx and Docker Engine with **cgroup v2, default seccomp and AppArmor**. A small pilot should have at least 2 vCPU, 4 GiB RAM and sufficient free persistent disk; this is a starting budget, not a tested capacity claim. One Java worker and one Git worker only. Monitor memory, queue latency and disk before adding testers. Do not disable swap/cgroups/security profiles to force the tests to pass.

## Contents and boundaries

| File | Purpose |
| --- | --- |
| `build-release.sh` | Build an exact clean Git commit, locked npm installs, generated Prisma client, compiled API/UI and whole-artifact checksums. Run unprivileged on Ubuntu. |
| `stage-release.py` | Verify artifact SHA/platform and extract to a **new** root-owned release directory. Does not switch or start services. |
| `pilot.py` | Guarded status, matched PostgreSQL/Git/config backup, migration, source activation and fresh-target recovery drill. Ubuntu root only; fixed pilot paths and connected database identity checks. |
| `pilot.env.example` | Secret-free production configuration template. |
| `Java.Dockerfile`, `build-java-image.sh` | Build a minimal pinned Java 17 runtime from a verified immutable Temurin base digest. |
| `systemd/*` | Separate unprivileged API, browser Git worker, Java controller and full isolation acceptance service. |
| `nginx/*` | TLS reverse proxy, SPA routing and a **deny-by-default** pilot IP allowlist. |

Trusted application code, PostgreSQL credentials and Git repositories stay outside Student execution containers. Each compile/run gets a separate container: nonroot UID, no network, no added capabilities, no new privileges, Docker default seccomp + explicit AppArmor, read-only root, 256 MiB memory, one CPU, 64 PIDs, 32 MiB temporary disk, bounded output/time, no persistent Docker output log and only its own job directory. Runtime mounts that job directory read-only; compilation can write only that directory. Annotation processing is disabled. The independent in-container timeout remains effective if the controller exits. The Java worker verifies actual boundaries **before claiming any jobs**, and the full acceptance command adds heap, disk, process, timeout, output, interactive Scanner and cleanup checks.

The trusted `origin-java` controller has Docker group access, which is security-sensitive host authority. Never add `origin`, nginx, Students or other application accounts to that group; never mount Docker's socket into a Student container. This is a limited, restricted academic pilot using a shared kernel, **not a hostile multi-tenant public compiler service**. Native Git Smart HTTP remains disabled; browser Save to Git, commits, branches and fast-forward merges use the existing Git service confined by systemd. Production still refuses unrestricted `local_process` Java/Git modes. No developer bypass is provided.

## 1. Owner prerequisites — before running application scripts

1. Confirm VM subscription/name/current IP and Ubuntu version yourself. Keep your SSH key private. Keep a second SSH session open when changing networking. This package never changes NSGs, firewall, SSH or cloud resources.
2. Point a domain at the confirmed IP; obtain a valid public TLS certificate and enable renewal. The app's production origin must be HTTPS. Never bypass a certificate warning or use a development cookie setting online.
3. Restrict inbound SSH to your management IP/VPN, HTTPS to adviser/panel/VPN IPs, and any temporary certificate challenge port as required by your certificate method. PostgreSQL 5432, Docker API, API 3000 and Vite ports must have **no public rule**. PostgreSQL binds loopback. Do not expose a Docker TCP listener.
4. Install Ubuntu updates and supported official packages. Review package changes on your VM before approving them:

   ```bash
   sudo apt update
   sudo apt install git nginx postgresql postgresql-client python3 ca-certificates apparmor
   ```

   Install Node 24 from its official Linux distribution for your CPU architecture, verify the official SHA256 checksum, and place `node`, `npm` and `npx` in `/usr/local/bin` (or symlink that location to your verified installation). Confirm `node --version`, `npm --version`. Install Docker Engine using its **official Ubuntu instructions**, not a downloaded convenience script. Confirm `sudo docker info`, cgroup v2, seccomp and AppArmor. No system software is installed by our scripts.
5. Configure an existing authenticated SMTP sender. Preview mail is deliberately forbidden in production. Admin may privately copy setup/recovery links; that does not waive the production SMTP configuration guard. Never log generated links or SMTP secrets.
6. Choose a backup destination outside the VM and an encrypted method for copying completed backup folders. Backups include password hashes, source and a root-only secret configuration. Restrict access, encrypt off-host copies, retain at least the last known-good pair and verify a restore drill. VM disk snapshots alone do not prove matched academic/Git recovery.

Primary operational references: [Docker Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/), [Docker runtime constraints](https://docs.docker.com/engine/containers/run/), [systemd confinement](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec), [Node downloads](https://nodejs.org/en/download), [PostgreSQL backup/restore](https://www.postgresql.org/docs/16/backup-dump.html). Operator must review currently applicable vendor instructions.

## 2. Dedicated directories and identities

These commands create **new** pilot resources only. First check `getent passwd origin origin-java`, `ls -ld /opt/origin /var/lib/origin /var/lib/origin-java /etc/origin /var/backups/origin`. If any existing resource has an unknown owner/purpose, stop and inspect; do not reuse or overwrite it.

```bash
sudo useradd --system --user-group --home-dir /var/lib/origin --shell /usr/sbin/nologin origin
sudo useradd --system --user-group --home-dir /var/lib/origin-java --shell /usr/sbin/nologin origin-java
sudo usermod -aG docker origin-java
sudo install -d -m 0755 /opt/origin /opt/origin/releases
sudo install -d -m 0700 -o origin -g origin /var/lib/origin /var/lib/origin/git
sudo install -d -m 0700 -o origin-java -g origin-java /var/lib/origin-java /var/lib/origin-java/jobs
sudo install -d -m 0700 /etc/origin /var/backups/origin
```

Do not recursively chown unrelated directories. `origin` and `origin-java` must not own application code. Keep Docker installed/configured by your management account.

Create a dedicated database and role using PostgreSQL's interactive prompt (password never appears in command history). First inspect `sudo -u postgres psql -c '\du'` and `-c '\l'`. If `origin_pilot` already exists, **inspect it; do not drop, reset or recreate it**.

```bash
sudo -u postgres psql
```

Inside psql:

```sql
CREATE ROLE origin_pilot LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password origin_pilot
CREATE DATABASE origin_pilot OWNER origin_pilot;
\q
```

Require `scram-sha-256` password authentication for this role on `127.0.0.1/32` and `::1/128` in your PostgreSQL `pg_hba.conf`; keep `listen_addresses='localhost'`. Review existing rules first. Reload PostgreSQL after validating configuration; do not stop or reconfigure unrelated databases. Verify a loopback password login as `origin_pilot`. This account owns only the new pilot DB.

## 3. Obtain, build and stage the exact source

Run as your normal Ubuntu operator/build user in a new directory. Replace `RELEASE_SHA` with the **full published commit in the handoff**. Never build from an unreviewed branch tip or copy Mac `node_modules`.

```bash
git clone --branch codex/origin-final-ux-pilot --single-branch https://github.com/wefllagn/Projex.git origin-pilot-source
cd origin-pilot-source
git checkout --detach RELEASE_SHA
git rev-parse HEAD
git status --short
bash deploy/pilot/build-release.sh "$PWD" RELEASE_SHA
```

Retain the printed artifact checksum. The script does not migrate, start services or use live database credentials. npm uses the committed lockfiles; no dependency upgrades are part of deployment. Failed build directories are retained for inspection. Stage the resulting artifact **on this Ubuntu host/architecture**:

```bash
sudo python3 deploy/pilot/stage-release.py origin-release-RELEASE_SHA.tar.gz ARTIFACT_SHA256 RELEASE_SHA
sudo python3 deploy/pilot/pilot.py activate --commit RELEASE_SHA --confirm SWITCH_ORIGIN_RELEASE
```

On the first installation no Origin service exists yet. On upgrades, backup first and explicitly stop `origin-api origin-git origin-java` before activation. Activation switches only `/opt/origin/current`; it does not start services or change data. Reusing an existing release directory is refused.

## 4. Configure secrets, Java image and services

```bash
sudo install -m 0600 deploy/pilot/pilot.env.example /etc/origin/pilot.env
sudoedit /etc/origin/pilot.env
```

**Do not overwrite this file on an upgrade.** Set domain, URL-encoded database password, a separately generated random signing secret (at least 32 random bytes), SMTP credentials and immutable Java image ID. Keep signing secret stable through normal restarts; rotating it invalidates tokens and must be planned. Do not copy fictional Mac demo credentials or secrets.

Build Java from the official `eclipse-temurin:17-jdk-jammy` image. Inspect its current repository digest yourself, verify it is the expected vendor/architecture, then pass the full immutable digest:

```bash
sudo docker pull eclipse-temurin:17-jdk-jammy
sudo docker image inspect --format '{{json .RepoDigests}}' eclipse-temurin:17-jdk-jammy
sudo bash deploy/pilot/build-java-image.sh eclipse-temurin:17-jdk-jammy@sha256:VERIFIED_BASE_DIGEST
```

Store the final printed **local `sha256:...` image ID** in `JAVA_DOCKER_IMAGE`. The build context contains only the Dockerfile. Record the base digest and final image ID with your release notes/backup; do not prune the pinned current or previous image.

```bash
sudo install -m 0644 deploy/pilot/systemd/origin-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/origin-*.service
```

A populated `/etc/origin/pilot.env` is root:root 0600. systemd reads it before dropping service privileges; do not loosen file permissions to troubleshoot. Runtime services have distinct storage allowlists; their code/root filesystem is read-only. Neither API nor Git worker has Docker access.

## 5. Migrations and initial administrator

**Migrations write schema.** On first install the target must be the empty `origin_pilot` DB. For upgrades take the paired backup in section 8, stop Origin units and pass that new backup path. There are 30 committed migrations; this UX/container package adds none. Never use `db push`, `migrate reset`, `migrate dev`, a demo seed or a schema rollback against pilot records.

```bash
sudo python3 deploy/pilot/pilot.py migrate --confirm MIGRATE_ORIGIN_PILOT
# Upgrade instead:
# sudo python3 deploy/pilot/pilot.py migrate --backup /var/backups/origin/backup-TIMESTAMP --confirm MIGRATE_ORIGIN_PILOT
```

The CLI attests connected server, database and role, refuses running Origin units, checks an existing DB against the paired backup's counts and row fingerprints, then runs Prisma deploy/status. Failed migration: keep services stopped and preserve diagnostics/backup; investigate before retrying. It never marks failed migrations resolved automatically. Future migration recovery is restore-to-fresh-target plus source/config rollback, **not** down-migration.

Create the initial Admin once. Use a private root-only temporary environment file for `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`. Do not put the password in a shell command, screenshot or Git. Run the existing compiled script with Node's dotenv loader through a temporary oneshot service:

```bash
sudo install -m 0600 /dev/null /etc/origin/initial-admin.env
sudoedit /etc/origin/initial-admin.env
sudo systemd-run --unit=origin-initial-admin --wait --collect \
  --property=WorkingDirectory=/opt/origin/current/server \
  --property=EnvironmentFile=/etc/origin/pilot.env \
  /usr/local/bin/node --env-file=/etc/origin/initial-admin.env dist/scripts/create-initial-admin.js
```

The script creates only an Admin and refuses duplicate email. Confirm successful creation, then remove **only the known temporary initial-admin file** (it contains that bootstrap password). Log in, provision limited Student/Instructor accounts in Admin, deliver links privately and let recipients choose their own passwords. No public self-registration or imported presentation accounts.

## 6. Mandatory pre-opening acceptance gates

First run full Java acceptance in its exact confined service context:

```bash
sudo systemctl start origin-verify-java
sudo journalctl -u origin-verify-java -n 100 --no-pager
```

Require every check PASS: configuration/migrations; actual nonroot/no-new-privileges/seccomp/AppArmor/cgroup/network/filesystem/secret boundaries; memory, disk, PIDs, timeout, output limit; interactive Scanner `8 5 → 13`; cleanup leaves no owned containers. This service exits nonzero on failure. **A Mac unit-test pass is not Linux sandbox acceptance. Do not open pilot access if this gate fails.** Keep its safe JSON output with release evidence, along with image ID and `docker info` security settings. Fix the actual host/runtime issue; do not enable `local_process`, disable the probe or weaken AppArmor.

Then start only the Origin service set (preflights run under each identity):

```bash
sudo systemctl start origin-git origin-java origin-api
sudo systemctl status origin-api origin-git origin-java --no-pager
sudo python3 deploy/pilot/pilot.py status
curl --fail http://127.0.0.1:3000/api/v1/health
```

If a service fails: read `journalctl -u origin-api` / `origin-git` / `origin-java`, fix configuration, then `systemctl reset-failed UNIT` and restart only that unit. Logs must not be shared with secrets. PostgreSQL health alone does not prove workers are ready. Keep nginx pilot allowlist closed until each service and full Java probe pass.

## 7. HTTPS proxy, access and functional checks

Copy nginx files to **new** reviewed locations, set domain/cert paths and add real authorized public tester/VPN IPs before `deny all`. Do not remove that final deny. Certificates must already exist before `nginx -t`.

```bash
sudo install -m 0644 deploy/pilot/nginx/pilot-access.conf.example /etc/origin/pilot-access.conf
sudoedit /etc/origin/pilot-access.conf
sudo install -m 0644 deploy/pilot/nginx/origin.conf.example /etc/nginx/sites-available/origin
sudoedit /etc/nginx/sites-available/origin
# Inspect existing sites and conflicting domain/default-server rules first.
sudo ln -s /etc/nginx/sites-available/origin /etc/nginx/sites-enabled/origin
sudo nginx -t
sudo systemctl reload nginx
```

Do not blindly remove an existing default site or overwrite an existing Origin configuration. Test from an allowed address, then from an unauthorized address (must get 403 or network denial). Ensure the requested hostname reaches this site, with no alternative public/default-host route around the allowlist. Validate HTTP→HTTPS, valid chain/hostname, and renewal procedure. App API is bound only to loopback and trusts exactly one nginx hop; nginx replaces forwarded headers rather than appending untrusted client values.

Check in a real browser through HTTPS:

- Landing/login/light/dark, account switch and expired-session recovery; access/refresh cookies have Secure, HttpOnly, SameSite=Lax and no broad Domain (the CSRF cookie is intentionally readable by the frontend).
- Admin provision/activation/password recovery; single-use/expiry and prior-session invalidation. No plaintext password or token appears in ordinary logs.
- Instructor create wizard: no test errors in Details, Back retains input, Next saves, browser reload recovers, all publication requirements only in Publishing. Publish once, freely browse locked grading/Java/tests afterward.
- Student interactive Scanner input, Run Visible Tests, Save to Git, Official Submit. Verify exact submitted commit and Java results.
- Instructor aggregate/criterion correction reason, saved draft/reload, stale-version rejection, save-before-release and immutable released result; Student sees only their own released results.
- Gradebook entire row/Enter/Space, periods, credited-attempt policy, provisional coverage and own-Student server authorization. No draft grade counted as released.
- Group branch, commit and fast-forward merge; Admin screens and graceful failures; IDE resize.
- Restart the three Origin units and recheck saved grades, repos and login. Reboot only when you choose an approved VM maintenance window, then verify enabled services and persistence.

Only after all gates and a successful paired backup/restore drill:

```bash
sudo systemctl enable origin-api origin-git origin-java
```

Record release SHA, artifact checksum, migration status, image IDs, acceptance JSON, test account roles and date. Do not claim panel readiness before the online checks pass. Native external `git clone/push` is deliberately not exposed for this browser-based pilot.

## 8. Paired backup and recovery drill

This operation briefly stops/restarts **only** Origin API and workers. It does not stop PostgreSQL, nginx or any other service. Tell testers to finish work first. Running/provisioning jobs or transitional Git directories block backup; allow completion and retry, never clear academic states manually.

```bash
sudo python3 deploy/pilot/pilot.py backup --confirm CREATE_PAIRED_BACKUP
```

It stores `database.dump`, `git-storage.tar`, root-only `pilot.env`, counts, applied migrations, release SHA and SHA256 checksums in a **new** `/var/backups/origin/backup-TIMESTAMP`. Existing backups are retained. Incomplete folders lack a valid completed manifest and must not be used. Copy the complete matching folder off-host with encryption/access controls. Keep the exact release artifact/source and pinned Java image available.

A recovery drill restores into a **new** `origin_restore_TIMESTAMP` database and `/var/lib/origin/restores/origin_restore_TIMESTAMP`, never the live DB/storage:

```bash
sudo python3 deploy/pilot/pilot.py restore --backup /var/backups/origin/backup-TIMESTAMP --confirm RESTORE_TO_FRESH_TARGET
```

The command verifies checksums, safe archive entries, connected empty target, all table counts/row fingerprints and Git fsck, then leaves active configuration unchanged. This is a **write to fresh recovery resources**, not a destructive replacement. Failed targets are retained for inspection. Do not delete unknown databases or directories. Test a successful drill **before** opening adviser access. On this Mac only the existing isolated PostgreSQL restore/migration regressions can run; this new Ubuntu operator path must pass on the VM.

## 9. Safe rollback / actual recovery

If the new release fails, close the nginx tester allowlist (retain management/VPN as appropriate), inform testers and stop only `origin-api origin-git origin-java`. Preserve logs and take a new paired backup when quiescent. Do not try random resets, Docker prune, `git clean` or database edits.

- **Code-only rollback**, when the schema has not changed and the previous source supports current persisted records: activate the previously staged full SHA with `pilot.py activate`, retain the current matching DB/Git/secret config, run its preflights/Java acceptance and restart the three units. This package adds no migration. The previous 819a84b baseline does **not** support the new production isolation modes, so it is **not** a hosted pilot rollback target; use a previously validated hosted artifact. For a first-install failure, leave the new pilot closed and fix/rebuild a reviewed commit instead.
- **Data/schema recovery**: restore a verified pair to fresh resources as in section 8. This intentionally loses work after that backup, so choose the recovery point explicitly. Retain the failed live DB/Git untouched. Review counts, migrations and fsck. With services stopped, rename the exact existing `/var/lib/origin/git` to a new dated retained path, then rename **the corresponding verified restored Git directory** to `/var/lib/origin/git` on the same disk. Refuse if either destination already exists. Set ownership `origin:origin` and mode0700 on that exact restored tree. Update only the DB name in `/etc/origin/pilot.env` to the matching `origin_restore_TIMESTAMP`, restoring required original secrets from the root-only paired config. Do not combine independent DB/Git backups. Activate the backup's compatible hosted release, preflight and run full Java acceptance before starting. Keep nginx restricted until manual Student/Instructor verification passes.

For a data recovery cutover, the exact retained-directory sequence is below. **This changes which restored academic snapshot is active and discards no files**, but work after the chosen backup will no longer appear in the recovered application. Review the point-in-time loss before proceeding. Replace the placeholders with the successful drill's printed database/directory and a new retention suffix; keep services stopped throughout:

```bash
set -euo pipefail
RESTORE_NAME=origin_restore_YYYYMMDDHHMMSS
RETAINED_GIT=/var/lib/origin/git-retained-YYYYMMDDHHMMSS
[[ $RESTORE_NAME =~ ^origin_restore_[0-9]{14}$ ]]
sudo systemctl stop origin-api origin-git origin-java
sudo test -d "/var/lib/origin/restores/$RESTORE_NAME"
sudo test -d /var/lib/origin/git
sudo test ! -e "$RETAINED_GIT"
sudo mv -T --no-clobber /var/lib/origin/git "$RETAINED_GIT"
sudo test ! -e /var/lib/origin/git
sudo mv -T --no-clobber "/var/lib/origin/restores/$RESTORE_NAME" /var/lib/origin/git
sudo chown -R origin:origin /var/lib/origin/git
sudo chmod 0700 /var/lib/origin/git
sudoedit /etc/origin/pilot.env
# Set DATABASE_URL's database to the matching RESTORE_NAME; retain its verified loopback role/password.
sudo python3 deploy/pilot/pilot.py activate --commit COMPATIBLE_HOSTED_BACKUP_SHA --confirm SWITCH_ORIGIN_RELEASE
```

Before reopening a recovered snapshot, invalidate **restored** refresh sessions and outstanding setup/recovery links so consumed/revoked credentials cannot be resurrected. Connect explicitly to the printed fresh restore database with `sudo -u postgres psql -d "$RESTORE_NAME"`; first inspect `SELECT current_database(), current_user;` and require the exact fresh recovery target. Then, while Origin remains stopped:

```sql
BEGIN;
UPDATE refresh_sessions SET revoked_at = now() WHERE revoked_at IS NULL;
UPDATE account_setup_tokens SET invalidated_at = now() WHERE invalidated_at IS NULL AND used_at IS NULL;
COMMIT;
```

These two intentional authentication changes log out restored sessions and expire old links; they do **not** modify grades, submissions or Git history. Record the recovery point and these actions in your operator log. Generate a new signing secret in the root-only config for this recovery cutover, let users sign in again, and have Admin reissue links/reset affected accounts if their password changed after the backup. Run full Java acceptance/preflights again, restart the three Origin units, verify Student/Instructor workflows and only then reopen the restricted allowlist. A successful restore drill alone does not authorize this cutover.

No automatic database drops, data deletion, service-wide shutdowns or schema down-migrations are provided. Docker metadata cleanup, if a controller was hard-killed: inspect **only** `docker ps -a --filter label=origin.managed=java`; verify PID label/creation time and that the owning Origin controller is stopped. Stop/remove individual proven-orphan container IDs only, after their independent deadline; never `docker system prune` or broad `rm`. Do not prune current/rollback images.

## Outstanding acceptance on the actual VM

The application-side flags, unit contracts, production guards and local UX/regressions are testable here. **Ubuntu service confinement, live Docker/AppArmor/cgroup enforcement, VM resource capacity, nginx/TLS/cookies through HTTPS, SMTP and the new Ubuntu backup/restore CLI are not yet remotely verified.** The full isolation service and above online checks are mandatory before pilot exposure. The owner configures infrastructure; no Azure connection or remote deployment is performed in this assignment.
