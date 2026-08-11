# Admin Functionalization and Operations

## Phase 9 boundary

Phase 9 is backend-focused. Phase 10D owns frontend integration using the student/instructor visual language. Phase 10D.1 replaces the temporary shell, overview, and account-management routes. Phase 10D.2 integrates class governance and bounded academic oversight. Phase 10D.3 integrates measured operations, narrowly controlled recovery, and the administrative audit ledger.

Phase 9A implements authorization and accountability. Phase 9B implements bounded read-only academic and operational oversight. Phase 9C adds only controlled Git-credential revocation and eligible repository-provisioning recovery.

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

Unsupported claims deliberately include capacity utilization, percentages, email delivery success, archive integrity, raw-log summaries, and worker/process health. The admin remains unable to author academic content, view hidden tests or source, grade or release work, author feedback, inspect Git history/source, issue credentials, execute processes, or query arbitrary infrastructure. The only Phase 9 operational mutations are the narrowly constrained revocation and retry actions below.

## Phase 9C controlled operational recovery

Every Phase 9C route repeats the authenticated ACTIVE-admin requirement at route and service boundaries and requires cookie authentication, CSRF validation, JSON input, and a trimmed reason of 10 through 500 characters.

```text
POST /api/v1/admin/operations/git-credentials/:credentialId/revoke
POST /api/v1/admin/operations/repository-provisioning-jobs/:jobId/retry
```

Credential revocation is monotonic. An unrevoked credential is updated only when `revokedAt IS NULL`; active and expired credentials can be revoked, while an already-revoked credential returns `changed: false` without another audit row. The response reuses the safe credential metadata projection and omits the secret/verifier. Inactive users and inactive repositories do not prevent defensive revocation. Smart HTTP re-evaluates the persisted credential on every request, so revocation denies later transport requests immediately.

Provisioning retry is limited to the existing failed job for an ACTIVE repository in safe failed storage state. It requires an exact `expectedUpdatedAt`, no storage path, worker, active lease, or quarantine state, an exhausted claim budget below 10, and—for class projects—an ACTIVE class/team with a PUBLISHED or CLOSED task. A successful retry preserves `claimAttempt` and failure diagnostics, increments `maxClaimAttempts` by exactly one, returns the same job to `PENDING`, and moves repository storage from `FAILED` to `PENDING`. The API performs no Git or filesystem operation; only the separate provisioning worker may claim the added attempt.

Both changes and their action-specific `AdminAuditEvent` are committed in one transaction. Credential metadata is limited to user/repository IDs and the previous ACTIVE/EXPIRED lifecycle. Retry metadata is limited to repository ID, claim count, previous/new maximum, sanitized failure code, and previous completion time. Audit failure rolls back the state change. Concurrent credential revocations produce one change; concurrent retries produce one requeue and one stale-version response.

Phase 9C does not add credential issuance, generic job mutation, Java retry, quarantine recovery, repository repair, Git/source access, process execution, or frontend behavior.

## Verification boundary

The additive Phase 9A and Phase 9C migrations are applied to both approved local databases; Phase 9B required no migration. Verification covers real cookie/CSRF authentication, route/service denial, compare-and-set concurrency, idempotency, audit rollback, safe projections, guarded worker-only Git provisioning, and immediate loopback Smart HTTP denial after revocation. Phase 10D frontend work and each commit/push boundary remain separate from database migration work.

## Phase 10D.1 frontend boundary

The redesigned admin foundation uses the real overview, user directory, account summary, student/instructor provisioning, setup resend, status transition, and session-revocation contracts. Directory filters and pagination are server-owned and reflected in the URL. Account details fail closed when the route identity and safe directory/account projections disagree. Status changes chain the authoritative `updatedAt`, preserve unsent reasons across stale conflicts, refetch current state, and require deliberate retry.

The frontend exposes aggregate session counts only and never setup tokens, session identifiers, cookies, IP addresses, user-agent strings, passwords, academic source/evidence, Git secrets, or infrastructure paths. It offers no ADMIN provisioning or role mutation.

## Phase 10D.2 frontend boundary

The administrator class catalog, creation flow, class detail, metadata lifecycle, join-code controls, and detailed roster use the existing Phase 4 and Phase 9 contracts. Class creation requires selection of an existing ACTIVE instructor; ownership reassignment, arbitrary enrollment, and invitation bypass remain unavailable. Class mutations refresh authoritative state because the class contract has no optimistic version. Membership removal/reactivation uses the detailed-roster `updatedAt` as `expectedUpdatedAt`; a stale conflict refetches the roster, preserves the reason, and requires deliberate retry.

Join codes are fetched only after deliberate reveal and remain in component memory. They are cleared by navigation, resource refresh, and unmount; an inactive or revoked code is never redisplayed as usable. Codes are absent from catalogs, URLs, browser storage, logs, and documents.

Read-only academic routes use the Phase 9 administrator projections for classes, activities, submissions, project tasks, and repositories. Filters, sorting, and pagination remain server-owned. Submission scores render only when the backend marks the submission `RELEASED`. These routes omit instructions, source, test definitions or evidence, compiler output, score corrections, feedback bodies, repository source/history, credentials, storage paths, and operational internals. Phase 10D.2 adds no authoring, grading, review, or recovery mutation.

## Phase 10D.3 frontend boundary

The operations overview consumes the Phase 9 health and storage contracts through explicit frontend allowlists. It reports only API reachability, direct PostgreSQL connectivity, persisted queue/lease observations, `workerHealth: not_observed`, storage-state totals, known measured bytes, and measured/unmeasured repository counts. Manual refresh replaces continuous polling. The interface does not infer uptime, worker availability, host capacity, utilization, integrity, retention, snapshot, export, or email-delivery status.

The shared API client retains fail-closed non-2xx behavior by default. Only the operational-health adapter opts into HTTP 503 as a potential data response, and only a valid standard success envelope is consumable; an error envelope, missing data, or null data still raises a safe `ApiError`. The returned metadata preserves the HTTP status so degraded transport is not represented as HTTP 200.

Execution and provisioning lists use server-owned filters, sorting, and bounded pagination. Their projections expose safe resource IDs, lifecycle/claim/timestamp metadata, an allowlisted failure code, and lease-derived `stuck` only. Java retry remains unavailable. Eligible failed provisioning jobs may be requeued only through the Phase 9C endpoint with a mandatory reason and the authoritative `updatedAt`; stale conflicts preserve the reason, refetch the current version, and require a deliberate second submission. The browser never executes Git, reads storage paths, or repairs quarantined storage.

Git credential administration exposes repository/user IDs, allowed operations, lifecycle timestamps, and revocation only. It never exposes or issues a credential secret or verifier. Active and expired credentials can be deliberately revoked with a reason, and already-revoked responses are represented truthfully. Audit list/detail views render actor identity, action, target, bounded reason, request ID, time, and a second action-specific metadata allowlist; arbitrary metadata is omitted rather than serialized.

Canonical routes are `/admin/operations`, its execution/provisioning/credential children, and `/admin/audit-events`. Legacy `/admin/storage` and `/admin/system` redirect to operations. The unreachable prototype `AdminPages.jsx` and its unused admin record arrays are retired; current routes never fall back to mock operational or academic records after an API failure.
