# AGENTS.md

## Project

Projex is a UI-first academic programming platform for Saint Louis University that is being functionalized as a local-first full-stack system. The existing React UI remains protected while approved backend phases replace hardcoded behavior incrementally.

## Current Instruction

Phases 0 through 3 are complete. Do not implement a new phase until its decisions and implementation plan are approved and the user explicitly says, "Implement the approved decisions."

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
- Do not implement mutable resubmission or overwrite a prior attempt; a new submission creates a new immutable attempt until `maxAttempts` is reached.
- Student submission records should be labeled as My Submissions, Submission Record, or Submitted Activities.
- Student submitted activity records must show submitted date/time, review status, mock test result summary, grade status, and instructor feedback when available.
- Student submit controls must become disabled after submission and show a locked state.
- Student submit controls must also be disabled after the deadline if no submission exists.
- Activity Mode must show deadlines and due states.
- Automated checking remains simulated.
- Students may see visible mock test summaries, but not hidden test logic.
- Detailed similarity review is primarily instructor-facing.
- Student View must not expose exact similarity scores, matched classmates, matched files, or side-by-side comparison.
- Student View may show only general academic review statuses such as Under Review, Needs Instructor Review, or Checked.
- Class membership must be visible through class code joins, pending invitations, enrolled classes, rosters, enrollments, and instructor assignments.

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
