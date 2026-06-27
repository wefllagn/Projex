# Projex Routes

The prototype can be implemented as a client-side single-page app. Routes should be stable enough to support direct navigation and visible enough to demonstrate the full product structure.

## Route Conventions

- Use `/student`, `/instructor`, and `/admin` as role roots.
- Use `/activity` and `/projects` to distinguish major modes.
- Use readable mock IDs such as `act-loops-01`, `repo-campus-nav`, and `sec-bsit-2a`.
- All routes use hardcoded data.
- Authentication routes are not required. A role switcher can simulate identity.

## Shared Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirect or default to Student dashboard. |
| `/student` | Student dashboard. |
| `/instructor` | Instructor dashboard. |
| `/admin` | Admin dashboard. |
| `/search` | Global mock search results for activities, repositories, users, submissions, and archives. |
| `/notifications` | Mock notifications for deadlines, feedback, flags, and archive events. |

## Student Routes

| Route | Purpose |
| --- | --- |
| `/student/activity` | Activity Mode dashboard for student work. |
| `/student/activity/:activityId` | Activity workspace with instructions, editor, compiler, tests, and submission panel. |
| `/student/activity/:activityId/submission-record` | Student final submission record for one activity. |
| `/student/activity/:activityId/feedback` | Feedback, rubric, grade, and revision status. |
| `/student/classes` | Enrolled classes and section membership. |
| `/student/join-class` | Join a class using a class code. |
| `/student/invitations` | Pending class invitations with accept/decline actions. |
| `/student/submissions` | My Submissions across activities, showing final submitted activity records. |
| `/student/projects` | Project Collaboration Mode dashboard for student repositories. |
| `/student/projects/:repoId` | Repository overview with files, members, tasks, commits, and contribution summary. |
| `/student/projects/:repoId/files` | Repository file browser and mock code preview. |
| `/student/projects/:repoId/commits` | Commit timeline. |
| `/student/projects/:repoId/contributions` | Personal and team contribution tracking. |
| `/student/projects/:repoId/tasks` | Team tasks/issues. |
| `/student/analytics` | Student learning analytics and topic progress. |
| `/student/archive` | Student-visible archived projects and past work. |

## Instructor Routes

| Route | Purpose |
| --- | --- |
| `/instructor/activity` | Activity management dashboard. |
| `/instructor/activity/new` | Mock activity creation form. |
| `/instructor/activity-settings` | Activity deadline, one-submission-only rule, publish/close status, checking setup, and test case count. |
| `/instructor/activity/:activityId` | Activity configuration summary. |
| `/instructor/activity/:activityId/editor` | Starter files, mock tests, rubric, and publishing controls. |
| `/instructor/activity/:activityId/monitor` | Student progress monitoring. |
| `/instructor/activity/:activityId/submissions` | Submission queue with status, compiler result, grade, and similarity filters. |
| `/instructor/activity/:activityId/submissions/:submissionId` | Submission review with code, test output, rubric, feedback, and similarity panel. |
| `/instructor/submission-review` | Cross-activity submission review queue with full checking and similarity review. |
| `/instructor/roster` | Class roster for the selected course/section. |
| `/instructor/invite-students` | Invite students to a class. |
| `/instructor/class-code` | Generate and view class code. |
| `/instructor/projects` | Project repository oversight. |
| `/instructor/projects/:repoId` | Project health, team, repository status, and instructor notes. |
| `/instructor/projects/:repoId/contributions` | Contribution tracking and collaboration balance. |
| `/instructor/projects/:repoId/similarity` | Project similarity review. |
| `/instructor/projects/:repoId/archive` | Archive readiness and preservation metadata. |
| `/instructor/analytics` | Learning analytics by course, section, activity, topic, and student. |
| `/instructor/students/:studentId` | Student academic coding profile. |

## Admin Routes

| Route | Purpose |
| --- | --- |
| `/admin/users` | User management table. |
| `/admin/users/:userId` | User profile, role, courses, sections, repositories, and account status. |
| `/admin/courses` | Course management. |
| `/admin/courses/:courseId` | Course detail with sections, instructors, activities, and repositories. |
| `/admin/sections` | Section management. |
| `/admin/sections/:sectionId` | Section roster, instructor assignment, activities, and repositories. |
| `/admin/enrollments` | Enrollment records, statuses, class membership, and invitation outcomes. |
| `/admin/instructor-assignments` | Instructor assignments across courses and sections. |
| `/admin/repositories` | Repository management across the platform. |
| `/admin/repositories/:repoId` | Repository policy, ownership, storage, activity, and archive status. |
| `/admin/storage` | System storage overview. |
| `/admin/archive` | Archived project preservation index. |
| `/admin/archive/:archiveId` | Archived project record with read-only snapshot metadata. |
| `/admin/system` | Mock system health, integration state, queues, and audit feed. |

## Route Coverage Matrix

| Feature | Student | Instructor | Admin |
| --- | --- | --- | --- |
| Programming activities | `/student/activity` | `/instructor/activity` | `/admin/courses/:courseId` |
| Project repositories | `/student/projects` | `/instructor/projects` | `/admin/repositories` |
| Mock editor/compiler | `/student/activity/:activityId` | `/instructor/activity/:activityId/editor` | Not primary |
| Submissions | `/student/submissions`, `/student/activity/:activityId/submission-record` | `/instructor/submission-review`, `/instructor/activity/:activityId/submissions` | Course/section/enrollment detail |
| Monitoring | Student progress only | `/instructor/activity/:activityId/monitor` | `/admin/system` |
| Contribution tracking | `/student/projects/:repoId/contributions` | `/instructor/projects/:repoId/contributions` | `/admin/repositories/:repoId` |
| Similarity indicators | General academic review status only | Full submission/project similarity review | Repository policy/detail |
| Feedback and grading | Feedback route | Submission review | Course records overview |
| Learning analytics | `/student/analytics` | `/instructor/analytics` | System-level summaries |
| User management | Not primary | Student profiles | `/admin/users` |
| Course/section management | Read-only context | Course selector | `/admin/courses`, `/admin/sections` |
| Class joining/invitations | `/student/classes`, `/student/join-class`, `/student/invitations` | `/instructor/roster`, `/instructor/invite-students`, `/instructor/class-code` | `/admin/enrollments`, `/admin/instructor-assignments` |
| Repository management | Own/team repos | Course repos | `/admin/repositories` |
| Storage overview | Not primary | Archive readiness | `/admin/storage` |
| Archived preservation | `/student/archive` | Project archive route | `/admin/archive` |

## Navigation Requirements

- Every major route should be reachable from visible navigation, tabs, tables, or detail links.
- The role switcher should preserve intent where reasonable but may route to each role dashboard.
- The mode switcher should send students and instructors between Activity Mode and Project Collaboration Mode.
- Admin routes do not need mode switching, but they must still expose activity, repository, storage, and archive concepts.
