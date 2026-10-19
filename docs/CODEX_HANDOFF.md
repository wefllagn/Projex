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

Latest authorized pass (2026-10-19): Admin UI/UX simplification is implemented,
pending Product Owner review. See [A–R review report](ADMIN_UI_SIMPLIFICATION_REVIEW.md)
and [permanent Admin UI guidance](design/ADMIN_UI_DESIGN_SYSTEM.md). Admin branch
remains `codex/julius-overnight-admin-mvp` at `c6b50ab`, with prior provisioning
and this pass unstaged/uncommitted. No Group/Activity implementation, backend
contract, schema/migration, normal database or persisted environment changes.

Latest checks supersede the counts below: client 57 files / 377 tests; server unit
42 / 298; both lint/builds, server type-check and integration type-check pass.
Existing frontend bundle warning remains. No database suite was run in this UX
pass. All seven screens inspected at 1366×768, 1920×1080 and 390×844; no page
horizontal overflow, exclusive selected navigation, contained mobile table scroll.
Private screenshots remain outside Git. Event-driven stale focus refresh replaces
routine landing-page Refresh; form/dialog state and deliberate writes are protected.
No commit, push, merge, reset or Product Owner final approval has occurred.

Current work order (2026-10-19): Admin and Instructor Class Provisioning MVP is
implemented and verified, pending Product Owner review on the existing
codex/julius-overnight-admin-mvp worktree at c6b50ab. Current changes remain
unstaged/uncommitted; prior overnight work and installed skills preserved.
See [current report](ADMIN_CLASS_PROVISIONING_MVP_REPORT.md) and
[approved decisions](ADMIN_CLASS_PROVISIONING_MVP_DECISIONS.md).

Instructor self-service and exceptional Admin creation use standardized term/year
without mandatory Course selection or Admin approval. Internal catalog/official
constraints, Primary/Co-Instructor rules, account/Class oversight and generated
Student join codes remain. No schema, migration or authority expansion.

Latest checks: client 55 files / 359 tests; server unit 42 / 298; serial PG 23 / 110;
both lint/builds and server type checks pass. Browser verified creation/join/Admin
support flows at desktop/mobile sizes. Existing bundle warning remains.
PG tests use a NEW exclusive temporary cluster on loopback port 54873, NOT the
original shared projex_test. Review UI/API use 5190/3317 and a separate fresh
review database there; temporary accounts/credential file explicitly approved.
No saved environment, normal database, frozen Activity or Group implementation
change. Never infer safe cleanup from the database name alone.

Group is paused for acceptance with its 23 tracked modifications/128 untracked
files preserved, not represented solely by 9203a2c. See
[preservation checklist](GROUP_PRESERVATION_CHECKLIST.md). Browser editing and
missing-demo recovery remain deferred. Do not reconstruct records or touch Git
storage; no Group merge/copy into Admin. Historical checkpoint text below is not
permission to resume old work or target the original demo database.

### Prior overnight checkpoint (historical)

Activity Workflow MVP — COMPLETE / APPROVED FOR BASELINE

Overnight continuation: Group is **IMPLEMENTED — PENDING PRODUCT OWNER REVIEW**
at local `9203a2c827e8f68e07e920a8a246d34b6d33af42` on
`work/julius-overnight-group-mvp` (795 passing tests and desktop/390 verification).
Its detailed report and decisions are on that branch, not copied into this base.

Independent Admin audit/safe fixes are **VERIFIED — PENDING REVIEW** on
`codex/julius-overnight-admin-mvp`, based on approved Activity HEAD `42666278d7987018cdf24af3499d10e7b84c4e4b`.
No Group source was merged. See `ADMIN_MVP_AUDIT_AND_PLAN.md`,
`OVERNIGHT_AUTOPILOT_REPORT.md` and `MVP_INTEGRATION_PREPARATION.md`.
Admin implementation checkpoint: `0e755bd710b1572c5849239bc8e8c12d62b1789c`.
Final Admin checks: client full 353 plus final focused academic 8; guarded PG 109;
lint/build/integration types and desktop/390 checks. No normal DB changes.
Runnable review: Group `http://127.0.0.1:5174` (compiled API 3300 + Git worker),
Admin `http://localhost:5180` (API 3301), both disposable `projex_test`.
Private test-login manifests remain outside Git in the task artifact directory.
Stop demo APIs/workers before any future shared mutable test-database suite.

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
2. Group Repository MVP — implemented/verified, Product Owner review pending
3. Admin Architecture MVP — audit/safe fixes verified, product lock/review pending
4. MVP Integration / Hardening — stable-contract test/plan prepared; merge gate pending
5. Adviser Review / Approval
6. Portable Docker demo package
7. Release / Submission freeze
8. Azure online deployment after MVP approval
9. Post-MVP Projex IDE / richer functionality

## Next major task

Current next gate: review ADMIN_CLASS_PROVISIONING_MVP_REPORT.md and the preserved
Group handoff independently. No commit, push, integration, normal-data migration
or deployment is authorized. The following overnight instruction is historical:

Product Owner reviews independent Group and Admin checkpoints, locks remaining
Admin decisions and explicitly authorizes an integration target/SHAs before
combining them. The newer overnight order authorizes these local task checkpoints
and safe existing-scope work, not pushes, integration, schema/authority expansion,
normal-database changes, Docker/Azure or release. Both worktrees remain recoverable.

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
