# Projex Mock Data Plan

The prototype uses hardcoded client-side data only. Mock data should be rich enough to make all major features visible without requiring a backend, authentication, GitLab API, compiler service, database, or similarity engine.

## Data Shape

Use a small set of typed JavaScript or TypeScript objects when implementation begins. Keep IDs stable and readable.

Recommended collections:

- `users`
- `courses`
- `sections`
- `enrollments`
- `classCodes`
- `classInvitations`
- `instructorAssignments`
- `activities`
- `activityFiles`
- `testCases`
- `submissions`
- `feedback`
- `rubrics`
- `repositories`
- `repositoryFiles`
- `commits`
- `branches`
- `mergeRequests`
- `projectTasks`
- `contributions`
- `similarityReports`
- `analytics`
- `storageBuckets`
- `archives`
- `notifications`
- `auditEvents`

## Users

Include all roles:

- Students across multiple sections.
- Instructors assigned to courses and sections.
- Admins managing system-level resources.

Fields:

- `id`
- `name`
- `email`
- `role`
- `status`
- `avatarInitials`
- `courseIds`
- `sectionIds`
- `lastActiveAt`

## Courses and Sections

Example courses:

- `CS 111 - Introduction to Programming`
- `CS 122 - Data Structures`
- `IT 212 - Web Systems and Technologies`
- `CS 321 - Software Engineering`
- `CS 498 - Capstone Project`

Section fields:

- `id`
- `courseId`
- `sectionCode`
- `term`
- `schedule`
- `instructorIds`
- `studentIds`
- `activityIds`
- `repositoryIds`
- `classCodeId`
- `enrollmentStatusSummary`

Class code fields:

- `id`
- `sectionId`
- `code`
- `generatedByInstructorId`
- `status`
- `expiresAt`
- `createdAt`

Class invitation fields:

- `id`
- `sectionId`
- `studentId`
- `email`
- `invitedByInstructorId`
- `status`
- `sentAt`
- `respondedAt`

Enrollment fields:

- `id`
- `studentId`
- `sectionId`
- `status`
- `source`
- `joinedAt`
- `invitationId`

Instructor assignment fields:

- `id`
- `instructorId`
- `courseId`
- `sectionId`
- `assignmentRole`
- `status`
- `assignedAt`

## Activities

Create activities across beginner, intermediate, and project-adjacent programming topics.

Example activities:

- `act-loops-01`: Loop Patterns and Input Validation.
- `act-arrays-02`: Student Grade Analyzer.
- `act-oop-03`: Library Item Class Model.
- `act-files-04`: CSV Enrollment Parser.
- `act-api-05`: Campus Events API Client.
- `act-db-06`: Repository Metadata Query.

Fields:

- `id`
- `courseId`
- `sectionIds`
- `title`
- `mode`
- `topic`
- `difficulty`
- `language`
- `points`
- `deadline`
- `status`
- `publishStatus`
- `closeStatus`
- `submissionRule`
- `testCaseCount`
- `checkingSetup`
- `objectives`
- `instructions`
- `starterFileIds`
- `testCaseIds`
- `rubricId`

## Activity Files and Mock Editor Content

Include realistic file trees.

Examples:

- `Main.java`
- `GradeAnalyzer.java`
- `README.md`
- `tests/GradeAnalyzerTest.java`
- `src/app.py`
- `package.json`
- `src/api/campusEvents.js`

Fields:

- `id`
- `activityId`
- `path`
- `language`
- `content`
- `isStarter`
- `isReadOnly`

## Test Cases and Mock Compiler Output

Test cases should support visible pass/fail states.

Fields:

- `id`
- `activityId`
- `name`
- `input`
- `expectedOutput`
- `status`
- `points`
- `message`

Mock compiler runs should include:

- Successful run.
- Syntax error.
- Failed test.
- Timeout.
- Warning with successful output.

## Submissions

Students may submit each activity only once. Do not model repeated attempts unless the product rule changes later. Student-facing pages should call these records "My Submissions", "Submission Record", or "Submitted Activities".

Submission records should cover final activity states:

- Not submitted.
- Submitted.
- Locked after submission.
- Closed without submission.
- Missing.
- Checked.
- Graded.
- Returned.
- Needs revision.

Fields:

- `id`
- `activityId`
- `studentId`
- `sectionId`
- `submittedAt`
- `status`
- `isLocked`
- `lockedReason`
- `reviewStatus`
- `compilerStatus`
- `testsPassed`
- `testsTotal`
- `studentTestSummary`
- `instructorCheckingSummary`
- `hiddenTestsVisibleToStudent`
- `gradeStatus`
- `grade`
- `maxGrade`
- `studentReviewLabel`
- `similarityReportId`
- `feedbackId`
- `changedFileIds`

Student submission records should show:

- Final submitted activity.
- Submitted date/time when submitted.
- Review status.
- Mock test result summary such as `2/3 passed`.
- Grade status.
- Instructor feedback status.
- Disabled submit state: `Submitted - Locked` after submission.
- Disabled submit state after deadline if not submitted.

Instructor submission review may show:

- Fuller mock checking results.
- Visible and hidden test summaries.
- Detailed similarity review.
- Feedback composer and grade controls.

## Rubrics and Feedback

Rubric criteria examples:

- Correctness.
- Code readability.
- Input validation.
- Error handling.
- Test coverage.
- Repository hygiene.
- Collaboration process.

Feedback fields:

- `id`
- `submissionId`
- `instructorId`
- `summary`
- `inlineComments`
- `rubricScores`
- `releasedAt`
- `revisionRequested`

## Repositories

Example repositories:

- `repo-campus-nav`: Campus Navigation Assistant.
- `repo-enrollment-lite`: Enrollment Queue Simulator.
- `repo-library-kiosk`: Library Kiosk Manager.
- `repo-lab-inventory`: Computer Lab Inventory.
- `repo-peer-review`: Peer Review Tracker.

Fields:

- `id`
- `name`
- `slug`
- `courseId`
- `sectionId`
- `teamId`
- `description`
- `language`
- `visibility`
- `status`
- `sizeMb`
- `lastActivityAt`
- `memberIds`
- `branchIds`
- `archiveId`
- `similarityReportId`

## Repository Activity

Commit fields:

- `id`
- `repoId`
- `authorId`
- `branch`
- `message`
- `committedAt`
- `filesChanged`
- `additions`
- `deletions`

Branch fields:

- `id`
- `repoId`
- `name`
- `latestCommitId`
- `status`

Merge request fields:

- `id`
- `repoId`
- `sourceBranch`
- `targetBranch`
- `authorId`
- `reviewerId`
- `status`
- `createdAt`
- `commentsCount`

## Project Tasks

Tasks should make collaboration visible without needing a full issue tracker.

Fields:

- `id`
- `repoId`
- `title`
- `status`
- `assigneeId`
- `priority`
- `dueAt`
- `linkedCommitIds`

## Contribution Tracking

Track both quantitative and qualitative signals.

Fields:

- `id`
- `repoId`
- `studentId`
- `commits`
- `filesTouched`
- `linesAdded`
- `linesDeleted`
- `reviews`
- `tasksClosed`
- `lastContributionAt`
- `balanceStatus`

Balance statuses:

- `balanced`
- `watch`
- `under-contributing`
- `dominant-contributor`
- `inactive`

## Similarity Reports

Similarity data is simulated. Language should frame it as an instructor review signal.

Detailed similarity data is primarily instructor-facing. Student-facing records must not expose exact similarity scores, matched classmates, matched files, or side-by-side comparisons. Students may only see general academic review labels such as `Under Review`, `Needs Instructor Review`, or `Checked`.

Fields:

- `id`
- `targetType`
- `targetId`
- `severity`
- `score`
- `matchedWith`
- `matchedFiles`
- `studentVisibleLabel`
- `instructorOnly`
- `summary`
- `status`
- `reviewedBy`

Severity values:

- `clear`
- `low`
- `moderate`
- `high`
- `needs-review`

## Analytics

Student analytics:

- Completion rate.
- Average test pass rate.
- Topic strengths.
- Topic risks.
- Late submissions.
- Feedback trend.

Instructor analytics:

- Activity completion by section.
- Average grade.
- Common failed tests.
- Similarity signal counts.
- At-risk students.
- Project contribution balance.

Admin analytics:

- Active users.
- Repository count.
- Activity count.
- Submission volume.
- Storage usage.
- Archive growth.

## Storage and Archive Data

Storage bucket fields:

- `id`
- `label`
- `category`
- `usedGb`
- `limitGb`
- `growthThisTermGb`
- `largestCourseId`

Archive fields:

- `id`
- `repoId`
- `courseId`
- `sectionId`
- `term`
- `teamName`
- `memberIds`
- `archivedAt`
- `retentionUntil`
- `sizeMb`
- `integrityStatus`
- `exportStatus`
- `snapshotLabel`

## Notifications and Audit Events

Notification examples:

- Deadline approaching.
- Feedback released.
- Similarity report ready.
- Repository inactive.
- Archive completed.
- Storage threshold warning.
- Class invitation received.
- Class code joined successfully.

Audit event examples:

- User role changed.
- Course section created.
- Class code generated.
- Enrollment accepted.
- Instructor assignment updated.
- Repository archived.
- Storage policy updated.
- Activity published.

## Minimum Mock Dataset Size

For the first useful prototype, include at least:

- 18 users: 12 students, 4 instructors, 2 admins.
- 5 courses.
- 6 sections.
- 6 class codes.
- 10 enrollment records.
- 8 class invitations.
- 6 instructor assignments.
- 8 activities.
- 8 repositories.
- 20 submissions.
- 10 feedback records.
- 8 similarity reports.
- 40 commits.
- 20 project tasks.
- 8 archive records.
- 6 storage buckets.

This is enough to populate dashboards, tables, charts, detail pages, and filters without repetition feeling empty.
