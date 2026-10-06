# Projex Iteration 2 Execution Checklist

## Tracker identity

- Revision: **I2-C10**
- Updated: **2026-10-04**
- Deadline target: **2026-10-30**
- Scope authority: `docs/team/ITERATION_2_ROADMAP.md` revision I2-R7
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
| I2.3 existing repository workflow/activity slice | ACCEPTED FOR FREISER CHECKPOINT | Authenticated provisioning and accepted-push feed, per-user accepted-push counts, final guarded 19/91 integration and full client 47/299, plus controlled localhost Student/Instructor/Admin validation are recorded in `milestones/I2.3.md`. Invitation acceptance lacks a second controlled walkthrough account; automated coverage passed. |
| I2.3 Student class-workspace foundation | ACCEPTED FOR FREISER CHECKPOINT — 2026-10-04 | Checker accepted the bounded one-Student/Class workspace. Two additive migrations applied only to `projex_test`; guarded integration 21/103, final post-correction standalone client 51/318, focused repository frontend 3/40, Smart HTTP 1/11 and real-Git 2/10 passed; isolated server 222/225 with the same three inherited Windows storage/restore failures. Normal `projex` was not migrated. See `milestones/I2.3.md`. |
| Course/Class Offering foundation | COMPLETED — ACCEPTED FOR FREISER CHECKPOINT | Checker accepted the bounded foundation after targeted CSV and Primary/Co boundary corrections. Split migrations applied only to disposable `projex_test`; final guarded integration 20/99, client 49/301, lint/type/build and controlled authenticated walkthrough passed. Normal `projex` migration remains separately gated. See `milestones/ACADEMIC_FOUNDATION.md`. |
| Personalized Exercise 1 checking | PROPOSED / AWAITING APPROVAL | Nonempty-output comparator/grading contract unresolved |
| I2.2 | ACCEPTED FOR FREISER CHECKPOINT | Final guarded integration 21/102 and full client 51/311 passed; client/server lint, server type/build and client build passed. The isolated server suite remains 221/224 with three separately tracked unchanged Windows storage/restore failures. Freiser's detailed desktop walkthrough and final 390 × 844 Student and Instructor re-check passed; Checker accepted the corrected responsive shell and Class layout. Loading/error/retry were not separately reported as manually passed. See `milestones/I2.2.md`. |
| I2.4–I2.9 | PENDING | Both the bounded existing-scope I2.3 slice and the separate class-workspace foundation are accepted for Freiser's checkpoint. Later Submit/provenance and network Git remain separate gates. |
| Normal database migration for Iteration 2 | PARTIAL — APPROVED RERUN SLICE ONLY | The two committed Instructor Rerun migrations were applied to Freiser's local `projex`; other proposed Iteration 2 schema work remains unapproved. |
| Network Git | PENDING | Smart HTTP remains loopback-only; browser Home-LAN testing is not Git transport evidence |

## Critical path to October 30

- [ ] **IN PROGRESS** I2.1 core committed/pushed on task branch; integrate only through a separate approval gate.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** Instructor rerun preserves original assessment, attempts, feedback and scores; guarded tests, approved normal-local migration, authenticated desktop/narrow walkthrough, retention decision and Checker acceptance are recorded in the rerun milestone. Protected integration remains separate.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** Course/Class Offering foundation, staff policy, in-place conversion and bounded Course/student-invitation CSV flows passed final Checker review; normal-database migration remains separately gated.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** I2.2 cross-class work views and bounded responsive corrections passed final Checker review after Freiser's 390 × 844 Student and Instructor PASS. Protected integration remains separate.
- [ ] **PROPOSED / AWAITING APPROVAL** Add the smallest repository-to-submission slice inside I2.3.
- [ ] **PENDING** Prove paired recovery in I2.6.
- [ ] **PENDING** Isolate Java execution in I2.7.
- [ ] **PENDING** Enable approved-network Git in I2.8.
- [ ] **PENDING** Complete the controlled SLU laboratory pilot in I2.9.
- [ ] **PENDING** Reconcile accepted evidence into the research paper before the deadline.

## Cross-cutting academic foundation follow-up

Status: **COMPLETED — ACCEPTED FOR FREISER CHECKPOINT**; protected integration and normal-database migration remain separate.

Objective: represent reusable Courses and official Class Offerings without confusing Official Class Code, Class UUID or the generated Projex join code. Support controlled teaching staff and bounded invitation setup.

Prerequisites:

- [x] Approve reusable Admin-managed Course Number and Course Name; retain Class UUID as offering identity.
- [x] Permit 1st/2nd Semester offerings in any school year, without a global Official Class Code uniqueness assumption.
- [x] Approve Instructor informal creation, Admin official creation and in-place official conversion of existing teaching Classes.
- [x] Approve Primary/Co-Instructor staff policy, invitation acceptance, explicit transfer disposition and Admin recovery.
- [x] Approve Course CSV import and bounded student **invitation** CSV; direct roster enrollment and join-request state are not approved in this slice.

Implementation checklist:

- [x] Add reusable Course records with Course Number and Course Name; no Units/curriculum.
- [x] Extend existing Class with optional structured official metadata and nullable legacy-compatible fields; preserve UUID and separate generated join code.
- [x] Add Admin official metadata impact/correction with reason, history acknowledgement, optimistic version and durable audit.
- [x] Add pending/active/removed Co-Instructor relationships and explicit Primary transfer/recovery disposition.
- [x] Add Admin Course manual create/edit and CSV preview/confirm; add bounded Student invitation CSV preview/confirm without direct enrollment.
- [x] Complete affected UI, regression/security checks and controlled test-database walkthrough; review the full logical diff. Narrow Instructor staff/Class Info and Admin Course Catalog/official-creation layouts were checked.
- [ ] Obtain separate normal-database migration approval before applying these migrations to Freiser's normal `projex`.

Required tests:

- [x] Split migration deploy against guarded `projex_test`; legacy Class fields remain populated and linked records are untouched.
- [x] Final guarded integration for repeated Course/Official Class Code, in-place conversion, staff transfer/Admin recovery, CSV edge cases/atomicity and authorization: 20 files/99 tests on verified `projex_test`; post-run relevant records empty.
- [x] Affected server isolated/client regression and lint/type/build checks: server 221/224 with the same three inherited Windows storage/restore failures; client 49/301; server/client lint, server production/integration type-check and client build passed. Java code was not changed; existing Java evidence remains separate.
- [x] Authenticated controlled-local UI walkthrough against disposable `projex_test`: Admin, Primary, Co-Instructor and Student flows at desktop; Instructor staff/Class Info and Admin catalog/offering creation at 390 px. The former-Primary leave navigation defect was fixed and regression-covered.

Deliverables and acceptance:

- Structured course/offering projections and clear display title.
- Previewed Course and Student invitation imports with no raw-file retention or automatic account creation.
- Existing class/activity/submission/repository relationships preserved.
- Manual invitation and existing join-code flows remain distinct; no join-request lifecycle was added.
- Guarded test-database migration completed; normal-database application remains a separate approval gate.

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

Status: **ACCEPTED FOR FREISER CHECKPOINT**; protected-branch integration remains separate.

Objective: provide truthful cross-class Student work/submission views and an Instructor review queue.

Prerequisites:

- [x] I2.1 core accepted on the cumulative member branch, satisfying the internal development dependency; protected integration remains separate.
- [x] Academic class identity/projections accepted on the cumulative member branch; normal `projex` migration remains separately gated.
- [x] Instructor rerun contract accepted so queue actions do not need immediate redesign.

Implementation:

- [x] Student upcoming/overdue activities and project tasks across ACTIVE memberships.
- [x] Global Student submission/attempt history with released-result rules.
- [x] Instructor queue for failed assessment recovery, review, feedback and release, including repositories ready for review.
- [x] Replace the dashboard Review Queue placeholder with truthful navigation.
- [x] Server filtering, stable sorting, pagination and honest loading/empty/error states.

Tests/evidence:

- [x] Cross-class authorization and one-Student isolation covered by guarded integration and authenticated API walkthrough.
- [x] Deadline ordering, archive behavior and no unreleased-score leakage covered by guarded integration.
- [x] API projection tests, frontend route/mobile-navigation tests, lint/type/build and final guarded 21-file/102-test integration and 51-file/311-test client suites passed.
- [x] Freiser's authenticated desktop walkthrough of Student, Primary/Co-Instructor and Student/Admin authorization surfaces passed; see `milestones/I2.2.md`.
- [x] Freiser's final 390 × 844 re-check passed for Student and Instructor after the bounded dashboard/Class correction; Checker accepted the milestone. Individual loading/error/retry scenarios were not separately reported as manually passed.

Deliverables/acceptance:

- Real data only; no cached/fabricated counts.
- Queue actions link to authorized exact records.
- Pre-commit report and separate integration approval.

Recommended owner: frontend/API integration member after academic projections stabilize.

## I2.3 — Repository Workflow and Monitoring

Status: **ACCEPTED FOR FREISER CHECKPOINT for the bounded existing-scope slice and the separate Student class-workspace foundation (2026-10-04)**

Objective: prove existing project/team repository workflows, add truthful activity evidence, and—after approval—connect individual programming work to Git without replacing explicit academic submission.

Prerequisites:

- [x] I2.1 accepted on the cumulative member branch; protected integration is a separate Julius gate.
- [x] Existing project/repository walkthrough repeated with controlled local accounts and data.
- [x] Authorize the bounded class-workspace foundation; submission provenance and commit-retention policy remain separate gates.
- [x] Accepted Course/Class Academic Foundation provides the stable `Class.id` and active membership/staff relationships used by this bounded repository slice.

Existing-scope implementation:

- [ ] Prove project task, team, repository, invitation, membership and review lifecycle. Project/task creation and publication, team/repository provisioning, review/request-changes/approval, archive/restore passed manually; invitation acceptance and member transition passed guarded integration but need a second controlled walkthrough account for manual proof.
- [ ] Fix confirmed discoverability defects only.
- [x] **ACCEPTED FOR FREISER CHECKPOINT** Add authenticated repository event feed and non-percentage contribution evidence from supported recorded provisioning and accepted-push operations.

Class-workspace foundation and deferred Submit slice:

- [x] Implement at most one Student-owned workspace repository per Student/class pair; Checker accepted for Freiser's checkpoint on 2026-10-04.
- [x] Preserve existing collaborative `CLASS_PROJECT` repositories; guarded regressions passed.
- [x] Preserve browser editor/import submissions as a separate authoring path.
- [ ] Let a Student select an authorized commit and bounded Java file, preview it, and explicitly Submit.
- [ ] Save immutable source/source hash plus repository, full commit ID and path provenance.
- [ ] Ensure later commits cannot alter the submitted snapshot.
- [x] Implement Student ownership and class-scoped Instructor read-only source/Git access; Checker accepted for Freiser's checkpoint on 2026-10-04.
- [ ] Decide whether v1 restricts submission to protected `main` or supports selected feature branches with commit retention.
- [ ] Do not auto-submit on push, create a special submission branch or expose a server shell.

Tests/evidence:

- [x] Guarded additive migration/integration tests for one workspace per Student/class: `projex_test` 21 files/103 tests, final schema up to date.
- [ ] Cross-repository, cross-class, removed-member and wrong-activity rejection.
- [ ] Exact commit/file resolution, size/text validation and immutable snapshot tests.
- [ ] Push after submission leaves the submission unchanged.
- [x] Existing project/team repository regressions and one controlled authenticated loopback native-Git push; the discovered root-tree 404 was fixed and guarded real-Git tests passed 2 files/10 tests.
- [ ] Authenticated browser/VS Code loopback walkthrough using disposable data. Browser and native Git CLI passed with controlled local records; invitation acceptance, a VS Code-specific pass, and a fully disposable walkthrough remain unverified.

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
