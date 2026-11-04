# Released Practice Mode and workflow hardening

Historical checkpoint: practice status and proposed policy below are superseded by [ACTIVITY_PRACTICE_VERIFICATION.md](ACTIVITY_PRACTICE_VERIFICATION.md) and the final 2026-11-04 product decision. Earlier independent-fix evidence remains valid.

2026-11-04, Asia/Manila.

STATUS: PARTIAL. Confirmed independent workflow defects are fixed and tested.
Post-release Practice Mode is not implemented or enabled: the work order requires
Product Owner approval when the unlocking-attempt policy is unspecified. Two
policy questions were sent during the work; no answer was received before this
handoff. Absence of a Practice action must not be described as a passing release
gate implementation.

## Branch and preservation

- New isolated branch: feature/released-practice-mode.
- Parent: fc2b5fa01b6ff547832a644a49c2aa8398047574, the reviewed integrity fixes.
- Remote default main was checked live: 5158280de5f7036e7371bf7fa1a31c5e68cf6385.
- Prior integrity worktree and all other branches/worktrees are retained. No
  reset, rebase, force push, merge, tag change or remote push was performed.
- No Azure operation or running demo application/configuration change was made.
  Only new audit resources were used. Normal student records remain untouched.
- Backend dependencies were copied at existing locked versions into this new
  worktree so future Prisma generation cannot alter prior/demo dependencies.
  No dependency, lockfile, schema or migration source change was required here.

## Release representation and pending product decisions

The existing release transaction changes REVIEWED to RELEASED, snapshots the
final result and sets its releasedAt. Any written feedback is published in the
same transaction with feedback.releasedAt and releasedById. Saving an explicitly
empty review removes its draft feedback row. A subsequently released reviewed
submission with no feedback row therefore represents a deliberately published
result without written comments; instructors need not invent comments.

Queued, running, assessed and reviewed/draft states are not official release.
An inconsistent RELEASED submission with a draft feedback row must not expose
that draft or be used as evidence that its comments were published. A defensive
student-projection fix now enforces the feedback row's release timestamp.

The existing LATEST/HIGHEST selection defines credited grades, not practice.
The new requirement explicitly says to obtain approval before implementing a
missing unlocking-attempt policy. The proposed decisions are:

1. **Recommended: each fully released graded attempt unlocks its own practice.**
   A branch such as practice/<submission UUID> is seeded from that immutable
   attempt. A newer queued/reviewed attempt does not relock an older released
   attempt's practice. Released replacements participate by their own identity.
   LATEST/HIGHEST grading and official attempt eligibility remain unchanged.
   Alternative: only the currently credited released attempt unlocks practice;
   this also needs a rule for existing practice when the credited result changes.
2. **Recommended first scope: graded attempts only.** Completion/Ungraded results
   have no numeric score, so the literal score-release requirement does not define
   their eligibility. Alternative: explicitly include their published completion
   result plus released feedback as the equivalent release gate.

Neither recommendation has been silently adopted. Current ordinary Git editing,
official submission and pre-deadline Run Code/Visible Tests remain available under
their existing rules; those transient PracticeExecution records are not the new
post-release Practice Mode.

After approval, the implementation still needs worker-owned create/reuse of the
practice branch, a safe initialization/recovery receipt, exact branch-scoped
receive policy, a separate post-deadline execution context, archival/revocation
fencing and the single Continue Practicing action. Do not merely enable a client
flag or broaden the existing boolean Git write permission. The main/ordinary
feature cutoff must remain intact, with no automatic merge into official work.

## Confirmed defects and fixes

| Priority | Reproduction | Correction |
| --- | --- | --- |
| P1 | Two simultaneous identical idempotency requests produced a Prisma serialization error instead of the same attempt | Retry only known rolled-back P2034 transactions, at most three total transactions, with the identical intent; repeat authoritative checks; return safe SUBMISSION_BUSY if contention persists |
| P1 | Timeouts/upstream failures discarded the original submission/checkpoint key and source intent | Retain exact intent for uncertain outcomes; use the existing history/exact-retry flow; known execution-disabled rejection remains a normal rejection |
| P1 | A delayed Git read changed source underneath an open Submit confirmation | Track source at confirmation opening; block confirmation if it changed; Cancel returns to the updated draft for review |
| P1 defensive visibility | Deliberately inconsistent isolated RELEASED result plus unreleased feedback row exposed draft text | Student feedback now additionally requires its own release timestamp; normal atomic release and instructor access are unchanged |
| P2 | Blank-only source consumed an attempt; lone Unicode surrogates reached Prisma | Reject before persistence; valid source remains byte-for-byte unchanged |

All reported failures were reproduced before correction. The feedback inconsistency
was constructed in disposable test records, not discovered in a live account.
Unknown database/connection errors are not automatically replayed because their
commit outcome may be uncertain. The browser retains the original intent for an
explicit idempotent retry instead.

Backend permission changes: **none**. No post-deadline exception, new credential
scope, practice endpoint, Git namespace reservation or release gate was enabled.
The corrected feedback projection narrows visibility; the normal release and
attempt/ownership/membership checks remain authoritative.

## Scenario matrix

PASS means a relevant automated assertion actually ran. Frontend component/browser
fixtures and real PostgreSQL/Git/Java tests are distinguished below. UNSUPPORTED
means absent or not verified in this pass; it must not be treated as PASS.

| Scenario | Expected / actual backend | Frontend and recovery evidence | Result |
| --- | --- | --- | --- |
| Ordinary explicit submission | One immutable source/test snapshot and job | Existing explicit confirmation retained | PASS |
| Empty/blank source | Reject without consuming allowance | Blank Submit remains disabled; safe source guidance | PASS |
| Malformed Unicode / oversized UTF-8 source | Safe 400/413 before creating an attempt | UTF-8 file import remains strict; no source rewrite | PASS |
| Invalid Java / merge markers outside comments | Accept source as an attempt; javac reports student error | Submitted text is preserved, not hidden or repaired | PASS |
| Comments, Javadoc, text blocks, strings, tabs, Unicode | Exact snapshot/hash and Instructor source | Existing import/editor tests and real javac fixtures | PASS |
| CRLF / LF / missing final newline | Git/API snapshots preserve input; import's existing LF normalization remains explicit | No new normalization added | PASS |
| Large valid source under 100,000-byte budget | Stored and compiled successfully | Existing editor size limit retained | PASS |
| Partial visible/hidden assessment | Original outcomes preserved; student sees only visible evidence | Existing safe result projections | PASS |
| Exact deadline / after cutoff / CLOSED | Submission/ordinary Git writes reject as specified | Authoritative attempt-state gates remain | PASS |
| Simultaneous identical requests | Same idempotency result; one attempt/job | Pending controls and exact retry retained | PASS |
| Two tabs with distinct intents | One or two attempts according to configured allowance; excess gets business rejection | No new attempt inferred from Git save | PASS |
| Submission while source load completes | Request source cannot silently change during confirmation | New warning and Cancel/review path tested at desktop and 390px | PASS |
| Timeout, disconnect or upstream error | Do not assume failure means no commit | Exact original key/source survive editor changes and explicit retry | PASS |
| Two simultaneous replacement claims | One linked replacement, correct attempt numbers | Backend-only replacement eligibility remains required | PASS |
| Maximum attempts / membership removed / execution unavailable | Existing eligibility rules reject | No client-inferred eligibility from history | PASS |
| Save to Git pending / concurrent native push | Checkpoint stays separate; stale ref mutation conflicts | Prior source/draft-preservation regressions rerun | PASS |
| Git push during queued/running/assessed/reviewed/released attempt | Git updates do not alter academic evidence, grades or feedback | File projection and immutable Instructor detail tested separately | PASS |
| Clone/fetch/pull/branch push and protected refs | Real authorized operations; unauthorized/scope/revocation violations rejected | Existing Code/credential flow not changed | PASS |
| Group review and deadline freezes | WORKING/CHANGES_REQUESTED before cutoff; review/approval/archive reject writes | Existing Group Git regressions rerun | PASS |
| Instructor draft/edit/clear/multiline/code-like feedback | Draft withheld; source never receives feedback text | Existing Instructor view tests plus real release tests | PASS |
| Empty comments on release | Published result with no feedback row | No mandatory invented comment | PASS |
| Double/stale release or stale review | Existing version checks reject; released evidence remains unchanged | Existing safe review/version recovery tests | PASS |
| Original score corrections and diagnostic reruns | Original snapshots/evidence retained; corrections append-only | Existing rerun/review checks remain | PASS |
| Sessions/auth/CSRF/cross-user access | Real authenticated Student/Instructor API tests enforce boundaries | Existing error mapping never reflects raw server details | PASS |
| Java interactive stdin and console lifecycle | Existing console state/ownership/sequence protections exercised in API tests | Interactive UI regression retained | PASS |
| Worker receipt recovery / crashes / ref races | Existing Git recovery and CAS assertions rerun | No new automatic merge or overwrite | PASS |
| Inline source annotations | No implemented inline-annotation module found in this submission contract | Ordinary textual feedback only | UNSUPPORTED |
| Full browser reload/login-expiry draft restoration | Drafts remain memory-only; no new browser-source persistence policy introduced | Do not promise unsaved code survives reload/logout | UNSUPPORTED |
| Forced mid-transaction instructor setting/membership change | Existing locking inspected; no new deterministic fault-injection test for every ordering | No claim of exhaustive interleaving coverage | UNSUPPORTED |
| Every arbitrary delayed/out-of-order response across routes | Tested Git-load/confirmation and existing source cases, not every request/navigation ordering | Further route-generation audit remains | UNSUPPORTED |
| Post-release Continue Practicing / practice branch / post-deadline execution | Pending unlocking-attempt and Ungraded policy decisions | No action or permissions exposed | UNSUPPORTED |
| Practice eligibility cases 1–7 (no attempt through full release) | Release representations inspected/tested, but no new practice authorization exists | Absence of the feature is not release-gate verification | UNSUPPORTED |
| Practice cases 8–15 (push, archival, revocation, concurrent sessions, protected refs) | Require the approved implementation and dedicated negative tests | No workaround or public/demo change | UNSUPPORTED |

## Verification and evidence

All SQL tests target the new PostgreSQL 18/practice_audit cluster on loopback port
55494, database exactly projex_test, with a separate non-superuser role. Existing
30 committed migrations were deployed to this new empty database only; there are
no new migration files. Test configuration/credentials are private, ACL restricted
and ignored. Sentinel-owned Git run directories are separate from source and all
demo repositories. Test cleanup touched only those disposable fixtures.

| Executed check | Result |
| --- | --- |
| Student/Instructor view and safe API-error tests | 115 passed, 3 files |
| Affected backend unit/security tests | 45 passed, 9 files |
| Real PostgreSQL/API submission, review, console, checkpoint, project and credential suites | 71 passed, 9 files |
| Real Git Smart HTTP, including new source round trips | 19 passed |
| Complete real Git provisioning/content/browser commit/ref regressions | 48 passed |
| New real javac/Java source variation cases | 10 passed; 7 nonselected Java cases not run in this command |
| Backend type-check, integration type-check, lint, build | Passed |
| Frontend lint/build | Passed; existing bundle-size warning |
| Desktop / 390px browser | Actual Student component with isolated fixtures: changed source disables confirmation; Cancel preserves the loaded source |
| Diff/security review | Passed; only the enumerated code/tests/docs staged; private resources remain ignored |

This is not a claim that a full post-release Practice flow was tested or that the
browser fixture talks to the SQL/Java worker. Real database/API role flows, real
Git transport and real compilation are separate executed suites. No success is
claimed based only on mocked responses, flags or a UI label.

## Changed code and readiness

Production: submission.service.ts (input and feedback boundary),
submission.schemas.ts (valid source), submission.repository.ts (bounded known
rollback retry), shared/source-text.ts, StudentSubmissionViews.jsx (confirmation
and uncertain intent), api-client.js (allowlisted recovery copy).
Related tests cover the reproduced failures, exact source variations, Git round
trips and safe messages; the owning submissions contract records these fixes.
No CSS, dependencies, schema, release process, official grading policy, Git
authorization or deployment files changed.

The hardening subset is suitable for review after final checks. The complete
Practice Mode work order is **not ready for integration**. Approve the two
specific policy choices, then implement and test the actual branch/worker/receive
and execution boundaries, including release/archive races, before review.
Push, merge and deployment remain unapproved.

Two predecessor risks remain open: the historical localhost conflict-marker
incident has not been attributed to a specific attempt/source record, and native
Smart HTTP authority is still a request-admission snapshot rather than an atomic
fence against a lifecycle change during an upload. The new Practice exception
must address its final-publication boundary before it can be accepted. See the
preserved SUBMISSION_GIT_LIFECYCLE_AUDIT.md; no resolution of either issue is
claimed by this hardening commit.

## Manual acceptance after building an isolated instance of this branch

These fixes are not installed in the existing localhost/Azure demo.

1. Student: import/edit Java with comments and Unicode; run visible tests and
   submit. Instructor: open that attempt and confirm the saved source is exact
   (file import retains its existing documented LF normalization).
2. With one allowed attempt, submit simultaneously from two tabs. Confirm only
   one attempt exists and the other request gives a safe allowance message.
3. Simulate a timeout/connection failure during Submit. Change the editor, then
   use Retry exact original request. Confirm the retry keeps the original source
   and does not consume an additional attempt for the same intent.
4. With a delayed Git source response, open Submit before it completes. Confirm
   a later source change blocks confirmation; Cancel, review, then submit anew.
5. Instructor: save multiline draft feedback and verify the Student cannot see
   it. Clear comments and release; confirm the score is published without a
   requirement to fabricate feedback. Repeat with written feedback on another
   disposable attempt and verify both publish together.
6. Push newer Main.java after a release while the Activity is still open. Confirm
   repository content changes but that released source, score and comments do not.
   After cutoff, verify ordinary main/feature pushes are rejected.
7. Confirm another Student cannot read/write that repository or submission, and
   Instructor Git access remains read-only. Never use production student records.
8. Do not accept Practice Mode yet: Continue Practicing, practice-only cutoff
   exceptions and their negative tests remain pending the two product decisions.
