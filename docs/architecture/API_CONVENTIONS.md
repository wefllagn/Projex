# Projex API Conventions

## Base path and protocol

- Every application endpoint is rooted at `/api/v1`.
- Production-like hosted traffic uses HTTPS.
- JSON is the default request and response format: `Content-Type: application/json`.
- File upload/download endpoints may use `multipart/form-data` or an explicit content type, but their metadata/errors still follow these conventions.
- Resource URLs use plural kebab-case nouns, for example `/api/v1/class-members` and `/api/v1/repository-invitations`.
- Existing frontend page URLs remain unchanged; API URLs are a separate namespace.

Illustrative routes:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/users
GET    /api/v1/users/:userId
GET    /api/v1/admin/users/:userId/account-summary
POST   /api/v1/admin/users/:userId/sessions/revoke
GET    /api/v1/admin/overview
GET    /api/v1/admin/academic/classes
GET    /api/v1/admin/academic/activities
GET    /api/v1/admin/academic/submissions
GET    /api/v1/admin/academic/project-tasks
GET    /api/v1/admin/academic/repositories
GET    /api/v1/admin/operations/health
GET    /api/v1/admin/operations/storage
GET    /api/v1/admin/operations/execution-jobs
GET    /api/v1/admin/operations/repository-provisioning-jobs
GET    /api/v1/admin/operations/git-credentials
POST   /api/v1/admin/operations/git-credentials/:credentialId/revoke
POST   /api/v1/admin/operations/repository-provisioning-jobs/:jobId/retry
GET    /api/v1/admin/audit-events
POST   /api/v1/classes
GET    /api/v1/classes
GET    /api/v1/classes/:classId
PATCH  /api/v1/classes/:classId
POST   /api/v1/classes/:classId/archive
POST   /api/v1/classes/:classId/restore
GET    /api/v1/classes/:classId/join-code
POST   /api/v1/classes/:classId/join-code/rotate
POST   /api/v1/classes/:classId/join-code/revoke
POST   /api/v1/classes/join
GET    /api/v1/classes/:classId/members
PATCH  /api/v1/classes/:classId/members/:memberId
POST   /api/v1/classes/:classId/activities
GET    /api/v1/classes/:classId/activities
GET    /api/v1/activities/:activityId
PATCH  /api/v1/activities/:activityId
POST   /api/v1/activities/:activityId/publish
POST   /api/v1/activities/:activityId/close
POST   /api/v1/activities/:activityId/archive
POST   /api/v1/activities/:activityId/restore
GET    /api/v1/activities/:activityId/test-cases
PUT    /api/v1/activities/:activityId/test-cases
POST   /api/v1/activities/:activityId/submissions
GET    /api/v1/activities/:activityId/submissions
POST   /api/v1/activities/:activityId/visible-test-runs
GET    /api/v1/visible-test-runs/:runId
GET    /api/v1/submissions/:submissionId
POST   /api/v1/submissions/:submissionId/score-corrections
PUT    /api/v1/submissions/:submissionId/review
POST   /api/v1/submissions/:submissionId/release
POST   /api/v1/submissions/:submissionId/assessment/retry
POST   /api/v1/submissions/:submissionId/assessment/resolve-failure
POST   /api/v1/classes/:classId/project-tasks
GET    /api/v1/classes/:classId/project-tasks
GET    /api/v1/project-tasks/:projectTaskId
PATCH  /api/v1/project-tasks/:projectTaskId
POST   /api/v1/project-tasks/:projectTaskId/publish
POST   /api/v1/project-tasks/:projectTaskId/close
POST   /api/v1/project-tasks/:projectTaskId/archive
POST   /api/v1/project-tasks/:projectTaskId/restore
GET    /api/v1/project-tasks/:projectTaskId/teams
GET    /api/v1/project-tasks/:projectTaskId/monitoring
POST   /api/v1/project-tasks/:projectTaskId/repositories
POST   /api/v1/repositories/personal
GET    /api/v1/repositories
GET    /api/v1/repositories/:repositoryId
PATCH  /api/v1/repositories/:repositoryId
POST   /api/v1/repositories/:repositoryId/ready-for-review
POST   /api/v1/repositories/:repositoryId/request-changes
POST   /api/v1/repositories/:repositoryId/approve
POST   /api/v1/repositories/:repositoryId/archive
POST   /api/v1/repositories/:repositoryId/restore
GET    /api/v1/repositories/:repositoryId/members
PATCH  /api/v1/repositories/:repositoryId/members/:memberId
GET    /api/v1/repositories/:repositoryId/source/summary
GET    /api/v1/repositories/:repositoryId/source/branches
GET    /api/v1/repositories/:repositoryId/source/commits
GET    /api/v1/repositories/:repositoryId/source/commits/:commitId
GET    /api/v1/repositories/:repositoryId/source/tree
GET    /api/v1/repositories/:repositoryId/source/file
GET    /api/v1/repositories/:repositoryId/source/diff
POST   /api/v1/repositories/:repositoryId/invitations
GET    /api/v1/repositories/:repositoryId/invitations
GET    /api/v1/repository-invitations
POST   /api/v1/repository-invitations/:invitationId/accept
POST   /api/v1/repository-invitations/:invitationId/decline
POST   /api/v1/repository-invitations/:invitationId/revoke
GET    /api/v1/repositories/:repositoryId/feedback
POST   /api/v1/repositories/:repositoryId/feedback-drafts
PATCH  /api/v1/repository-feedback/:feedbackId
GET    /api/v1/notifications
```

Implemented examples reflect their actual contracts. Future-feature examples remain illustrative, do not authorize implementation, and are not a complete endpoint inventory.

### Phase 4 projection rules

- Global user endpoints are admin-only and use explicit safe user selections.
- Class lists are scoped by the authenticated role: all classes for admins, owned classes for instructors, and ACTIVE memberships for students.
- Class responses never include join codes for students.
- Student roster entries contain only `userId` and `fullName`.
- Instructor/admin roster entries may additionally contain `memberId`, email, user status, membership status, `joinedAt`, `removedAt`, and `lastActivatedAt`.
- A successful new class-code join returns `201`; an idempotent existing ACTIVE membership returns `200` with the same membership ID.
- Class-code errors never echo the submitted code or reveal the target class.

### Phase 9A administrator contracts

- Both new `/api/v1/admin` endpoints require an authenticated ACTIVE administrator at route and service boundaries.
- Account summaries expose only safe identity/status timestamps, setup state, session counts, and class-membership summaries. They omit hashes, token values, cookies, IP addresses, user agents, setup links, and request secrets.
- Target-user session revocation requires a trimmed 10-500 character reason, is idempotent, revokes only unexpired active sessions, and records one successful audit event only when sessions change.
- `PATCH /api/v1/users/:userId/status` requires `status`, `reason`, and `expectedUpdatedAt`. It rejects self-disablement, stale versions, and a transition that would remove the last ACTIVE administrator.
- Successful admin account/class/membership mutations write an allowlisted audit event in the same database transaction. Failed or denied requests do not create successful audit rows.
- Administrators receive metadata-only activity projections. They cannot use activity/test-case mutation routes, list test-case definitions, retrieve practice-run outcomes, or receive starter/submitted source through instructor projections.

### Phase 9B administrator oversight contracts

- All oversight routes repeat the authenticated ACTIVE-admin check at route and service boundaries. Instructor, student, and inactive-admin callers fail closed.
- Academic lists use explicit allowlisted projections. They omit instructions, starter/submitted source, test definitions/evidence, compiler/process output, correction reasons, feedback bodies, storage paths, and Git transport/history details.
- Submission summaries expose `releasedScore` only for a `RELEASED` submission; otherwise it is `null`.
- Operational job lists expose safe related IDs, lifecycle/lease timestamps, claim bounds, sanitized failure codes, and a lease-derived `stuck` flag. They omit worker IDs, raw failure messages, output, storage paths, and quarantine keys.
- Storage reports known measured bytes as a decimal string plus measured/unmeasured record counts. No capacity or utilization is inferred.
- Health separates API, database, and persisted queue observations. `workerHealth.status` remains `not_observed` because job/lease records do not prove worker availability.
- Git-credential lists expose IDs, allowed operations, and lifecycle timestamps only. Audit lists expose bounded reasons and action-specific metadata allowlists; arbitrary stored metadata is discarded.
- Oversight lists accept only endpoint-specific status/type/resource/search filters, explicit sort fields/directions, and `pageSize` from 1 through 100. Phase 9B introduces no mutation endpoint.

### Phase 9C controlled operational contracts

- Both Phase 9C POST routes require an authenticated ACTIVE administrator at route and service layers, JSON, CSRF validation, and a trimmed reason from 10 through 500 characters.
- Credential revocation uses a monotonic `revokedAt IS NULL` compare-and-set. An active or expired unrevoked credential returns safe metadata with `changed: true`; an already-revoked credential returns `changed: false` and creates no duplicate audit event. Responses never include the secret or verifier.
- Provisioning retry requires `expectedUpdatedAt` and requeues only the same eligible exhausted FAILED job. It preserves `claimAttempt`, adds exactly one to `maxClaimAttempts`, and returns only job/repository IDs, queue state/counts, availability/version timestamps, and `queued: true`.
- Stable retry errors are `PROVISIONING_JOB_NOT_FOUND`, `PROVISIONING_JOB_NOT_FAILED`, `STALE_PROVISIONING_JOB_VERSION`, `REPOSITORY_NOT_PROVISIONABLE`, `PROVISIONING_QUARANTINED`, `PROVISIONING_STORAGE_STATE_UNSAFE`, `PROVISIONING_RETRY_LIMIT_REACHED`, and the established `GIT_EXECUTION_DISABLED` when controlled-local Git is unavailable.
- The API mutation never executes Git or accesses repository storage. Smart HTTP continues to perform current credential and authorization checks per transport request.

### Phase 5 activity and test-case rules

- Activity creation always produces a server-owned `DRAFT`; the client cannot choose the initial status.
- Activity mutations require `expectedUpdatedAt`. A successful mutation advances the timestamp by at least one millisecond, and stale writes return `STALE_ACTIVITY_VERSION`.
- Draft test cases are replaced as one ordered transactional set. Array position defines the authoritative one-based order.
- Publishing requires a future due date, at least one visible test case, positive combined test points, and test points no greater than the activity total.
- After publication, starter code, Java language/entry-class configuration, total points, and all test-case content/visibility/points are immutable.
- A published due date may only be extended and `maxAttempts` may only increase. Closed and archived activities are read-only.
- Student activity access requires ACTIVE class membership and a `PUBLISHED` or `CLOSED` activity.
- Student test-case lists contain only visible cases. Hidden records do not contribute to the returned list, count, pagination, or error details.
- Restoring a previously published activity produces `CLOSED`; it never silently republishes or reopens the activity.

### Phase 6 submission, assessment, and visible-test rules

- Submission creation requires an authenticated ACTIVE student, ACTIVE class membership, an ACTIVE class, Java execution enabled for controlled local development, Java source only, and an `Idempotency-Key` header.
- An ordinary submission requires a `PUBLISHED` activity before its deadline. A valid unconsumed infrastructure-failure replacement grant is the only exception that permits creation after the deadline or while the activity is `CLOSED`.
- A replacement never bypasses an archived class/activity, inactive account, removed membership, expiration, or single-use consumption.
- `POST /activities/:activityId/submissions` returns `201` for a new accepted attempt and `200` with `meta.idempotentReplay=true` for an exact replay.
- `POST /activities/:activityId/visible-test-runs` returns `202`, creates only a short-lived practice job, executes only visible test snapshots, accepts no custom stdin, and creates no submission, attempt, history, or score.
- Students may immediately receive visible-test outcomes. Before release they receive no numeric score, correction, instructor points, final score, or feedback. After release they receive only the released final score, activity total, and released feedback.
- Student responses never contain hidden-test inputs, expected outputs, identifiers, names, individual outcomes, individual points, or hidden-test counts.
- Owning ACTIVE instructors may read detailed assessment evidence, append score corrections, save review/feedback drafts, release results, retry exhausted infrastructure failures, and resolve failures. Administrators have safe read-only submission access and cannot grade, correct, release, retry, or resolve failures.
- `expectedUpdatedAt` protects correction, review, release, retry, and failure-resolution transitions. Released submissions are immutable during Phase 6.
- An infrastructure-failure replacement requires a mandatory reason and future `replacementExpiresAt`. The response labels the new record as `Replacement attempt for Attempt N`; the internal chronological `attemptNumber` is not presented as “Attempt N of maxAttempts.”

### Phase 7 project and repository collaboration rules

- Project-task creation produces a server-owned `DRAFT`. Instructor mutations require exact class ownership and `expectedUpdatedAt`; students see only `PUBLISHED` and `CLOSED` tasks in classes where they have ACTIVE membership.
- Class-project creation is student-only, requires an ACTIVE class membership and an open pre-deadline task, and atomically creates the team, lead membership, metadata-only repository, and owner membership.
- The client supplies no visibility, owner, class, team, repository path, or Git fields. `CLASS_PROJECT` responses always use `CLASS_ONLY`; `PERSONAL` responses always use `PRIVATE`.
- Repository list/detail responses are role-scoped. Unauthorized and cross-class access is concealed with `404` where revealing existence would disclose protected academic records.
- Classmate member projections contain member/user IDs, full name, and team/repository role only. The team owner additionally receives membership status and `updatedAt` so authorized removal/reactivation can use optimistic concurrency, while email and account status remain omitted. Full lifecycle detail is limited to the owning instructor and safe administrator views.
- Invitation creation verifies the invitee is an ACTIVE student with ACTIVE membership in the same class, is not active on another team for the task, and fits capacity. Expiry is the earlier of seven days after creation or the task deadline.
- Invitation acceptance and membership removal/reactivation synchronize `TeamMember` and `RepositoryMember` in one transaction. The owner/lead cannot be removed, and no endpoint transfers ownership.
- Repository metadata, ordinary invitations, student membership changes, and `READY_FOR_REVIEW` require a PUBLISHED project task before its deadline. Instructor corrective member changes after cutoff require a non-empty reason.
- `REQUEST_CHANGES` accepts only a current `READY_FOR_REVIEW` repository while the task is PUBLISHED before its deadline and atomically releases the referenced non-empty feedback draft.
- `APPROVE` accepts previously submitted `READY_FOR_REVIEW` work while the task is PUBLISHED or CLOSED, including after the deadline. An optional referenced draft is released atomically with approval.
- Feedback drafts are instructor-only. Student repository feedback responses contain released textual feedback only. Numeric grades and rubrics are not accepted or returned in Phase 7.
- Phase 7 creates no fake repository activity or Git history. Phase 8A provisions empty repositories, Phase 8B supplies authenticated transport, and Phase 8C supplies authenticated read-only source inspection.

## Naming and data representation

- JSON fields use `camelCase`.
- IDs are UUID strings and end in `Id` when they reference another resource.
- Timestamps use ISO 8601 with an explicit UTC offset, preferably UTC `Z` in transport.
- Date-only values use `YYYY-MM-DD` only when time has no meaning.
- Durations and byte limits are numeric with explicit field units, such as `timeoutMs` and `sizeBytes`.
- Enum values use stable lowercase snake_case strings, such as `needs_instructor_review`.
- Booleans use positive names such as `isLocked` and `isArchived`.
- Money is not currently in scope. Scores use numeric earned/max fields, not formatted strings.
- Nullability is intentional. Omitted means unavailable/not requested; `null` means known absence.

## Standard success response

```json
{
  "data": {
    "id": "3ef272c8-f541-448f-b859-0bc43af617bd",
    "status": "submitted",
    "attemptNumber": 2,
    "submittedAt": "2026-07-29T01:30:00.000Z"
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

- `data` contains the requested resource or action result.
- `meta.requestId` correlates client reports with logs.
- Create operations normally return `201 Created`; successful reads/updates return `200 OK`; operations with no body may return `204 No Content`.

## Standard list response

Projex uses page-based pagination initially because the prototype tables are modest and page totals are useful for the UI. Endpoints with fast-changing or large feeds may later adopt cursor pagination under a separately documented contract.

```json
{
  "data": [
    {
      "id": "3ef272c8-f541-448f-b859-0bc43af617bd",
      "title": "Loop Patterns and Input Validation"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Rules:

- Default `page` is 1.
- Default `pageSize` is 20; maximum is 100 unless an endpoint documents a smaller bound.
- Sorting uses an allowlisted `sort` field and `order=asc|desc`.
- Filters are endpoint-specific and validated with Zod.
- Stable tie-breaker ordering by ID is required when the selected sort is not unique.

## Standard error response

```json
{
  "error": {
    "code": "ATTEMPT_LIMIT_REACHED",
    "message": "This activity's maximum number of submission attempts has been reached.",
    "details": {
      "activityId": "b8e48f6b-519b-45d3-ae10-f9a9b08802bb"
    }
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

- `error.code` is a stable, uppercase, machine-readable identifier.
- `error.message` is safe for display but is not a stable programmatic contract.
- `error.details` is optional and must not reveal secrets, hidden tests, filesystem paths, stack traces, another student's private data, or authorization internals.
- Validation errors use `VALIDATION_FAILED` and may include a safe array of field/path issues.
- Unexpected errors return `INTERNAL_ERROR` with a generic message; full details remain in redacted server logs.

## HTTP status conventions

| Status | Use |
| --- | --- |
| `200` | Successful read or update with a response body. |
| `201` | Resource created. |
| `202` | Valid asynchronous work accepted, such as an assessment job. |
| `204` | Successful action with no response body. |
| `400` | Malformed request or validation failure. |
| `401` | No valid authenticated session. |
| `403` | Authenticated but not permitted by role, membership, ownership, or record visibility. |
| `404` | Resource not found or intentionally concealed from the caller. |
| `409` | State/uniqueness/version conflict, including duplicate idempotency request or an attempt-number race. |
| `413` | Source, upload, stdin, or output-related request exceeds an HTTP input limit. |
| `422` | Semantically invalid state transition when `400` is too general. |
| `429` | Rate limit exceeded. |
| `500` | Unexpected internal error. |
| `503` | Required dependency or worker capacity temporarily unavailable. |

## Validation and trust rules

- Params, query, body, headers used by the endpoint, and file metadata are validated with Zod.
- Unknown mutation fields should normally be rejected.
- The backend ignores or rejects client-supplied `role`, `ownerId`, `studentId`, `instructorId`, filesystem paths, Git commands, Java commands, hidden-test flags, and grade-release authority unless the endpoint explicitly allows the field and independently authorizes it.
- The authenticated user ID and roles come only from the validated server session.
- Valid application roles are `STUDENT`, `INSTRUCTOR`, and `ADMIN`; Student and Instructor workflows are implemented first without removing Admin from authorization scope.
- Authorization occurs after authentication and before sensitive data is loaded or returned.

## Sessions, cookies, and CSRF

- Authentication uses a secure server-side session referenced by an HTTP-only cookie.
- Browser requests that depend on the cookie include credentials.
- State-changing endpoints require CSRF protection in addition to SameSite cookie controls.
- Login rotates the session identifier; logout revokes the server-side session and expires the cookie.
- APIs must not place session IDs or secrets in URLs, response bodies, browser storage, or logs.

## Idempotency and concurrency

- An activity permits a configurable maximum of 1 to 3 immutable submission attempts per student.
- The backend, never the frontend, atomically determines the next `attemptNumber` beginning at 1.
- Attempt creation verifies the activity is accepting submissions and `count(countsTowardAttemptLimit=true) < activity.maxAttempts` inside the concurrency-safe operation unless it atomically consumes a valid replacement grant.
- Creation is protected by a database unique constraint on `(activityId, studentId, attemptNumber)` and a transaction/retry strategy.
- `POST /activities/:activityId/submissions` requires an `Idempotency-Key`. Its hash is scoped to the authenticated student, activity, and submission endpoint; a different student does not collide.
- Repeated requests with the same scoped key and source payload return the original attempt; the same scoped key with different source returns `DUPLICATE_SUBMISSION_REQUEST`.
- `ATTEMPT_LIMIT_REACHED`, `DUPLICATE_SUBMISSION_REQUEST`, `ACTIVITY_NOT_ACCEPTING_SUBMISSIONS`, `EXECUTION_UNAVAILABLE`, and `SUBMISSION_NOT_FOUND` distinguish normal submission failures without exposing internals.
- A double-click or network retry must not consume two attempt numbers or create duplicate attempts.
- Successfully created attempts are immutable and preserve their source/activity/test snapshots, submitted timestamp, execution result, score evidence, late status, and review state.
- Infrastructure retries reuse the same submission and job. After retry exhaustion, instructor resolution either closes the failure or grants one expiring replacement; the failed record is never deleted, overwritten, or renumbered.
- Grant consumption, idempotency persistence, replacement submission/job creation, and linkage to the failed submission occur in one serializable transaction protected by the student/activity allocation lock.
- Operations such as feedback release, repository-invitation acceptance, and repository readiness require explicit valid state transitions.
- Update endpoints for concurrently edited records should use a version field or `updatedAt` precondition where lost updates are possible.

## Asynchronous operations

An accepted job response uses `202`:

```json
{
  "data": {
    "jobId": "ac7ed949-f43b-4dcf-a6dc-90b8a84c2270",
    "status": "queued"
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Job statuses are server-owned and use a defined state machine such as `queued`, `running`, `succeeded`, `failed`, `timed_out`, or `cancelled`. Client polling endpoints return bounded, role-filtered output. Workers never expose shell commands, host paths, or hidden test contents.

For the controlled pilot, jobs may be PostgreSQL-backed and claimed atomically by a separate worker with lease/retry fields and bounded concurrency. No external queue product is required. Redis, RabbitMQ, or another dedicated queue may be considered only after measured testing proves it necessary.

## Assessment score response rules

Instructor assessment DTOs keep automated evidence separate from instructor review:

```json
{
  "data": {
    "submissionId": "3ef272c8-f541-448f-b859-0bc43af617bd",
    "attemptNumber": 2,
    "originalAutomatedScore": 82,
    "effectiveAutomatedScore": 80,
    "automatedMaximum": 85,
    "instructorPoints": 3,
    "instructorMaximum": 15,
    "finalScore": 85,
    "totalPoints": 100,
    "reviewedAt": "2026-07-29T03:10:00.000Z",
    "feedbackReleasedAt": null
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

- `automatedMaximum` is the sum of immutable test-case points; `instructorMaximum = totalPoints - automatedMaximum`.
- `originalAutomatedScore` comes from preserved automated results and is never overwritten.
- “Edit Automated Score” appends a correction preserving the original score, previous effective score, new effective score, mandatory reason, instructor identity, and timestamp. The latest valid correction becomes effective while prior corrections remain immutable.
- `effectiveAutomatedScore` remains within `0..automatedMaximum`; `instructorPoints` remains within `0..instructorMaximum`.
- `finalScore = effectiveAutomatedScore + instructorPoints` and remains within `0..totalPoints`. It becomes the immutable `releasedFinalScore` on release.
- Unreleased scores, correction history, instructor points, feedback, and grading drafts are omitted from student responses.
- Rubric grading, course-grade aggregation, and post-release correction/versioning remain outside Phase 6.

## Versioning and compatibility

- Breaking contract changes require a new API version or an explicit coordinated migration.
- Adding an optional response field is normally backward-compatible.
- Removing/renaming fields, changing types, changing enum meaning, or changing authorization visibility is breaking.
- Frontend adapters should translate API DTOs into the current component view models so visual components do not need broad rewrites.

## Observability

- Accept or generate a request ID and return it as `meta.requestId` and an `X-Request-Id` header.
- Log method, route template, status, duration, authenticated user ID when permitted, and error code.
- Never log cookies, authorization secrets, passwords, complete source code, stdin, hidden tests, or sensitive feedback.

## Phase 8A repository storage projection

Existing repository create, list, and detail projections include `storageStatus` with `PENDING`, `PROVISIONING`, `READY`, `FAILED`, or `QUARANTINED`. They never expose `storagePath`, absolute host paths, Git arguments, or quarantine locations. Phase 8A adds no Git transport or repository-content endpoint.

## Phase 8B Git transport contracts

Credential management uses the normal JSON envelope and cookie-session/CSRF rules:

```text
POST /api/v1/repositories/:repositoryId/git-credentials
GET  /api/v1/repositories/:repositoryId/git-credentials
POST /api/v1/git-credentials/:credentialId/revoke
```

Issuance accepts only a validated operation set (`READ`, `WRITE`), returns the random secret once, and returns expiry plus safe credential metadata. List, revoke, logs, and later reads never return the verifier or secret.

Git clients use only these authenticated Smart HTTP CGI-compatible routes:

```text
GET  /api/v1/git/repositories/:repositoryId/info/refs?service=git-upload-pack
GET  /api/v1/git/repositories/:repositoryId/info/refs?service=git-receive-pack
POST /api/v1/git/repositories/:repositoryId/git-upload-pack
POST /api/v1/git/repositories/:repositoryId/git-receive-pack
```

These routes deliberately do not use the JSON success envelope: successful bodies and content types are the bounded byte streams emitted by `git-http-backend`. Before dispatch, Projex authenticates the repository-scoped Basic credential, re-evaluates current user/membership/lifecycle authorization, validates the service/path, and resolves READY storage internally. Rejections are safe and never expose credentials, source, or host paths.

## Phase 8C repository-inspection contracts

The seven `/repositories/:repositoryId/source/*` endpoints use cookie authentication and the standard JSON envelope. They re-evaluate the same current source-read authorization as Phase 8B and resolve only READY marker-owned storage. Smart HTTP need not be enabled, but controlled local Git execution must be enabled outside production.

History accepts an optional validated `branchName`, `page`, and `limit` capped at 50. Tree and file accept either a validated branch name or a full reachable 40-character commit ID, never both; omitting both selects the server-owned default branch. Diff accepts two full reachable commit IDs and an optional normalized path. Commit detail accepts only a full reachable commit ID.

Responses may include branch names, commit IDs, bounded author display names, timestamps, subjects, safe tree entries, bounded UTF-8 file content, and bounded unified patches. They omit author emails, storage paths, credentials/verifiers, environment/configuration, raw stderr, unsupported binary data, and arbitrary Git objects. Empty repositories return explicit empty projections.

Stable inspection errors include `GIT_INSPECTION_UNAVAILABLE`, `GIT_REVISION_NOT_FOUND`, `GIT_CONTENT_NOT_FOUND`, `GIT_BINARY_FILE_UNSUPPORTED`, operation-specific limit errors, and the generic safe `GIT_INSPECTION_FAILED`. Validation errors never echo a host path or unrestricted revision expression.
