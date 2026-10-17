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
2. Group Repository MVP — next
3. Admin Architecture MVP
4. MVP Integration / Hardening
5. Adviser Review / Approval
6. Portable Docker demo package
7. Release / Submission freeze
8. Azure online deployment after MVP approval
9. Post-MVP Projex IDE / richer functionality

## Next major task

Group Repository MVP architecture/audit.

Before implementation, inspect existing `CLASS_PROJECT`, `CLASS_WORKSPACE`,
team, membership, and repository authorization functionality. Reuse existing
work where possible. Architecture/audit does not authorize implementation.

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
