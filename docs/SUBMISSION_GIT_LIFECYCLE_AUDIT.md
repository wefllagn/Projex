# Origin branch and submission/Git audit

2026-11-03, Asia/Manila. Local isolated verification; no deployment, live database
access, demo restart, merge, remote push, reset, or history rewrite.

## Reconciled baseline

Remote references were refreshed and independently checked with `ls-remote`.

| Identity | Revision | Evidence |
| --- | --- | --- |
| GitHub default `main` | `5158280de5f7036e7371bf7fa1a31c5e68cf6385` | Live remote HEAD points to main; release merge |
| Local `main` | `af819aa` | 69 commits behind remote main; preserved |
| Windows demo source | `2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff` | Clean native-app checkout and Windows handoff receipt |
| Remote development/fullstack | `813fd08c9a3c36efdeeb9796c6ee7304e2cd5207` | One unique merge on each side versus main; identical trees |
| Local development/fullstack | `75d11ec` | 68 commits behind its remote; preserved |
| Original workspace | `90d8c4a3864d2d9b8bc41ca9b1570c1f52d5b096` | iteration-2/julius-i2-1-academic-workspace; dirty; preserved |
| Azure | Not independently attested | Previously reported baseline 68881c8; no VM access in this audit |
| Linux compatibility branch | `68881c8fc31f804e1279187a5a26002039f5f77c` | Published fix/linux-git-runtime; separate from main |
| This fix branch | main plus this audit's commit | fix/submission-git-integrity; no deployment changes |

Main, the frozen demo, and remote fullstack share tree
`e4a178e5e348bf7dd5ccc3c5554999ca550c37b7`. The fullstack divergence is merge
topology, not missing implementation. Local historical task branches are already
ancestors of main except the Linux fix and the paused Smart HTTP branch. The
remote origin-landing-macos branch also has two unmerged commits, 234245b and
29891f9, on an older baseline; do not replace current source with that branch.

The original workspace retains four modified tracked files (README.md,
client/.env.example, docs/team/TEAM_DEVELOPMENT_WORKFLOW.md, server/README.md) and
three untracked status entries (docs/team/MACOS_LOCAL_SETUP.md, output/, tmp/).
Existing output resources were preserved; this audit adds only separate test
artifacts under output/.

| Retained worktree branch | HEAD on inspection | Dirty status entries |
| --- | --- | --- |
| iteration-2/julius-i2-1-academic-workspace | 90d8c4a | 7 |
| design/origin-application | 94861c7 | 0 |
| work/julius-overnight-group-mvp | 3105cbb | 2 |
| group-browser-editor-mvp | 10c6333 | 2 |
| julius-overnight-admin-mvp | 332e6b5 | 2 |
| fix/linux-git-runtime | 68881c8 | 0 |
| mvp-integration-readiness | 5da3ef7 | 0 |
| feature/isolated-git-smart-http | 68881c8 | 26 |
| integration/projex-mvp | 7cf12c6 | 0 |
| student-ui-ux-continuation | c99934d | 0 |

All ten existing worktrees remain. The eleventh is the isolated audit worktree.
No existing branch, worktree or uncommitted patch was discarded. The paused
Azure implementation was neither imported nor published.

Recommended workflow: branch from refreshed origin/main in a clean isolated
worktree, test and commit there, review a focused diff, then seek separate push,
integration and deployment approval. Keep environment files and runtime data
outside commits. Carry the Linux compatibility change separately when preparing
a future Linux build; main still rejects Linux Git by design at this revision.

## Conflict-marker trace and confirmed fixes

The user reported localhost, whose source matches main. No affected submission ID
or before/after source was available, and the live demo database was not started
or queried. Historical attribution remains unconfirmed.

A disposable native Git merge reproduces the symptom: conflicting Main.java
edits create `<<<<<<< HEAD` in the student's working tree. If the student stages
and commits that content, the authenticated push accepts those bytes. Repository
inspection, explicit source submission, the immutable PostgreSQL snapshot and the
Instructor projection all return the same bytes. A separate authenticated
HTTP/CSRF integration test verifies exact marker preservation in the submission
payload, database, worker input and Instructor response. Component tests verify
the viewer's exact pre.textContent for both clean source and literal markers.

No marker-insertion or automatic merge implementation was found in the inspected
transport/submission/viewer path. This reproduction identifies a possible
client-side origin, not proof about the reported historical attempt. Do not strip
markers or rewrite old submissions. To close that incident, compare the affected
attempt's saved source with its original payload and student commit, with the
owner's authorization, after the demo environment is available.

Two independently reproduced editor defects were fixed:

1. Focus refresh replaced the displayed repository summary. Save then used that
   newer HEAD as its expected base while still sending older browser code. A
   repeated Save after a conflict could do the same. The editor now retains its
   own base until explicit source loading or a successful checkpoint. An initially
   empty repository is handled distinctly from an unknown base.
2. Load latest checked the source captured before its asynchronous requests.
   Typing during those requests could be discarded without confirmation. It now
   checks the current source and activity key before replacement, and again after
   confirmation; changes made in the meantime remain untouched.

Three added regression cases failed before the fix and pass afterward. The
changes neither merge source nor alter submission persistence, scoring, schema,
credentials or authorization. No CSS/layout change was made.

## Programming Activity lifecycle

Expected behavior derives from SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md,
Git evaluateGitPermission, checkpoint worker policy and the existing submission
allocation transaction. All positive writes assume an active enrolled owner,
READY repository, active class, PUBLISHED activity and time before its deadline.

| Scenario | Expected behavior | Actual behavior | Result |
| --- | --- | --- | --- |
| Push before submission | Update Git only | Real clone/commit/push; no attempt or execution job | PASS |
| Explicit submission | Snapshot current request source | Source/hash and chronological attempt persisted independently | PASS |
| Push while queued | Keep existing attempt/job unchanged | Entire saved submission/evidence record unchanged | PASS |
| Push while assessment running | Worker retains submitted source | Claimed job uses original source; later push changes no snapshot | PASS |
| Push after assessment | Preserve original outcomes/score | Saved cases and automated score unchanged | PASS |
| Push during Instructor review | Preserve review data | REVIEWED draft feedback and points unchanged | PASS |
| Push after grade release | Preserve released attempt | Released source, 90-point result and feedback unchanged | PASS |
| Push after deadline | Reject writes, retain authorized reads | Existing WRITE credential rejected; fetch succeeds | PASS |
| Push while CLOSED | Reject writes, retain authorized reads | Rejected independently of deadline; fetch succeeds | PASS |
| Push after maximum attempts | Git can continue before cutoff | Push succeeds; new official attempt is rejected | PASS |
| Submit newer repository source | Explicit new attempt, if allowance remains | Attempt 2 snapshots newer source; Attempt 1 remains unchanged | PASS |
| Feature-branch push | Update selected branch only | Main HEAD and existing submissions unchanged | PASS |
| Insufficient authority | Reject credential/write request | Non-owner source access and Instructor writes rejected | PASS |
| Open/refresh editor after push | Preserve draft; deliberate load only | Background notice, repeated-save rejection, cancellation preserved | PASS |
| Native push races checkpoint | Reject stale checkpoint, no silent merge | Real competing HTTP push wins; original commit still readable | PASS |

There is no Activity-wide UNDER_REVIEW repository state. Instructor review belongs
to a particular immutable attempt. Max-attempt exhaustion and grade release do
not close the Git workspace; activity/class/repository lifecycle and deadline do.
Later pushes create repository PUSH events, not academic attempts or reassessment.
Submission APIs continue to enforce idempotency, chronological numbering, current
membership and attempt allowance transactionally.

## Group Project lifecycle

Expected behavior derives from PROJECT_REPOSITORY_COLLABORATION.md and
GIT_SMART_HTTP_TRANSPORT.md. Maintainer means the active team lead/repository owner;
Developer means an active synchronized team/repository MEMBER. Task and class
must be open and active for writes.

| Scenario | Expected behavior | Actual behavior | Result |
| --- | --- | --- | --- |
| WORKING | Maintainer main/features; Developer features | Real permitted pushes; Developer main rejected by receive hook | PASS |
| Submitted for review | Freeze all writes | READY_FOR_REVIEW rejects an existing WRITE credential | PASS |
| Under Instructor review | Same freeze | No separate UNDER_REVIEW enum; READY_FOR_REVIEW remains frozen | PASS |
| CHANGES_REQUESTED | Permit revisions before cutoff | Real feature push accepted after reasoned Instructor transition | PASS |
| Late requested revision | Reject after cutoff | Existing Developer credential rejected | PASS |
| APPROVED/finalized | Freeze all writes | Push rejected even with future deadline | PASS |
| Deadline / CLOSED | Read-only for authorized actors | Deadline real push rejected; CLOSED permission regression rejects writes | PASS |
| ARCHIVED | Preserve authorized reads, reject writes | Fetch succeeds; push rejected | PASS |
| Instructor / Admin | Instructor READ only; Admin no source | Real credentials/transport/inspection recheck role boundaries | PASS |
| Mixed feature/main push by Developer | Reject entire update | Receive hook rejects both refs atomically | PASS |

Approval may finish after cutoff; requesting changes/resubmitting may not.
Numeric Group project grading is not added. Group metadata review is a different
contract from an Activity's immutable source/assessment attempt.

## Safeguards and practical limits

- Submission source is stored independently; inspection and native pushes cannot
  update it, original per-test evidence, feedback or released results.
- Browser checkpoints and Group browser commits use existing revision checks;
  Group browser publication additionally retains its existing locked authority
  checks, atomic ref transactions and durable receipt recovery.
- Authentication, scope, expiry/revocation, membership and current lifecycle are
  rechecked for each Smart HTTP request. Receive hooks enforce protected refs,
  fast-forwards, allowed namespaces, branch collisions and bounded objects.
- A native receive hook gets a permission snapshot from request admission; it does
  not query PostgreSQL again during object reception. A lifecycle/deadline change
  during an already admitted upload is not proven atomic with ref publication.
  No stricter in-flight freeze policy or new hook/DB authority channel was invented.
  Before requiring strict freeze-at-publication, the Product Owner should choose
  whether to drain admitted requests or require serialized final authorization.
  That concurrency boundary needs a separate design/test; these PASS rows cover
  requests begun after the stated transition, not an in-flight transition race.
- No live Azure result is claimed. No real student code, grades or Git history was
  inspected or changed. The reported historical marker incident still needs its
  exact attempt/source comparison; the reproduction does not establish blame.

## Verification and changed files

Windows Node 24.18.0, Git 2.55.0.windows.3, existing Temurin Java 17.0.20.1.
Dedicated WSL PostgreSQL 18/submission_audit, loopback port 55493, database exactly
projex_test, separate non-superuser test owner. All 30 committed migrations were
applied to that fresh database only. Git storage uses sentinel-owned disposable
run children outside the source worktree and all demo storage. Private test
configuration is ACL restricted, ignored by Git, and not part of this commit.

| Check | Result |
| --- | --- |
| Student/Instructor views + submission adapters/projections | 70 passed |
| Affected backend units, including Group state matrix | 43 passed |
| Real Smart HTTP | 15 passed |
| PostgreSQL submission/API/checkpoint/repository/project/credential/review suites | 45 passed, 8 files |
| Real Java compile/evaluate, compiler rejection, interactive Scanner | 3 passed; 14 nonselected cases not run |
| Complete real-Git provisioning/content/browser/ref suite | 48 passed, 4 files |
| Backend type-check, integration type-check, lint, production build | Passed |
| Frontend lint and production build | Passed; existing large-chunk warning |
| Browser UI | Isolated fixture at desktop and 390px; stale save refused; Cancel preserves source |
| Diff/secret review | Passed; exact source/test/documentation paths staged; private resources ignored |

The broader Git suite initially failed because fresh Prisma-created job schedule
timestamps were 58–387 ms ahead of the WSL database clock. Tests assumed immediate
claiming. A test-only helper now marks only PENDING, never-claimed fixture jobs as
due. It never retries claimed jobs or changes authorization, expiry, receipt or
CAS expectations. Earlier test setup also lacked required safe mail/frontend
fields; these exist only in private test configuration. WSL was kept awake for
tests after initial migration connection failures. None of these changes alter
production configuration or the normal worker scheduler.

Production changes: client/src/submissions/StudentSubmissionViews.jsx only.
Tests: StudentSubmissionViews.test.jsx, InstructorSubmissionViews.test.jsx,
git-authorization.test.ts, git-smart-http.git.integration.test.ts,
submissions-api.integration.test.ts, the two Group browser Git tests and their
browser-worker-fixture.ts scheduling helper. Documentation: this report and the
owning submissions contract. No migrations, dependencies, lockfiles, backend
production files, CSS, deployment files or release tags changed.

Before integration: review the small editor diff and regression evidence, resolve
the historical incident if its exact source record is needed, and make the
in-flight lifecycle policy explicit if strict finalization fencing is required.
Push, merge into main/fullstack and deployment remain separate approval gates.
