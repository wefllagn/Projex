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
