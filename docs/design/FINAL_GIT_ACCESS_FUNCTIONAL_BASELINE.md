# Final Git access and Friday demo gate

Date: 2026-10-22, Asia/Manila. Branch: `codex/student-ui-ux-continuation`.
This report supersedes the verification/status sections of the earlier refinement handoffs. Those files remain historical evidence.

## A. Outcome and implementation

The shared Code menu retains the actual credential-free clone URL, Copy, Get Git access and beginner help. Git access now has exactly one deliberate **Generate credentials** action. No issuance occurs on repository, menu or modal reads.

- `RepositoryCodeMenu.jsx` reads current Activity/Personal/legacy capabilities from the existing `GET /repositories/:id` response. Its new `gitPermissions` allowlist is computed with the existing Git transport authorizer and access repository. No new endpoint, credential policy, migration or schema was introduced.
- Group access continues to fetch authoritative Group context. Both paths revalidate on Generate; current write capability requests existing READ + WRITE, otherwise READ. Missing/malformed/denied authority fails closed. Frontend role and stale write hints do not select the scope. The credential endpoint and Git hooks still authorize the operation independently.
- `GitAccessDialog.jsx` shows the returned username/token Copy fields, expiry, Read only / Read and write and authorized-branches reminder. Tokens remain ephemeral; closing/changing views/unmounting/expiry/identity or confirmed access loss clears them. Late results are fenced. Failed generation never automatically replays. Get new access returns to the deliberate action.
- Manage access retains active metadata, deliberate revoke confirmation, authoritative revoke results, optional details and collapsed history paged six rows at a time. Original secrets cannot be recovered. Existing list API has no server pagination: loading is unchanged; only rendering is bounded.
- The checkpoint also includes the previously approved Student/Instructor panel, People, Class details, work-hub, direct Activity repository navigation/provisioning, shared browser and repository catalog changes. No Group editor or Origin rebrand is included.

## B. Verification actually executed

| Check | Result |
| --- | --- |
| Full frontend, bounded two-worker rerun | 77 files, **589 tests passed** |
| Focused permission-loss/capability tests | passed; included in full count |
| Backend unit regressions | **377 tests passed** |
| Dedicated PostgreSQL integration | 24 files, **121 tests passed** |
| Real Git provisioning/source inspection | 2 files, **11 tests passed** |
| Real Git Smart HTTP | 1 file, **12 tests passed** |
| Trusted local Java runner | 3 files, **26 tests passed** |
| Frontend lint/build; backend lint/type-check/build | passed |
| Backend integration type-check | passed |
| Final API mapping assertion, frontend lint and whitespace check | see local checkpoint evidence manifest |

An initial frontend run had one file-browser lookup timeout under simultaneous checks; focused and bounded full reruns passed. The first real-Git run used an excessively deep temporary root and failed Windows process startup; a disposable scratch reproduction confirmed the path limit. The guarded suite passed with a shorter owned QA root. Application authorization/storage containment was not weakened. Existing Vite JavaScript chunk >500 kB warning remains.

Component tests use synthetic credentials. Native Git suites and the separate persistent demo use real locally issued credentials. Browser visual checks issued none. Do not equate mock tests with real transport evidence.

## C. Real functional acceptance

The isolated demo exercised real HTTP/CSRF sessions, PostgreSQL, workers and native Git:

1. Admin provisions fictional Instructor/Students; Instructor creates Classes, visible/hidden tests, graded and completion Activities and a Group task, then publishes them.
2. Student reads do not provision repositories. Intentional creation provisions one Activity association; repeated create returns the existing 409 contract and read reuses the same ID. Owner-write and Instructor-read capabilities match server authority; Instructor write issuance returns 403.
3. Real Java code run and visible-test execution succeed. IDE checkpoint persists exact source and a real Git commit without an academic attempt.
4. One official submission is assessed against both accepted visible/hidden cases. Instructor review remains hidden from Student until release; release yields 100/100 and feedback.
5. A later Git checkpoint changes the working copy while accepted submitted source and released score remain unchanged.
6. Two Group members use separate native clones: lead initializes main, Developer pushes feature/catalog, Developer push to main is rejected, lead fetches and fast-forwards main. Group records preserve authenticated pushes.
7. Ready for review removes write authority and rejects further write issuance. Instructor clones with READ. Native transport regressions cover stale/frozen permissions, revocation and protected refs. Expiry clearing is checked with controlled component clocks; credential expiration policy remains unchanged.
8. Admin overview/academic/operations/audit reads succeed; Student Admin access is denied. Explicit fictional teammate session revocation rejects refresh; fresh login succeeds.

Browser checks: Activity Detail → View repository directly; writable Activity modal; frozen Group read-only modal; collapsed access History; Escape/focus restoration; 390 × 844 layout; Java IDE → Load latest from Git restores exact saved source. No live browser token was generated for screenshots.

## D. Preservation and source checkpoint

Initial verified HEAD: `53ee6d9c8c274bfc6486b802ad01e6e4c788b8d3`; 39 modified, 29 untracked, nothing staged. All belonged to the preceding approved refinement chain. Review covers the complete candidate, including those files and the bounded one-button correction. No unrelated source was identified. No reset, clean, checkout, rebase, deletion, push, merge or deployment occurred.

The final local checkpoint SHA, explicit changed-file manifest and security/preservation review are recorded outside Git in the demo evidence directory and the final handoff. Private accounts, environment files, PostgreSQL/Git/Java storage, logs and screenshots are outside the source checkout and must never be staged.

## E–F. Persistent Friday environment and walkthrough

Friday: **October 23, 2026 afternoon, Asia/Manila**.

- Demo UI: `http://127.0.0.1:5207/`; API: `http://127.0.0.1:5340/api/v1`.
- Dedicated new database `projex_friday_demo`, non-superuser `projex_friday_app`, owned isolated loopback PostgreSQL cluster port 55493. Existing 25 migrations applied only to this new database. No new migration created.
- Existing manual review UI `http://127.0.0.1:5197/` and database `projex_student_review` preserved. Disposable suite database `projex_test` uses a separate restricted role; identity, ownership and absence of other consumers checked before destructive suite fixtures.
- Runtime root: `C:/Users/Wefllagn/.codex/visualizations/2026/10/20/01a15a3d-b1a5-7990-b286-2bd8c98fc9f4/projex-friday-demo-20261022`.
- `RUNBOOK.md` contains startup/recovery and exact links. `private/LOGIN.md` contains fictional accounts/passwords; do not copy credentials into source or public slides. `evidence/acceptance.json` contains real journey results and IDs. `Demo.ps1 status|start|stop|restart` controls owned demo processes only.
- Accounts: `admin@friday.projex.invalid`, `instructor@friday.projex.invalid`, `student@friday.projex.invalid`, `teammate@friday.projex.invalid`.
- Demonstrate graded Hello Projex with released result and two Git saves, unsubmitted Java practice for a fresh action, and Campus Library with two members/two branches/two commits in Ready for Review. This is persistent fictional data, not restored historical demo data.

## G. Readiness and limits

The checked local functional baseline is suitable for controlled Friday demonstration. It is not production/deployment approval. No public tunnel or non-loopback listener was introduced. Java local_process is for trusted local fixtures; public Java isolation/recovery proof, hosted configuration, deployment and branch integration remain separate gates. The large frontend bundle warning and unbounded credential metadata fetch are retained limitations, not concealed failures. Automated API/native-Git coverage does not claim exhaustive human usability acceptance of every screen.

## H. Separate Group editor development

Do not implement Group editing on this branch. After checkpointing, use the exact SHA and commands in the external runbook to create `codex/group-browser-editor` in a new worktree. If that branch/path exists, inspect and reuse appropriately; never reset it.

Reusable components: `StudentProgrammingWorkspace` / `JavaSourceEditor.jsx`, workspace sizing, `AppDialog`, `GroupFileBrowser`, `RepositoryGitLayout`, `GroupRepositoryView`, `RepositoryCodeMenu`, Git/source projections, Group context, `evaluateGitPermission`, safe storage/command runner and Smart HTTP hooks.

Activity writes currently use `RepositoryCheckpointJob`, `activity-workspace-checkpoints`, `repository-checkpoint-queue`, `git-activity-checkpoint-writer` and the Git worker. They are Activity-bound single-Java-file/main checkpoints. Group source APIs are read-only. A Group editor requires its own bounded durable commit job/request contract, current role/freeze/branch authorization and atomic expected-HEAD conflict handling against native pushes. Do not repurpose Activity jobs, submit/grade Group code, silently overwrite concurrent work or expose a fake editor. See the existing Group proposal for the concrete gap and bounded design.

## I. Next approval gate

No further owner approval was needed for these expressly authorized isolated QA/demo resources and local checkpoint. No normal-development database migration was applied. Normal database changes, public exposure/Java isolation deployment, integration and push remain separate approvals. Group editor implementation belongs to its approved separate track; its normal-database migration still requires explicit approval.
