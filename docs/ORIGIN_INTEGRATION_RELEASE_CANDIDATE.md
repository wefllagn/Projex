# Origin integration release candidate

Reviewed 2026-11-05, Asia/Manila. Branch: `release/origin-integration`.
Status: **READY FOR A SINGLE INTEGRATION PR**, subject to required independent review. This is not deployment approval. Pin the full containing commit reported in the handoff; do not deploy a moving branch name.

## Sources and history

- Independently refreshed remote main: `5158280de5f7036e7371bf7fa1a31c5e68cf6385`; its source tree matches frozen `2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff`.
- Normal, non-fast-forward merges preserve `c989e79148289e649c1daa9753bf697af35ff550` (Practice Again, `fc2b5fa` editor/submission integrity, `22123d7` lifecycle hardening and acceptance refinements) and `68881c8fc31f804e1279187a5a26002039f5f77c` (validated Linux Git support).
- Reconciled all 26 uncommitted Smart HTTP files from the preserved `feature/isolated-git-smart-http` worktree using a three-way patch. The two textual conflicts were in documentation and pilot tests; both sides' relevant contracts/tests remain.
- The shared transport still passes exact practice-branch permissions into the receive hook and retains lifecycle/credential write fencing, fresh authorization, immutable submission source and ordinary deadline/main protections. Hosted CGI executes in the confined Git worker, not the API. Its private listener accepts canonical Git protocol requests only; Nginx terminates HTTPS. Worker readiness controls credential issuance and public capabilities.
- Included bounded CGI concurrency/process-group termination, bounded readiness, disabled-mode/path/auth tests, client capability refresh and a real verified-TLS Git regression. No dependencies or lockfiles were upgraded.

No blanket merges of historical branches were needed. The older landing work was already reconciled through `55022ee`; Group Git action layout refinements are already present, including newer theme styling. Other worktrees' setup notes, contact sheets, tool metadata and local output were preserved rather than imported as application changes. PR #5, main, the frozen tag and deployed sources were not changed or published.

## Explicit feedback release

Practice requires exhausted counting attempts, the latest applicable graded attempt's officially released score **and an existing feedback record with releasedAt**, no pending official assessment/review and no valid replacement. Missing feedback and draft feedback do not qualify. Current account, ownership, membership, activity, class and repository restrictions still apply. LATEST/HIGHEST credit selection is unchanged; replacement or reopened attempts suspend the existing workspace without deleting it.

The existing instructor release transaction now creates a released feedback record with empty text when a graded result is deliberately released without written comments. Existing feedback is released in that same transaction. No invented comments, new migration or implicit historical backfill is introduced. Completion-based Ungraded release behavior and the student's empty-comment projection remain unchanged. Previously released records without authoritative feedback remain locked; any historical remediation requires an explicitly reviewed instructor/repair workflow, not inferred release dates.

## Verification on the combined implementation

All database-backed suites ran serially against new disposable `projex_test` on loopback port 55495, never a demo database. Git suites used sentinel-owned per-run storage and separate temporary clones. Windows used Git for Windows and JDK 17; Ubuntu 24.04/WSL2 used native Git 2.43.0, Node 24 and JDK 17.

| Check | Windows | Ubuntu |
| --- | --- | --- |
| Backend unit/security | 514 passed; 1 existing POSIX executable-bit test skipped | 515 passed |
| Native Git provisioning/checkpoints/browser commits/refs | 50 passed | 50 passed |
| Smart HTTP, practice and actual verified HTTPS Git | 29 passed | 29 passed |
| API/database integration | Final full 163 passed | Full 163 passed |
| Real Java compiler/runtime | 47 passed | 47 passed |
| Backend build and both type-checks | Passed | Passed |

Frontend: all 747 tests, lint and production build passed. Backend lint passed. Pilot operator guards: 11 passed. Existing Vite chunk-size warning remains. A pre-existing POSIX-path assumption in the Java container **test fixture** was made platform-correct; no Java container protection changed. The earlier Windows native-Git fixture failures did not reproduce in this isolated combined run; no production workaround or skipped Git cases was introduced.

The Git suites exercise authenticated clone/fetch/pull/push, branches, read-only/cross-user rejection, revoked authority, malformed paths, disabled transport, force/protected-ref rejection, limits, receipts/recovery, native/browser races and practice-only post-deadline writes. The TLS case requires certificate verification, refuses the untrusted certificate and unauthorized writes, and confirms pushed source through repository inspection. Source/comment/Unicode/CRLF/conflict-marker fixtures remain exact; invalid Java produces student compile errors, not rewritten source.

Fresh actual-browser acceptance used only new ports 5338/5339 and fictional student/instructor accounts. Verified login; activity-level eligibility; original starter; practice save; visible tests; Java output `ok`/exit 0; confirmation/cancel/reset; re-entry; desktop and 390px layout. Interrupting only the disposable API preserved unsaved code; retry saved the original intent while newer typing remained unsaved. Instructor review retained the released 90/100, feedback and exact original submitted source after practice reset and external Git edits.

Credentials generated through the actual Code dropdown were used in separate Git CLI clones: status/add/commit/push, upstream branch push, fetch, switch and a real pull of another clone's commit all passed. Anonymous access was rejected. Refreshing Origin displayed the pushed commit, branches and exact Main.java. Credentials, fixture state, screenshots and diagnostics remain private and ignored; they are not release artifacts.

## Migration and deployment gates

The original additive `20261104000000_activity_practice` migration is unchanged. A separate populated `origin_upgrade_rehearsal` database was built with the frozen main's 30 migrations and fictional academic evidence, then upgraded to 31. Counts and fingerprints of all 40 existing tables were preserved; practice tables stayed empty and absent historical feedback was not invented. This is a synthetic compatibility rehearsal, not production drift or backup attestation.

Before any deployment:

1. Approve the exact release SHA and integration PR; keep deployment separately gated. Obtain the required approving review; do not bypass main protection. No push or PR change is authorized by this report.
2. Inspect actual Windows/Azure migration history and drift, source identity, package revisions and service/storage configuration privately. A database with 24 migrations needs review of all intervening changes, not just this migration.
3. Rehearse a coherent database/Git/configuration backup and restore to fresh resources. Preserve hidden Git receipt refs, previous binaries, migration inventory and checksum manifest. No live backup/restore was executed here.
4. Build platform-native locked artifacts, generate Prisma and verify checksums. Keep the Java image pinned. Run the actual Ubuntu production preflight and confined-worker acceptance; require maintained Git security packages and the existing systemd restrictions.
5. Under approved maintenance, drain all writers/jobs and deploy matching API, Git hook/worker, Java worker and client. Apply only the reviewed pending migration set with the guarded pilot operator. Do not admit Git writes with mixed old/new practice authorization.
6. For hosted Git, review the supplied Nginx template, validate with nginx, keep port 3001 loopback-only and route HTTPS `/api/v1/git/` to the worker. Set private `GIT_HTTP_PORT=3001` and the Ubuntu backend path; enable the flag only after acceptance. Keep `/git/`, dumb storage routes and readiness private. Confirm real certificate/hostname behavior, Code URL, authorized Git and denial cases externally before reopening access.

**Not verified here:** actual Azure revision/configuration; real Nginx syntax/runtime; full systemd production Git-worker confinement; Docker/AppArmor/cgroup Java acceptance; production data drift, capacity, SMTP and real paired-backup restoration. Nginx and Docker are unavailable in this disposable WSL environment. A real TLS test proxy is evidence of protocol/TLS behavior, not proof of deployed Nginx or Azure. These remain deployment prerequisites, not hidden test passes.

## Rollback limits

Before new writes, a reviewed code/config rollback can retain the additive schema. Keep Git writes closed if the older binary lacks the practice namespace policy. Do not drop practice tables, reset repositories or restore the database alone. After new writes, recover only a verified matching database/Git/configuration pair into fresh resources and approve cutover separately; restoring older data can lose later work. Preserve failed resources for reconciliation.

The exact integration HEAD, clean status, ancestry and remote identities must be rechecked before publication. Keep PR #5 open/unmodified until the owner approves how the final integration PR will supersede it. No merge, push, deployment, real migration, live service restart or history rewrite was performed during preparation.
