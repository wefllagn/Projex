# Projex Submissions and Automated Assessment

## Status and scope

This document is the current Phase 6 contract for backend-only submission, automated Java assessment, instructor review/release, infrastructure-failure replacement, and Run Visible Tests behavior.

Phase 6 does not integrate the frontend, calculate course grades, implement rubrics or similarity analysis, permit post-release correction/versioning, execute Java on an internet-accessible host, or begin project/repository work.

## Execution boundary

- `JAVA_EXECUTION_MODE=disabled` is the safe default.
- `local_process` is accepted only when `NODE_ENV` is not `production` and only for controlled local verification/demonstration.
- The API process never invokes `javac` or `java`. It persists a durable job; a separate worker claims and executes it.
- The worker invokes executables with argument arrays and `shell: false`, compiles with `--release 17`, uses a unique server-created temporary directory, compiles once per job, bounds time/output, applies a JVM heap limit, kills the process tree on a limit, and removes the directory afterward.
- Client payloads cannot select commands, executables, flags, paths, environment variables, test visibility, test inputs, or limits.
- Phase 6 local-process controls are not a complete hostile-code sandbox. Container or equivalent CPU, process, network, and filesystem isolation is required before internet-hosted Java execution is enabled.

```mermaid
flowchart LR
    API["Express API"] -->|"atomic submission/practice + job"| DB[("PostgreSQL")]
    Worker["Separate Java worker"] -->|"claim with lease"| DB
    Worker --> Temp["Unique temporary directory"]
    Worker --> Javac["javac --release 17"]
    Worker --> Java["java per test snapshot"]
    Worker -->|"bounded result transaction"| DB
    Worker --> Cleanup["Guaranteed cleanup"]
```

## Official submission creation

`POST /api/v1/activities/:activityId/submissions` accepts only:

```json
{
  "sourceCode": "public class Main { ... }"
}
```

The request requires a validated `Idempotency-Key` header, cookie authentication, CSRF protection, an ACTIVE student account, ACTIVE membership, an ACTIVE class, and enabled controlled-local execution.

The serializable creation transaction:

1. Acquires the student/activity allocation lock and share-locks the activity/class against archive.
2. Rechecks the authoritative user, membership, class, activity, deadline, counting-attempt allowance, and replacement state.
3. Applies idempotency within authenticated student + activity + submission endpoint scope.
4. Allocates the next positive chronological `attemptNumber`.
5. Creates immutable source/activity/test snapshots, one execution, per-test result placeholders, one durable job, and one idempotency record.
6. When applicable, consumes and links exactly one valid replacement grant in the same transaction.

A new attempt returns `201`. An exact replay returns the original response with `200` and `meta.idempotentReplay=true`. Reusing the same scoped key with different source returns `DUPLICATE_SUBMISSION_REQUEST`. Another student has a separate scope.

## Attempt allowance and replacement grants

- `maxAttempts` is 1 through 3 and limits records where `countsTowardAttemptLimit=true`.
- `attemptNumber` is chronological internal history, not the allowance count.
- Student compilation errors, test failures, runtime errors, student-code timeout, and output overflow count toward the allowance.
- Worker/runtime unavailability, worker crashes, lease-recovery exhaustion, temporary-directory failures, and internal worker failures are infrastructure failures.
- Infrastructure retries always use the original immutable submission and job first.
- Exhausted infrastructure failures remain counting and `ASSESSMENT_FAILED` until an owning instructor explicitly resolves them.
- `CLOSED_WITHOUT_REPLACEMENT` preserves a counting terminal `FAILED_RESOLVED` record.
- `REPLACEMENT_GRANTED` preserves the failed record, sets it non-counting, requires a mandatory reason and future `replacementExpiresAt`, and creates no replacement until the student consumes the grant.
- A replacement is usable once, before expiration. It may cross the normal deadline or `CLOSED` state but never an archived class/activity, inactive account, or removed membership.
- An expired unused grant cannot be consumed. It remains immutable evidence and no longer blocks archive.
- The API labels the linked record `Replacement attempt for Attempt N`; clients must not display “Attempt N of maxAttempts” for a replacement.

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> ASSESSING
    ASSESSING --> QUEUED: infrastructure retry available
    ASSESSING --> ASSESSED: student-code outcome
    ASSESSING --> ASSESSMENT_FAILED: infrastructure retries exhausted
    ASSESSMENT_FAILED --> QUEUED: instructor retries same submission
    ASSESSMENT_FAILED --> FAILED_RESOLVED: instructor resolves
    ASSESSED --> REVIEWED: review saved
    REVIEWED --> REVIEWED: append correction or update draft
    REVIEWED --> RELEASED: release
    RELEASED --> [*]
    FAILED_RESOLVED --> [*]
```

## Scoring and release

- `automatedMaximum = sum(testCase.maximumPoints)`.
- `instructorMaximum = totalPointsSnapshot - automatedMaximum`.
- `originalAutomatedScore = sum(original per-test automatedPoints)` and is immutable.
- `effectiveAutomatedScore` is the latest correction value, or the original score when no correction exists, and remains within `0..automatedMaximum`.
- `instructorPoints` remains within `0..instructorMaximum`.
- `finalScore = effectiveAutomatedScore + instructorPoints` and remains within `0..totalPointsSnapshot`.
- Release snapshots `releasedFinalScore` and makes the submission immutable during Phase 6.

Every score correction is append-only and preserves correction order, original automated score, previous effective score, new effective score, mandatory reason, instructor identity, and timestamp.

## Visibility and authorization

| Capability | Student | Owning instructor | Admin |
| --- | --- | --- | --- |
| Create official attempt | Own ACTIVE membership only | No | No |
| Run visible tests | Own ACTIVE membership only | No | No |
| List/get official submissions | Own records only | Owned class | Safe read-only projection |
| View source | Own record | Owned class | No |
| View visible outcomes immediately | Own record | Yes | Summary only |
| View hidden evidence | Never | Owned class | No |
| Correct/review/release | No | Owned class, unarchived state | No |
| Retry/resolve infrastructure failure | No | Owned class, unarchived state | No |

Before release, students receive visible-test outcomes but no numeric scores, corrections, instructor points, final score, or feedback. After release they may receive the released final score, total points, and released feedback. Students never receive hidden-test inputs, expected outputs, identifiers, names, individual outcomes, points, or counts.

## Run Visible Tests

`POST /api/v1/activities/:activityId/visible-test-runs` accepts Java source only. It rejects arbitrary stdin and requires the normal student/account/membership/class/activity/deadline checks.

The transaction snapshots only `isHidden=false` test cases and creates a short-lived `PracticeExecution`, visible-case records, and durable `VISIBLE_TEST_RUN` job. It does not create an `ActivitySubmission`, attempt number, idempotency record, score, feedback, or official history.

Creation is protected by a per-student rate limit and per-student/activity active-job capacity. `GET /api/v1/visible-test-runs/:runId` returns only the owning student's result, the owning instructor's result, or an administrator's safe visible-only projection.

## Archive terminal state

Closing rejects ordinary new submissions and all new practice runs. Already accepted official/practice jobs continue. A CLOSED activity permits assessment retry/completion, instructor correction, review, feedback drafting, failure resolution, and release.

Activity and class archive are rejected while any of these exist:

- an official submission outside `RELEASED` or `FAILED_RESOLVED`;
- a queued or running practice execution;
- an unconsumed `REPLACEMENT_GRANTED` resolution whose expiration is still in the future.

An expired unused replacement no longer blocks archive. Archived activities/classes are read-only, and accepted academic records remain preserved.

## API surface

```text
POST /api/v1/activities/:activityId/submissions
GET  /api/v1/activities/:activityId/submissions
POST /api/v1/activities/:activityId/visible-test-runs
GET  /api/v1/visible-test-runs/:runId
GET  /api/v1/submissions/:submissionId
POST /api/v1/submissions/:submissionId/score-corrections
PUT  /api/v1/submissions/:submissionId/review
POST /api/v1/submissions/:submissionId/release
POST /api/v1/submissions/:submissionId/assessment/retry
POST /api/v1/submissions/:submissionId/assessment/resolve-failure
```

All mutation endpoints require JSON, cookie authentication, CSRF validation, Zod validation, and backend role/ownership/state checks. Mutation logs include IDs, state, actor, and safe failure code only; they redact source, hashes, test data/results, compiler output, feedback/reasons, credentials, cookies, tokens, and database URLs.

## Verification boundary

- `npm test` remains isolated and does not require Java or PostgreSQL.
- `npm run test:java` invokes the locally installed `javac`/`java` and verifies Java 17 target compilation, deterministic stdin/stdout, student compiler errors, timeouts, output overflow, process termination, and temporary cleanup.
- `npm run test:integration` accepts only private `TEST_DATABASE_URL` naming exactly `projex_test`, runs `prisma migrate deploy`, executes serial PostgreSQL tests, and removes fixture application rows while preserving migration history.
- The integration runner never falls back to `DATABASE_URL` and never runs `prisma db push` or `prisma migrate reset`.
