# Admin Functionalization and Operations

## Phase 9 boundary

Phase 9 is backend-focused. The existing admin React pages remain a temporary mock and feature inventory; Phase 10D owns their redesign and integration using the student/instructor visual language.

Phase 9A implements authorization and accountability. Phase 9B implements bounded read-only academic and operational oversight. Phase 9C Git-credential revocation and repository-provisioning recovery remain a separate approval boundary.

## Administrator role

An administrator manages institutional account and class lifecycle and may receive deliberately minimized academic metadata. Administrator status never implies instructor ownership, grading authority, repository source access, hidden-test access, or arbitrary infrastructure control.

Phase 9A retains existing admin user provisioning, setup resend, user status, class, join-code, and class-membership administration. It adds:

- `GET /api/v1/admin/users/:userId/account-summary`;
- `POST /api/v1/admin/users/:userId/sessions/revoke`;
- active-admin checks at route and service boundaries;
- optimistic concurrency and bounded reasons for disruptive admin changes;
- self-disable and last-active-admin protection; and
- transactional allowlisted administrative audit events.

Admins cannot create/update/publish/close/archive/restore programming activities, replace/list test definitions, retrieve practice outcomes, grade/correct/release/resolve submissions, author project tasks or repository review/feedback, inspect repository source, or issue Git credentials.

## Safe account projection

Account summaries include safe user identity/status timestamps, setup state and nonsecret expiry, aggregate session counts, and class-membership lifecycle summaries. Explicit selections omit password hashes, token hashes/values, cookies, CSRF data, IP addresses, user-agent strings, setup links, source, hidden tests, credentials, host paths, and environment configuration.

Session revocation affects only active unexpired sessions. Repeating a successful request after all sessions are revoked returns a zero count and does not create a duplicate audit event.

## Status concurrency

Admin status changes require the target's `expectedUpdatedAt`. The repository obtains a transaction-scoped PostgreSQL advisory lock before reading/counting administrators and changing status. This serializes administrator-disable decisions; concurrent administrators cannot disable each other and leave zero ACTIVE administrators. Self-disable requests are rejected before repository mutation.

## Administrative audit ledger

`AdminAuditEvent` stores only:

- actor administrator ID;
- allowlisted enum action;
- allowlisted target type and optional UUID;
- a bounded reason where required;
- request UUID;
- internally constructed action-specific metadata; and
- creation timestamp.

The application exposes no update/delete audit API. Successful mutations and audit creation use one PostgreSQL transaction, so audit failure rolls back the mutation. Denied and failed requests use redacted operational/security logs and never masquerade as successful audit rows.

Phase 11 remains responsible for retention, export, tamper-evidence, incident review, and broader durable security-event coverage.

## Phase 9B read-only oversight

Every Phase 9B endpoint requires an authenticated ACTIVE administrator at both route and service boundaries. The implementation uses explicit Prisma selections and derives summaries from existing authoritative records; it adds no cache, persistent counter, schema change, or mutation path.

The API surface is:

```text
GET /api/v1/admin/overview
GET /api/v1/admin/academic/classes
GET /api/v1/admin/academic/activities
GET /api/v1/admin/academic/submissions
GET /api/v1/admin/academic/project-tasks
GET /api/v1/admin/academic/repositories
GET /api/v1/admin/operations/health
GET /api/v1/admin/operations/storage
GET /api/v1/admin/operations/execution-jobs
GET /api/v1/admin/operations/repository-provisioning-jobs
GET /api/v1/admin/operations/git-credentials
GET /api/v1/admin/audit-events
```

List endpoints use validated filters, explicit sorting, stable ID tie-breaking, and page sizes from 1 through 100. Overview totals are grouped from current user, class, membership, activity, submission, project-task, team, repository, execution-job, provisioning-job, and Git-credential records. Account setup totals use the latest setup-token lifecycle without loading token values or hashes. Repository storage reports the sum of known measurements plus measured and unmeasured record counts; it does not infer capacity.

Academic projections contain identity, lifecycle, ownership, timestamps, and bounded counts only. Activities omit instructions, starter code, and test definitions. Submission records omit source and assessment evidence and return a numeric score only when the submission is `RELEASED`. Project tasks omit instructions. Repositories omit descriptions, storage paths, failure detail, feedback text, credentials, transport details, and source/history.

Operational job projections contain safe related IDs, state, claim counts, configured maximum attempts, lifecycle timestamps, an allowlisted failure code, and a computed `stuck` flag. A job is stuck only when persisted state says it is `RUNNING` and its lease is missing or expired. This is a queue observation, not proof of worker health. Worker identifiers, process output, source, test data, quarantine keys, and raw failure messages are omitted.

Administrative health distinguishes API availability, PostgreSQL connectivity, and queue-query availability. It explicitly reports worker health as `not_observed`; it never promotes jobs or leases into a health claim. Git-credential listings expose lifecycle timestamps, resource IDs, and allowed operations only, never the secret or verifier. Audit listings rebuild typed metadata from an action-specific allowlist and discard arbitrary stored keys.

Unsupported claims deliberately include capacity utilization, percentages, email delivery success, archive integrity, raw-log summaries, and worker/process health. The admin remains unable to author academic content, view hidden tests or source, grade or release work, author feedback, inspect Git history/source, issue credentials, retry jobs, revoke credentials, execute processes, or query arbitrary infrastructure.

## Phase 9C boundary

Phase 9B adds no status change, archive/restore, retry, credential revocation, session revocation expansion, audit mutation, or other operational action. Phase 9A mutations remain unchanged. Any Phase 9C recovery or revocation behavior requires separate approval and tests.

## Verification boundary

The additive Phase 9A migration is applied to both approved databases. Phase 9B needs no migration and uses only guarded `projex_test` for database-backed implementation verification. Tests cover route/service denial, bounded filters and pagination, aggregate accuracy, released-score behavior, stuck-job derivation, measured/unmeasured storage, health semantics, audit metadata allowlisting, empty states, and deliberate sensitive fixtures. Authenticated normal-environment validation remains a final Phase 9 acceptance item under a separately approved credential workflow. Phase 9C, frontend work, commit, push, and integration remain separate boundaries.
