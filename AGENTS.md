# AGENTS.md

## Project

Projex is a UI-first academic programming platform for Saint Louis University that is being functionalized as a local-first full-stack system. The existing React UI remains protected while approved backend phases replace hardcoded behavior incrementally.

## Current Boundary

Phase 0 (architecture and planning) and implementation Phases 1 through 9 are complete, accepted, and integrated. Phase 10A.1 shared frontend foundation and authentication is the current approved milestone on `phase/10-frontend-integration`. Class, activity, submission, project, repository, Git, admin-data, admin-redesign, Phase 11, commit/push, and integration work remain separate approval boundaries.

## Live-State Authority

Use current repository evidence instead of relying on potentially stale summaries:

1. Git branch, HEAD, status, and logical diff own current repository facts.
2. The Prisma schema, committed migrations, and actual migration status own schema and migration facts.
3. Current package scripts and checks that were actually executed own verification evidence.
4. Current source code and nearest tests own implemented behavior.
5. The relevant current document under `docs/architecture/` owns the accepted subsystem contract.
6. Conversation summaries and historical documents are advisory and cannot override current repository evidence.

When evidence conflicts, inspect the owning source and report a material contradiction. Do not infer broader authorization from stale status text.

## Bounded Autonomy

Within an explicitly approved scope, Codex may:

- inspect repository state and the affected subsystem;
- choose technical implementation details consistent with accepted architecture;
- implement the approved behavior and directly related tests or documentation;
- fix directly related defects;
- run focused checks and affected regressions;
- repeat the diagnose, fix, test, and review cycle; and
- perform final diff/security review and provide one completion report.

Do not pause for ordinary lint failures, import mistakes, test-fixture defects, compilation errors, or directly related implementation corrections unless they reveal a protected-boundary issue.

## Protected Approval Boundaries

Stop before:

- changing product scope or making a major architectural decision;
- destructive or difficult-to-reverse actions;
- applying a migration to the normal development database unless explicitly authorized;
- persistent credential or environment changes;
- deleting non-test data or accepting material data-loss risk;
- weakening authorization, validation, isolation, security, or required testing;
- installing or upgrading a dependency with meaningful impact;
- production or non-loopback exposure;
- changing an unrelated subsystem;
- merging into `development/fullstack` or `main`;
- force-pushing, rewriting history, changing protected branches, or deleting branches; or
- deployment.

Codex may stage, commit, and push only to the current task or phase branch when the approved work order explicitly authorizes those operations and all required checks pass. Integration branches remain separate approval gates.

## Product Boundaries

- Preserve the React 19, Vite, JavaScript/JSX, React Router, and existing CSS frontend. Do not migrate it to TypeScript.
- Preserve unrelated UI behavior and mocks until their approved functionalization phase.
- Preserve the existing backend, database, authentication, authorization, ownership, and membership controls.
- Do not call external GitHub or GitLab APIs for core Git behavior.
- Do not call an external compiler API for core Java behavior.
- Keep development local-first, cloud-provider-neutral, and limited to controlled testing and defense rather than university-wide production.
- Keep Activity Mode and Project Collaboration Mode, with Student, Instructor, and Admin role views, visible in the eventual product.
- Keep the academic programming context visible; Projex is neither a generic LMS nor only a GitHub clone.
- Preserve eventual UI coverage for programming activities, project repositories, the code editor/compiler, submissions, instructor monitoring, contribution tracking, similarity indicators, feedback/grading, analytics, user/class/repository management, storage overview, and archived preservation.
- Student submission views use My Submissions, Submission Record, or Submitted Activities; they show submission time, review/test/grade state, and released feedback as available. Submission controls lock after acceptance and after the deadline, and activity views show deadlines and due states.
- Class membership remains visible through joins or invitations, enrolled classes, rosters, enrollments, and instructor assignments.

## Admin Frontend Direction

- The current admin frontend is a temporary mock and feature inventory, not an approved visual source of truth.
- Phase 9 defines backend admin capabilities, authorization, safe projections, and operational summaries and remains backend-focused unless separately approved.
- Phase 10D redesigns and integrates the admin frontend using the student and instructor interface as the visual source of truth.
- Do not functionalize or redesign admin frontend files before an explicitly approved frontend phase.

## Documentation Routing

Begin with this file, actual Git state, the target source files and nearest tests, and the owning subsystem document. Load additional documents only when the affected boundary, a concrete dependency, a contradiction, or a failed check requires them.

| Work area | Owning document |
| --- | --- |
| Cross-system design and trust boundaries | `docs/architecture/SYSTEM_ARCHITECTURE.md` |
| Backend modules and dependency direction | `docs/architecture/BACKEND_STRUCTURE.md` |
| HTTP contracts and response conventions | `docs/architecture/API_CONVENTIONS.md` |
| Database policy and current model overview | `docs/architecture/DATABASE_CONVENTIONS.md`, `docs/architecture/DATABASE_SCHEMA.md` |
| Authentication and authorization | `docs/architecture/AUTHENTICATION_AND_AUTHORIZATION.md` |
| Users and classes | `docs/architecture/USER_AND_CLASS_MANAGEMENT.md` |
| Activities and test cases | `docs/architecture/PROGRAMMING_ACTIVITIES_AND_TEST_CASES.md` |
| Submissions and Java assessment | `docs/architecture/SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md` |
| Project/team/repository academic workflow | `docs/architecture/PROJECT_REPOSITORY_COLLABORATION.md` |
| Git provisioning | `docs/architecture/GIT_FOUNDATION_AND_PROVISIONING.md` |
| Git Smart HTTP | `docs/architecture/GIT_SMART_HTTP_TRANSPORT.md` |
| Repository inspection | `docs/architecture/GIT_REPOSITORY_INSPECTION.md` |
| Frontend API/auth/state, route integration, mock retirement, and admin redesign | `docs/architecture/FRONTEND_INTEGRATION.md` |
| Branches, verification, reporting, and approval gates | `docs/architecture/DEVELOPMENT_WORKFLOW.md` |
| Accepted milestones and roadmap gates | `docs/architecture/PHASE_CHECKLIST.md` |

`docs/FUNCTIONALIZATION_AUDIT.md` and the root-level UI direction, feature inventory, route map, mock-data plan, implementation checklist, and instructor UI brief are historical snapshots. Preserve them as evidence and consult them only for relevant UI/prototype context; current architecture documents and repository behavior govern conflicts.

## Implementation Expectations

- Prefer existing project patterns and keep changes scoped.
- Use the feature-based backend structure, Zod validation, Prisma migrations, service-level authorization, transactions, and database constraints where applicable.
- Never use `prisma db push` or `prisma migrate reset`; stop on drift or a reset request.
- Never expose `.env`, credentials, tokens, cookies, database URLs, SMTP secrets, class join codes, hidden tests, host paths, or repository source/diffs outside their authorized response boundary or in logs.
- Do not run Git or Java through shell-concatenated client input, and never run Java execution inside the API process.
- Verify desktop and narrow/mobile behavior only when an approved task changes or integrates the frontend.
- Run checks proportional to the changed boundaries and report only checks that actually ran.
- Use the compact completion format in `DEVELOPMENT_WORKFLOW.md`; expand evidence for migrations, credentials, security-sensitive work, Git/Java execution, hosted operations, unresolved failures, phase completion, and formal capstone evidence.
