# Projex Feature Inventory

This inventory is the source of truth for what must be visible in the UI-first prototype. Features may use hardcoded data and simulated interactions, but they should not be skipped.

## Platform Modes

### Activity Mode

- Programming activity list by course and section.
- Activity detail with objectives, instructions, constraints, deadline, one-submission-only rule, points, and rubric.
- Starter file tree.
- Mock code editor with multiple files.
- Mock compiler/test runner panel.
- Test case list with pass/fail/pending states.
- Single final submission record with submitted date/time and status.
- Feedback and grading display.
- Student-safe academic review status for submitted code.
- Student progress and activity analytics.
- Instructor activity authoring, deadline, checking setup, one-submission-only, publish, close, and grading status controls.
- Instructor monitoring of student activity progress.

### Project Collaboration Mode

- Project repository list by course, section, team, and status.
- Repository overview with description, members, language, visibility, size, and last activity.
- File browser and mock code preview.
- Commit timeline with author, message, branch, timestamp, and changed files.
- Branch and merge request summary.
- Team task board or issue list.
- Contribution tracking by member.
- Instructor-facing similarity indicators across project code or submissions.
- Instructor project monitoring and intervention signals.
- Archived project preservation state and read-only snapshot access.

## Student View

- Student dashboard.
- Active activities and deadlines.
- Enrolled classes.
- Join class by class code.
- Pending class invitations with accept/decline actions.
- Recent submitted activities.
- Grades and feedback summary.
- Learning analytics and progress by topic.
- Activity workspace.
- Mock editor/compiler.
- My Submissions or Submission Record.
- Project repositories.
- Group member list.
- Contribution history.
- Project tasks/issues.
- Student-safe academic review status only, with no exact similarity scores or matched classmates/files.
- Archived projects from previous terms, read-only where applicable.

## Instructor View

- Instructor dashboard.
- Course and section selector.
- Class roster.
- Class code generation.
- Student invitation flow.
- Activity management.
- Activity configuration.
- Starter files and mock tests.
- Rubrics and point allocation.
- Publication, close, deadline, one-submission-only, and grading status.
- Student monitoring table.
- Submission queue.
- Code review and mock diff.
- Compiler/test result review.
- Similarity review.
- Feedback composer.
- Grade entry and release state.
- Project repository oversight.
- Team contribution balance.
- Project health indicators.
- Learning analytics by course, section, activity, topic, and student.

## Admin View

- Admin dashboard.
- User management.
- Role management.
- Account status management.
- Course management.
- Section management.
- Instructor assignment.
- Student enrollment overview.
- Enrollment record management.
- Repository management.
- Repository policy and visibility status.
- System storage overview.
- Archive management.
- Archived project preservation.
- System health/status indicators.
- Audit-style activity feed.

## Programming Activity Features

- Activity title, course, section, difficulty, language, and topic.
- Instructions and expected output.
- Deadline and due status.
- One-submission-only label.
- Starter code.
- File tree.
- Mock editor tabs.
- Mock terminal/compiler output.
- Student-visible mock test result summary.
- Instructor-visible full checking setup and results.
- Submit button that becomes disabled after submission or after deadline.
- Submission status: open, due soon, submitted, closed, missing, checked, graded, returned, needs revision.
- Submitted date/time when present.
- Rubric criteria.
- Instructor feedback.
- Student-safe academic review status.
- Learning topic mapping.

## Repository Features

- Repository name, course, team, owner, visibility, language, and status.
- Files and folders.
- Commit history.
- Branches.
- Merge requests or review requests.
- Contributors.
- Contribution metrics.
- Recent activity.
- Repository size.
- Last backup/snapshot.
- Archive status.
- Preservation metadata.

## Monitoring Features

- Student activity state: not started, editing, compiling, submitted, stuck, late, graded.
- Last active time.
- Attempt count.
- Compiler result.
- Test pass rate.
- Instructor-facing similarity severity.
- Feedback status.
- Grade status.
- Project contribution balance.
- Repository activity frequency.
- Risk flags for inactivity, high similarity, low test pass rate, and uneven collaboration.

## Similarity Features

- Similarity status visible on submissions and project repositories.
- Severity levels: clear, low, moderate, high, needs review.
- Matched peer/project indicator using mock labels.
- Matched files list.
- Similarity explanation written as a review aid, not an accusation.
- Instructor review action.
- Resolution status: open, reviewed, dismissed, escalated.
- Detailed scores, matched classmates, matched files, and comparison views are instructor-facing only.
- Student-facing similarity language is limited to general academic review statuses such as Under Review, Needs Instructor Review, or Checked.

## Feedback and Grading Features

- Rubric-based scoring.
- Inline or file-level comments.
- General feedback.
- Compiler/test context.
- Grade draft state.
- Grade released state.
- Revision requested state.
- Feedback history.
- Student-visible feedback panel.

## Learning Analytics Features

- Course progress.
- Activity completion rate.
- Average test pass rate.
- Topic mastery indicators.
- Late/missing submissions.
- Similarity trends.
- Student risk list.
- Project collaboration balance.
- Contribution trend.
- Instructor intervention opportunities.

## Management Features

- Users by role.
- Courses.
- Sections.
- Enrollments.
- Instructor assignments.
- Class codes.
- Class invitations.
- Enrollment statuses.
- Activity counts.
- Repository counts.
- Repository ownership.
- Repository visibility.
- Storage consumption.
- Archive retention.

## Preservation Features

- Archived project list.
- Read-only repository snapshot.
- Term, course, section, team, and members metadata.
- Final grade or evaluation status.
- Storage footprint.
- Retention date.
- Export/download status shown as simulated.
- Integrity/checksum status shown as mock metadata.

## Explicit Non-Goals for the Prototype

- No backend.
- No real authentication.
- No real GitLab API integration.
- No real compiler backend.
- No database persistence.
- No production authorization model.
- No real plagiarism detection.

These non-goals should not remove the UI for the corresponding concepts. They only define implementation boundaries for the localhost prototype.
