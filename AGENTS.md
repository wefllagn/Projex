# AGENTS.md

## Project

Projex is a UI-first localhost prototype for a web-based academic repository-learning platform for programming education at Saint Louis University.

## Current Instruction

Do not code the app until the documentation-first phase is complete and accepted. The initial work is to create and maintain planning documentation only.

## Product Boundaries

For the current prototype:

- Use hardcoded data only.
- Do not add a backend.
- Do not add real authentication.
- Do not call a real GitLab API.
- Do not add a real compiler backend.
- Do show almost all product features in the UI.

## Current Product Corrections

- Activity Mode uses one submission only per student per activity.
- Do not design repeated attempts or resubmission history unless the user explicitly changes that rule.
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

The prototype may simulate role switching locally. It must not require real login.

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

- `docs/PROJEX_UI_DIRECTION.md`: Product and UI direction.
- `docs/PROJEX_FEATURE_INVENTORY.md`: Required feature inventory.
- `docs/PROJEX_ROUTES.md`: Proposed route structure.
- `docs/PROJEX_MOCK_DATA_PLAN.md`: Hardcoded mock data plan.
- `docs/PROJEX_IMPLEMENTATION_CHECKLIST.md`: Build checklist and guardrails.

## Implementation Expectations For Future Agents

Before coding:

- Read all documents in `docs/`.
- Preserve the feature inventory unless the user explicitly changes scope.
- Use the implementation checklist as the source of truth for progress.
- Keep changes scoped and avoid unrelated refactors.

When coding begins:

- Prefer existing project patterns.
- Use client-side state and hardcoded data.
- Make features visible even when simulated.
- Add realistic mock data instead of placeholder lorem ipsum.
- Verify the UI in desktop and narrow/mobile viewports.
- Run available lint/build checks before final response.
