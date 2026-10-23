# Demo database recovery issue

Status: OPEN — RECOVERY DEFERRED BY PRODUCT OWNER, 2026-10-19.
This issue records the earlier incident separately from Group MVP feature scope.
It is not authorization to restore, reconstruct, seed, migrate or clean a database.

## Incident and source evidence

During the Group search/edit continuation, the agent ran the official real-Git
regression runner against projex_test, then started the Smart HTTP runner. The
live demo also used projex_test. The agent failed to establish actual isolation.
Database-name validation did not prevent destructive cleanup of the live demo.

`server/tests/integration/database.ts::cleanIntegrationDatabase` deletes application
records across its target database, including users, sessions, classes, activities,
submissions, projects, teams, repository metadata, invitations and feedback. The
helper is appropriate only for truly disposable fixtures. Sequential execution
alone does not protect other consumers of the same database.

Real Git reported 2 files / 10 passing tests, but that result does not negate the
data-loss incident. Smart HTTP was interrupted after the issue was identified;
it has no passing result. No further mutable database suite was run afterwards.

## Last confirmed state

- Demo login failed; read-only checks found the original demo account and
  repository database record absent.
- Existing demo Git storage and the original bare repository remained present.
  Read-only Git inspection found main at the last user-observed e9f3cdfc prefix.
  The original stored Git source was not changed or printed.
- The normal development database was not targeted by these test runners.
- Other demo records sharing projex_test may also be missing. Unchanged Activity
  and Admin implementation/worktrees do NOT prove their demo data was unaffected.
- No full backup was established by the investigation. Preserved Git alone cannot
  recover deleted feedback, submission records, account state or academic history.
- No restore, metadata reconstruction, reseed or storage replacement was performed.
  The 2026-10-19 handoff closure is documentation-only; these observations are not
  a new database/storage inspection or a recovery-success claim.

## Current containment

Preserve existing Git storage in place. Do not rerun seeds against it, overwrite
bare repositories or reconnect guessed identities. Do not run database-cleaning
suites while live/demo consumers share the target. No persistent environment,
credentials or database configuration were changed by this closure.

Missing demo records currently prevent the latest search-popover desktop/mobile
walkthrough. This is a data availability issue, not evidence that the UI checks
passed or that the preserved repository is currently accessible through the app.

## Deferred recovery work order

When separately authorized, first inventory available backups and establish
disposable test/database/storage separation from every running demo consumer.
Choose verified backup restoration or explicit metadata reconstruction only with
Product Owner approval; reconstruction must disclose what history is unrecoverable.
Validate ownership, Class/Team/Repository relationships, Git linkage and review
state without guessing permissions or overwriting preserved commits. Any data-loss
acceptance, migration or persistent environment change remains a separate gate.

Before future mutable suites, verify the resolved database target and its exclusive
disposable use, inspect cleanup scope, and check storage-root separation. Do not
rely only on a name allowlist or on tests being serial. Implementation of stronger
test isolation is follow-up work, not claimed complete by this document.

Related evidence: [historical incident report](design/GROUP_SEARCH_EDIT_REVIEW_REPORT.md),
[current Group handoff](design/GROUP_REPOSITORY_FINAL_HANDOFF.md).
