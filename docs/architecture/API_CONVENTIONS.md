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
GET    /api/v1/repositories/:repositoryId/branches
POST   /api/v1/repositories/:repositoryId/invitations
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
