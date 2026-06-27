# Projex Implementation Checklist

This checklist governs the later UI implementation. Do not start coding until the documentation-first phase is accepted.

## Phase 0: Documentation

- [x] Create UI direction document.
- [x] Create feature inventory.
- [x] Create route map.
- [x] Create mock data plan.
- [x] Create implementation checklist.
- [x] Create agent instructions.

## Phase 1: App Foundation

- [x] Inspect existing Vite/app structure.
- [x] Confirm framework, styling approach, and available icon library.
- [x] Create or adapt the app shell.
- [x] Add role switcher for Student, Instructor, and Admin.
- [x] Add mode switcher for Activity Mode and Project Collaboration Mode.
- [x] Add course/section selector.
- [x] Add mock notification entry point.
- [x] Add client-side routing or route-like state.
- [x] Add hardcoded mock data module.
- [x] Revise app shell navigation for class membership, one-submission activity records, instructor review, enrollments, and instructor assignments.

## Phase 2: Shared UI Components

- [x] Build navigation shell.
- [~] Build page header component. Basic page heading pattern exists in placeholder pages; not extracted yet.
- [x] Build metric cards or compact stat panels.
- [x] Build data table component.
- [x] Build status chip component.
- [~] Build filter/search controls. Detailed tables are present; full filtering is still pending.
- [ ] Build tabs.
- [ ] Build detail drawer or modal.
- [~] Build mock code editor panel. Student Activity Workspace includes a page-level mock editor panel.
- [~] Build mock terminal/compiler output panel. Student Activity Workspace includes simulated compiler output.
- [~] Build rubric display. Student Feedback and Grade includes a rubric summary table.
- [~] Build similarity indicator component. Instructor Similarity page shows detailed similarity rows and decisions.
- [~] Build contribution chart/list component. Student contribution tracking uses a detailed contribution table.
- [~] Build archive metadata panel. Student archive page shows preserved project metadata in table form.

## Phase 3: Student View

- [x] Student dashboard.
- [x] My Classes.
- [x] Join Class.
- [x] Class Invitations.
- [x] Student Activity Mode dashboard.
- [x] Activity workspace with instructions.
- [x] Activity file tree.
- [x] Mock code editor.
- [x] Mock compiler/test runner.
- [x] Submission panel with one-submission-only lock state.
- [x] My Submissions / Submission Record. Records are final, not repeated attempts.
- [x] Feedback and grading view.
- [x] Student Project Collaboration dashboard.
- [x] Repository overview.
- [x] Repository file browser.
- [x] Commit timeline.
- [x] Team task list.
- [x] Contribution tracking.
- [x] Student-safe academic review status. Exact similarity scores, matched classmates, matched files, and comparisons are not exposed.
- [x] Student learning analytics.
- [x] Student archive view.

## Phase 4: Instructor View

- [x] Instructor dashboard.
- [x] Class roster.
- [x] Invite students.
- [x] Class code.
- [x] Activity management list.
- [x] Activity settings.
- [x] Mock activity creation/editing screen.
- [x] Starter file and test configuration UI.
- [x] Rubric configuration UI.
- [x] Activity publishing/deadline controls.
- [x] Student monitoring view.
- [x] Submission queue.
- [x] Submission review screen.
- [x] Code diff or changed files preview.
- [x] Compiler/test result review.
- [x] Similarity review panel. Instructor-only detailed similarity route exists.
- [x] Feedback composer.
- [x] Rubric grading controls.
- [x] Grade release state.
- [x] Project repository oversight.
- [x] Contribution balance review.
- [x] Project similarity review.
- [x] Archive readiness view.
- [x] Instructor learning analytics.
- [x] Student academic coding profile.

## Phase 5: Admin View

- [x] Admin dashboard.
- [x] User management table.
- [~] User profile/detail. User-level rows and role/status controls exist; dedicated profile route remains future work.
- [x] Role and account status controls.
- [x] Course management.
- [x] Section management.
- [x] Enrollment overview.
- [x] Instructor assignment overview.
- [x] Repository management.
- [x] Repository policy/status detail.
- [x] System storage overview.
- [x] Archive preservation index.
- [x] Archived project detail.
- [x] Mock system health page.
- [x] Audit event feed. System notices and policy warnings are visible in System Health.

## Phase 6: Required Feature Coverage

- [x] Programming activities are visible in Student detailed pages.
- [x] Activity deadlines are visible in Student detailed pages.
- [x] One-submission-only rule is visible in Student detailed pages.
- [x] Project repositories are visible in Student detailed pages.
- [x] Mock code editor/compiler is visible in Student Activity Workspace.
- [x] Submissions are visible in Student My Submissions and Submission Record.
- [x] Instructor monitoring is visible in detailed Instructor pages.
- [x] Contribution tracking is visible in Student detailed pages.
- [x] Similarity indicators are visible in detailed Instructor Similarity Review.
- [x] Detailed similarity indicators are scoped to Instructor View; Student View uses general academic review status only.
- [x] Feedback and grading are visible in Student and Instructor detailed pages.
- [x] Learning analytics are visible in Student and Instructor detailed pages.
- [x] User management is visible in detailed Admin pages.
- [x] Course/section management is visible in detailed Admin pages.
- [x] Student class joining and invitations are visible with simulated UI actions.
- [x] Repository management is visible in detailed Admin pages.
- [x] System storage overview is visible in detailed Admin pages.
- [x] Archived project preservation is visible in Student archived projects page.

## Phase 7: Mock Interaction Pass

- [x] Role switching works locally.
- [~] Mode switching works locally through navigation links.
- [ ] Course/section selection updates visible context.
- [x] Activity selection opens detailed workspace.
- [x] Repository selection opens detailed workspace.
- [x] Mock compiler action changes output state.
- [x] Submission action shows a simulated result.
- [x] Submitted activities lock the submit button as Submitted - Locked.
- [x] Activities after deadline disable submission when no submission exists.
- [ ] Filters work on major tables.
- [x] Similarity panels can be opened in Instructor View.
- [x] Feedback/grading panel can be opened or edited locally in Instructor Submission Review.
- [x] Archive detail can be inspected in Student Archive and Instructor Archive Readiness.

## Phase 8: Visual QA

- [ ] UI does not look like a generic LMS.
- [ ] UI does not look like only a GitHub clone.
- [ ] Student, Instructor, and Admin areas feel distinct.
- [ ] Activity Mode and Project Collaboration Mode are clearly identifiable.
- [ ] Tables and dense views remain readable.
- [ ] Code editor and compiler panels fit desktop layouts.
- [ ] Mobile/narrow layouts do not overlap.
- [ ] Text fits inside buttons, chips, cards, and navigation.
- [ ] Color palette is restrained and not one-note.
- [ ] Empty states still mention Projex-specific concepts.

## Phase 9: Verification

- [x] Run lint/build if configured.
- [x] Start local dev server.
- [ ] Inspect key routes manually.
- [ ] Capture or review desktop viewport.
- [ ] Capture or review mobile viewport.
- [ ] Confirm all checklist items in Phase 6 are represented in UI.
- [ ] Document known limitations: hardcoded data, no backend, no auth, no GitLab API, no compiler backend.

## Implementation Guardrails

- [x] Do not add backend code.
- [x] Do not add real authentication.
- [x] Do not call a real GitLab API.
- [x] Do not add a real compiler service.
- [x] Do not remove UI for features just because they are simulated.
- [x] Do not collapse roles into one generic dashboard.
- [x] Do not collapse Projex into a generic assignment LMS.
- [x] Do not make repositories the only center of the product.
