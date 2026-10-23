# Group browser file commits — durable-write design gate

Status: DEFERRED BY PRODUCT OWNER — 2026-10-19.
Browser editing of Group .java/.md files belongs to a later milestone. Native Git
clone/commit/push is sufficient for Group Repository MVP. Preserve this proposal
as future design input, not an approved implementation contract. Do not implement
its schema, commit-job system or browser write endpoints. This deferral is not a
blocker to the next Admin and Instructor Class Provisioning MVP milestone and
does not authorize integrating branches or changing the frozen Activity system.

The proposal below records the prior design investigation. No browser editor or
Group write API was implemented, and its suggested policies remain unapproved.

## Actual source constraints

| Source | Evidence |
| --- | --- |
| prisma/schema.prisma, RepositoryCheckpointJob | Required Activity FK/student/activity idempotency scope; no selected branch, general file path contract or user commit message |
| git-activity-checkpoint-writer.ts | Allows only entry .java on main; permits creation/allow-empty; not a general existing-file writer |
| activity-workspace-checkpoint-worker.service.ts | Explicit ACTIVITY_WORKSPACE permission checks before preparation and push |
| repository-checkpoint-queue.ts | Claims only ACTIVITY_WORKSPACE; lease/claim/retry state; terminal raw-source clearing |
| git-authorization.ts | Group write requires active account/class/team/repository memberships, open deadline/project, writable review state; main additionally requires owner + Team lead |
| repository-content.routes.ts | Authenticated GET-only tree/file/history/diff; no Group write contract |
| repository.repository.ts recorded activity | Only trusted provisioning/PUSH projections currently exposed; unused COMMIT enum alone is not an authenticated browser-commit contract |

Using an Activity ID for a Group job, dropping its required relation, or merely
changing its repository-type guard would violate the frozen Activity contract.
An in-memory idempotency map/direct API-process file write would lose durable
recovery and reliable attribution after restart. Do neither.

## Recommended bounded extension for approval

1. Dedicated GroupFileCommitJob model/migration, separate from Activity jobs.
   Reuse the existing PostgreSQL queue/worker pattern and managed Git executable,
   locator, environment, timeout/output and storage limits. Do not migrate the
   normal development database; test migration only on guarded disposable data.
2. Persist actor/repository, existing branch, canonical existing file path,
   expected full HEAD, bounded source, required short commit subject, payload
   hash, scoped idempotency hash, claim/fencing token, candidate/result hash and
   timestamps. One active job per repository/branch; unique actor/repository/key.
   Key replay with different payload rejects. Source never appears in logs or
   status/list projections; clear terminal source as in Activity checkpoints.
   Pending-job expiry and bounded recovery must be specified/tested before merge.
3. POST/GET scoped Group file-commit jobs. Cookie auth + CSRF + validated
   idempotency header. Status read rechecks authorized scope. No arbitrary shell,
   Git argument, environment, executable, author, ref namespace or host path input.
4. Reuse evaluateGitPermission at enqueue, claim and immediately before ref
   update. Group-only STUDENT writes. Developer existing permitted feature refs
   only; protected main only owner + lead. Instructor/Co-Instructor/Admin read-only;
   removed/inactive/archived/deadline/Ready for Review/Approved states reject.
5. Existing regular .java/.md files only, original mode preserved; no create,
   upload, rename, delete, symlink/submodule or unsafe parent traversal. Canonical
   paths use existing normalization. Proposed maximum 256KiB UTF-8, consistent
   with current inspection; reject NUL/invalid encoding and malformed surrogates.
   Keep exact content/whitespace; restore a uniform original CRLF convention when
   textarea editing normalizes newlines. Mixed-ending handling must be explicit.
6. Worker creates one commit whose parent is exactly expected HEAD, without
   applying repository-controlled hooks/filters or executing source. Existing
   branch update must be atomic compare-and-swap on expected HEAD, never a force
   update, implicit branch creation or merge. Review/membership rechecked at the
   write boundary, not inferred from the Edit button.
7. Durable crash reconciliation is mandatory: Git and PostgreSQL cannot share a
   transaction. A persisted candidate identity/receipt and fenced claim must let
   retries detect an already accepted commit, including after later native pushes.
   Do not rely only on a tip trailer or blindly create a replacement commit after
   an ambiguous push. Unknown outcomes retain the draft and reconcile safely.
8. Server-derived local author identity (existing Student identity convention),
   separate authenticated actor audit, one real COMMIT event after acceptance.
   Do not label browser writes PUSH or count them as verified contribution grades.
   Extend safe activity projection explicitly without revealing private source.
9. Simple viewer/editor + Commit changes dialog only after the service is real.
   Memory-only draft/path/branch/original HEAD/message. Dirty cancellation and
   router/branch guards; no overwriting draft on background refresh. Failure or
   conflict retains text/message; retry uses the original idempotency key until
   the outcome is known. Successful commit refreshes history/tip/count/file in
   context and shows the real resulting commit. No compiler/terminal/IDE.

## Unresolved decisions retained for the future milestone

- Queued-source retention: decide how long pending/running source is retained,
  who can access it, terminal cleanup timing, and privacy/recovery guarantees.
  Terminal clearing suggested above is not an accepted retention policy.
- Job expiry: decide TTLs, lease/fencing interaction, expiry during recovery,
  user-visible outcomes and when retry/requeue is safe. No expiry value is approved.
- Ambiguous commit recovery: specify durable candidate/receipt evidence and
  reconciliation across Git/DB crash windows and later native pushes. Define
  what happens when acceptance cannot be proved without risking a duplicate
  commit; preserve the user's proposed changes and never blindly replay writes.

## Deferred approval gate

A future work order must resolve the decisions above and explicitly approve the
separate durable Group commit-job schema, worker reconciliation protocol and
authenticated COMMIT projection before implementation. Any future verification
must establish disposable database/storage isolation, not just a test DB name.
Normal database migration, push/merge, deployment and Activity/Admin integration
remain separate gates. No new role or relaxation of existing Git rules is implied.

## Required completion proof after approval

Maintainer .md + native clone exact bytes; Developer .java on feature branch;
main/staff/removed member/review/deadline denial at service and worker; UTF-8,
CRLF, traversal, symlink and source limits; duplicate keys/clicks/restarts; lease
expiry and crash before/after ref update; concurrent native push and deletion;
exactly one Git commit/audit event; retained browser draft/message and guarded
navigation; refreshed history/count without manual reload; untouched Activity and
other repository types. Run shared-DB suites sequentially, real-Git/Smart HTTP,
lint/types/build and desktop/mobile checks. No success claims before that proof.
