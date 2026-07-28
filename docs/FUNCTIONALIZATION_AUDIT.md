# Projex Functionalization Audit

**Audit date:** 2026-07-29  
**Audited branch:** `development/fullstack`  
**Audit scope:** Current tracked application code, configuration, documentation, and asset inventory. Generated `dist/` output and third-party `node_modules/` contents were excluded because they are build output and dependencies, not authored application source.  
**Change constraint:** This audit is the only file created. No source file, package, route, style, mock, or asset was modified.

## Executive summary

Projex is a client-only React 19/Vite single-page prototype. It has substantial student and instructor workflows plus a simpler admin shell, but it has no backend, API client, database, real compiler, real repository provider, session, authorization, or persistent application state. The UI is not currently TypeScript despite the project context: every application source module is `.js` or `.jsx`, and there are no interfaces, type aliases, enums, `.ts`, or `.tsx` files.

The central functionalization risk is data fragmentation. `src/data/projexData.js` contains a broad domain-shaped mock model, but the detailed student and instructor screens do not consume it. Instead, `StudentPages.jsx`, `InstructorPages.jsx`, `DashboardLayout.jsx`, and `LoginPage.jsx` define separate hardcoded copies of users, classes, activities, submissions, repositories, notifications, feedback, and analytics. The same conceptual record therefore has different names, dates, IDs, roles, codes, and statuses on different screens.

The safest path is to preserve the rendered components and CSS, introduce stable domain contracts and an API adapter boundary, then replace data one entity group and one workflow at a time. Authentication and class membership should come first; submissions must enforce the one-submission rule at the database and transaction level. Repository/compiler integration should follow only after identity, ownership, class, activity, and submission records are stable.

## 1. Current project structure

### Top-level structure

| Path | Purpose | Audit finding |
| --- | --- | --- |
| `index.html` | Browser document and root mount point | Loads `/src/main.jsx`; sets the Projex favicon and title. |
| `src/` | Entire authored frontend | JavaScript/JSX only; no TypeScript source. |
| `src/main.jsx` | React entry point | Mounts `<App />` inside `StrictMode`. |
| `src/App.jsx` | Router composition | Creates the complete browser router from `routeCatalog`. |
| `src/App.css` | Nearly all visual styling | 12,712 lines, 239,907 bytes, approximately 1,788 selector blocks; this is a high-risk protected UI file. |
| `src/index.css` | Root/global reset styling | 51 lines; font, box sizing, root/body defaults. |
| `src/components/` | Small generic presentational components | `Card`, `DataTable`, `StatCard`, and `StatusBadge`. |
| `src/layouts/` | Role shells and navigation | `DashboardLayout.jsx` contains separate student and instructor shells plus the generic admin shell. |
| `src/pages/` | All page-level workflows | Student and instructor flows are each monolithic modules; admin is smaller. |
| `src/data/projexData.js` | Central mock catalog | Rich data exists here, but most student/instructor screens bypass it. |
| `public/assets/brand/` | Product and SLU visual assets | Logos, mascot, favicon variants, and landing benefit images. |
| `docs/` | Product planning and reference material | Existing direction, routes, mock plan, feature inventory, checklist, instructor guidance, and UI reference images. |
| `package.json` | Runtime/build configuration | React 19, React DOM 19, React Router 7, Vite 8, ESLint; no HTTP, form, schema, state, or test library. |

### Entry and routing setup

`src/main.jsx` renders `src/App.jsx`. `App.jsx` uses `createBrowserRouter` and generates all role child routes by flattening `routeCatalog` from `src/data/projexData.js`.

Registered public routes are:

- `/` -> `RoleLandingPage`.
- `/student-login` -> student `LoginPage`.
- `/instructor-login` -> `InstructorLoginPage`.
- `/prototype-switcher` -> `PrototypeRoleSwitcher`.
- `/student/*`, `/instructor/*`, and `/admin/*` -> role-specific layouts and pages generated from `routeCatalog`.
- `*` -> redirect to `/`.

`getRouteElement()` delegates every catalog child to `StudentRoutePage`, `InstructorRoutePage`, or `AdminRoutePage`. Those modules use a second, manual object map from the literal `pagePath` to a rendered component. This two-layer route definition is fragile: the catalog can register a URL that the page map silently sends to its fallback page.

There are no dynamic route parameters in the implementation. IDs such as `act-loops-01`, `prelim-group-project-1`, and `repo-campus-nav` are literal paths and literal data.

### Global state and context

There is no application context, global store, reducer, server-state cache, auth provider, or shared data provider. State is isolated in component-level `useState` calls. Changing route or refreshing the page destroys all simulated changes. The only `useEffect` is the landing-page scroll/resize behavior; it is not application data synchronization.

### Main role layouts

| Role | Layout/component | Responsibilities |
| --- | --- | --- |
| Student | `StudentDashboardLayout` in `src/layouts/DashboardLayout.jsx` | Sidebar, class links, To-do, repositories, join-class navigation, automatic coding-workspace collapse, and `<Outlet />`. |
| Instructor | `InstructorDashboardLayout` in the same file | Sidebar, review queue, class links, create-class modal, and `<Outlet />`. |
| Admin | Generic branch of `DashboardLayout` | Route groups, local role switcher, course/section selectors, notification badge, identity pill, and `<Outlet />`. |
| Student class pages | `StudentClassPage` + `ClassHeader` in `StudentPages.jsx` | Class identity and Stream/Assignments/People tabs. |
| Instructor class pages | `InstructorClassPage` + `InstructorClassHeader` in `InstructorPages.jsx` | Instructor class identity and Stream/Assignments/People/Class Info tabs. |

## 2. Hardcoded and mock data

### Central mock data file

`src/data/projexData.js` is the only dedicated data file. It exports:

| Export | Content | Current consumers |
| --- | --- | --- |
| `roles` | Student, instructor, and admin role metadata/static people | `App.jsx` indirectly through `routeCatalog`, `LoginPage.jsx`, `DashboardLayout.jsx`. |
| `courseOptions`, `sectionOptions` | Static topbar choices | Generic/admin `DashboardLayout`. |
| `activitySummaries` | Activity deadlines, submission rules, test/grade/feedback states | Only reused inside the same file by `studentActivityDetails`; not used by detailed screens. |
| `classMembership` | Enrolled classes, invitations, roster, instructor assignments | Not consumed by a rendered detailed workflow. |
| `routeCatalog` | All registered role routes and route descriptions | `App.jsx`; generic admin navigation. |
| `dashboardStats`, `dashboardRows` | Role dashboard summary data | `RoleDashboard.jsx`; detailed student/instructor dashboards use other local data. |
| `studentActivityDetails` | Activity instructions, tests, deadline and class data | Not consumed by `StudentPages.jsx`. |
| `studentSubmissionRecords` | Final submission records and locked states | Not consumed by `StudentPages.jsx`. |
| `studentFeedback` | Grade, rubric, feedback and safe review label | Not consumed by `StudentPages.jsx`. |
| `studentProject` | Repository, members, tasks, contributions, commits | Not consumed by `StudentPages.jsx`. |
| `studentAnalytics`, `studentTopicRows`, `studentArchives` | Student progress and preservation mocks | Not consumed by the student route; analytics/archive currently reuse unrelated pages. |
| `instructorRoster`, `instructorClassCode` | Roster/invitation/class-code mocks | Not consumed by `InstructorPages.jsx`. |
| `instructorActivities`, `instructorActivitySettings` | Activity management settings | Not consumed by `InstructorPages.jsx`. |
| `instructorMonitoringRows`, `instructorSubmissions`, `instructorReview` | Monitoring, submission queue, checking, feedback and similarity data | Not consumed by `InstructorPages.jsx`. |
| `instructorProjects`, `instructorProjectDetail`, `instructorSimilarityReports` | Project/repository oversight | Not consumed by `InstructorPages.jsx`. |
| `instructorAnalytics`, `instructorAnalyticsRows`, `instructorStudentProfile` | Instructor learning views | Not consumed by the instructor route. |
| `adminStats`, `adminUsers`, `adminCourses`, `adminSections`, `adminEnrollments`, `adminInstructorAssignments`, `adminRepositories`, `adminStorage`, `adminSystemHealth`, `adminArchives` | Admin tables and counts | Consumed by `AdminPages.jsx`. |

### Hardcoded data outside the data file

`src/pages/StudentPages.jsx` contains all of the following module-level collections or values:

- `streamPosts`: announcements/activity/project/feedback stream records.
- `groupProjects`: project requirement rows and expanded state.
- `homeClasses`, `studentDashboardStats`: dashboard classes and metrics.
- `instructors`, `classmates`: static class people.
- `feedbackResults`: static passed checks.
- `workspaceCode`, `workspaceObjectives`, `workspaceActivities`: editor and activity content.
- `repositoryFiles`, `repositoryCollaborators`, `repositoryCommits`: repository view content.
- `studentNotifications`: fixed notification feed.
- `todoSections`: due-date buckets containing activity/project/repository work.
- `studentRepositoryGroups`, `personalRepositories`: repository indexes.
- `pendingClassInvitations`, `availableProjectRepositories`: class and repository joins.
- Function-local `assignmentRows`, `assignmentStats`, branch names, repository stats, and route map.

`src/pages/InstructorPages.jsx` contains:

- `instructorClass`, `dashboardStats`, `instructorHomeClasses`, `instructorHomeStats`.
- `instructorReviewPreview`, `reviewQueueClasses`, `streamItems`.
- `activities`, `monitoringStats`, `submissionRows`, `queueRows`.
- `reviewTests`, `submittedCode`.
- `groupProjects`, `projectTeams`, `repositoryFiles`, `repositoryCollaborators`, `contributionRows`.
- `roster`, notification arrays, assignment rows, activity/project review queue rows, branches, pending invites, class-info rules, and the route map.

`src/layouts/DashboardLayout.jsx` separately hardcodes `studentClasses` and `instructorClasses`, including different class codes for the same IT 112 class. `src/pages/LoginPage.jsx` hardcodes preview submission rows, benefit cards, and default login credentials. `src/pages/PlaceholderPage.jsx` hardcodes placeholder feature rows. `src/pages/AdminPages.jsx` hardcodes table columns, counts, and all local action messages.

### Static domain content present

- **Users:** Alyssa Mendoza, Julius Teodoro, Engr./Marco Rivera, instructors, classmates, admins, roster students, repository collaborators, and preview users.
- **Classes/courses:** IT 112, CS 111, IT 123, MATH 101, IT 212, CS 122, CS 321, sections such as BSIT 2A and BSCS 1A, and several incompatible class codes.
- **Activities:** Loop Patterns and Input Validation, Student Grade Analyzer, CSV Enrollment Parser, multiple Prelim Programming Exercises, and Hello World content.
- **Submissions/results:** submitted/missing/late/graded/review rows, mock visible and hidden tests, points, compiler states, code, and final locked records.
- **Repositories/projects:** group requirements, team repositories, project teams, files, branches, commit history, collaborators, contribution balances, review state, and archives.
- **Notifications/analytics/feedback:** fixed notification feeds, dashboard metrics, test summaries, similarity signals, instructor comments, grades, storage, system health, and archive metrics.

## 3. Fake functionality

### Persistence and network

- There are no `fetch`, Axios, XMLHttpRequest, WebSocket, GraphQL, API-client, or SDK calls.
- There is no `localStorage` or `sessionStorage` usage.
- There are no `setTimeout` or `setInterval` calls and therefore no fake delays or timed loading states.
- There are no explicit loading, pending-request, error-boundary, retry, optimistic-update, or synchronization states. Text such as “Auto-save” and “Saved a few seconds ago” is static.
- Clipboard writes are real browser calls for generated class codes, but success is reported without awaiting or handling clipboard failure.

### Student-only local behavior

- Notification/profile menus, sidebar collapse, editor tabs, resizable panes, repository menus, collapsible lists, filters, and sort controls only alter local presentation state.
- Stream announcements/comments are appended to local arrays with `Date.now()` IDs and disappear on navigation/remount/refresh.
- `Run Code` does not read or execute editable code. The code is rendered in a `<pre>`, not an editor/input. Each click toggles between a canned success and canned failure.
- `Clear`, Resources, custom testcase, add editor tab, repository file/history/clone/download/IDE actions, attachment previews, comments, and many menu actions are no-ops.
- `Submit final` only navigates to a pre-rendered submission-record route. It creates no record and does not prevent navigating back and “submitting” again.
- Activity submitted/locked state is selected by route props, not derived from a submission record or deadline.
- Joining a repository, inviting collaborators, marking ready for review, accepting/declining class invitations, and joining by code mutate only component state.
- Creating a repository ignores form values and navigates to the always-existing hardcoded repository.
- Class/repository search fields do not query a data source; some are visual only.

### Instructor-only local behavior

- Stream posts/comments, filters, dropdowns, notification/profile menus, queue selection, branch selection, and modals are component-local.
- Activity and project creation fields are mostly uncontrolled `defaultValue` inputs. Save/publish buttons only replace a status sentence.
- The activity form permits 1, 2, or 3 attempts even though the accepted product rule is one submission per student per activity.
- Upload/source/PDF selectors and `Add test case` do nothing.
- `Run Tests` in submission review sets a canned failed state; individual points can be edited locally.
- Grade/feedback release only opens and closes a confirmation modal. No submission, grade, feedback, release timestamp, or notification is updated.
- “Review again,” repository approval/revision, similarity/contribution review, and collaborator/student invitations are modal-only or status-text behavior.
- Generated class codes use `Math.random()`, exist only in component state, and are not validated for uniqueness or persisted.
- Roster removal filters the visible local array only. Manage and invitation controls do not update shared class membership.

### Admin-only local behavior

Every admin action changes a helper message only: review/toggle user, create/edit course, create/edit section, approve/remove enrollment, assign/reassign instructor, run policy check, review archive, retry mock jobs, acknowledge notice, view snapshot, and request restore. Storage is read-only static data.

### Authentication simulation

Both login forms accept any entered values and navigate immediately. Default plaintext demonstration credentials are embedded in JSX. Sign-out only navigates to `/`; it clears no session because none exists.

## 4. Authentication and roles

- Authentication is **absent**, not merely incomplete. There is no identity verification, credential request, token/cookie, session restoration, password handling, logout endpoint, or authenticated user object.
- Student and instructor role selection occurs through separate landing-page links and separate login routes. Submitting the student form navigates to `/student`; submitting the instructor form navigates to `/instructor`.
- `/prototype-switcher` links directly to all three role roots from `roles`.
- The generic/admin layout includes buttons that navigate directly among `/student`, `/instructor`, and `/admin`.
- Student and instructor profile menus show static identities and sign out by navigation only.
- There are no protected routes. Typing any role URL directly grants access, and no check verifies that the current identity owns the role, class, activity, submission, or repository.

Files responsible are `src/pages/LoginPage.jsx` (landing, fake login, prototype switcher), `src/App.jsx` (all route registration), `src/layouts/DashboardLayout.jsx` (role-specific shells and generic role switcher), and `src/data/projexData.js` (`roles` and route catalog). No file implements protected-route behavior.

## 5. Existing TypeScript structures

There are none. The repository has:

- No `.ts`, `.tsx`, or `.d.ts` authored files.
- No `tsconfig.json`.
- No TypeScript compiler dependency or script.
- No interfaces, type aliases, enums, discriminated unions, schemas, or shared entity definitions.
- `@types/react` and `@types/react-dom` are installed, but they do not make JSX source TypeScript.

Current structures are implicit JavaScript object shapes. They are inconsistent and duplicated. Examples:

- A user may be `{ name, email, avatar }`, `{ item, mode, status, signal }`, `{ name, role, marker }`, or a role object with `{ id, label, path, person, description }`.
- Activities use `deadline` in the central file but `due`/`dueValue` in page-local rows; status meanings mix lifecycle, due, review, and grading state.
- Submission test results appear as strings (`"3/3"`, `"Passed"`, `"20 / 20"`) rather than normalized counts/results.
- Repositories are variously keyed by `id`, `name`, `slug`-like strings, title, or route.
- Dates mix unzoned machine-like strings, locale display strings, relative text, and years 2022, 2026, and 2027.
- Table components assume `row.item` is a unique key, which is not a reusable entity identity contract.

Before converting the large JSX files, introduce shared contracts for IDs, timestamps, lifecycle statuses, DTOs, and API errors. Runtime validation should accompany TypeScript at the network boundary; static types alone will not validate backend payloads.

## 6. Entity mapping for backend/database support

| Entity | Current frontend evidence | Required persistent relationships/behavior |
| --- | --- | --- |
| Users | Roles, login defaults, people lists, roster, collaborators, authors | Stable user ID, profile, role assignments, account status, credentials/session identity. |
| Classes | Sidebars, class headers, `classMembership`, class info | Course/section/term identity, instructor ownership, active/archive status, unique class codes. |
| Class members | Rosters, enrollments, join code, invitations | User-class join table with member role/status/source/join timestamps and authorization. |
| Programming activities | Lists, detail, creation/settings forms | Class ownership, instructions, files, language, points, deadline, publish/close state, one-submission rule. |
| Test cases | Workspace samples, authoring toggles, review tests | Activity ownership, visibility, input/expected output, points/order, secure hidden logic. |
| Submissions | Student record, instructor queues/monitoring | Unique `(activity_id, student_id)` final record, submitted timestamp, source snapshot, lock reason, late/missing state. |
| Submission results | Compiler/test panels, review result points | Run/build status, output/error, per-test result, totals, execution metadata, immutable submission association. |
| Feedback | Student modal, instructor composer/release modal | Submission/instructor association, rubric/inline/summary content, draft/released state and timestamp. |
| Project tasks | Central `studentProject`, to-do items, contribution language | Repository/project association, assignee, priority, due date, status, linked commits. |
| Repositories | Student index/workspace, instructor review, admin governance | Owner/team/class/project, slug, visibility, status, provider ID, size, readiness/archive state. |
| Collaborators | Repository people/invite modals | Repository-user membership, permission/role, invite/accepted/removed timestamps. |
| Invitations | Class and repository invitation UI | Target type, inviter, recipient/email, token/code, status, expiry and response audit. |
| Commits | Student/instructor history and contribution rows | Repository/branch/author, provider commit hash, message/time, change stats and file links. |
| Branches | Local branch dropdowns | Repository, name, head commit, default/protected status, provider reference. |
| Notifications | Student/instructor menus and badges | Recipient, event type, entity link, content, read/created timestamps and delivery state. |

Additional entities already implied by the UI and central mock plan are courses, sections/terms, instructor assignments, activity files, compiler runs/jobs, rubrics/rubric scores, repository files, project requirements/teams, contributions, similarity reports/reviews, analytics snapshots, storage buckets, archives/snapshots, audit events, and attachments.

## 7. Shared data dependencies

### Same user

- Julius Teodoro is the student login identity, profile identity, announcement/comment author, repository team lead, and commit author.
- Alyssa Mendoza is simultaneously the central `roles` student, a classmate/collaborator, an instructor-dashboard review subject, and a repository commit author.
- Engr. Marco Rivera is the central instructor and instructor profile, while `Marco Rivera` also appears as a student/submission author and repository collaborator.
- Login, dashboards, headers, people, submissions, repository workspaces, notifications, and admin records must all use one canonical user service. Replacing only one mock will visibly contradict the others.

### Same class

IT 112 / BSIT 2A is repeated in both sidebars, both class headers, home cards, streams, activities, project pages, people, create forms, repository links, and notifications. Class codes conflict (`9346`, `9446`, generated random codes, and central `SLU-*` forms). A canonical class response must feed the layout as well as nested pages; otherwise sidebar/header/detail drift will remain.

### Same activity and submission

“Prelim Programming Exercise 1” appears in activity lists, detail, workspace, submission record, feedback, monitoring, queues, review, notifications, and landing preview. Its title, instructions, dates, points, tests, student, and status vary by page. These pages need a shared activity ID and a shared final submission ID, with role-specific projections rather than separate records.

### Same project/repository

“Prelim Group Project 1” and `prelim-group-project-1-team-03` appear in the student project requirement, repository creation/join, student workspace, repository index, instructor monitoring/review, contribution panel, and notification data. The student and instructor file/collaborator views are duplicate mock arrays and can diverge immediately.

### Components likely to break when mocks are removed

- `DashboardLayout`: assumes synchronous class arrays, route roles, course/section options, and counts.
- `ClassHeader` / `InstructorClassHeader`: assume one hardcoded selected class and fixed tabs.
- `StudentRoutePage` / `InstructorRoutePage`: build all JSX eagerly from a string map and have no route params/loading/errors.
- `ActivitiesPage`, `InstructorActivitiesPage`: compute counts and links from local fixed shapes.
- `ActivityDetailPage`, `CodingWorkspacePage`, `SubmissionReviewPage`: assume a record always exists and use hardcoded identity/status.
- `RepositoryWorkspacePage`, `InstructorRepositoryReviewPage`: assume repository, branch, file, collaborator, commit, and linked project data are synchronously available.
- `StudentNotificationMenu`, `InstructorUserArea`: fixed counts are not tied to list/read state.
- `DataTable`: assumes every row has a unique `item` and that every `status` can be converted directly to a CSS class.
- `StatusBadge`: calls `label.toLowerCase()` without a null/unknown guard and couples arbitrary backend status text to CSS selectors.
- Filters/sorts use display strings and dates directly; normalized backend enums/timestamps will require adapters.

## 8. Forms and actions inventory

### Public/authentication

| Surface | Actions needing backend/session support |
| --- | --- |
| Student login | Validate email/password, create session, load identity/roles, handle errors/loading, redirect safely. |
| Instructor login | Same as student with server-authorized role. |
| Role/prototype switching | Replace with authorized role selection/impersonation policy; prevent unauthorized direct URLs. |
| Sign out | Revoke/clear session and cached private data. |

### Student

| Surface | Forms/actions requiring connection |
| --- | --- |
| Stream | Post announcement, add class/private comment, post menus/moderation. |
| Activity board | Fetch/filter/sort activities and projects; resolve real detail/submission links. |
| Activity detail | Open attachments, add class/private comment, load deadline/submission/grade/feedback, enforce enabled/locked submit state. |
| Coding workspace | Load/save files, autosave, tabs/files, compile/run, sample/custom tests, clear output, final submit and idempotent confirmation. |
| Submission/feedback | Load immutable record, test summary, review state, released grade and feedback; navigate to submission. |
| Project requirement | Open specification, comment, create or join team repository. |
| Join repository modal | List eligible repositories, validate membership, join/link repository. |
| Repository creation | Name/class/project/visibility/collaborator fields, create provider repository, link project, handle conflict/error. |
| Repository workspace | Branch search/select/create, file create/upload/find, tag, history, commit view, clone URL copy, ZIP download, IDE link, collaborators, readiness transition, specification view. |
| Add collaborator | Search class members, invite selected member, show pending invitations. |
| To-do | Fetch/filter tasks by class and expand due buckets. |
| Repository index | Fetch/group repositories and create repository. |
| Join class | Validate class code, join class, accept/decline pending invitations. |
| Notifications/profile | Fetch/read notifications, badge count, manage profile/settings, sign out. |

### Instructor

| Surface | Forms/actions requiring connection |
| --- | --- |
| Create class | Course, section, instructor and invite fields; generate/persist unique code; create class and invitations. |
| Stream | Post announcements/comments and expose post actions. |
| Activity list | Query/filter, view, configure, and create activity/project requirement. |
| Create/configure activity | Title, language, due date, fixed one-submission rule, instructions, attachments/source, checking settings, visible/hidden tests, points, save draft, publish. |
| Test-case authoring | Add/edit/remove/order test cases and securely store hidden cases. |
| Monitoring/submission queue | Query progress/results, select student, review/flag, open submission, filter queue. |
| Submission review | Run/re-run checking, inspect code/results/similarity, edit test points if policy allows, save feedback/grade, release atomically, notify student. |
| Review queues | Query by class and type, expand/select queue, navigate to real targets. |
| Project requirement | Title, group size, deadline, description, PDF, required structure, rubric, repository policies, draft/publish. |
| Project monitoring | View specs, teams/repositories/contribution/readiness and open review. |
| Repository review | Branch/file/history/commit actions, invite collaborator, add review, return for revision, approve presentation, import PDF. |
| People/roster | Invite by email, generate/copy/revoke class code, manage member, remove member, view invitation status. |
| Notifications/profile | Fetch/read notifications, profile/settings, sign out. |

### Admin

- Review/change user role and account status.
- Create/edit courses and sections.
- Approve/remove enrollments.
- Assign/reassign instructors.
- Run repository policy checks and review archives.
- Retry checking jobs and acknowledge notices.
- View archive snapshots and request/approve restore.
- Query storage/system-health data with appropriate audit logging.

### Currently visual/no-op controls that still need a decision

Editor Resources, add tab, output Clear, custom testcase tab, submission guide, comment buttons, post “more” menus, attachment previews, project expand chevrons, repository new file/upload/directory/branch/tag/find/history/commit actions, clone/download/IDE actions, PDF/source pickers, test-case add, spec view, and generic profile/settings/account buttons have no implemented effect. Each should either be wired, deliberately disabled with explanatory state, or removed only after explicit product approval; preserving the current UI means wiring or disabling is safer than redesigning.

## 9. Terminology and data inconsistencies

| Inconsistency | Evidence/impact | Recommended canonical use |
| --- | --- | --- |
| Activity vs assignment | Student/instructor tabs, `assignmentRows`, “Create Assignment,” and “Submission Attempts” describe programming activities as assignments. | Use **Programming Activity** for Activity Mode records; use “Assignments” only as an optional umbrella UI label if product-approved. |
| One submission vs attempts | Product guardrail and central mocks say one submission; instructor form offers 1/2/3 attempts and text describes multiple attempts. | One final submission per student/activity; remove attempt-count semantics during functionalization without visually redesigning the control area. |
| Project vs project task | “Group Project,” project requirement, project repository, and to-do rows collapse requirement, repository, and task into one concept. | Separate **Project Requirement**, **Project Repository**, and **Project Task** entities. |
| Repository vs project repository | UI alternates “repository,” “team repository,” “project repository,” and “student repository.” | Use **Project Repository** when linked to a requirement; **Personal Repository** otherwise; “repository” as shorthand in workspace UI. |
| Class vs course | IT 112 is used as course and class; BSIT 2A is section; route/data sometimes call a combined record a class. | Course = catalog subject; Section = scheduled offering; Class = course-section-term workspace. |
| Student member vs collaborator | Class classmates/members and repository collaborators are mixed in invite/search wording. | **Class Member** for class enrollment; **Repository Collaborator** for repository access; **Project Team Member** for project team membership. |
| Student identity | Central role says Alyssa; login/profile says Julius; Alyssa is also classmate/review subject. | Authenticated user ID must be the sole identity source. |
| Marco Rivera role | Engr. Marco Rivera is instructor while Marco Rivera appears as student/collaborator/submission author. | Use separate stable IDs and unambiguous mock/person records before migration. |
| Emails | `.example` and `@slu.edu.ph` are mixed. | Define environment-safe canonical seed emails and never use login strings as IDs. |
| Class codes | `9346`, `9446`, random `XXXX-XXXX`, and `SLU-*` values represent the same feature. | One format, uniqueness constraint, lifecycle and optional expiry. |
| Dates | The same flow mixes 2022, 2026 and 2027 plus relative strings and unzoned timestamps. | Store UTC/offset timestamps; format per user timezone in the UI. |
| Status | `Published`, `Open`, `Due Soon`, `Submitted`, `Grading`, `Checked`, and similarity review labels occupy generic `status` fields. | Separate lifecycle, due, submission, checking, review, grade, and visibility enums. |
| Student similarity visibility | Central guardrail is safe; instructor screen shows exact comparison. Student page currently does not expose it. | Preserve general student labels only; enforce field-level authorization server-side. |

## 10. Recommended functionalization sequence

1. **Freeze a visual and route baseline.** Capture desktop/narrow screenshots for every implemented route, record current text/actions, and add route/render smoke tests before changing data flow. Treat CSS class names and DOM structure as compatibility contracts.
2. **Define canonical domain contracts and IDs.** Add TypeScript configuration and entity/DTO/status definitions in new non-visual modules. Do not begin by converting the 2,000-line page files. Define date, error, pagination, permission, and async-state conventions plus runtime response validation.
3. **Introduce an adapter/service boundary.** Make UI-facing view models match current component props exactly. Initially adapters may return existing mocks; this creates a seam for HTTP without changing markup.
4. **Implement users, sessions, roles, and authorization.** Add secure session handling, current-user/current-role loading, protected route wrappers, forbidden/not-found handling, and ownership checks. Preserve the three existing visual shells.
5. **Implement courses, sections/classes, memberships, instructor assignments, class codes, and invitations.** Feed layouts, headers, people, join/invite flows, and selectors from the same canonical records.
6. **Implement programming activities, files, attachments, and test-case authoring.** Preserve existing forms but bind them to controlled DTOs. Enforce the one-submission product rule and explicit activity lifecycle/deadline states.
7. **Implement compiler/checking jobs.** Treat runs as asynchronous jobs with queued/running/success/failure/timeout states. Never send hidden test logic to students. Connect autosave/editor state only after ownership and activity files are stable.
8. **Implement final submissions transactionally.** Enforce a database unique constraint on student/activity, deadline rules, idempotency, source snapshot, immutable submitted timestamp, and locked UI state. Test refresh, double-click, concurrent tabs, deadline races, and retry behavior.
9. **Implement instructor review, grading, feedback, and notifications.** Save drafts separately from release; release grade/feedback and create notification in one transaction/event flow. Provide role-specific response projections.
10. **Implement project requirements, teams, repositories, collaborators, invitations, branches, commits, files, tasks, and readiness.** Keep provider-specific IDs behind an integration service so the UI is not coupled to GitLab/GitHub semantics.
11. **Implement contribution, similarity, analytics, admin governance, storage, and archives.** Build these from persisted event/domain data. Enforce instructor-only similarity detail in backend serializers/authorization, not just hidden UI.
12. **Retire mocks incrementally.** Replace one adapter at a time, compare API and mock view models, retain fixture fallbacks for tests/story states, and remove production mock dependencies only after route-by-route visual and interaction parity.

## 11. Risk report

### Critical/high risks

- **Mock coupling and split sources of truth:** detailed student/instructor pages ignore the central model. A backend replacement performed screen by screen will create contradictory state unless shared IDs/adapters are introduced first.
- **Submission integrity:** current submit is navigation only, and instructor settings contradict the one-submission guardrail. Backend enforcement must not rely on disabled buttons.
- **No authorization boundary:** all role/entity URLs are directly accessible. Repository, hidden-test, grade, feedback, and similarity data would be exposed if APIs mirrored current route access.
- **Monolithic files:** `StudentPages.jsx` is 2,350 lines/86,885 bytes; `InstructorPages.jsx` is 2,295 lines/88,208 bytes; `src/data/projexData.js` is 1,141 lines/43,442 bytes. Small data changes can affect many unrelated screens.
- **Styling blast radius:** `App.css` is 12,712 lines/239,907 bytes with broad shared class naming across student and instructor screens. Markup/class changes are likely to cause visual regressions.

### Duplicate components/logic

- Student and instructor profile menus, notification menus, class headers/pages, stream comment composers, assignment tabs, repository workspaces, branch/code menus, file lists, collaborator lists, and modals repeat near-identical structures.
- Class-code generation/copy logic exists in both `DashboardLayout.jsx` and `InstructorPages.jsx`.
- Student and instructor repository files/collaborators describe the same repository but are separate arrays.
- Duplication should be consolidated only behind compatible props and snapshot coverage; a visual component rewrite during backend work is high risk.

### Routing risks

- Activity rows link to `/student/activity/act-loops-01/submitted`, which is not registered; the wildcard redirects to `/`.
- Catalog routes and component maps are duplicated. Unmapped instructor paths such as `invite-students`, `analytics`, and `students/stu-alyssa` fall back to the class stream. Student `analytics`, `settings`, and `archive` deliberately render unrelated stream/project pages; `submissions` reuses the activity board.
- Many catalog entries labeled “Placeholder” actually render detailed pages, and some “Shell ready” routes render reused unrelated pages. Status metadata is not a reliable implementation flag.
- Literal IDs prevent multiple classes/activities/repositories and make server-driven deep links impossible without route refactoring.
- No role-aware 403 or entity-aware 404 exists; the global wildcard masks bad links by returning home.

### State-management risks

- Local state is lost on remount/refresh and cannot synchronize across sidebar, list, detail, modal, and role views.
- Components initialize state from module arrays/props once; later async data changes could leave stale state (`rosterRows`, sidebar collapse, feedback modal defaults).
- There are no request cancellation, stale response, optimistic update, conflict, offline, validation, loading, or server error patterns.
- React `StrictMode` will expose unsafe side effects when fetching is added; effects must be idempotent/cancellable.
- Fixed notification counts, dashboard totals, list totals, and roster counts will drift unless derived from shared server data.

### Additional regression risks

- `StatusBadge` derives class names from arbitrary labels and assumes a non-null string.
- `DataTable` uses `row.item` as the key and cannot safely handle entities without that field or duplicate labels.
- Uncontrolled `defaultValue` form fields make validation, reset, server errors, and edit hydration difficult.
- Generated codes use non-cryptographic randomness and have no uniqueness/expiry/revocation.
- Clipboard success is shown without checking the returned promise.
- Mixed timestamps and display strings will sort incorrectly and cause deadline errors in Asia/Manila versus server time.
- Current editor is read-only text despite autosave messaging; functional editing is a material behavior addition and must preserve layout/performance.
- There is no test suite or configured test runner. Visual, route, permission, and transaction regression coverage must be added before high-risk replacement.

## 12. Protected UI files and components

Backend work should preserve the current visual hierarchy, DOM/class contracts, spacing, responsive behavior, labels unless correcting approved terminology, and existing interactions in these files.

### Protected styling and assets

- `src/App.css` — all role, page, modal, editor, repository, responsive, and landing styling.
- `src/index.css` — global/root styling.
- `public/assets/brand/*`, `public/favicon.svg`, `public/icons.svg`, and `src/assets/*` — current visual assets.

### Protected layout and routing presentation

- `src/layouts/DashboardLayout.jsx`: `StudentDashboardLayout`, `InstructorDashboardLayout`, generic `DashboardLayout`, `SidebarBrand`, `StudentSidebarLink`, `SidebarClassLink`, and `CreateClassModal` markup.
- `src/App.jsx`: existing user-visible route URLs and shell nesting should remain stable even when guards/loaders are added.

### Protected student UI

All rendered components in `src/pages/StudentPages.jsx`, especially `HomeDashboardPage`, `StudentClassPage`, `ClassHeader`, `StreamPage`, `ActivitiesPage`, `ActivityDetailPage`, `CodingWorkspacePage`, `SubmitConfirmationModal`, `FeedbackModal`, `GroupProjectsPage`, `GroupProjectDetailPage`, `RepositoryWorkspacePage`, `AddCollaboratorModal`, `StudentTodoPage`, `StudentRepositoriesPage`, `CreateRepositoryModal`, `StudentJoinClassPage`, `JoinClassModal`, and `PeoplePage`.

### Protected instructor UI

All rendered components in `src/pages/InstructorPages.jsx`, especially `InstructorDashboard`, `InstructorClassPage`, `InstructorClassHeader`, `InstructorStreamPage`, `InstructorActivitiesPage`, `CreateActivityPage`, `ActivityMonitoringPage`, `SubmissionQueuePage`, `SubmissionReviewPage`, `ReviewQueuesPage`, `InstructorProjectsPage`, `CreateProjectRequirementPage`, `ProjectMonitoringPage`, `InstructorRepositoryReviewPage`, review/invite modals, `InstructorPeoplePage`, and `InstructorClassInfoPage`.

### Protected admin/shared/public UI

- `src/pages/AdminPages.jsx`: all admin dashboards, tables, cards, and action placement.
- `src/pages/LoginPage.jsx`: landing page, student/instructor login, and prototype switcher layouts.
- `src/pages/RoleDashboard.jsx` and `src/pages/PlaceholderPage.jsx`.
- `src/components/Card.jsx`, `DataTable.jsx`, `StatCard.jsx`, and `StatusBadge.jsx` public markup/class contracts.

Protected does not mean logic cannot change. Fetching, validation, controlled values, loading/error overlays, permissions, and event handlers should be introduced behind or within the current presentation without a visual redesign. Any necessary markup change should be isolated, visually compared at desktop and narrow widths, and approved separately.

## Files inspected

### Application/configuration files read

- `AGENTS.md`
- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json` (dependency/lock inventory)
- `vite.config.js`
- `eslint.config.js`
- `index.html`
- `src/main.jsx`
- `src/App.jsx`
- `src/App.css`
- `src/index.css`
- `src/data/projexData.js`
- `src/layouts/DashboardLayout.jsx`
- `src/components/Card.jsx`
- `src/components/DataTable.jsx`
- `src/components/StatCard.jsx`
- `src/components/StatusBadge.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/RoleDashboard.jsx`
- `src/pages/PlaceholderPage.jsx`
- `src/pages/StudentPages.jsx`
- `src/pages/InstructorPages.jsx`
- `src/pages/AdminPages.jsx`

### Planning/reference files read or inventoried

- `docs/PROJEX_UI_DIRECTION.md`
- `docs/PROJEX_FEATURE_INVENTORY.md`
- `docs/PROJEX_ROUTES.md`
- `docs/PROJEX_MOCK_DATA_PLAN.md`
- `docs/PROJEX_IMPLEMENTATION_CHECKLIST.md`
- `docs/instructor-ui-guidelines.txt`
- All 17 tracked student UI reference PNG paths under `docs/ui-references/student/` were inventoried as protected visual references.

### Tracked assets inventoried

- `public/assets/brand/landing-benefit-1.png` through `landing-benefit-4.png`
- `public/assets/brand/projex-landingpage-logo.png`
- `public/assets/brand/projex-login-logo.png`
- `public/assets/brand/projex-login-logo1.png`
- `public/assets/brand/projex-login-mascot.png`
- `public/assets/brand/projex-sidebar-logo.png`
- `public/assets/brand/projex-favicon2.png`
- `public/assets/brand/projex_favicon.png`, `projex_favicon3.png`, `projex_favicon4.png`, `projex_favicon5.png`
- `public/assets/brand/slu-landing-logo.png`, `public/assets/brand/slu-logo.png`
- `public/favicon.svg`, `public/icons.svg`
- `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`

## Acceptance checklist for the next phase

- Keep current routes and visual shells stable.
- Establish canonical user/class/activity/submission/repository IDs before replacing screens.
- Enforce permissions and the one-submission rule on the server/database, not only in UI state.
- Keep hidden tests and detailed similarity data out of student responses.
- Add async loading/error/empty/forbidden/not-found behavior without redesigning existing views.
- Verify every route at desktop and narrow/mobile widths after each entity slice.
- Do not delete mocks until the corresponding live adapter has parity and regression coverage.
