# Origin final UX and Azure pilot preparation

Status: **local UX verified; application deployment package prepared; actual Ubuntu/online acceptance pending.** No Azure connection, cloud changes or remote deployment were performed. The Product Owner executes the VM guide, then validates the restricted online pilot.

## Traceable source

- Working/published branch: `codex/origin-final-ux-pilot` in `wefllagn/Projex`.
- Reconciled parent: `codex/origin-final-functional` at `819a84b90a5ff83b2b0a349e6f5936436fcd8d9f`.
- Verified locked Phase 2 remote: `ui/origin-phase2-polish` at `2f5831ef8a3f8cc98acd66127e0158e28a2f8ae5`.
- UX checkpoint: `81ed56163eee9b7ef287aa0d357d09d8f891f314`.
- This document, deployment files and final verification evidence belong to the final release commit; use the full `git rev-parse HEAD` supplied at handoff as the deployment input. Build artifacts record that exact commit and migration set in `release.json` and hash all files in `SHA256SUMS`.

Discovery checked ten existing worktrees, current/remote functional and Phase 2 refs and preserved uncommitted approved visual work. The parent already includes the reconciled visual changes and approved functional work. The new worktree was created separately; no merge into main/development or protected branch occurred. GitHub identity was verified as `wefllagn` before publication. No force push is authorized or used.

## What changed

**Activity creation:** Details → Java starter → Test cases → Publishing. Next validates only the current step and persists it. The first Next creates the private draft automatically and replaces the route with its canonical Activity URL. A stable request UUID plus database primary-key uniqueness makes concurrent clicks/lost-response retries return the same scoped Activity. Existing clients may still omit that optional UUID.

Back retains local work. A private, account/Class/Activity-scoped session cache recovers unsaved fields and the current step for up to eight hours in that tab; signing out or confirming an identity change clears private caches. A saved server draft persists independently of the cache and can be reopened later. A recovered stale version is blocked until the Instructor explicitly loads the current saved record. Existing optimistic versions remain required for patches, test replacement and publication. Storage failure reports recovery unavailability; Next still saves to the server.

Java starter explains its purpose and required entry class/nonempty source. Test importance, derived points, rounding, visible/hidden access and existing publication constraints are reused. Complete readiness appears only in Publishing, alongside the summary, Save Draft and Publish. Once published, the existing free section tabs return and existing immutability rules apply. Archived Classes remain read-only. Validation focuses the first invalid control; the desktop content pane scrolls while navigation stays outside it; mobile uses natural page flow.

**Gradebook:** removed only the redundant visible caption band. Its table still has an accessible name. Clicking the name, any period cell or empty row space opens that Student's existing Gradebook. Enter/Space work on the row; the native name link remains and independent controls/modified clicks are respected. Hover/focus reuse Origin tokens. Calculations, periods, provisional coverage, release policy, Student authorization and legacy Unassigned records are unchanged.

No Admin deletion, rubric redesign, university formula, new language or unrelated UI work was added. Existing global theme/layout CSS, badges, avatars, login, landing, IDE and Git layouts were preserved. The two new CSS files are scoped to these approved UX changes.

## Deployment package

Follow **[deploy/pilot/README.md](../deploy/pilot/README.md)** in order. It covers dedicated users/directories, a fresh PostgreSQL pilot database, exact-SHA Ubuntu builds, immutable release staging/activation, secrets, migrations, Java image, confined services, HTTPS proxy, restricted access, installation checks, backups, fresh-target recovery and rollback.

- `build-release.sh`: locked dependency installation and exact clean source build on Ubuntu Node24, not copied Mac binaries.
- `stage-release.py`: artifact checksum, architecture/Node/platform checks and extraction into a new root-owned SHA directory; no overwrite/activation.
- `pilot.py`: connected loopback database/role attestation, fixed pilot paths, confirmation phrases, no active-service migration, matched PostgreSQL/Git/private-config backups, row fingerprints and fresh-target restore verification. No drop/reset/down-migration commands.
- `pilot.env.example`: production-only HTTPS, secure cookies, one trusted proxy, separate signing/SMTP secrets, container Java and confined browser Git; no embedded secrets.
- `systemd/*`: separate unprivileged API/Git and trusted Java controller identities, read-only code/root and explicit storage allowlists; preflights per role.
- `nginx/*`: TLS SPA/API proxy, forwarded-header replacement, no native Git endpoint, deny-by-default tester IP allowlist.
- `Java.Dockerfile`/`build-java-image.sh`: immutable official JDK17 base and image ID, tiny build context.

New production modes are `JAVA_EXECUTION_MODE=container` and `GIT_EXECUTION_MODE=service_isolated`. Production continues rejecting `local_process`. Browser Git is enabled only inside the unprivileged/read-only service boundary; native Smart HTTP remains disabled. Java runs each compile/run in a separate offline, nonroot, capability-free container with explicit AppArmor/default seccomp, no new privileges, private cgroup namespace, no IPC, read-only runtime mount/root, 256MiB/one CPU/64PID limits, temporary disk and file/output/time bounds. The trusted controller has Docker authority; Student jobs receive neither its socket nor application credentials/files.

The Java worker checks actual runtime boundaries **before claiming jobs**. `origin-verify-java.service` is the mandatory full Linux acceptance gate: actual boundaries, memory, disk, PID exhaustion, timeout, output, interactive Scanner and cleanup. Image tags are rejected; no fallback to host Java exists. The Mac development preview remains isolated and retains its pre-existing local runner solely for fictional local regression testing.

### Database/API compatibility

No Prisma schema or migration was added in this pass; all **30** existing committed migrations are retained. The only Activity API addition is the optional create-only UUID `creationRequestId`; authorization/scoring/release contracts are unchanged. Deployment preflight now checks exact applied migration names and file checksums, including rejecting unknown newer migrations. Existing backup/restore-safety backend contributions remain intact; the Ubuntu operator package is separately guarded and does not relax those older tool restrictions.

## Verification performed on the isolated Mac environment

| Check | Actual result |
| --- | --- |
| Frontend | 92 files, **721 tests passed** |
| Backend unit | 56 files, **453 tests passed** |
| PostgreSQL integration | 28 files, **141 tests passed** |
| Real Java17 | 4 files, **37 tests passed**, including compiling the Linux acceptance source (compilation is not isolation proof) |
| Real Git workflows/recovery | 4 files, **48 tests passed** |
| Smart HTTP regression | 1 file, **12 tests passed**; remains disabled in hosted pilot |
| Deployment operator guard tests | **7 passed**; target identity, tampering, links, deterministic fingerprints, incomplete release and template boundaries |
| Static/build checks | Client/server lint, backend + integration TypeScript checks, Prisma validate, both production builds, shell syntax and Python compile passed |
| Runtime preflight | Own QA database, exact migration checksums and local runtime readiness passed |
| Unsupported-host guard | Container acceptance refused macOS; no host-process fallback |
| Fresh-copy recovery | **41 tables** matched by row content, **117 Git files** matched, **4 repositories** passed fsck, **30 migrations** current, migrate deploy changed no rows |

The frontend build retains its existing large-bundle warning; no unrelated bundling/dependency refactor was undertaken. A newly added validation-focus assertion initially used an exact label that includes inline error text; the assertion was corrected to its accessible textbox name, and the complete 721-test suite then passed.

Real Instructor browser verification used **only** `http://ux.localhost:5208/`: Details without premature publication/test errors; first Next/canonical single draft; starter explanation and saved code; Back/Next retention; visible Normal plus hidden Very High tests and automatic 17.5/52.5 point allocation; final summary; saved draft refresh resuming Publishing; publication; free, locked section browsing afterward; Gradebook period-cell click and Enter row navigation; step validation focus; light/dark and 390px responsive rendering without horizontal overflow. Unsaved input remount recovery and double-click/lost-response behavior additionally passed automated tests; the dirty-page browser unload guard was not bypassed for a screenshot claim.

The disposable UI Activity is `UX verification · Guided Scanner`, in the copied 48-Student QA Class. It exists only in the new preview. Do not seed/import it into production.

Evidence: [screenshots and safe verification JSON](evidence/origin-final-ux-pilot/). Full raw local logs and private fictional review credentials remain outside Git in the separate `origin-ux-pilot-review` operations directory.

## Preservation verification

All five protected frontends and APIs remained healthy: **5196, 5198, 5202, 5204, 5206**. Their existing migration counts remained 28/28/28/29/30. **8,123 protected file hashes**, **ten worktree HEAD/status states**, and seven source-preview academic-table fingerprints matched their recorded pre-work baseline. Existing dirty Phase 2/handoff work was not overwritten. No protected service was stopped/restarted, database migrated/reset/seeded or Git storage/credential changed. Only the new preview at **5208 / API3032 / PostgreSQL55500** and explicitly disposable test/recovery copies were written or restarted.

## Owner actions and remaining gates

The Azure VM name is `origin-demo-vm`; its old IP `20.205.63.170` is only historical context. Current reachability, OS, capacity and configuration are unverified. No connection was attempted and no private key is needed by this package.

Before pilot exposure, the owner must configure VM access, DNS/certificate/renewal, restricted NSG/firewall/VPN or tester IPs, supported Ubuntu/Node/PostgreSQL/Docker, an existing SMTP sender, new secrets and off-host protected backups. Execute the guide's exact-SHA build/stage/migration steps, full Linux Java acceptance, each service preflight, HTTPS/cookie/access checks, real academic smoke tests and Ubuntu paired backup/fresh-restore drill. Do not enable a fallback runner or remove a failed isolation check to get online.

**Not yet verified:** actual Linux Docker/AppArmor/cgroup enforcement; Ubuntu systemd confinement and operator CLI end-to-end; VM capacity; nginx/TLS/proxy/cookies via HTTPS; SMTP delivery; online adviser/panel workflows; VM backup/restore and reboot persistence. These are explicit deployment acceptance gates, not completed tests. Shared-kernel container isolation is for this restricted academic pilot; a public hostile multi-tenant service requires a separate security decision/review.

Recovery instructions retain failed data, restore matched database/Git/config to fresh targets, validate before cutover and invalidate restored authentication sessions/links before reopening. No automatic destructive cleanup or rollback of academic schema/data is provided. The previous local-only 819a84b artifact is not a hosted-mode rollback target; retain each subsequently validated hosted release and image.

Stop here. The package is ready for the Product Owner's VM configuration and joint deployment walkthrough; **no online deployment is claimed**.
