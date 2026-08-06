# AGENTS.md

## Project

Projex is a UI-first academic programming platform for Saint Louis University that is being functionalized as a local-first full-stack system. The existing React UI remains protected while approved backend phases replace hardcoded behavior incrementally.

## Current Instruction

Phases 0 through 8B are complete. Phase 8C is the approved backend-only, read-only repository-inspection slice. Preserve its strict source authorization, bounded Git execution, test-only storage boundary, and deferred server-side mutation design. Do not apply normal-data changes, modify the frontend, commit/push Phase 8C, or begin Phase 9 without explicit approval.

## Product Boundaries

For the current phased functionalization:

- Preserve frontend mocks outside the explicitly approved feature.
- Preserve the existing backend, database, and authentication implementation.
- Implement only the explicitly approved phase and stop when its scope is complete.
- Do not expose secrets or bypass backend authentication, authorization, ownership, or membership checks.
- Do not call external GitHub or GitLab APIs for core Git behavior.
- Do not call an external compiler API for core Java behavior.
- Keep the existing UI feature coverage visible while replacing mocks incrementally.

## Current Product Corrections

- Each programming activity configures one to three immutable attempts per student.
- The backend assigns sequential attempt numbers and permanently preserves every accepted attempt.
- Do not implement mutable resubmission or overwrite a prior attempt. Ordinary submissions count toward `maxAttempts`; a formally granted replacement for an infrastructure failure creates another immutable record without renumbering or deleting the failed submission.
- Student submission records should be labeled as My Submissions, Submission Record, or Submitted Activities.
- Student submitted activity records must show submitted date/time, review status, mock test result summary, grade status, and instructor feedback when available.
- Student submit controls must become disabled after submission and show a locked state.
- Student submit controls must also be disabled after the deadline if no submission exists.
- Activity Mode must show deadlines and due states.
- Phase 6 automated checking is real only through the separate controlled-local Java worker. It remains disabled by default and unavailable for internet hosting until container or equivalent isolation is implemented.
- Students may see visible-test outcomes immediately, but never hidden-test inputs, expected outputs, identifiers, names, outcomes, points, or counts.
- Detailed similarity review is primarily instructor-facing.
- Student View must not expose exact similarity scores, matched classmates, matched files, or side-by-side comparison.
- Student View may show only general academic review statuses such as Under Review, Needs Instructor Review, or Checked.
- Class membership must be visible through class code joins, pending invitations, enrolled classes, rosters, enrollments, and instructor assignments.
- Published activity test cases, starter code, language/entry-class settings, and scoring configuration are immutable.
- The professor-facing "Edit Automated Score" workflow creates append-only corrections preserving the original score, previous effective score, new effective score, mandatory reason, instructor identity, and correction timestamp.
- Numeric scores, instructor points, final score, feedback, and correction history remain hidden from students until release; released student responses still omit all hidden-test breakdowns.
- Infrastructure failures retry the same immutable submission and do not stop counting toward the allowance unless an instructor formally grants a time-limited replacement. Grant consumption and replacement creation are atomic.
- Released submissions are immutable during Phase 6. Post-release correction/versioning remains deferred.

## Phase 7 Product Rules

- Phase 7 is backend-only. Preserve every file under `client/`.
- `CLASS_PROJECT` repositories are always `CLASS_ONLY`; `PERSONAL` repositories are always `PRIVATE`. Clients cannot choose or mutate visibility, and `PUBLIC` is rejected.
- A class-project team and repository are created atomically. Every ACTIVE team member has a matching ACTIVE repository member, and the team lead remains the repository owner.
- The owner/lead cannot leave or be removed. Ownership transfer is deferred to a separately approved workflow.
- Invitation acceptance and member removal/reactivation update team and repository membership atomically. Repository membership never creates academic team membership by itself.
- Invitees must be ACTIVE students with ACTIVE membership in the same class and no ACTIVE team for the same project task. One unexpired PENDING invitation per invitee/project task is allowed.
- ACTIVE members plus unexpired PENDING invitations cannot exceed `maxTeamSize`; the owner counts toward capacity. Invitations expire at the earlier of seven days or the task deadline.
- Student mutations require a PUBLISHED task before its deadline. After the deadline or while CLOSED, only the owning instructor may perform reasoned corrective removal/reactivation; ordinary student collaboration remains closed.
- `REQUEST_CHANGES` is allowed only from `READY_FOR_REVIEW` while the task is PUBLISHED and before its deadline, and atomically releases non-empty textual feedback.
- The owning instructor may approve previously submitted `READY_FOR_REVIEW` work after the deadline or while CLOSED, with optional released textual feedback. Numeric grades and rubrics remain out of Phase 7.
- Project-task and class archiving must honor unexpired invitations, nonterminal repository review states, and synchronized membership invariants. Archived records are read-only.
- Phase 8A may create only verified empty bare repositories and exactly one `REPOSITORY_PROVISIONED` system activity after verification. Do not generate fake commits, refs, history, or other Git activity.
- Phase 8C may inspect only reachable branch history, trees, bounded UTF-8 files, and bounded diffs through authenticated APIs. It does not create branches, commits, merges, tags, refs, or contribution claims.

## Admin frontend direction

- The current admin frontend is a temporary mock and feature inventory, not an approved visual source of truth.
- Phase 9 defines backend admin capabilities, authorization, safe projections, and operational summaries and remains backend-focused unless separately approved.
- Phase 10D redesigns and integrates the admin frontend using the student and instructor interface as the visual source of truth.
- Do not functionalize the current dense admin UI as-is, and do not modify admin frontend files before an explicitly approved frontend phase.

## Required Product Modes

Projex has two major modes:

- Activity Mode.
- Project Collaboration Mode.

Both modes must be visible in the eventual UI.

## Required Role Views

Projex has three role-based views:

- Student View.
- Instructor View.
- Admin View.

The existing frontend may continue to simulate role switching until its approved integration phase. The backend authentication and authorization implementation is real and must remain authoritative for protected API behavior.

## Required Feature Visibility

The UI must show:

- Programming activities.
- Project repositories.
- Mock code editor/compiler.
- Submissions.
- Instructor monitoring.
- Contribution tracking.
- Similarity indicators.
- Feedback and grading.
- Learning analytics.
- User management.
- Course/section management.
- Repository management.
- System storage overview.
- Archived project preservation.

Do not skip these features.

## Product Positioning Guardrails

- Do not simplify Projex into a generic LMS.
- Do not make Projex look like only a GitHub clone.
- Keep the academic programming education context visible.
- Keep Saint Louis University context visible.
- Treat repositories as part of a learning workflow, not as the whole product.
- Treat activities as programming workspaces, not as generic assignments.

## Documentation Map

- `docs/architecture/`: Current full-stack architecture, security, API, database, workflow, and phase decisions.
- `docs/FUNCTIONALIZATION_AUDIT.md`: Dated pre-functionalization audit; preserve its historical findings.
- `docs/PROJEX_UI_DIRECTION.md`, `docs/PROJEX_FEATURE_INVENTORY.md`, `docs/PROJEX_ROUTES.md`, `docs/PROJEX_MOCK_DATA_PLAN.md`, `docs/PROJEX_IMPLEMENTATION_CHECKLIST.md`, and `docs/instructor-ui-guidelines.txt`: Historical UI-prototype documents. Preserve them as evidence, but do not use superseded rules as current architecture.

## Implementation Expectations For Future Agents

Before coding:

- Read the relevant current files in `docs/architecture/` and use historical documents only for UI context.
- Use the repository, committed migrations, automated tests, and current architecture documents as the source-of-truth order.
- Confirm the approved phase scope, exclusions, migration impact, authorization rules, verification plan, and explicit implementation authorization.
- Keep changes scoped and avoid unrelated refactors.

When coding begins:

- Prefer existing project patterns.
- Preserve unrelated client-side mocks until their approved functionalization phase.
- Use the feature-based backend structure, Prisma migrations, backend validation, and service-level authorization.
- Never use `prisma db push` or `prisma migrate reset`; stop on drift or reset requests.
- Never expose `.env`, credentials, tokens, cookies, database URLs, SMTP secrets, class join codes, hidden tests, or host paths.
- Verify the existing UI in desktop and narrow/mobile viewports when an approved phase changes or integrates it.
- Run the relevant lint, type-check, test, build, migration, and live checks before the final response.
