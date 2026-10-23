# Projex Codex Handoff

## Current milestone — macOS Gate B execution

The Product Owner approved full integrated verification on October 20, 2026,
using the exact isolated macOS resource plan. The approved compatibility
checkpoint is `a6ef2427a7e27183977c9b66ff6ce14b988bf6f7` on
`codex/mvp-gate-b-macos`, parent `5da3ef767fa29a0c01294788ee941dc885bc0fbc`.
No further staging/commit/push/merge is authorized. Git owns live status.

The [self-contained Gate B report](MVP_INTEGRATION_GATE_B_REPORT.md) owns current
A–Q evidence, exact resources, remaining browser limitations and next boundaries.
New private root `/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7` exists;
do not initialize it again. Its PostgreSQL system ID is `7698462431321079325`,
loopback port 55483. The separate test/review owners cannot connect to one
another's DBs. Both new databases have the 24 committed migrations with matching
checksums. The original checkout/database/storage remains preserved and port
5432 was never connected to or targeted.

Fresh real Mac serial suites passed: PostgreSQL 114, Java 26, native Git 11,
Smart HTTP 12. Fresh server unit 333 and client unit 488 passed, with lint/type
checks/build as detailed in the report. Windows numbers remain historical;
Windows execution was not repeated. Bounded unstaged defects cover raw-query
serialization retries, platform-aware native Git fixtures, POSIX hook file
permissions, multi-row Audit mapping and unsaved workspace route/history loss.
Security, academic submission and Group rules remain unchanged.

Actual browser Admin provisioned the Instructor; Instructor created a Class,
invited staff and created an Activity; Student joined by code, ran real Java/stdin
and visible tests, saved a Git checkpoint and made one assessed submission.
Instructor saved feedback. Native Git on the browser repository preserved the
single immutable academic attempt despite different Git HEAD. Separate API/native
Group capacity/roles/protected-main/freeze/fetch and Activity review/release proof
passed, but is not a substitute for remaining browser observations.

A native result-release confirmation currently blocks the in-app browser;
the dialog API cannot reach it and human OK was requested. Do not replay the
release or earlier consequential actions blindly. Publishing showed a real
prompt and one browser-origin success, but the user's cancellation report and
observed Published state conflict; cancellation remains unverified. Continue
from actual UI after the prompt closes. Full Group UI, released Student feedback,
unsaved-code browser retest, populated Admin follow-ups and wide/mobile remain
pending. No final MVP acceptance is claimed. Keep the loopback review services
and private evidence for inspection; the report gives safe credential access.

## Historical Gate A integration

The October 19 Gate A reconciliation ran on `codex/mvp-integration-readiness`.

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

The current full Gate B work order authorizes only the exact new resources,
24 existing migrations, serial suites, fictional fixtures, browser verification
and bounded integration fixes in [the resource plan](MVP_INTEGRATION_GATE_B_PLAN.md).
Existing resources now belong to this task; reattest them rather than assuming
an absent root. Review data must never be a destructive-suite target.

Continuation of pending browser verification needs no renewed scope approval.
Native prompts may require human UI assistance. Local staging/commit of the
resulting fixes requires separate repository-policy approval after review.
No push, merge, original database/storage change, recovery/reseed, new feature/
schema, deployment/public exposure or whole-root/cluster teardown is authorized.
The older Windows instructions are historical and grant no additional authority.

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

Mac PostgreSQL/cookie/CSRF, Java, native Git and Smart HTTP suites now pass.
The remaining actual-browser requirements and limitations are itemized in the
Gate B report; API/native checks and historical screenshots cannot satisfy them.
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
