# Linux Git compatibility release from frozen 2a2a3e5

This is a code-only upgrade procedure for an **existing** restricted Ubuntu 24.04
Origin pilot. It does not provision Azure resources or authorize deployment.
No VM, production database, secrets, release tag, or existing release directory
was changed during implementation. The frozen `origin-demo-2026-10-24` tag stays
at `2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff`. Use the new commit on
`fix/linux-git-runtime`, never move that tag or patch an installed `dist` file.

## Diagnosis and compatibility policy

Both `origin-api` and `origin-git` run `deployment-preflight.js`. With
`GIT_EXECUTION_MODE=service_isolated`, its Git check first calls
`assertHostedGitService`, checks storage access, and then calls
`createGitCommandRunner(...).detectVersion()`. The frozen platform policy rejects
Linux even with Git 2.55; Ubuntu Git 2.43 also falls below its Windows/macOS
minimum. The preflight correctly maps that exception to `GIT_RUNTIME_NOT_READY`.
Other confinement/storage failures intentionally produce the same safe code;
the version fix is not proof that every gate on the actual VM already passes.

The only production-code change adds Linux with plain `git version X.Y.Z`
output and a 2.43.0 compatibility floor. Windows still requires the Windows
suffix and >=2.55.0; macOS still requires plain upstream output and >=2.55.0.
Malformed, prerelease, unknown-vendor, unsafe-integer and Windows-suffixed Linux
versions remain rejected. No process platform/version is spoofed.

| Required operations | Real-Git coverage on Ubuntu 24.04 / Git 2.43 |
| --- | --- |
| `init --bare --initial-branch=main`, symbolic HEAD, refs, fsck | Empty provisioning, durable ownership/storage checks and repeat verification |
| `rev-list`, `show`, `ls-tree`, `cat-file`, `diff-tree`, bounded `diff` | Authorized summary, branches, history, reachable files and diffs |
| Local `clone --no-tags`, add, commit, fast-forward push | Activity checkpoint exact content, retry recovery and concurrent-push refusal |
| `read-tree`, `hash-object`, `update-index --cacheinfo`, `write-tree`, `commit-tree` | Browser create/update commits, invalid object/path refusal, receipts and concurrent updates |
| `update-ref --stdin` start/verify/create/update/prepare/commit, `merge-base --is-ancestor`, `check-ref-format` | Atomic receipt/ref publication, create-if-absent, fast-forward-only merges, stale/diverged rejection |
| HTTP backend / receive-pack / upload-pack | Guarded Smart HTTP compatibility/security regressions; native Smart HTTP remains disabled in the pilot |

Transactional ref updates already exist in the
[Git 2.43 manual](https://git-scm.com/docs/git-update-ref/2.43.0).
Git version output is **not** a security-patch or binary-provenance attestation.
The tested Ubuntu package is `1:2.43.0-1ubuntu7.4`, from noble security/updates,
which still prints `git version 2.43.0`. Use the current vendor-maintained Ubuntu
package, not an unpatched upstream 2.43.0 binary; Ubuntu documents security
backports under the same upstream version in
[USN-7626-1](https://ubuntu.com/security/notices/USN-7626-1).
The actual VM package revision was not inspected. Review the VM's current Ubuntu
security updates separately if its package is stale; this application fix does
not upgrade OS software.

## Unchanged security boundaries

`assertHostedGitService`, production configuration validation, all systemd units,
HTTP authentication/authorization, storage markers/containment, sanitized child
environment, argument-array execution with `shell: false`, time/output bounds,
CAS/atomic publication and protected-ref policies are unchanged. Production
`local_process` remains forbidden. Keep the existing unprivileged `origin`
identity, root-owned read-only code, no-new-privileges, zero capabilities,
`ProtectSystem=strict`, `KillMode=control-group` and exact writable storage path.
Neither API nor Git worker gains Docker access. Do not disable preflight,
change unit confinement, loosen permissions or enable native Smart HTTP to make
startup pass. Java container acceptance remains a separate mandatory host gate.

## Local verification evidence

All database-backed checks used a newly created **local-only** cluster and
`projex_test`, with sentinel-owned current-run storage and guarded fixture cleanup.
No real deployment database or presentation data was used.

- Linux backend type-check, integration type-check, lint and build passed.
- Linux full unit/security suite: **470 passed** across 56 files, including
  Linux version-to-preflight classification, authorization, environment filtering,
  storage/path protection, credential handling, configuration and redaction.
- Linux real-Git suites: **50 passed** across five files; Smart HTTP: **12 passed**.
- A local transient systemd probe with the Git pilot confinement directives
  accepted the unchanged hosted-service guard and Git 2.43 empty-bare/fsck checks.
  The same probe outside confinement was rejected before Git. Its code/storage
  were disposable local test resources; no database or VM was accessed.
- Pilot operator guards: **7 passed**; canonical LF release-build shell syntax passed.
- Windows Smart HTTP: **12 passed**. Windows version/preflight/confinement
  focused suite: **48 passed**; Windows
  type-check, integration type-check, lint and backend build passed.
- Broader Windows Git fixture runs are not clean: 27/50 passed in the short-root
  fix run, and 36/50 passed in a separate comparison with the frozen production
  runner. Both expose existing group-job/claim fixture failures; these were
  retained, not masked or "fixed" by changing unrelated worker behavior. The
  new real checkpoint tests pass on Windows, and the Windows transport suite
  passes independently. Linux's entire real-Git suite passes.
- The broader Windows unit sweep had 464 passed, one skipped and one unrelated
  Java-container POSIX-path assertion failure. A separate frozen Java-source
  comparison reproduced that failure (three passed, one failed). The Linux
  Java-container unit checks passed. macOS execution was not available; its
  existing version-policy matrix remains covered.

These results establish local command compatibility and regression behavior.
Actual Azure systemd confinement, Docker/AppArmor/cgroups, migration state,
TLS/SMTP/network policy and online workflows still require the existing VM
acceptance gates. No successful Azure startup is claimed here.

## 1. Deliver source and inspect host prerequisites

The fix branch is committed locally; pushing or transferring it and applying the
upgrade are operator actions. A source-only Git bundle can be created from the
fix worktree and copied privately to the Ubuntu build account:

```bash
git bundle create origin-linux-git-runtime.bundle fix/linux-git-runtime
git bundle verify origin-linux-git-runtime.bundle
```

Alternatively, after the owner publishes the branch normally, fetch its exact
commit using Git. Do not change `main`, merge branches or move the frozen tag to
perform this upgrade. Do not copy Windows `node_modules`, generated Prisma
engines, private environment files or database backups into a Linux artifact.

On the Ubuntu host, inspect the current vendor package and existing units; these
commands do not alter them:

```bash
/usr/bin/git --version
dpkg-query -W -f='${Version}\n' git
apt-cache policy git
/usr/local/bin/node --version
sudo systemctl cat origin-api origin-git
sudo systemctl status origin-api origin-git origin-java --no-pager || true
```

Require Ubuntu 24.04, the reviewed current Ubuntu Git security package, Node 24,
the existing private PostgreSQL configuration, the existing pinned Java image,
and unchanged confined service templates. Do not print `/etc/origin/pilot.env`.

## 2. Build a new immutable Linux artifact (ordinary build user)

Copy the source bundle to `$HOME/origin-linux-git-runtime.bundle`. In the script
below replace `NEW_FULL_COMMIT_SHA` with the exact 40-character commit reported
in the handoff; it is the **new fix commit**, not 2a2a3e5. Fresh names are deliberate.

```bash
set -euo pipefail
RELEASE_SHA=NEW_FULL_COMMIT_SHA
SOURCE="$HOME/origin-linux-git-runtime"
BUILD="$HOME/origin-build-linux-git-runtime"
[[ $RELEASE_SHA =~ ^[a-f0-9]{40}$ ]]
test ! -e "$SOURCE"
test ! -e "$BUILD"
git -c core.autocrlf=false clone --branch fix/linux-git-runtime \
  "$HOME/origin-linux-git-runtime.bundle" "$SOURCE"
git -C "$SOURCE" checkout --detach "$RELEASE_SHA"
test "$(git -C "$SOURCE" rev-parse HEAD)" = "$RELEASE_SHA"
test -z "$(git -C "$SOURCE" status --porcelain)"
git -C "$SOURCE" merge-base --is-ancestor \
  2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff "$RELEASE_SHA"
git -C "$SOURCE" diff --exit-code \
  2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff "$RELEASE_SHA" \
  -- server/prisma server/package.json server/package-lock.json client \
  deploy/pilot/systemd server/src/config/env.ts \
  server/src/infrastructure/preflight/hosted-service.ts
mkdir "$BUILD"
cd "$BUILD"
bash "$SOURCE/deploy/pilot/build-release.sh" "$SOURCE" "$RELEASE_SHA"
ARTIFACT="$BUILD/origin-release-$RELEASE_SHA.tar.gz"
sha256sum "$ARTIFACT"
ARTIFACT_SHA256=$(sha256sum "$ARTIFACT" | awk '{print $1}')
```

This uses locked installs and a dummy build-only database URL, validates and
regenerates Prisma, compiles the API and same-origin frontend, records the full
commit/platform, and hashes the artifact. It never connects to the live database.
Review and retain the printed artifact checksum through the transfer channel.
An existing output or release target must be inspected, never overwritten.

## 3. Stage and perform a code-only cutover (later approved maintenance)

Keep the existing restricted nginx allowlist closed to testers during acceptance.
Use the same shell variables from section 2 and the existing pilot layout:

```bash
sudo python3 "$SOURCE/deploy/pilot/stage-release.py" \
  "$ARTIFACT" "$ARTIFACT_SHA256" "$RELEASE_SHA"
PREVIOUS_SHA=$(sudo python3 -c \
  'import json; print(json.load(open("/opt/origin/current/release.json"))["commit"])')
printf 'Previous source release: %s\n' "$PREVIOUS_SHA"
```

Before stopping an operating pilot, obtain the existing required matched backup
using the current operator procedure and retain its verified receipt/off-host
copy. The existing command briefly stops/restarts only Origin services and does
not modify academic records:

```bash
sudo python3 "$SOURCE/deploy/pilot/pilot.py" backup --confirm CREATE_PAIRED_BACKUP
sudo systemctl stop origin-api origin-git origin-java
sudo python3 "$SOURCE/deploy/pilot/pilot.py" activate \
  --commit "$RELEASE_SHA" --confirm SWITCH_ORIGIN_RELEASE
```

**No migration, seed, restore, user creation, secret edit, unit replacement,
PostgreSQL restart, or Git-storage replacement is part of this patch.** The
schema/migration files are identical to the frozen release. Existing preflight
checks migration names and checksums read-only; stop and investigate if it
reports drift or incomplete migrations. Never run `pilot.py migrate` merely to
make this code-only update start.

## 4. Run the real confined acceptance gates

```bash
sudo systemctl reset-failed origin-api origin-git origin-java origin-verify-java
sudo systemctl start origin-verify-java
sudo systemctl show origin-verify-java -p Result -p ExecMainStatus
sudo systemctl start origin-git origin-java origin-api
for unit in origin-api origin-git origin-java; do
  sudo systemctl is-active --quiet "$unit"
done
sudo journalctl -u origin-api -u origin-git -u origin-verify-java -n 120 --no-pager
sudo python3 "$SOURCE/deploy/pilot/pilot.py" status
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/health
```

Require Java verification `Result=success` and `ExecMainStatus=0`, every required
preflight check PASS, `GIT_RUNTIME_READY` from both API and Git scope, and all
three long-running services active. Their `ExecStartPre` commands run under the
actual service identity and mount/capability restrictions; do not replace this
with a root/unconfined shell preflight. If anything fails, keep access closed and
retain diagnostics. Do not retry by weakening isolation or changing capabilities.

Then use the existing authorized pilot accounts to verify HTTPS login/cookies,
Activities, practice Java, browser Save to Git, group commits/branches/fast-forward
merges and Gradebook. Use a deliberate disposable Activity for any official
submission; do not consume a real attempt or release a grade as a smoke test.
Native external Git clone/push remains unavailable by design. Reopen only the
existing restricted tester allowlist after all host and functional gates pass.

For code-only rollback, keep traffic restricted, stop only the three Origin units,
activate the retained compatible `$PREVIOUS_SHA` with the same guarded CLI, rerun
its acceptance gates and then restart. Keep the database/Git/config pair intact.
The original 2a2a3e5 has the Linux blocker; rolling back to it retains the known
failure and is not permission to bypass preflight. If no earlier hosted release
passes, leave the pilot stopped and investigate instead of changing data.
