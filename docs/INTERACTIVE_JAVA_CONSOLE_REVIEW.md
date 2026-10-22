# Interactive Java console — Mac verification, 23 October 2026

## A. Source and scope

- Repository: `wefllagn/Projex`.
- Exact parent: `7cf12c64460863e8ad9ec5219af52d808484754f`.
- Feature branch: `feature/java-interactive-console`.
- Worktree: `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/java-interactive-console`.
- Local checkpoint SHA is supplied in the completion message; no push or merge is part of this work.
- Git author/committer: `wefllagn <147218978+wefllagn@users.noreply.github.com>`; active GitHub login independently rechecked as `wefllagn`.
- Existing Origin branch HEAD and all ten preserved modified/untracked design file hashes remained unchanged. No historical worktree was reset, cleaned, overwritten, or deleted.

## B. Existing infrastructure reused

The implementation extends the current Student Activity IDE, submission API client, authenticated/CSRF middleware, practice execution transaction, source snapshot and domain-separated debug hash, practice rate/capacity limits, PostgreSQL `ExecutionJob` claim/lease mechanism, and the separate Java worker. Java 17 compilation, minimal child environment, shell-free commands, JVM heap/stack/processor options, temporary directories, output bounds, and cleanup remain in the existing Java runner.

There is no new compiler service, WebSocket framework, dependency, official submission type, or Group execution path. The legacy pre-entered-stdin code-run endpoints remain available; the Student IDE uses the new interactive endpoints. Visible tests, Instructor review runs, and official assessment retain batch stdin/output comparison.

## C. Student console and screenshots

Run Code captures the current editor source and starts immediately. The existing Output panel displays queued/compiling/running/terminal state, incremental stdout/stderr (including prompts without newlines), input with Enter-to-send, Stop, optional End input, and exit status. Blank lines and significant whitespace survive. Output is React text, with bounded scrolling and no HTML interpretation. Polling continues when inspecting Tests or Git, and stops on unmount/terminal state. Local failures retain source/input and offer explicit recovery; uncertain input and start retries retain their original sequence/request key. Late poll responses cannot regress output, acknowledged input sequence, EOF/cancellation, or terminal state.

Browser verification used the actual API and separate Java/Git workers on macOS. All four existing toolbar actions remained accessible. Desktop was measured at 1441 × 1000 CSS pixels; mobile at 390 × 844, with document width equal to viewport width. Keyboard Enter worked at both widths. Temporary viewport overrides were reset and the temporary browser tab closed.

Screenshots are outside Git at `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-review/interactive-console-2026-10-23/`:

- `scanner-desktop.jpg`: completed Scanner run with the four IDE actions visible.
- `scanner-mobile-waiting.jpg`: prompt, input, Send, EOF, and Stop at mobile width.
- `scanner-mobile-completed.jpg`: mobile completion and exit code.
- `no-input-desktop.jpg`: Hello World without supplying stdin.
- `stopped-desktop.jpg`: actual cancellation of an infinite loop.
- `official-submission.jpg`: separately accepted and assessed official attempt.

## D. Session security, lifecycle, and limits

A single console row belongs to an existing practice execution. Authentication, current active Student role, ownership, current active class membership, and retention expiry protect every read/control request. Input additionally requires the current class/Activity/deadline execution policy; the worker rechecks that eligibility during compilation/execution. IDs alone grant no access. No source snapshot, queued input, worker identifier, PID, instructor test input/output, hidden test, or score is included in the console projection. Responses are non-cacheable.

Start UUIDs are unique and checked against owner, Activity, and exact source; concurrent exact retries create one job. Input messages use ordered sequences. An identical retry acknowledges the existing message; changed/skipped sequences are rejected. Input can be delivered only by the worker holding that single-attempt job. An interrupted session is failed rather than re-executed.

Limits are server-owned:

| Boundary | Limit |
| --- | --- |
| Source | Existing configurable byte limit (default 100,000 bytes) |
| Compilation | Existing timeout (default 10 seconds) |
| Runtime | 90 seconds |
| Session age, including queueing | 150 seconds |
| Lost client presence | 30 seconds without polling/input |
| Output | Existing configured combined compile/runtime budget (default 65,536 bytes) |
| Input line | 4,000 characters, no embedded newline/CR/NUL |
| Total input | 20,000 UTF-8 bytes including appended newlines; at most 256 messages |
| JVM | Existing heap (default 64 MB), 1 MB stack, one advertised processor |
| Concurrency | One live console per Student; existing per-Activity practice cap; one job at a time per worker |
| Start rate | Existing per-Student practice limit (default five per minute) |
| Browser polling | Non-overlapping 250 ms reads, bounded to 180 seconds |
| Worker controls/output persistence | 200 ms checks with lease renewal |

Stop, deadline/permission loss, worker shutdown, expiry, output overflow, and runtime timeout terminate the process group. A local supervisor detects abrupt parent death and enforces a hard deadline independently of the worker. Ordinary outcomes remove scratch directories. After an abrupt worker kill, a restarted worker reaps only console directories older than five minutes; active/unrelated directories are preserved. A database/control failure aborts the live process. Existing practice retention later cascades to console data.

A shared serial worker can be occupied by one console for up to the runtime bound, delaying queued assessment work. This is bounded trusted-local capacity, not a multi-tenant public scheduling guarantee.

## E. API, worker, and migration changes

New endpoints, under `/api/v1`:

```text
POST /activities/:activityId/interactive-code-runs  {sourceCode, requestKey}
GET  /interactive-code-runs/:runId
POST /interactive-code-runs/:runId/input           {sequence, text, eof}
POST /interactive-code-runs/:runId/stop            {}
```

All POSTs require JSON, authentication, Student authorization, CSRF, and strict request validation. Start handles bounded serialization retries. The API only queues/persists controls; it never launches Java.

The existing Java worker detects the practice job's console relation and invokes the interactive extension of the same Java runner. It persists live output and final compiler/runtime/exit evidence without calling assessment completion logic. `maxClaimAttempts=1` prevents an interactive restart. The queue's existing exhausted-lease handling fails abandoned jobs.

Migration: `20261023020000_interactive_console`. It adds one table with a cascading one-to-one practice foreign key, unique start key, bounded input counter, phase constraint, output/input state, cancellation, and client presence. All 27 earlier migration sources are byte-for-byte unchanged. All 28 applied migration checksums matched their local SQL sources.

Migration testing used a freshly initialized dedicated PostgreSQL cluster at `/private/tmp/projex-console-qa-20261023/pgdata`, loopback port 55489, disposable database `projex_test`. Its identity and data directory were verified before applying migrations. No preserved development/demo/presentation database or storage was queried, migrated, or reset. Browser records were fictional QA fixtures, and were subsequently cleaned by the final regression suites; no presentation Activities were seeded.

## F. Actual Scanner evidence

The real browser console showed the first prompt before any input. Enter sent `Julius`; the same execution then showed the age prompt. Enter sent `23`; the program completed:

```text
Enter your name: Julius
Enter your age: 23
Hello, Julius!
Age: 23

Process finished with exit code 0
```

The real Java/HTTP tests additionally verified multiple loop inputs, Unicode, blank lines, whitespace, EOF, non-newline output while still RUNNING, deduplicated delivery, and temporary cleanup. This is not simulated browser output.

## G. Security and recovery evidence

Passing real HTTP/PostgreSQL/Java checks cover authentication, missing CSRF, foreign Student/instructor read/input/stop denial, source-bound concurrent start replay, sequence replay/conflict/order, input limits, stale writes, disconnected expiry, revoked membership, cancellation, compiler/runtime failures, and exhausted-lease non-replay. Java tests additionally verify no-input execution, timeout, output overflow, immediate stop of a blocked reader, abrupt worker SIGKILL killing Java, and selective abandoned-directory cleanup.

Browser checks also verified that Run Code and a real Save to Git left the official submission count at zero. Only the explicit Submit confirmation created Attempt 1, which the unchanged worker assessed. Its unreleased grade remained concealed. Visible tests used predefined stdin and passed independently.

## H. Checks actually executed

| Check | Final outcome |
| --- | --- |
| Frontend full suite | 80 files, 638 passed |
| Backend unit suite | 51 files, 421 passed |
| PostgreSQL full suite | 25 files, 128 passed, including seven console tests |
| Real Java suite | Four files, 36 passed |
| Real Git/Group browser suite | Four files, 48 passed |
| Native Git Smart HTTP suite | One file, 12 passed |
| Client/server lint | Passed |
| Backend source and integration type checks | Passed |
| Prisma generate/validate | Passed |
| Client/server production builds | Passed |
| Diff whitespace, scoped source/migration/preservation checks | Passed |

Initial runs exposed sandbox socket restrictions, incomplete QA worker environment settings, noncanonical Git executable paths, and a frontend timing failure under high concurrency. These were resolved through proper local test permissions/environment and reduced client concurrency; the final runs above passed. The pre-existing Vite chunk-size warning remains. No Windows, public-hosted isolation, or production deployment tests are claimed.

After verification, the feature QA API, Java/Git workers, frontend, and dedicated PostgreSQL cluster were stopped; their isolated files were retained.

Test logs remain private/outside Git under `/private/tmp/projex-console-qa-20261023/`. Screenshots and a point-in-time browser database evidence snapshot remain in the external review directory.

## I. Limits and deployment boundary

This is verified on macOS with Temurin Java 17 for trusted local development. The supervisor, JVM heap bound, and process-group termination do not isolate hostile code from the host filesystem/network, enforce total process memory/CPU quotas, or prevent deliberately escaping child processes. The Windows lifecycle path was not verified. Public execution remains blocked on separately verified OS/container isolation and deployment approval. Existing production restrictions were retained; there was no public exposure, dependency upgrade, deployment, or presentation seeding.

Closed tabs intentionally expire their sessions; they do not reconnect to/restart an old Java process. Terminal output is retained only for the existing practice TTL. Inputs beyond the fixed bounds require a new manual run. No full shell, terminal emulator, debugger, or Java auto-assessment in the Group editor was introduced.

## J. Changed files and integration handoff

All paths below are relative to the feature worktree:

```text
client/src/submissions/InteractiveConsole.jsx
client/src/submissions/InteractiveConsole.test.jsx
client/src/submissions/interactive-console.css
client/src/submissions/StudentSubmissionViews.jsx
client/src/submissions/StudentSubmissionViews.test.jsx
client/src/submissions/submission-api.js
docs/INTERACTIVE_JAVA_CONSOLE_REVIEW.md
docs/architecture/SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md
server/prisma/schema.prisma
server/prisma/migrations/20261023020000_interactive_console/migration.sql
server/src/app.ts
server/src/infrastructure/java/java-runner.ts
server/src/modules/interactive-console/console.repository.ts
server/src/modules/interactive-console/console.routes.ts
server/src/modules/interactive-console/console.worker.ts
server/src/modules/submissions/submission.repository.ts
server/src/server.ts
server/src/worker.ts
server/tests/integration/interactive-console.integration.test.ts
server/tests/java/interactive-console.java.integration.test.ts
```

Review this scoped local checkpoint before integrating it into a separately authorized release candidate. Apply its migration first on that candidate's disposable QA database and repeat affected academic/Git/browser regressions after reconciling design changes. Do not copy older Mac application components over the functional baseline. No merge into `integration/projex-mvp` or `design/origin-application` was performed.

INTERACTIVE JAVA CONSOLE — VERIFIED
