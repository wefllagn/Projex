# Projex Codex Handoff

## Current milestone — isolated MVP integration Gate A

Product Owner authorization: 2026-10-19, Gate A only. Branch:
`codex/mvp-integration-readiness`, in its dedicated managed worktree.
Current HEAD/status are owned by Git, not the historical handoff excerpts below.

Approved pinned inputs, integrated in this order:

| Input | Commit |
| --- | --- |
| Starting origin/development/fullstack | 25235b113cc856678221dbbbe3d7cb5a25e22e6d |
| Activity | 42666278d7987018cdf24af3499d10e7b84c4e4b |
| Group Repository | 3105cbb517db055996532f2658a6a886124abd27 |
| Admin / Instructor Class Provisioning | 332e6b548ab087d2424497ce6ec27cf666fcc718 |

Activity and Group were merged locally with exact pinned tree identity.
The Admin merge combines both milestones rather than replacing shared files
wholesale. See [Gate A report](MVP_INTEGRATION_GATE_A_REPORT.md) for the merge
parents, actual conflicts, resolution details and executed verification.

## Current authority and next gate

Gate A permits this isolated local reconciliation, related fixes, safe unit/
component checks, lint, type checks, builds and reviewed local checkpoints.
It does NOT permit push, merge to development/fullstack or main, original
worktree/branch changes, destructive database suites, migrations, database
recovery, deployment or feature expansion.

Gate B is separate. [The exact resource and safety proposal](MVP_INTEGRATION_GATE_B_PLAN.md)
requires approval before any cluster/database/fixture creation, migration or
database-dependent suite. No such operation occurred in Gate A. New disposable
test resources must be exclusive and separate from review fixtures and all
original databases/Git storage. A test database name alone is not isolation.

The older report instructions to stop demo APIs, reuse projex_test or recreate
fixtures are HISTORICAL, not current authority. Do not act on those instructions.

## Preserved product contracts

- Activity Workspace remains the approved constrained academic coding environment.
- Run Code uses current browser source and Student stdin.
- Run Visible Tests uses Instructor-defined tests.
- Save to Git is a repository checkpoint, not a submission or consumed attempt.
- Submit is an immutable browser-source academic attempt, never repository HEAD.
- Existing Activity native Git, attempt/deadline/acceptance locks and academic
  review/released-feedback behavior remain unchanged. No terminal or full IDE.
- Group uses native clone/commit/push, protected main, Developer feature branches,
  current membership/roles, pending-capacity accounting and academic review freeze.
- Group source reads remain authorized, immutable-snapshot based and recoverable
  inside repository context. Git author metadata is not verified Projex identity.
- Instructor self-service and exceptional Admin Class creation use required
  standardized term/year fields, with no mandatory Course or approval workflow.
- Admin retains account/Class oversight, last-Admin/session protections, safe
  metadata, eligible recovery controls and authorized Audit evidence. No new
  private Git, credential issuance, hidden-test or grading authority.
- Shared UI-owned errors preserve backend diagnostic contracts. Admin validation,
  cooldown and rate-limit guidance coexist with Group temporary-read recovery.

## Explicit deferrals and remaining proof

Browser editing of Group .java/.md, proposed schema/jobs/write endpoints, Add File,
PRs, browser merges, full IDE, broader redesign and deployment remain deferred.
Preserve [the browser-editing proposal](architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md),
including unresolved queued-source retention, job expiry and ambiguous recovery.

Missing original demo metadata recovery is separately deferred. Preserve existing
Git in place. [The recovery issue](DEMO_DATABASE_RECOVERY_ISSUE.md) records the
destructive shared-test-data incident; native Git alone cannot recover DB history.
Do not restore, reconstruct, reseed or overwrite original storage.

Combined real PostgreSQL/cookie/CSRF, Java, Git/Smart HTTP and role/viewport proof
remain Gate B work. Group's latest interrupted Smart HTTP and current search-
popover 1366/wide/390px walkthrough are not passing results. Independent historical
matrices and older screenshots are not combined verification or final acceptance.
Existing frontend bundle-size warnings remain outside this integration's scope.

## Historical milestone evidence — not live worktree status

- Activity implementation ancestor: 4030e86f7fe6a1fb336c9e73184c6dfcc00ee33f;
  the authoritative approved handoff ref is pinned above. Its historical 783-test
  matrix is not counted as a new Gate A run.
- Group: [decisions](GROUP_REPOSITORY_MVP_DECISIONS.md),
  [checklist](GROUP_REPOSITORY_MVP_CHECKLIST.md),
  [review handoff](design/GROUP_REPOSITORY_FINAL_HANDOFF.md),
  [implementation report](GROUP_REPOSITORY_MVP_IMPLEMENTATION_REPORT.md).
- Admin: [decisions](ADMIN_CLASS_PROVISIONING_MVP_DECISIONS.md),
  [provisioning report](ADMIN_CLASS_PROVISIONING_MVP_REPORT.md),
  [compact UI report](ADMIN_UI_SIMPLIFICATION_REVIEW.md).
- [Overnight evidence](OVERNIGHT_AUTOPILOT_REPORT.md) preserves both branches'
  historical accounts with their original counts; neither grants new authority.
- [Original integration preparation](MVP_INTEGRATION_PREPARATION.md) is annotated
  with the actual overlap and superseding Gate A direction.

Original Group/Admin checkpoints, their excluded previews/skills, the launch
checkout and Activity ref must remain unchanged. Inspect actual Git state and
owning architecture/tests; do not revive old autonomous work orders or infer
broader permission from historical documents.
