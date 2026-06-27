# Projex UI Direction

Projex is a web-based academic repository-learning platform for programming education at Saint Louis University. The prototype must communicate a complete product vision through a UI-first localhost experience with hardcoded data only.

The product is not a generic LMS and not only a GitHub-style repository browser. It combines programming activity delivery, repository-centered project collaboration, instructor monitoring, academic feedback, analytics, and administrative repository preservation.

## Prototype Principles

- Show almost every Projex feature in the interface, even when behavior is mocked.
- Prefer realistic academic workflows over placeholder marketing screens.
- Use role-based views for Student, Instructor, and Admin, without real authentication.
- Make Activity Mode and Project Collaboration Mode visibly distinct but connected.
- Use mock statuses, metrics, similarity indicators, grades, storage data, and repository activity to imply system depth.
- Keep interactions local: filters, tabs, drawers, modals, mock editors, mock compiler output, and detail pages can all use hardcoded state.
- Avoid backend promises in UI labels. Use neutral labels such as "Run mock tests", "Preview submission", "Sync status: simulated", and "Repository snapshot".
- Treat Activity Mode submissions as one-submission-only unless the user explicitly changes the product rule later.

## Product Identity

Projex should feel like an academic engineering workspace:

- Course-aware: sections, terms, instructors, activity deadlines, project groups.
- Repository-aware: branches, commits, contributors, files, merge activity, archived snapshots.
- Learning-aware: rubric feedback, compiler output, similarity indicators, learning analytics, and intervention signals.
- Institution-aware: Saint Louis University context, admin oversight, retention, storage, and preservation.

## Visual Direction

The UI should be dense, calm, and operational. It should support repeated instructor and admin use while remaining approachable for students.

Recommended style:

- Restrained academic/professional interface.
- Clear left navigation with mode and role switching.
- Dashboard pages with compact metrics, tables, status chips, and timeline panels.
- Code and repository views that look technical but not like a generic GitHub clone.
- Learning analytics shown as instructional signals, not vanity charts.
- Similarity and contribution indicators shown with context and severity, with detailed similarity reserved for Instructor View.
- Archived preservation pages should feel records-oriented and durable.

Avoid:

- Marketing landing pages as the primary screen.
- Oversized hero layouts.
- Generic course cards with no repository/programming detail.
- UI that only resembles GitHub, GitLab, or a file manager.
- Hiding major features behind future notes.

## Information Architecture

The app should expose three role-based workspaces:

- Student View: activity work, code editor, submissions, feedback, project repository, contribution history, group collaboration, learning progress.
- Instructor View: activity authoring, monitoring, submissions review, compiler/test results, similarity review, grading, feedback, analytics, project oversight.
- Admin View: users, roles, courses, sections, repository governance, storage overview, archive preservation, system health.

The app should expose two major modes:

- Activity Mode: individual or structured programming activities with instructions, deadlines, starter files, mock compiler/test output, one locked final submission, grades, and feedback.
- Project Collaboration Mode: group repositories, contribution tracking, branches, commits, issues/tasks, merge activity, similarity flags, instructor oversight, and archival.

## UI Shell

The top-level shell should include:

- Role switcher: Student, Instructor, Admin.
- Mode switcher: Activity Mode, Project Collaboration Mode.
- Current course/section selector.
- Search or command field for activities, repositories, users, and submissions.
- Notification center for deadlines, feedback, flags, and archive events.
- Mock identity indicator showing the selected role.

The left navigation should change by role and mode, but keep enough consistency that the prototype feels like one product.

## Core Screens

Student screens should include:

- Student dashboard with active activities, deadlines, due status, project repositories, feedback, grades, class membership, and contribution summary.
- Class pages for enrolled classes, joining a class by code, and accepting or declining pending class invitations.
- Activity workspace with instructions, deadline, one-submission-only label, file tree, mock code editor, mock compiler, tests, submission panel, rubric, and feedback record.
- My Submissions or Submission Record page with final submitted activities, submitted date/time, review status, mock test summary, grade status, and instructor comments.
- Project repository page with files, commits, group members, tasks, branches, contribution chart, and general academic review status.
- Learning analytics page with progress, strengths, weak topics, late work, and recommended review.

Instructor screens should include:

- Instructor dashboard with class activity, flagged submissions, grading workload, similarity alerts, and project health.
- Class roster, class code generation, and student invitation management.
- Activity management with activity list, configuration, starter files, test cases, rubric, deadline, one-submission-only rule, checking setup, and Draft/Published/Closed/Grading status.
- Monitoring view with live/mock student progress, compiler states, submission states, idle indicators, and risk signals.
- Submission review with code diff, full mock checking results, rubric grading, feedback composer, detailed similarity panel, and grade release state.
- Project oversight with repositories, teams, contribution balance, commit timelines, branch/merge activity, and preservation state.
- Learning analytics with course, section, activity, topic, and student-level insights.

Admin screens should include:

- Admin dashboard with platform counts, storage usage, repository volume, archive status, and system alerts.
- User management with students, instructors, admins, roles, account status, and section membership.
- Course, section, enrollment, and instructor assignment management with terms, instructors, activity counts, and repository counts.
- Repository management with ownership, visibility, size, last activity, policy status, and archive actions.
- System storage overview with storage by course, repository, archive, artifacts, and logs.
- Archived project preservation with searchable archived projects, metadata, read-only snapshots, retention status, and export indicators.

## Mock Interaction Expectations

The prototype should support visible local interactions:

- Switch role and mode.
- Select courses, sections, activities, repositories, students, and teams.
- Open code files in a mock editor.
- Run a mock compiler/test action and show deterministic output.
- Submit one final activity record and show its locked state in local UI state if feasible.
- Lock an activity after its single submission, showing "Submitted - Locked" or an equivalent disabled submit state.
- Disable submission after the activity deadline if the student has not submitted.
- Filter submissions by status, grade, similarity, and compiler result.
- Open grading and feedback panels.
- Inspect contribution details and similarity indicators.
- Browse archived projects and repository snapshots.

## Activity Submission and Deadline Rules

- Each activity allows exactly one student submission.
- Do not design multiple attempts, attempt counters, or resubmission flows unless explicitly requested later.
- Student-facing submission lists should be named "My Submissions", "Submission Record", or "Submitted Activities".
- A submitted activity must show submitted date/time, review status, mock test result summary, grade status, and instructor feedback when available.
- The submit button must become disabled after submission and read "Submitted - Locked" or an equivalent locked state.
- The submit button must also be disabled after the deadline when the student has not submitted.
- Activity due states should include Open, Due Soon, Submitted, Closed, Missing, and Checked.

## Automated Checking and Similarity Scope

- Automated checking is simulated in the prototype.
- Students may see mock test summaries such as "2/3 passed" but must not see hidden test case logic.
- Instructors may see fuller checking results during review and retain control over final feedback and grade.
- Detailed similarity indicators belong primarily in Instructor View.
- Student View must not show exact similarity scores, matched classmates, matched files, or side-by-side comparisons.
- Student View may show only general academic review states such as "Under Review", "Needs Instructor Review", or "Checked".
- Instructor View must include full similarity review features.

## Data Tone

Mock data should use realistic Saint Louis University programming education examples:

- Courses such as CS 111, CS 122, IT 212, CS 321.
- Activities such as loops, arrays, OOP, file handling, APIs, database access, and capstone milestones.
- Project repositories such as enrollment systems, campus navigation, inventory tools, and learning apps.
- Student and instructor names should be plausible but clearly fictional.
- Similarity indicators should avoid accusation-heavy language. Use "Needs review", "Similar structure", and "High overlap signal".

## Definition of Done for the UI Prototype

The first implementation pass should be considered complete only when:

- All role views exist.
- Both major modes exist.
- Every required feature category appears somewhere visible.
- Mock code editor/compiler, submissions, feedback, grading, analytics, user management, course/section management, repository management, storage overview, and archived preservation all have dedicated UI.
- The app can be navigated locally without backend setup.
- The UI reads specifically as Projex for programming education at Saint Louis University.
