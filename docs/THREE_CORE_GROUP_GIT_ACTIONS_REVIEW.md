# Three core Group Git actions — implementation and review

Date: 23 October 2026. Branch: codex/group-browser-editor-mvp.
Base of this extension: ac9103bee2bfe6579c2fdcbf5fdfe81ba94ee3fc.
The final checkpoint SHA is recorded in the owner handoff and available through git rev-parse HEAD.

## Outcome

New Branch, Commit Changes and Merge Branch are implemented as real Group Git operations. Existing editor, README correction, unsaved protection, native transport, empty initialization and optional welcome/help preference are retained. No deployment branch integration, push, public exposure, dependency upgrade or Origin rebrand is included.

## Actions

New Branch shows the current source branch and exact commit. Explicit confirmation creates an actual refs/heads branch if absent, then switches the editor in place. Unsaved source and commit message move with the editor without being committed or discarded. Empty repositories must first be initialized by an authorized Maintainer. Names use a bounded portable Git grammar; protected-main creation, HEAD, custom refs, reserved prefixes/device components, invalid names and duplicate/case-prefix collisions are refused.

Commit Changes invokes the original GroupBrowserCommitJob path. It requires a message and changed supported text, preserves exact-HEAD checks, one-file/64-KiB limits, server-bound actor identity, worker execution and durable receipt recovery. It does not add staging, Push or academic Submit.

Merge Branch selects existing source/target branches. Main is the default only when authoritative current permissions permit it. The read-only review shows exact revisions, introduced commit count, up to five commit subjects, bounded changed files, and the target-update consequence. Explicit confirmation queues a fast-forward. Diverged or equal branches cannot be confirmed in the UI and are independently refused by execution. There is no merge commit, automatic three-way merge, force update, hidden rebase or conflict resolution.

The source selector may read main while an ordinary Developer's target selector excludes protected main. Developers can create feature branches and fast-forward into authorized feature targets. Maintainer privileges do not override lifecycle, deadline, membership or review restrictions.

## API, storage and execution

- POST /api/v1/repositories/:repositoryId/browser-refs accepts CREATE_BRANCH or FAST_FORWARD, exact expected source/target revisions, and an Idempotency-Key. It requires authenticated active Student, JSON and CSRF.
- GET /api/v1/repositories/:repositoryId/browser-refs/preview?sourceBranchName=&targetBranchName= performs authorized bounded read-only inspection.
- GET /api/v1/repositories/:repositoryId/browser-refs/:refJobId exposes only the requesting actor's safe job projection under current read authority.
- The existing browser-commits endpoints and worker remain the sole file-commit mechanism.

Migration 20261023010000_group_browser_refs adds a separate GroupBrowserRefJob table. It reuses the existing generic job-state enum and direct User/Repository relationships, without altering Activity submission/checkpoint identities. SQL checks enforce operation/revision shape, bounded names, claim state, terminal timestamps and success-result binding. SHA-256: 58913bc13aef167635d2dcea2050770d735f85133e1fed6143727615be72e931.

The Git worker services ref jobs alongside existing Group commits, repository provisioning and Activity checkpoints. Both APIs serialize acceptance per repository and bound an actor's active commit/ref action. Retries are bound to the exact payload and key.

Worker leases/claims are fenced. Read/write/project/branch authority is checked before preparation and again under locked policy rows immediately before publication. Ref publications are serialized per repository; the locked preflight repeats name/collision/count and ancestry checks before the final permission check.

Git update-ref --stdin atomically verifies the source, creates/compare-and-swaps the target, and creates a private refs/projex/browser-refs/job-id receipt. Stale source or target refuses publication and requires fresh review. Concurrent native changes cannot be silently overwritten. The receipt resolves ambiguous publication/worker interruption without applying the update twice, including when later native changes advance the target or authority freezes.

Repository activity records BRANCH/MERGE with the authenticated actor and confirmed target revision. Existing transfer.hideRefs protection covers these receipts; native clients cannot advertise or push the private namespace. No Git mutation runs synchronously inside the API process. Only bounded preview inspection does.

## Error handling and editor preservation

- Pending actions prevent repeated mutations; unknown network outcomes retry only the identical key/payload.
- Failed/conflicted ref jobs retain dialog inputs and editor source/message.
- Stale refs expose Review latest branches and require renewed merge preview/confirmation.
- A merge advancing a dirty current target retains its old draft/base and requires Compare latest before committing.
- Branch creation switches URL and editor state without activating the leave-page discard prompt; real navigation continues to be protected.
- Enter in the New branch dialog cannot bubble into the surrounding Commit form.
- Dialog focus trapping, Escape/cancel, trigger-focus restoration and responsive controls reuse Projex conventions.

## Isolated resources

A new loopback PostgreSQL cluster on 55514 contains separate newly created projex_test and projex_group_actions_review databases. Only these new resources received the candidate's 27 migrations. Test cleanup targets projex_test; manual browser fixtures and their Git history live separately in the new review database/root.

The preview is UI 5213 and API 5353, with a separate Git worker and managed Git storage. Existing 5212/5352 Group fixtures and the Student/Instructor continuation remain preserved. No preserved demo/development/presentation database was migrated.

Private generated account details are outside Git in the owned QA TEST-ACCOUNTS.txt file. No account passwords, session cookies, issued credentials, database URLs or private environment files are committed.

## Verification

| Check | Result |
| --- | --- |
| Full frontend | 619 tests, 79 files passed |
| Focused Group editor/actions | 30 tests passed; includes real data-router protection |
| Backend unit | 420 passed, one existing Windows skip |
| PostgreSQL integration | 121 tests, 24 files passed |
| Real Git suites | 48 tests, four files passed |
| Smart HTTP regression | 12 tests passed |
| Trusted local Java | 26 tests, three files passed |
| Client/server lint | Passed |
| Application/integration TypeScript | Passed |
| Client/server/worker builds | Passed |
| Prisma validation | Passed |
| Migration application | 27 migrations applied only in the new QA resources |

The existing frontend bundle-size advisory remains. Test corrections preserved all assertions: membership-withdrawal fixtures update team/repository membership consistently with existing database invariants, and immediately eligible test jobs use deterministic scheduling times rather than depending on PostgreSQL/Windows millisecond rounding. No production policy was relaxed to pass tests.

Actual browser evidence: Maintainer initialized README on main, created feature/full-workflow while carrying an unsaved source/message, committed 3d95571bea57a7ee28ea220f0f611d5b19bc80cd and confirmed fast-forward into main. A live data-router guard issue discovered during this test was fixed and covered by regression.

Actual HTTP/native proof: Developer created feature/developer-proof-final and committed fe9296dfdd5cec563f0c12aa83ece398f7a5f905. Developer merge to main returned 403; Maintainer preview/merge succeeded. Native authenticated Smart HTTP clone/fetch confirmed main and that feature ref at that exact commit and the server-bound Developer author. Private receipts remained hidden, the temporary verification READ credential was revoked, and an actual divergent merge was rejected. The final outside-Git handoff records exact job IDs and hashes. Both new databases have 27 matching migration checksums. The final audit found zero pending ref jobs, zero active verification credentials, and all terminal browser-commit payloads cleared.

Actual HTTP denials: anonymous 401; Viewer 403; unrelated Student 404; Instructor/Admin 403; missing CSRF 403; invalid ref 400. Automated real-Git tests additionally cover duplicate simultaneous creation, source/target races, stale refs, late permission withdrawal, closed/frozen/deadline states, actor-scoped status, payload-bound retry and interrupted publication recovery.

Browser checks used desktop and 390x844 mobile. The mobile merge dialog measured 370px wide with a 390px document and no horizontal overflow. Enter-based creation, branch switching, preservation, confirmation and focus/cancel behavior were exercised. Temporary viewport overrides were reset.

## Deliberate limits and handoff

Fast-forward only; use native Git/local IDE when branches diverge. One bounded UTF-8 file per commit, existing text/path limits, no automatic source persistence, no terminal/compiler/academic submission or broad file management. Branch deletion is not added. Preview file/branch/command limits remain bounded and can require a local client for unusually large comparisons.

The implementation is an isolated candidate. The separate Student/Instructor panel continuation has not been merged into it. The authorized local checkpoint includes this extension and the previously approved dirty editor/help refinements. Push, integration into a deployment branch and public deployment are not performed.

Manual entry: http://127.0.0.1:5213/student-login. Use the private Maintainer account for all actions including main; use Developer for feature targets/protected-main denial. See the owner handoff for the current direct editor URL and credentials-file location.
