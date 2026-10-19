# Projex Codex Handoff

## Current approved baseline

Branch: `iteration-2/julius-activity-mvp`

Activity MVP commit: `4030e86f7fe6a1fb336c9e73184c6dfcc00ee33f`

The baseline preserves the approved Activity implementation from detached base
`f962cace33dcdf49b565b79e218a3554150a7676`. Aaron's newer `a0907b4` I2.6
backup/restore commit was intentionally not integrated.

The approved implementation passed 783 tests across client, server,
PostgreSQL integration, Java, Git, and Smart HTTP suites, plus lint, type
checks, builds, and desktop/390px browser verification. Database verification
used `projex_test`; no normal-development database migration was applied.
Runtime credentials, environment files, and test storage are not in Git.

## Current milestone

Current disposition — 2026-10-19: Group Repository handoff prepared for review on
`work/julius-overnight-group-mvp`, HEAD `9203a2c`; cumulative UI/search/error work
remains unstaged and uncommitted. See the
[current review handoff](design/GROUP_REPOSITORY_FINAL_HANDOFF.md).

The Product Owner deferred browser .java/.md editing to a later milestone;
native Git clone/commit/push is sufficient for Group Repository MVP. Preserve the
[proposal](architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md) and its
unresolved source-retention, expiry and ambiguous-recovery decisions. No proposed
schema, job system or browser write endpoint is implemented or authorized now.

Demo database recovery is separately DEFERRED BY PRODUCT OWNER. The earlier test
cleanup removed demo metadata from projex_test; original Git storage and last
observed main e9f3cdfc remain preserved. Do not restore, reconstruct, reseed or
overwrite storage. See the [separate recovery issue](DEMO_DATABASE_RECOVERY_ISSUE.md).
Do not run mutable DB suites until actual live-demo/test isolation is verified.

Last executed checks: client 62/433 and server unit 42/287 pass; lint/types/build
pass; real Git 2/10 passed WITH the destructive cleanup incident. Smart HTTP was
interrupted, not passed. Current search-popover desktop/mobile walkthrough remains
unverified because demo login is unavailable. Documentation-only closure does not
rerun or replace those checks. This is not final UI acceptance or merge readiness.
No normal DB migration, commit/push/merge, production backend or Activity/Admin
implementation change in this closure.

### Prior recovery checkpoint (historical)

Latest continuation: **Group file recovery + permanent error standard**, including
attached Group content hierarchy requirements. See
[report](design/PROJEX_ERROR_RECOVERY_IMPLEMENTATION_REPORT.md) and
[standard](design/PROJEX_ERROR_AND_RECOVERY_STANDARD.md).
Actual filename search is separate from exact paths; local Retry/Back to folder
preserve repository context. Shared feedback hides diagnostic IDs/raw messages;
backend diagnostics unchanged. AGENTS rule and scoped adoption roadmap added.
Client 61/426, lint/build; server isolated diagnostics 1/2, type-check/lint pass.
Transient Group refresh failures retain loaded context/input; confirmed access
denial still hides content. Intermittent service failure root cause not addressed.
Existing bundle warning remains. No production backend, Activity/Admin, migration,
Git/review mutation, commit/push/merge. Browser editing remains deferred.

### Prior interaction checkpoint (historical)

Latest continuation: **Group interaction polish** follows the newer seven-image
feedback: Code dropdown spacing/chevron/viewport containment, transient cursor
copy feedback, actual clickable latest-commit preview, commit total moved into
that summary row, one Enter-to-open file-path field, truthful Add file WIP dialog,
and Group-scoped friendly 404/5xx recovery. See
[interaction report](design/PROJEX_GROUP_INTERACTION_POLISH_REPORT.md).
Client 60/403, lint and build pass; existing bundle warning remains. No production
backend/schema, Activity/Admin, migration, commit/push/merge or final UI approval.
The prior report's Add File omission/toolbar placement is superseded by this
explicit follow-up; it is a preview only, not a new file-write API.

### Prior GitHub-familiar checkpoint (historical)

Latest continuation: **GitHub-familiar Group UI refinement** on the same dirty
Group worktree/branch, HEAD `9203a2c`. See
[A–Q refinement report](design/PROJEX_GITHUB_FAMILIAR_UI_REPORT.md).
One Code toolbar, exact selected-branch history total, URL-backed tab/branch,
contextual commit details, compact activity and Project Detail cleanup are
implemented. Final executed matrix: client 58/391, server unit 41/285; both lint
and builds, server type checks and diff check pass. Integration/Java suites were
not rerun in this frontend-only production pass. No commit/push/merge/migration.
Product Owner visual review remains pending; Activity and Admin remain untouched.

### Prior refinement checkpoint (historical)

Latest continuation: **UX refinement and Design System v1**, implemented on the
same Group branch with the prior uncommitted work preserved. See
[current refinement report](design/PROJEX_UX_REFINEMENT_REPORT.md) and
[design system](design/PROJEX_DESIGN_SYSTEM.md).
Current executed matrix: client 57/383, server unit 41/285; lint, type checks
and build pass. Previous integration matrices below are historical, not rerun
in this frontend-only refinement. No commit/push/merge or final UI approval.
The new scope does not authorize Admin/Activity redesign or integration.

Latest work order: the 2026-10-18 **Group Repository final UX redesign**
supersedes the overnight continuation below for this worktree. Backend direction
is approved; the previous UI was not final-approved. Compact Group UX is now
implemented as uncommitted changes from `9203a2c` on
`work/julius-overnight-group-mvp`, pending Product Owner UI review.
See [redesign report](GROUP_REPOSITORY_UX_REDESIGN_REPORT.md) for the current
785-test verification matrix, desktop/390px walkthrough and limitations.
No Admin integration, frozen Activity changes, migration, commit, push or merge
was performed in this pass. Historical checkpoint counts below remain history.

Activity Workflow MVP — COMPLETE / APPROVED FOR BASELINE

Group Repository MVP is **IMPLEMENTED — PENDING PRODUCT OWNER REVIEW** on
`work/julius-overnight-group-mvp`, from approved Activity HEAD
`42666278d7987018cdf24af3499d10e7b84c4e4b`. This is a local review checkpoint,
not acceptance or integration. Final matrix: 795 passing tests across 121 files.
Product authority: [locked decisions](GROUP_REPOSITORY_MVP_DECISIONS.md).
Auditable slice/verification status: [checklist](GROUP_REPOSITORY_MVP_CHECKLIST.md).
Student-led group creation is approved; Instructor assignment is deferred.

## Activity behavior now locked

- Activity Workspace is a constrained academic coding environment.
- Run Code = Student-provided stdin debugging of current browser source.
- Run Visible Tests = Instructor-defined deterministic tests.
- Save to Git = repository checkpoint only; no submission or attempt consumed.
- Submit = official immutable browser-source academic attempt, not Git HEAD.
- Native clone/push works using the Activity Git repository.
- Activity repository summary reflects current Git history.
- No full terminal.
- No full multi-file Activity IDE.

## Current roadmap

1. Activity Workflow MVP — complete
2. Group Repository MVP — handoff prepared; review and recorded verification gaps remain
3. Admin and Instructor Class Provisioning MVP — next development milestone
4. MVP Integration / Hardening
5. Adviser Review / Approval
6. Portable Docker demo package
7. Release / Submission freeze
8. Azure online deployment after MVP approval
9. Post-MVP Projex IDE / richer functionality

## Next major task

The Product Owner's 2026-10-19 direction identifies the previously approved Admin
and Instructor Class Provisioning MVP as the next development milestone. This
Group closure does not start that implementation, merge the separate Admin
worktree, recover demo data or authorize schema changes. Begin the next task by
reconciling its actual worktree, owning architecture and approved provisioning
scope. Group browser editing is not a prerequisite. Review the current Group
handoff and its verification limitations without treating them as final acceptance.

### Historical overnight authority (superseded for this closure)

The 2026-10-18 overnight work order supersedes the earlier pre-commit stop:
local checkpoints on dedicated overnight branches are authorized. Continue the
Admin source/schema/route/auth/UI/test audit independently from approved Activity
HEAD, then implement only existing-scope safe improvements. Do not combine
unreviewed Group/Admin work. Record new authority/schema/ownership choices as
AWAITING PRODUCT OWNER APPROVAL and continue independent work.
See `OVERNIGHT_AUTOPILOT_REPORT.md` and `GROUP_REPOSITORY_MVP_IMPLEMENTATION_REPORT.md`.
No push, protected integration, normal-database mutation or deployment authorized.

## Do not touch unless explicitly requested

- Aaron I2.6 backup/restore work
- Docker/Azure deployment
- Full Projex IDE
- Interactive terminal/WebSocket console
- Activity Git provenance / commit-based submissions
- Automatic workspace provisioning
- Unrelated Admin redesign

## Multi-Codex coordination rule

Before modifying anything:

1. Run `git fetch --all --prune`.
2. Report the worktree path.
3. Report the branch.
4. Report HEAD.
5. Report `git status`.
6. Report the origin target-branch SHA.
7. Reconcile ahead/behind/diverged state.
8. Do not reset/rebase/merge automatically.

Fetching remote refs does not authorize integrating another branch. Preserve
uncommitted work, follow effective `AGENTS.md` and the current work order,
and use actual Git/source/schema evidence when historical status conflicts.
