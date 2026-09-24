# Projex Iteration 2 Execution Checklist

## Tracker identity

- Revision: **I2-C3**
- Updated: **2026-09-24**
- Deadline target: **2026-10-30**
- Scope authority: `docs/team/ITERATION_2_ROADMAP.md` revision I2-R4
- Evidence authority: current Git/source/Prisma/test output, then the active `docs/team/milestones/I2.X.md` report

This file is the status and execution tracker. It does not redefine roadmap scope. Update it only when repository evidence changes or an explicit approval changes a gate. Do not mark a feature complete because a screen exists.

## Status vocabulary

- **COMPLETED** — implemented, tested, reviewed and accepted.
- **IN PROGRESS** — authorized work exists on the current task branch but is not fully accepted/integrated.
- **PENDING** — accepted roadmap work has not started.
- **BLOCKED** — work cannot proceed without an external prerequisite or repeated unresolved blocker.
- **PROPOSED / AWAITING APPROVAL** — recommendation or requested behavior whose implementation boundary is not yet authorized.

## Current snapshot

| Item | Status | Evidence / next gate |
| --- | --- | --- |
| Active branch | IN PROGRESS | `iteration-2/freiser-work-01`, continued from Julius handoff `90d8c4a3864d2d9b8bc41ca9b1570c1f52d5b096`; protected-branch integration pending |
| I2.1 core commit | VERIFIED ON TASK BRANCH | `448dc5843865ee669f60473bcdb0f543875f084d`; 16-file slice committed/pushed, integration pending |
| I2.1 automated evidence | COMPLETED for current slice | Client 46/293, server 36/224, Java 3/24, PostgreSQL integration 18/86; lint/type-check/build recorded passing in `I2.1.md` |
| I2.1 authenticated walkthrough | COMPLETED for selected deterministic demo | Student/Instructor activity, practice, submit, review, release and narrow layout recorded passing |
| Instructor fresh rerun | COMPLETED — ACCEPTED FOR FREISER CHECKPOINT | Checker accepted the scoped rerun. Guarded `projex_test` integration 19/90, client 46/296, Java 3/24; server isolated 221/224 with three inherited Windows storage/restore failures tracked separately. Approved local migrations and authenticated 1280 px/390 px walkthrough passed. Julius set Iteration 2 diagnostic retention without automatic cleanup; protected integration remains pending. See `milestones/INSTRUCTOR_REVIEW_RERUN.md`. |
| Personalized Exercise 1 checking | PROPOSED / AWAITING APPROVAL | Nonempty-output comparator/grading contract unresolved |
| I2.2–I2.9 | PENDING | No later Iteration 2 phase started |
| Normal database migration for Iteration 2 | PARTIAL — APPROVED RERUN SLICE ONLY | The two committed Instructor Rerun migrations were applied to Freiser's local `projex`; other proposed Iteration 2 schema work remains unapproved. |
| Network Git | PENDING | Smart HTTP remains loopback-only; browser Home-LAN testing is not Git transport evidence |

## Critical path to October 30

- [ ] **IN PROGRESS** I2.1 core committed/pushed on task branch; integrate only through a separate approval gate.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** Instructor rerun preserves original assessment, attempts, feedback and scores; guarded tests, approved normal-local migration, authenticated desktop/narrow walkthrough, retention decision and Checker acceptance are recorded in the rerun milestone. Protected integration remains separate.
- [ ] **PROPOSED / AWAITING APPROVAL** Approve the academic Course/class-offering and Admin roster-import model.
- [ ] **PENDING** Complete essential I2.2 cross-class work views.
- [ ] **PROPOSED / AWAITING APPROVAL** Add the smallest repository-to-submission slice inside I2.3.
- [ ] **PENDING** Prove paired recovery in I2.6.
- [ ] **PENDING** Isolate Java execution in I2.7.
- [ ] **PENDING** Enable approved-network Git in I2.8.
- [ ] **PENDING** Complete the controlled SLU laboratory pilot in I2.9.
- [ ] **PENDING** Reconcile accepted evidence into the research paper before the deadline.

## Cross-cutting academic foundation follow-up

Status: **PROPOSED / AWAITING APPROVAL**

Objective: represent official SAMCIS course/class-offering data and reduce roster setup for 45–50 students without confusing the official class code with the Projex join code.

Prerequisites:

- [ ] Confirm official uniqueness rules for SAMCIS class codes within an academic period.
- [ ] Confirm permitted semester labels and school-year format.
- [ ] Approve `Course` catalog plus existing `Class`-as-offering design.
- [ ] Approve Admin roster imports creating/reactivating ACTIVE memberships after preview.
- [ ] Approve the pending join-request lifecycle for manual join-code use.

Implementation checklist:

- [ ] Add reusable course number/description records without expanding programming-language scope.
- [ ] Extend the existing class offering with official class code and optional units/schedule/days/room.
- [ ] Keep the UUID as internal identity and rename/project the generated code clearly as a join code.
- [ ] Add Admin-only offering import preview, validation, confirmation and bounded audit evidence.
- [ ] Add Admin-only roster import for existing ACTIVE Students; never auto-create accounts.
- [ ] Preserve omitted memberships; no destructive CSV synchronization.
- [ ] Preserve manual Instructor invitations.
- [ ] Add Student join request plus Instructor approve/reject only after its state model is approved.

Required tests:

- [ ] Migration deploy against guarded `projex_test`, including compatibility with existing classes.
- [ ] Repeated course across several offerings and repeated official class code across different school years.
- [ ] Duplicate, malformed, unknown-account, inactive-account and wrong-role rows.
- [ ] Atomic/explicit-confirmation behavior and safe retry/idempotency.
- [ ] Admin-only authorization, Instructor ownership, Student isolation and audit redaction.
- [ ] Frontend preview, error recovery, desktop and narrow layouts.

Deliverables and acceptance:

- Structured course/offering projections and clear display title.
- Previewed Admin import with no raw-file retention or automatic account creation.
- Existing class/activity/submission/repository relationships preserved.
- Manual invitation and join-request flows remain distinct.
- Explicit migration and normal-database application gates completed separately.

Recommended owner: backend/database lead for schema and authorization; a frontend member may implement preview/UI only after the contract is accepted. Do not develop competing migrations in parallel.

## I2.1 — Academic Core and Programming Workspace

Status: **CORE VERIFIED AND COMMITTED ON TASK BRANCH — integration pending**

Objective: prove realistic Programming 1 activity work and make bounded browser source entry usable without building a full IDE.

Prerequisites:

- [x] Accepted Home-LAN-tested baseline.
- [x] Sanitized Programming 1 exercise intake and selected deterministic demo.
- [x] Existing Java API/worker and submission lifecycle.

Implementation:

- [x] Import one bounded UTF-8 `.java` file with confirmation and no path persistence.
- [x] Add line numbers, indentation guides, Tab/Shift+Tab, auto-indent and synchronized scrolling.
- [x] Link safe compiler diagnostics to the matching source line.
- [x] Preserve visible tests, official Submit, attempts, LATEST/HIGHEST, review/release and close/reopen.
- [x] Reconcile stale live-validation and demo wording in `I2.1.md` before commit.
- [x] Review and stage only the intended 16-file I2.1 slice; `git diff --cached --check` passed.
- [x] Commit/push after explicit approval (`448dc5843865ee669f60473bcdb0f543875f084d`).
- [ ] Integrate into `development/fullstack` only after separate approval.

Bounded adviser follow-ups:

- [ ] **PROPOSED / AWAITING APPROVAL** Explain/progressively disclose Java entry class while preserving `Circle2` and other valid names.
- [ ] **PROPOSED / AWAITING APPROVAL** Compact test-case editing and keep Add/Save/allocation controls reachable.
- [ ] **PROPOSED / AWAITING APPROVAL** Show automated and Instructor maximums clearly before publication.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** Add Instructor rerun through a dedicated durable review-execution target. The two split migrations passed guarded `projex_test` verification and were applied, by separate approval, to Freiser's normal local `projex`. Authenticated validation passed; Julius approved durable Iteration 2 diagnostic history without automatic cleanup. Protected integration remains separate.
- [ ] **PROPOSED / AWAITING APPROVAL** Decide whether Student custom stdin is required after native Git becomes usable; do not build a terminal emulator.
- [ ] **PROPOSED / AWAITING APPROVAL** Decide personalized nonempty-output checking and ungraded activity semantics.

Required tests/evidence:

- [x] File import/editor focused tests.
- [x] Client/server unit, Java and guarded PostgreSQL integration suites recorded passing.
- [x] Authenticated Student/Instructor walkthrough and narrow layout.
- [x] Staged diff review, `git diff --cached --check`, dependency/schema/secret review for the 16-file core.
- [x] For rerun: immutable source, no attempt use, no score/evidence replacement, released-result preservation, existing Java input/output limits, authorization and hidden-test privacy verified by guarded integration, frontend tests and authenticated walkthrough; final diff/security review and Checker acceptance completed for Freiser's checkpoint.

Acceptance criteria:

- Current core is complete only after the logical slice is committed and accepted.
- Adviser follow-ups are not complete until separately implemented/tested; they do not silently enter the protected core commit.

Recommended owner: Julius or the backend lead for rerun; editor/test-case UX is safely delegable after the core commit.

## I2.2 — Academic Work Hub

Status: **PENDING**

Objective: provide truthful cross-class Student work/submission views and an Instructor review queue.

Prerequisites:

- [ ] I2.1 core integrated.
- [ ] Academic class identity/projections stable enough for cross-class display.
- [ ] Instructor rerun contract known so queue actions do not need immediate redesign.

Implementation:

- [ ] Student upcoming/overdue activities and project tasks.
- [ ] Global Student submission/attempt history with released-result rules.
- [ ] Instructor queue for failed assessment recovery, review, feedback and release.
- [ ] Remove the current dashboard Review Queue placeholder only when navigation remains truthful.
- [ ] Server filtering, stable sorting, pagination and honest loading/empty/error states.

Tests/evidence:

- [ ] Cross-class authorization and one-Student isolation.
- [ ] Deadline ordering, archive behavior and no unreleased-score leakage.
- [ ] API projection tests, frontend route tests, lint/build, desktop/narrow walkthrough.

Deliverables/acceptance:

- Real data only; no cached/fabricated counts.
- Queue actions link to authorized exact records.
- Pre-commit report and separate integration approval.

Recommended owner: frontend/API integration member after academic projections stabilize.

## I2.3 — Repository Workflow and Monitoring

Status: **PENDING; class-workspace extension PROPOSED / AWAITING APPROVAL**

Objective: prove existing project/team repository workflows, add truthful activity evidence, and—after approval—connect individual programming work to Git without replacing explicit academic submission.

Prerequisites:

- [ ] I2.1 integrated.
- [ ] Existing project/repository walkthrough repeated on the accepted baseline.
- [ ] Approve class-workspace repository model, submission provenance and commit-retention policy.
- [ ] Academic class offering relationship stable.

Existing-scope implementation:

- [ ] Prove project task, team, repository, invitation, membership and review lifecycle.
- [ ] Fix confirmed discoverability defects only.
- [ ] Add authenticated repository event feed and non-percentage contribution evidence.

Proposed class-workspace slice:

- [ ] Provision at most one Student-owned workspace repository per Student/class pair.
- [ ] Keep existing collaborative `CLASS_PROJECT` repositories unchanged.
- [ ] Allow browser editor/import submissions to continue.
- [ ] Let a Student select an authorized commit and bounded Java file, preview it, and explicitly Submit.
- [ ] Save immutable source/source hash plus repository, full commit ID and path provenance.
- [ ] Ensure later commits cannot alter the submitted snapshot.
- [ ] Preserve Student ownership and class-scoped Instructor read/review access.
- [ ] Decide whether v1 restricts submission to protected `main` or supports selected feature branches with commit retention.
- [ ] Do not auto-submit on push, create a special submission branch or expose a server shell.

Tests/evidence:

- [ ] Guarded migration/integration tests for one workspace per Student/class.
- [ ] Cross-repository, cross-class, removed-member and wrong-activity rejection.
- [ ] Exact commit/file resolution, size/text validation and immutable snapshot tests.
- [ ] Push after submission leaves the submission unchanged.
- [ ] Existing project/team repository regressions and real-Git tests.
- [ ] Authenticated browser/VS Code loopback walkthrough using disposable data.

Acceptance:

- Push and Submit are visibly distinct.
- Git author strings are never presented as verified authorship.
- No ownership transfer, unrestricted command endpoint or hidden server path exposure.

Recommended owner: backend/Git lead; UI selection/preview may be delegated after contracts are fixed.

## I2.4 — Similarity Indicators

Status: **PENDING — deferrable before October 30**

Objective: provide Instructor-only similarity indicators as review aids, never plagiarism verdicts.

Prerequisites/approval:

- [ ] Approve algorithm, normalization, minimum source length, false-positive language, retention and recomputation rules.
- [ ] I2.1 immutable submissions stable.

Implementation/tests:

- [ ] Compute only within authorized same-activity scope.
- [ ] Version evidence and protect student source/privacy.
- [ ] Test short/common-template false positives and authorization.
- [ ] Add explanatory Instructor UI only after evidence is reliable.

Acceptance/evidence:

- Existing `SimilarityResult` alone is not completion.
- Human-review wording and bounded evidence must be accepted.

Recommended owner: research/algorithm member paired with backend reviewer. Defer if it threatens I2.6–I2.9.

## I2.5 — Class Communication

Status: **PENDING — deferrable before October 30**

Objective: add real announcements and in-app notifications after audience/lifecycle rules are approved.

Prerequisites/approval:

- [ ] Approve authors, audiences, read state, archive behavior and moderation.
- [ ] I2.2 navigation/work views stable.

Implementation/tests:

- [ ] Replace deferred stream only with persistent authorized data.
- [ ] No fake counters, local-only posts or SMTP dependency.
- [ ] Test class isolation, archive behavior and notification privacy.

Acceptance/evidence:

- Real backend, UI and read-state behavior all pass; otherwise keep the feature deferred.

Recommended owner: full-stack member after critical-path work.

## I2.6 — Recovery and Laboratory Package

Status: **PENDING — required for pilot**

Objective: prepare and prove installation, restart, paired backup/restore, rollback and operator recovery.

Prerequisites:

- [ ] Repository storage model stable enough for a paired recovery point.
- [ ] Approved isolated test restore targets.
- [ ] Resolve production SMTP/startup expectation.

Implementation/tests:

- [ ] Build accepted commit on Linux using release preparation.
- [ ] Complete API/worker service definitions and start/stop order for approved capabilities.
- [ ] Take a guarded PostgreSQL + complete Git-root backup.
- [ ] Restore to isolated targets and verify checksums, relationships and repositories.
- [ ] Test restart, rollback, log retention and host-shutdown recovery.

Acceptance/evidence:

- Redacted backup manifest/checksum, restore verification and operator runbook.
- No destructive normal-data restore or secret in Git.

Recommended owner: two infrastructure members with Julius approving every destructive/host boundary.

## I2.7 — Isolated Java Execution

Status: **PENDING — required for pilot**

Objective: move untrusted Java from host `local_process` into a container or equivalent reviewed OS-level isolation boundary.

Prerequisites:

- [ ] I2.1 execution contracts, including approved rerun behavior, stable.
- [ ] Threat model and target Linux/container runtime approved.

Implementation/tests:

- [ ] Preserve durable queue and separate worker.
- [ ] Bound CPU, memory, wall time, output, processes, filesystem and network.
- [ ] Use disposable per-job environments and fail closed when unavailable.
- [ ] Test compile/runtime failures, hangs, forks, output floods, cleanup and crash recovery.

Acceptance/evidence:

- Independent safety review and redacted execution evidence.
- No claim of perfect hostile-code security.

Recommended owner: backend/infrastructure lead; do not delegate as an isolated UI task.

## I2.8 — Secure Laboratory Git Access

Status: **PENDING — required for pilot**

Objective: enable native clone/fetch/push only from the approved laboratory network over reviewed HTTPS.

Prerequisites:

- [ ] I2.3 repository contracts stable.
- [ ] Local loopback Smart HTTP tests and manual disposable-repository walkthrough pass.
- [ ] Approved host, TLS, reverse proxy, laboratory network range and firewall policy.

Implementation/tests:

- [ ] Preserve short-lived repository-scoped credentials and per-request authorization.
- [ ] Route Git without making remote clients appear loopback-trusted accidentally.
- [ ] Keep protected refs, limits, atomic validation and push-activity recovery.
- [ ] Test Student owner/member, Instructor read-only, removed user, wrong repository, revocation and expiry.
- [ ] Test concurrent clients, restart, initial empty repository and branch workflows.

Acceptance/evidence:

- Three-computer native Git evidence on the approved network.
- No public Internet Git, SSH or unrestricted shell.

Recommended owner: Git/backend lead plus infrastructure member; firewall/TLS changes require Julius approval.

## I2.9 — SLU Laboratory Pilot

Status: **PENDING — final pilot gate**

Objective: deploy and validate the accepted release on an approved SLU laboratory host for a controlled test window.

Prerequisites:

- [ ] I2.6 recovery proof accepted.
- [ ] I2.7 Java isolation accepted.
- [ ] I2.8 laboratory Git access accepted.
- [ ] Release commit, migrations, accounts, retention and incident plan approved.

Implementation/tests:

- [ ] Configure PostgreSQL, API, frontend, Java worker and Git worker as supervised services.
- [ ] Apply migrations only through the approved release procedure.
- [ ] Test Student, Instructor and Admin workflows on multiple laboratory computers.
- [ ] Test realistic programming activities, Git collaboration, restart, backup/restore and rollback.
- [ ] Review redacted logs and record limitations/findings.

Acceptance/evidence:

- Controlled pilot report and adviser acceptance decision.
- No claim of university-wide production, high availability or public access.

Recommended owner: Julius as release manager; members execute assigned test roles and evidence capture.

## Maintenance procedure

At each bounded work completion:

1. Verify branch, HEAD, diff, Prisma state and actual checks.
2. Update only the affected checklist rows and active milestone report.
3. Link concrete evidence; do not paste secrets, credentials, source submissions or hidden tests.
4. Mark **COMPLETED** only after implementation, tests, review and acceptance.
5. Record **PROPOSED / AWAITING APPROVAL** until product/schema/network authority is explicit.
6. Keep roadmap scope changes in `ITERATION_2_ROADMAP.md`; keep day-to-day completion state here.
7. Stage roadmap/checklist changes as their own logical documentation changeset, never inside an application feature commit.
