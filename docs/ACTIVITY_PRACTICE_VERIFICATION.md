# Activity-level Practice Again verification

Final product policy: 2026-11-04, Asia/Manila. Branch `feature/released-practice-mode`; implementation parent `c2e214e`. Prior integrity fixes `22123d7` and `fc2b5fa` are preserved.

## Final authorization contract

Practice requires exhausted counting attempts, the latest attempt by attempt number to have a graded RELEASED score and released corresponding feedback, no unfinished assessment/review/failure, and no valid unconsumed replacement grant. A released optional empty review is represented by no feedback row. A draft feedback row never qualifies. Deadline expiry does not exhaust unused attempts. A latest failed/resolved attempt without a released graded result remains locked. LATEST/HIGHEST credited grade selection is unchanged.

Increasing permitted attempts or granting a replacement suspends access without deleting practice progress. After the new final opportunity is exhausted and released, the same workspace resumes. Current student, membership, class/activity and repository authority remain required. The shared policy controls API, activity action, Git practice scope, worker publication and interactive Java monitoring. Publication locks fence lifecycle, attempt and replacement changes; native authentication is repeated under those locks.

## Design and integrity review

One unique student/activity workspace snapshots authoritative assignment instructions and starter on first entry. The existing system has no historical publication-time instruction version; instructions can be edited after publication. It never initializes from submitted answers or ordinary Git source.

The existing isolated Git worker creates an orphan `practice/<workspace UUID>` branch. Saves use expected-head comparison and atomic ref/receipt updates. Start Over creates a forward commit restoring the starter tree; history is preserved. Interruption recovery uses a private durable receipt. Native practice cannot create/delete its reserved branch, write another practice branch, or use its deadline exception for main/ordinary feature branches. Ordinary browser checkpoints continue to require main permission.

Practice Java uses existing ungraded execution and visible-case snapshots, never official submission/release/grade/feedback writes. Hidden tests remain excluded. Limits remain 100,000 UTF-8 source bytes. Current authoring requires non-empty starters; empty practice snapshots are defensively supported/tested without changing that authoring policy.

Reviewed scope: practice model/routes/service/worker/writer; Git authorization/receive fencing; execution admission/monitoring; student route/action/editor/API/error copy; related tests/fixtures and documentation. No dependencies, lockfiles, grading algorithms, deployment files, live environment or secrets changed. Migration `20261104000000_activity_practice` adds two tables and one nullable execution relation, indexes and restrictive foreign keys. No official data update, deletion, reset or history rewrite. Applied only to disposable `projex_test` at 127.0.0.1:55494. Normal/demo migration requires separate approval.

## Scenario evidence

| Scenario | Verification |
| --- | --- |
| Partial/exhausted attempts; queued/running/assessed/reviewed/failed states; final score/feedback; zero score and empty feedback | Policy matrix plus authenticated database/API tests |
| Remaining attempts/replacement suspension and expiry, preserved workspace | Persisted database grants and Git authorization; replacement pending/released matrix |
| First/repeated/concurrent entry; blank snapshot; late provisioning | Real Git orphan tree and unique workspace checks |
| Save/reset/progress; idempotent retry; stale browser and native clients | Real Git and frontend recovery tests |
| Clone/push/pull/fetch; unauthorized ref/main/deletion/read-only access | Native Smart HTTP suite |
| Archive/membership revocation; interruption receipt recovery | Native Git fencing and API console monitoring |
| Post-deadline Java/visible tests, hidden-case exclusion and unchanged official evidence | Authenticated API with real Java processes |
| Actual Practice route, save, polling, reset and responsive screen | Isolated application browser verification |

Final results: **PASS** — frontend 141 tests (7 files); related backend/policy units 57 passed and 1 platform-dependent skip (10 files); complete native Smart HTTP 28 passed; official submission/review/checkpoint/repository/credential and real Java/API regressions 74 passed (9 files). Backend type-check, integration type-check, frontend/backend lint and both builds pass. Vite retains its existing large-chunk warning. The final reset timing fix was followed by another passing 7-test UI/adapter run and build.

Actual final-build browser verification: student login, activity Practice Again, original starter initialization, queued Git save, visible test PASS, real Java output `ok` / exit 0, cancelled and confirmed Start Over, saved-starter re-entry, desktop and 390px narrow layouts. Page width at 390px was 375px (no horizontal overflow). Changing only the fictional fixture to released Attempt 1 of 3 removed Practice Again (zero matching actions), then its exhausted state was restored. Browser checks found and fixed route catalog registration, visible-test polling adapter, inherited editor-grid CSS interference, and a transient reset/navigation warning. Screenshots are retained locally outside the repository.

No Azure/macOS/Linux runtime acceptance is claimed. Existing hosted Smart HTTP restrictions remain. Unsaved memory drafts cannot survive a forced crash/reload; normal reload/navigation and reset actions confirm possible loss. Receipt retention follows the existing worker pattern. No inline annotation subsystem was added. Native receives hold policy locks for their bounded transport duration, which can temporarily delay concurrent instructor lifecycle changes. This is an integrity fence, not a production performance certification.

## Manual acceptance and approval gates

1. Confirm no Practice Again after released Attempt 1/3 or while the exhausted final attempt is pending.
2. Release the final score/feedback as instructor, enter the single activity action as student, and confirm starter source.
3. Save, leave and re-enter; run Java and visible tests. Cancel then confirm Start Over.
4. Grant a replacement/increase attempts through authorized official workflows; verify suspension and preserved progress. Complete/release the final opportunity and re-enter the same workspace.
5. Confirm official attempts, released grade and feedback only change through intentional official actions.

Do not push, merge, migrate normal databases or deploy without approval. Before integration, rollback is simply to keep using the prior application; preserve additive tables and practice data rather than dropping them.

Final review covered all 48 changed files including the additive migration. An additional targeted native test passed with an already populated main branch: practice initialization/save/reset left its exact file content and commit unchanged. Temporary browser/API/Git/Java processes were stopped after verification; isolated fixtures and private receipts remain local. No live demo services were restarted.
