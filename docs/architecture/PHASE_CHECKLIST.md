# Projex Full-Stack Phase Checklist

## Purpose

This checklist gates the transition from the hardcoded UI to a functional full-stack system. It does not authorize implementation beyond the phase explicitly requested and accepted.

Status markers:

- `[x]` documented/completed in the current phase.
- `[ ]` pending.
- `[~]` partially complete or requires acceptance/verification.

## Phase 0: architecture and development standards

### Confirmed decisions

- [x] Existing frontend recorded as React 19, Vite, JavaScript/JSX, React Router, and existing CSS.
- [x] Frontend TypeScript migration explicitly excluded.
- [x] Existing UI, CSS, routes, responsive behavior, and interactions identified as protected.
- [x] Planned backend recorded as Node.js, Express, TypeScript, Zod, Prisma ORM, and PostgreSQL.
- [x] Feature-based modular-monolith decision recorded.
- [x] API prefix fixed at `/api/v1`.
- [x] Roles fixed as `STUDENT`, `INSTRUCTOR`, and `ADMIN` from the authorization foundation.
- [x] Student and Instructor end-to-end academic workflows prioritized before Admin UI functionalization.
- [x] Admin retained in scope with a dedicated later phase and the existing admin prototype preserved.
- [x] Activities own configurable `maxAttempts` from 1 through 3.
- [x] Submissions defined as immutable, server-numbered attempts with permanent academic history.
- [x] Two-layer assessment defined through `automatedScore`, `instructorAdjustment`, and derived `finalScore`.
- [x] PostgreSQL-backed jobs and separate workers approved as the initial free, self-hosted queue.
- [x] Local-first, cloud-provider-neutral development recorded.
- [x] Later internet-accessible controlled testing/defense target recorded.
- [x] University-wide deployment, high availability, multi-server failover, and 24/7 availability recorded as out of scope.

### Required Phase 0 documents

- [x] `SYSTEM_ARCHITECTURE.md`
- [x] `BACKEND_STRUCTURE.md`
- [x] `API_CONVENTIONS.md`
- [x] `DATABASE_CONVENTIONS.md`
- [x] `SECURITY_RULES.md`
- [x] `DEVELOPMENT_WORKFLOW.md`
- [x] `PHASE_CHECKLIST.md`
- [x] `docs/FUNCTIONALIZATION_AUDIT.md` left unchanged.

### Architecture coverage

- [x] Domain feature modules listed: auth, users, classes, class-members, activities, test-cases, submissions, assessments, feedback, project-tasks, teams, repositories, repository-members, repository-invitations, notifications, analytics.
- [x] Infrastructure modules listed: database, Git, Java execution, job queue, storage, logging.
- [x] Routes, controllers, services, repositories, validation schemas, and tests have defined responsibilities.
- [x] Success, paginated list, and machine-coded error response formats defined.
- [x] Attempt numbering, idempotency, immutability, history, constraints, and atomic limit checks defined.
- [x] Automated/test-level scores, instructor adjustments, final score, review time, and release time defined.
- [x] Prisma/PostgreSQL naming, UUIDs, timestamps, archives, constraints, transactions, migrations, and seeds defined.
- [x] Secure sessions, HTTP-only cookies, CSRF, backend role checks, ownership, and membership checks defined.
- [x] Local OpenJDK queue/worker isolation and resource boundaries defined with no external compiler API.
- [x] Local Git CLI/bare repository/worktree/path/lock boundaries defined with no GitHub/GitLab API.
- [x] `.env`, `.env.example`, secrets, and separate hosted/local configuration rules defined.
- [x] Branch, commit, verification, deployment, and Codex workflows defined.

### Phase 0 acceptance gate

- [x] No backend code implemented.
- [x] No package installed.
- [x] No application source modified.
- [x] No configuration changed.
- [x] No folder reorganized.
- [x] Only existing files under `docs/architecture/` revised.
- [x] `docs/FUNCTIONALIZATION_AUDIT.md` not modified.
- [ ] Revised documents reviewed and accepted by the project owner.

Do not begin Phase 1 until the final Phase 0 item is accepted.

## Phase 1: backend and PostgreSQL foundation

- [ ] Create a phase branch from `development/fullstack`.
- [ ] Record frontend lint/build baseline and protected-route desktop/narrow screenshots.
- [ ] Add the backend package without reorganizing the frontend.
- [ ] Configure Node.js, Express, TypeScript, Zod, Prisma, and PostgreSQL.
- [ ] Add validated environment configuration and `.env.example`; keep `.env` uncommitted.
- [ ] Add `/api/v1`, structured logging, request IDs, standard response envelopes, and central error handling.
- [ ] Add database health/readiness checks with no sensitive details.
- [ ] Add Prisma migration and deterministic local seed workflows.
- [ ] Add backend lint, type-check, build, unit-test, and integration-test commands.
- [ ] Verify startup and migration on a clean local database.
- [ ] Confirm the existing frontend still builds and renders unchanged.
- [ ] Report every changed file and stop.

## Phase 2: authentication, users, sessions, and role foundation

- [ ] Implement users/accounts and `STUDENT`, `INSTRUCTOR`, `ADMIN` roles from the beginning.
- [ ] Implement password hashing and server-side session storage.
- [ ] Implement HTTP-only secure cookies, session rotation, expiry, logout, and CSRF.
- [ ] Implement current-session endpoint and backend role checks.
- [ ] Implement account status and role-change auditing.
- [ ] Add login rate limits and safe machine-readable errors.
- [ ] Bind existing login/profile/sign-out UI without redesign.
- [ ] Protect student, instructor, and admin APIs/routes appropriately.
- [ ] Test direct URL access, frontend role spoofing, session fixation, expiry, logout, and disabled accounts.
- [ ] Preserve the existing Admin prototype even though early Admin UI functionalization is not required.
- [ ] Keep non-auth mocks unchanged.
- [ ] Report every changed file and stop.

## Phase 3: classes and class membership

- [ ] Implement course/section/class, instructor assignment, and class membership records needed by the first workflow.
- [ ] Allow an instructor to create a class.
- [ ] Generate a unique server-owned class code.
- [ ] Allow the instructor to rotate or revoke the class code.
- [ ] Allow a student to join using an active class code.
- [ ] Prevent duplicate class membership with a database constraint and idempotent workflow.
- [ ] Allow the instructor to list class members.
- [ ] Allow deactivation/removal of current membership without deleting academic history.
- [ ] Check backend class membership/assignment for every protected class operation.
- [ ] Bind existing class shell, header, people/roster, create-class, and join-code UI without redesign.
- [ ] Test invalid/revoked codes, duplicate/concurrent joins, removed membership, and cross-class access.
- [ ] Treat invitation email delivery, invitation acceptance/decline pages, and invitation expiry as later enhancements unless separately required.
- [ ] Keep repository collaborator invitations in scope for Phase 8.
- [ ] Keep unrelated activity/repository mocks unchanged.
- [ ] Verify desktop/narrow UI, report every changed file, and stop.

## Phase 4: programming activities and test cases

- [ ] Implement activity title/instructions, lifecycle, publication state, visibility, due date, starter code, total points, and programming language.
- [ ] Implement and validate `maxAttempts` from 1 through 3.
- [ ] Implement visible and hidden test-case authoring, ordering, and automated points.
- [ ] Prevent hidden test content from student responses.
- [ ] Bind existing activity lists/detail/create/settings UI through JavaScript adapters and view models.
- [ ] Preserve current routes and workspace layout.
- [ ] Test lifecycle transitions, due-date/timezone behavior, points/attempt validation, and cross-class access.
- [ ] Keep execution and submission behavior simulated until their approved phases.
- [ ] Report every changed file and stop.

## Phase 5: local Java execution and execution queue

- [ ] Use a locally managed OpenJDK; do not use an external compiler API.
- [ ] Implement PostgreSQL-backed job records with atomic claiming, leases, retries, bounded concurrency, and terminal states.
- [ ] Run a separate worker process; never compile or execute inside the main API process.
- [ ] Accept bounded source code and stdin only; never client shell commands.
- [ ] Do not allow clients to select executable paths, compiler/JVM flags, resource limits, environment values, or host paths.
- [ ] Compile once per submission assessment.
- [ ] Enforce compile timeout, execution timeout, memory, CPU, process/thread, disk, and output-size limits.
- [ ] Disable worker network access and restrict filesystem access.
- [ ] Use a unique temporary directory per job and guarantee cleanup.
- [ ] Return a safe normalized result without host paths, commands, or hidden tests.
- [ ] Add Docker/container isolation before internet-hosted execution.
- [ ] Confirm Redis, RabbitMQ, or another queue product is not required for the controlled pilot.
- [ ] Test success, compile error, runtime error, timeout, memory/CPU/output limits, worker crash/retry, atomic claim, and cleanup.
- [ ] Report every changed file and stop.

## Phase 6: submission attempts and automated assessment

- [ ] Implement immutable UUID `Submission` attempts.
- [ ] Add `attemptNumber` starting at 1 and uniqueness on `(activity_id, student_id, attempt_number)`.
- [ ] Derive student identity and authoritative attempt number on the backend.
- [ ] Atomically verify membership, activity acceptance, due/late state, existing count below `maxAttempts`, and next attempt number.
- [ ] Implement idempotency so double-clicks/retries do not create or consume duplicate attempts.
- [ ] Permanently preserve each attempt's source snapshot, submitted time, late/status values, execution result, automated score, and review state.
- [ ] Retrieve complete authorized attempt history.
- [ ] Initiate assessment through the Phase 5 execution queue.
- [ ] Preserve deterministic per-test-case results and `automatedPoints`.
- [ ] Compute and store `automatedScore` without instructor overwrite.
- [ ] Bind existing workspace/submission records to attempts without redesign or broad mock removal.
- [ ] Use errors including `ATTEMPT_LIMIT_REACHED`, `DUPLICATE_SUBMISSION_REQUEST`, `SUBMISSION_ALREADY_PROCESSING`, `ACTIVITY_NOT_ACCEPTING_SUBMISSIONS`, and `SUBMISSION_NOT_FOUND`.
- [ ] Test attempt-limit races, double-click, network retry, concurrent tabs, due-date race, immutability, history, and unauthorized access.
- [ ] Report every changed file and stop.

## Phase 7: instructor review, score adjustment, and feedback release

- [ ] Preserve `automatedScore` and every automated test result during review.
- [ ] Implement signed `instructorAdjustment` with reviewer and review timestamp.
- [ ] Derive `finalScore` consistently within zero and activity total points.
- [ ] If test-level editing is enabled, preserve both `automatedPoints` and `instructorAdjustedPoints`.
- [ ] Implement instructor-only grade/feedback drafts.
- [ ] Atomically release final score/feedback and record `feedbackReleasedAt`.
- [ ] Keep unreleased drafts invisible to students.
- [ ] Authorize review to assigned instructors; keep Admin access explicit, minimized, and audited.
- [ ] Bind existing submission queue/review/feedback UI without redesign.
- [ ] Test adjustment bounds, concurrent edits, automated-score immutability, draft visibility, release idempotency, timestamps, and cross-class access.
- [ ] Report every changed file and stop.

## Phase 8: project tasks, teams, repository invitations, and local Git repositories

- [ ] Implement project tasks, teams, team membership, and project requirement linkage.
- [ ] Implement repository collaborator invitations, acceptance/decline, membership, and authorization.
- [ ] Implement server-owned repository identifiers and bare local Git repository provisioning.
- [ ] Use the local Git CLI executable plus argument arrays; never concatenate client input into shell strings.
- [ ] Never trust repository paths from the frontend.
- [ ] Validate repository names, repository-relative file paths, and branch/tag names.
- [ ] Use temporary worktrees with guaranteed cleanup.
- [ ] Disable unsafe hooks/helpers/config and bound Git process time/output.
- [ ] Implement per-repository write locks/leases and stale-lock recovery.
- [ ] Preserve commit, branch, diff, and contribution history.
- [ ] Bind existing student/instructor repository UI without redesign.
- [ ] Do not use GitHub or GitLab APIs for core behavior.
- [ ] Test traversal/ref injection, unauthorized access, invite races, concurrent writes, failed provisioning, lock recovery, and archive read-only state.
- [ ] Verify desktop/narrow repository UI, report every changed file, and stop.

## Phase 9: Admin functionality

- [ ] Preserve explicit `ADMIN` authorization and audit every sensitive action.
- [ ] Functionalize user-account management and account activation/deactivation.
- [ ] Functionalize instructor assignment support.
- [ ] Functionalize class and course oversight.
- [ ] Functionalize repository and storage monitoring.
- [ ] Functionalize archive controls and system-health views.
- [ ] Add only narrowly approved controlled maintenance tools.
- [ ] Apply data-minimization and privacy rules; Admin does not automatically receive every private field.
- [ ] Preserve the existing admin routes, components, CSS, and visible structure.
- [ ] Test role enforcement, auditing, dangerous-action confirmation, archive/history preservation, and student/instructor data visibility.
- [ ] Report every changed file and stop.

## Phase 10: integration, hardening, laboratory testing, and temporary internet deployment

- [ ] Implement persisted authorized notifications and unread state.
- [ ] Implement analytics from canonical records with role-specific projections.
- [ ] Implement general student similarity status and detailed instructor-only similarity indicators.
- [ ] Complete security hardening, integration tests, end-to-end tests, and laboratory testing.
- [ ] Confirm all required Student, Instructor, and approved Admin workflows work locally first.
- [ ] Select a portable temporary VPS, GitHub Student Developer Pack credit, Azure for Students, another student cloud credit, or an SLU host.
- [ ] Keep core code cloud-provider-neutral and self-host PostgreSQL, OpenJDK/Java, and Git.
- [ ] Do not make Cloudflare Tunnel or any specific provider mandatory.
- [ ] Configure TLS reverse proxy, frontend, API, workers, PostgreSQL, and persistent server-owned storage.
- [ ] Inject separate hosted secrets/environment variables; do not copy or commit local `.env`.
- [ ] Apply migrations as a controlled release step.
- [ ] Enable Java execution only after container/no-network isolation and limits pass hosted tests.
- [ ] Configure restricted test accounts and non-production academic data.
- [ ] Configure logs, security events, health checks, backups, restore test, and shutdown/incident procedures.
- [ ] Verify authorization and resource limits from an internet client.
- [ ] Define the controlled testing/defense availability window.
- [ ] Document that university-wide rollout, high availability, multi-server failover, and a 24/7 SLA are out of scope.
- [ ] Remove or disable the temporary environment after the approved period.
- [ ] Report every deployment artifact/change and stop.

## Every-phase regression gate

- [ ] Scope matches the explicit phase request.
- [ ] The application works at the end of the phase.
- [ ] Existing UI and routing preserved.
- [ ] Existing class names, layout, spacing, and responsive behavior preserved.
- [ ] No unrelated component redesign.
- [ ] `src/App.css` unchanged unless minimally required and explicitly justified.
- [ ] Data/mocks replaced only for the requested feature and workflow.
- [ ] Unrelated mocks preserved.
- [ ] Java and Git remain local/self-hosted with no external compiler, GitHub, or GitLab API.
- [ ] New input validated and backend authorization tested.
- [ ] Database constraints/transactions cover concurrency and academic-history invariants.
- [ ] `.env` and secrets absent from the diff; `.env.example` updated if needed.
- [ ] Relevant tests, lint, type checks, builds, migrations, API contracts, and desktop/narrow UI checks pass.
- [ ] Every changed file, migration, environment variable, manual step, and known limitation reported.
- [ ] Work stops after the requested phase.
