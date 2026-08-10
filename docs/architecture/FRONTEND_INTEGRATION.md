# Frontend Integration

## Ownership and current boundary

This is the single current owner for Projex frontend integration: API-client behavior, browser authentication and CSRF, role routing, frontend state ownership, mock retirement, visual preservation, frontend testing, backend-gap handling, and Phase 10 milestone tracking.

The client remains React 19, Vite 8, JavaScript/JSX, React Router, and the existing CSS. Phase 10 does not authorize a TypeScript migration, a general state/query/form library, or a student/instructor redesign. The current admin pages are only a historical feature inventory and must be replaced in Phase 10D using the student/instructor visual language.

Phase 10A.1 completed shared infrastructure and authentication. Phase 10A.2 connects classes and memberships through the existing backend and is implemented pending final review. Activities, submissions, projects, repositories, Git workflows, and admin data remain later boundaries. Backend records are authoritative; production routes never fall back to mocks after an API failure.

## Shared client contract

### API client

- All JSON application requests use one native-fetch client and the `/api/v1` base by default. `VITE_API_BASE_URL` may configure a different API base without containing a secret.
- Requests use `credentials: include`, standard JSON envelopes, safe `ApiError` fields, request IDs, and caller-provided abort signals.
- Protected mutations read the `projex_csrf` cookie only while constructing the request and send it as `X-CSRF-Token`.
- The client never logs request/response bodies, credentials, cookies, passwords, source, hidden tests, feedback, reasons, or host paths.
- A protected request may trigger one shared refresh operation after a 401. Login and refresh never recursively refresh. If refresh or the single retry proves the session unusable, the API client notifies `AuthProvider` so protected content is removed and routing returns to login.

### Authentication and role routing

- `AuthProvider` owns only bootstrap status, the safe current-user profile, authentication state, login, logout, refresh, account setup, and password change.
- Bootstrap calls `GET /auth/me`; an initial 401 triggers one refresh and one retry through the API client.
- Anonymous users cannot render protected role layouts. A wrong-role user is redirected to the home for the backend-returned role.
- UI role checks control navigation and presentation only. Backend authorization remains authoritative.
- Setup tokens are read from the URL fragment, retained only in component memory, and removed from the visible URL immediately.
- Access, refresh, CSRF, setup, and Git credentials are never persisted in `localStorage` or `sessionStorage`.

### Error/status behavior

| Condition | Frontend behavior |
| --- | --- |
| Initial bootstrap | Full-page loading state; no protected-content flash |
| Network/server failure | Safe unavailable state and bounded manual retry |
| `400 VALIDATION_FAILED` | Map allowlisted issue paths to fields |
| `401` | Refresh once when eligible, otherwise return to login |
| `403` | Honest permission/account state |
| `404` | Safe not-found state without existence disclosure |
| `409` | Stale/conflict state; later forms retain unsent values |
| `422` | Show backend-approved lifecycle/business correction |
| `503` | Service/worker unavailable state, not fabricated health |
| Unknown | Safe message plus request ID, never raw payload/stack |

## State ownership

| State | Owner |
| --- | --- |
| Current user and bootstrap | `AuthProvider` |
| Selected class | Phase 10A.2 URL state derived from authorized classes |
| Route data | Owning feature hook/component |
| Forms and mutation state | Owning controlled form |
| Filters, sorting, pagination | URL search parameters when introduced |
| Optimistic-concurrency timestamp | Loaded resource/form state |
| Java practice/submission jobs | Phase 10B polling hook |
| Repository provisioning | Phase 10C polling hook |
| One-time Git secret | Issuance dialog memory only, cleared on close/unmount |
| Admin filters/summaries | Phase 10D route state |

No normalized global cache or general global store is approved. Confirmed backend responses replace local optimistic views unless an endpoint explicitly supports an optimistic concurrency workflow.

## Bidirectional feature-parity inventory

This inventory is maintained in both directions throughout Phase 10: prototype concepts cannot silently disappear when mocks are retired, and approved end-user backend capabilities cannot remain invisible without an explicit disposition. `INTEGRATED` means real UI and backend are connected. `UI GAP` means the backend exists but the adequate frontend is assigned to a remaining milestone. `BACKEND GAP` means a prototype concept has no backend. `DEFERRED` preserves a recognized non-core concept without simulating it. `UNSUPPORTED PROTOTYPE` identifies old behavior incompatible with the approved system. `REMOVED FROM SCOPE` is reserved for an explicit product decision and is not assigned autonomously.

| Meaningful feature | Frontend | Backend | Iteration 1 | Status | Owning milestone | Final UI treatment |
| --- | --- | --- | --- | --- | --- | --- |
| Session authentication, role routing, logout, CSRF, and account setup | Yes | Yes | Core | INTEGRATED | 10A.1 | Real protected entry and account setup flows |
| Authenticated password change and logout-all-sessions controls | No | Yes | Core | UI GAP | Phase 10A follow-up gate | Add a shared account-security entry point without exposing session or credential details |
| Authorized class catalog and explicit URL selection | Yes | Yes | Core | INTEGRATED | 10A.2 | Real student/instructor cards, sidebars, loading, empty, and safe inaccessible states |
| Class metadata create/edit and archive/restore | Yes | Yes | Core | INTEGRATED | 10A.2 | Instructor forms and lifecycle confirmation; archived classes remain read-only |
| Student class-code join | Yes | Yes | Core | INTEGRATED | 10A.2 | One-time input sent only in the protected request body; code is not persisted or redisplayed |
| Student-safe and instructor-detailed rosters | Yes | Yes | Core | INTEGRATED | 10A.2 | Role-specific allowlisted fields with bounded pagination |
| Membership removal/reactivation | Yes | Yes | Core | INTEGRATED | 10A.2 | Confirmed instructor action followed by authoritative backend response/refetch |
| Join-code view, rotation, revocation, and inactive state | Yes | Yes | Core | INTEGRATED | 10A.2 | Dedicated instructor screen; copy only when usable; no browser generation |
| Class invitations and invite-by-email | Yes | No | Deferred | DEFERRED | Future product decision | Honest unavailable state; retain concept without local acceptance or fake email delivery |
| Class announcements and comments | Yes | No | Deferred | DEFERRED | Future product decision | Class overview retains a clear deferred stream state; fake posts and local mutations removed |
| Notifications | Yes | No | Deferred | DEFERRED | Future product decision | Bell visual remains disabled without fake counts or messages |
| Schedules, rooms, class rules, and fabricated enrollment metrics | Yes | No | Deferred | BACKEND GAP | Future product decision | Omit from authoritative class views; preserve concept here for future evaluation |
| Activity and test-case authoring/lifecycle | Yes | Yes | Core | UI GAP | 10B | Connect the existing instructor activity surfaces to approved APIs |
| Student activity catalog/details and visible-test practice | Yes | Yes | Core | UI GAP | 10B | Replace activity previews with authorized class-scoped records and worker states |
| Submission attempts and operational results | Yes | Yes | Core | UI GAP | 10B | Connect immutable attempts without exposing hidden-test detail |
| Instructor assessment, correction, feedback, and release | Yes | Yes | Core | UI GAP | 10B | Connect approved review actions and released student projections |
| Cross-class submission/review queue | Yes | No | Core | BACKEND GAP | 10B follow-up gate | Require a bounded backend contract before global queue integration |
| Project tasks, teams, invitations, and repository academic lifecycle | Yes | Yes | Core | UI GAP | 10C | Connect approved student/instructor collaboration workflows |
| Repository provisioning state and safe inspection | Yes | Yes | Core | UI GAP | 10C | Replace fabricated files/history with real safe inspection projections |
| Repository-scoped Git credentials and local-client guidance | No | Yes | Core | UI GAP | 10C | Add short-lived issuance flow and local Git instructions; never persist the secret |
| Browser Git file editing, upload, ZIP, branch/tag creation, merge, or fake history | Yes | No | Deferred | UNSUPPORTED PROTOTYPE | 10C retirement | Remove or disable controls because they conflict with the approved boundary; direct users to the approved local Git client workflow |
| Repository activity feed | Yes | No | Core | BACKEND GAP | 10C follow-up gate | Require a bounded read contract before displaying real activity |
| Student/instructor analytics | Yes | No | Deferred | DEFERRED | Future research/product decision | No canonical role projection exists; keep an explicit unavailable state with no fabricated rates or risk claims |
| Similarity indicators and verified contribution analytics | Yes | No | Deferred | DEFERRED | Future research/product decision | No approved computation/projection exists; preserve as recognized research concepts and show no fake percentages |
| Admin account, academic, operational, recovery, and audit capabilities | Yes | Yes | Core | UI GAP | 10D | Replace the inadequate temporary mock using the student/instructor visual language and Phase 9 safe projections |
| Attachments, project rubric/grading, and post-release grade versioning | Yes | No | Deferred | DEFERRED | Future product decision | Retain inventory only until separately approved |

No feature is classified `REMOVED FROM SCOPE` at this boundary.

## Exhaustive route baseline

Statuses below describe the baseline found at Phase 10 start plus the Phase 10A.1 authentication disposition. “Mock-driven” means hardcoded records render the page; “local-only” means controls change component state without a request; “visual prototype” means the route exists mainly as a design; “incorrectly routed” means it renders an unrelated component; and “unsupported” means no approved backend contract exists.

### Public and shared routes

| Route | Component | Baseline/current status | Data or handler | Backend contract/gap | Milestone | Visual disposition | Mock retirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `RoleLandingPage` | Visual prototype | Static product preview, scores, similarity, dates | Marketing surface; no data contract | 10A.1 guard entry | Preserve; keep preview clearly illustrative | Inline landing preview remains presentation-only |
| `/student-login` | `LoginPage` | Backend-connected in 10A.1 | Previously direct navigation and demo credentials | `POST /auth/login` | 10A.1 | Preserve with validation/loading | Fake navigation and demo password retired |
| `/instructor-login` | `InstructorLoginPage` | Backend-connected in 10A.1 | Previously direct navigation and demo credentials | `POST /auth/login` | 10A.1 | Preserve with validation/loading | Fake navigation and demo password retired |
| `/prototype-switcher` | Redirect | Retired authentication bypass | Previously linked directly to all role roots | No approved bypass | 10A.1 | Remove | `roles`-driven switcher retired |
| `/account-setup` | `AccountSetupPage` | Backend-connected in 10A.1 | Fragment token and controlled password form | `POST /account-setup/complete` | 10A.1 | Match login visual | No mock fallback |
| `*` | `Navigate` | Routing utility | Redirect to landing | Not applicable | 10A.1 | Preserve | None |
| `/student/*`, `/instructor/*`, `/admin/*` | `ProtectedRoute` + layout | Backend-connected guard in 10A.1 | Previously directly accessible | `/auth/me`, `/auth/refresh` | 10A.1 | Preserve layouts; add safe states | Direct anonymous/role access retired |

### Student routes

| Route | Current component | Status | Hardcoded/local behavior | Backend contract or gap | Milestone | Disposition | Mock source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/student` | `HomeDashboardPage` | Class-connected | Real identity, class totals, active/archived cards | Activity/project summaries remain later work; notifications deferred | 10A.2–10C | Existing dashboard with truthful class data | Class-owned home arrays retired |
| `/student/classes` | `StudentClassesPage` | Connected | Authorized catalog, explicit selection, safe detail | Announcement/comment backend gap | 10A.2 complete; stream deferred | Existing class shell plus honest deferred stream state | Class/stream mocks retired |
| `/student/todo` | `StudentTodoPage` | Mock-driven | Due groups, fake counts/filter | No authoritative global to-do contract | 10B/10C | Preserve layout; derive only supported records | `todoSections` |
| `/student/join-class` | `StudentJoinClassPage` | Connected | Server-validated one-time code input and safe joined-class result | `POST /classes/join` | 10A.2 complete | Existing modal connected | Join fallback and invitation mocks retired |
| `/student/invitations` | `DeferredStudentPage` | Deferred | No fake accept/decline behavior | Class invitation API absent | Deferred/new scope | Honest unavailable state | Invitation mock retired; concept retained in inventory |
| `/student/people` | `PeoplePage` | Connected | Selected-class instructor plus student-safe paginated classmates | `GET /classes/:classId/members` | 10A.2 complete | Existing people visual with privacy projection | Inline class roster retired; project invite fixture separated |
| `/student/activity` | `ActivitiesPage` | Mock-driven | Static filters, scores, due states | Class activity list | 10B | Preserve | Inline/project data and `projexData.js` activity data |
| `/student/activity/act-loops-01` | `ActivityDetailPage` | Visual prototype | Fixed activity/instructions/work status | Activity detail | 10B | Preserve with dynamic ID and attempt model | Inline activity record |
| `/student/activity/act-loops-01/workspace` | `CodingWorkspacePage` | Local-only, visual prototype | Read-only source, fake autosave, alternating fake tests | Visible-test run and submission APIs | 10B | Preserve with necessary editable/status adjustments | `workspaceCode`, objectives/results |
| `/student/activity/act-loops-01/submission-record` | `ActivityDetailPage` | Mock-driven | Static accepted submission/score state | Submission detail | 10B | Preserve; parameterize submission | Inline record |
| `/student/submissions` | `ActivitiesPage` | Incorrectly routed | Renders activity list instead of submissions | Global role-scoped submission list missing | 10B + backend follow-up | Replace with genuine submission page | Activity mocks |
| `/student/activity/act-loops-01/feedback` | `ActivityDetailPage` | Mock-driven | Fixed 5/5 results/score/feedback | Released submission projection | 10B | Preserve but never reveal hidden-test count | `feedbackResults` |
| `/student/projects` | `GroupProjectsPage` | Mock-driven | Static project cards | Class project-task list | 10C | Preserve | `groupProjects` |
| `/student/projects/prelim-group-project-1` | `GroupProjectDetailPage` | Local-only | Create/join toggles and joined name | Project detail and repository create; direct join absent | 10C | Preserve create; remove direct join | Project/repository inline arrays |
| `/student/projects/prelim-group-project-1/repository` | `RepositoryWorkspacePage` | Mock-driven, local-only, partially supported | Fake files/commits/branches/invites/review/clone | Repository, invitation, source, credential APIs; web mutations/activity feed gaps | 10C | Preserve workspace; remove unsupported controls | Repository inline arrays |
| `/student/projects/repo-campus-nav` | `GroupProjectsPage` | Incorrectly routed | Project list aliases repository overview | Repository detail/summary exists | 10C | Replace with real overview | `groupProjects` |
| `/student/projects/repo-campus-nav/contributions` | `GroupProjectsPage` | Incorrectly routed, unsupported | No contribution page | Verified contribution contract absent | Deferred/new scope | Replace with unavailable state | `studentProject`, analytics mocks |
| `/student/repositories` | `StudentRepositoriesPage` | Mock-driven, local-only | Static groups/create navigation | Repository list/create | 10C | Preserve | Repository group arrays |
| `/student/analytics` | `DeferredStudentPage` | Deferred | Explicit unavailable state | Canonical analytics absent | Deferred/new scope | Honest unavailable state | Incorrect stream fallback retired |
| `/student/archive` | `DeferredStudentPage` | Deferred pending 10C | Explicit unavailable state | Archived class access exists in class catalog; archived project/repository view remains 10C | 10C | Preserve route for real read-only project view | Incorrect active-project fallback retired |
| `/student/settings` | `DeferredStudentPage` | Deferred | Explicit unavailable state | User profile/settings update absent | Deferred/new scope | Honest unavailable state | Incorrect stream fallback retired |

### Instructor routes

| Route | Current component | Status | Hardcoded/local behavior | Backend contract or gap | Milestone | Disposition | Mock source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/instructor` | `InstructorDashboard` | Class-connected | Real identity, owned class totals/cards | Global review/notifications remain later gaps | 10A.2–10C | Existing dashboard with truthful class data and deferred queue state | Class-owned home arrays retired |
| `/instructor/classes` | `InstructorClassesPage` | Connected | Owned catalog, explicit selection, real metadata/action links | Stream API absent | 10A.2 complete; stream deferred | Existing class shell plus honest deferred state | Stream mocks/local handlers retired |
| `/instructor/people` | `InstructorPeoplePage` | Connected | Detailed bounded roster and membership transitions | Roster/membership APIs | 10A.2 complete | Existing roster table with authoritative actions | Old roster/code/invite controls retired |
| `/instructor/class-info` | `InstructorClassInfoPage` | Connected | Supported metadata update and archive/restore | Class detail/update/lifecycle | 10A.2 complete | Existing info panel and forms | Unmodeled rules removed from authoritative view |
| `/instructor/roster` | `InstructorPeoplePage` | Connected | Alias of detailed roster | Roster/membership APIs | 10A.2 complete | Preserve alias | Old roster retired |
| `/instructor/invite-students` | `DeferredInstructorPage` | Deferred | No fake email or invitation success | Class invitation API absent | Deferred/new scope | Honest unavailable state with join-code alternative | Incorrect fallback retired |
| `/instructor/class-code` | `InstructorClassCodePage` | Connected | Server-owned active state, copy, rotate, revoke | Join-code get/rotate/revoke | 10A.2 complete | Dedicated code controls | Browser generation/default codes retired |
| `/instructor/review-queues` | `ReviewQueuesPage` | Mock-driven | Cross-class counts/selection | Efficient global review queue absent | 10B/10C + backend follow-up | Preserve | `reviewQueueClasses` |
| `/instructor/activity` | `InstructorActivitiesPage` | Mock-driven | Static filters/actions | Activity list/lifecycle | 10B | Preserve | `activities` |
| `/instructor/activity-settings` | `CreateActivityPage` | Incorrect alias/local-only | Same unsaved create form | Activity update/test-case replace | 10B | Preserve with correct mode | Form defaults |
| `/instructor/activity/new` | `CreateActivityPage` | Local-only | Status text only, file/rubric-like controls | Activity create/test cases; attachments absent | 10B | Preserve supported fields; remove unsupported controls | Form defaults |
| `/instructor/activity/act-loops-01/monitor` | `ActivityMonitoringPage` | Mock-driven, partially supported | Progress/compiler/idle signals | Submission states exist; live presence/idle absent | 10B | Preserve supported states only | `monitoringStats`, rows |
| `/instructor/activity/act-loops-01/submissions` | `SubmissionQueuePage` | Mock-driven | Static submission queue | Per-activity submission list | 10B | Preserve | `submissionRows`, `queueRows` |
| `/instructor/submission-review` | `SubmissionReviewPage` | Local-only, conflicting | Fake rerun, per-test edits, grade, similarity | Get/correct/review/release/retry/resolve; similarity absent | 10B | Preserve layout with scoring correction | `reviewTests`, `submittedCode` |
| `/instructor/projects` | `InstructorProjectsPage` | Mock-driven | Static oversight cards | Class project-task list | 10C | Preserve | `groupProjects` |
| `/instructor/projects/new` | `CreateProjectRequirementPage` | Local-only, partially supported | Fake save/publish, rubric/deliverables | Project-task create; rubric/attachments absent | 10C | Preserve supported fields | Form defaults |
| `/instructor/projects/prelim-group-project-1` | `ProjectMonitoringPage` | Mock-driven | Teams/contribution states | Project monitoring exists; verified contribution absent | 10C | Preserve supported lifecycle/team data | `projectTeams` |
| `/instructor/projects/prelim-group-project-1/repository` | `InstructorRepositoryReviewPage` | Mock-driven, local-only | Fake source/invite/review | Source/review/feedback exist; instructor invite absent | 10C | Preserve review, remove unsupported invite/web mutations | Repository arrays |
| `/instructor/projects/repo-campus-nav/contributions` | `InstructorRepositoryReviewPage` | Incorrectly routed, unsupported | Reuses review page | Verified contribution API absent | Deferred/new scope | Replace with unavailable state | `contributionRows` |
| `/instructor/projects/repo-campus-nav/similarity` | `InstructorRepositoryReviewPage` | Incorrectly routed, unsupported | Reuses review page/fabricated percentage | Similarity projection/computation absent | Deferred/new scope | Replace with unavailable state | Static similarity copy |
| `/instructor/projects/repo-campus-nav/archive` | `InstructorRepositoryReviewPage` | Incorrectly routed | Reuses review page | Repository archive/restore exists; integrity/snapshots absent | 10C | Replace with lifecycle-only view | Static archive copy |
| `/instructor/analytics` | `DeferredInstructorPage` | Deferred | Explicit unavailable state | Canonical analytics absent | Deferred/new scope | Honest unavailable state | Incorrect stream fallback retired |
| `/instructor/students/stu-alyssa` | `DeferredInstructorPage` | Deferred | Explicit unavailable state | Consolidated student profile absent | Deferred/new scope | Honest unavailable state | Incorrect stream fallback retired |

### Admin routes

Every admin route is a mock feature inventory and Phase 10D replacement boundary. Phase 10A.1 adds authentication/role protection only and does not functionalize or redesign these pages.

| Route | Component | Baseline status | Unsupported or misleading concepts | Matching Phase 9 capability | Milestone/disposition | Mock source |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `AdminDashboard` | Mock-driven; requires redesign | Institutional totals, integrity/preservation claims | Admin overview and bounded health | 10D replace | `adminStats`, `adminSystemHealth` |
| `/admin/users` | `UserManagementPage` | Local-only; requires redesign | Role review/change, fabricated totals | User directory, provisioning, status, summary, session revoke | 10D replace | `adminUsers` |
| `/admin/courses` | `CourseManagementPage` | Unsupported; requires redesign | Separate Course model/create/edit | Admin class oversight; class lifecycle APIs | 10D replace with academic oversight | `adminCourses` |
| `/admin/sections` | `SectionManagementPage` | Unsupported; requires redesign | Separate Section model and counts | Class records contain section metadata | 10D replace | `adminSections` |
| `/admin/enrollments` | `EnrollmentsPage` | Local-only; requires redesign | Pending approvals/invitations/manual bypass | Class members and admin membership transitions | 10D replace | `adminEnrollments` |
| `/admin/instructor-assignments` | `InstructorAssignmentsPage` | Unsupported; requires redesign | Reassignment/transfer workflow | Safe class/instructor metadata only | 10D replace | `adminInstructorAssignments` |
| `/admin/repositories` | `RepositoryManagementPage` | Local-only; requires redesign | Policy checks, integrity/archive review | Safe repository oversight | 10D replace | `adminRepositories` |
| `/admin/storage` | `StoragePage` | Mock-driven; requires redesign | Capacity percentages/provisioned totals | Known/unmeasured storage summaries only | 10D replace | `adminStorage` |
| `/admin/archive` | `ArchivePage` | Local-only; requires redesign | Snapshots, retention, restore requests, integrity | Archived metadata only | 10D replace | `adminArchives` |
| `/admin/system` | `SystemHealthPage` | Local-only; requires redesign | Worker health, notices, generic retry | Bounded health/job views and eligible provisioning retry | 10D replace | `adminSystemHealth` |

## Hardcoded and duplicated entity inventory

### Central mock module

`client/src/data/projexData.js` retains roles, course/section options, activity summaries, route catalog, later-milestone dashboard rows, student activity/submission/feedback/project/analytics/archive records, instructor activity/monitoring/submission/review/project/similarity/analytics/student-profile records, and all admin tables/summaries. Phase 10A.2 removed the central class-membership, instructor-roster, and instructor-class-code fixtures.

### Student page inline records

Phase 10A.2 retires student class/home/stream/invitation/roster fixtures. `repositoryInviteCandidates` is deliberately separated from the retired class roster and remains only for the Phase 10C project-repository prototype. Activity, submission, project, repository, notification-design, to-do, and workspace fixtures remain later-milestone evidence and are not treated as records for a selected real class.

### Instructor page inline records

Phase 10A.2 retires `instructorClass`, class dashboard/home cards and statistics, stream items, browser join-code generation, and the old roster. Activity, monitoring, submission, review, project, repository, and contribution fixtures remain assigned to 10B/10C or documented deferred scope.

### Layout records

The layout class arrays and both client-side class-code generators were retired in 10A.2. The role shell now consumes authorized class projections from the bounded class context.

Repeated example identifiers include `act-loops-01`, `prelim-group-project-1`, `repo-campus-nav`, and `stu-alyssa`. Phase-specific integration must parameterize them using authorized backend IDs without breaking the established route hierarchy.

## Local-only and visually misleading actions

- Login and prototype role switching previously bypassed authentication; retired in 10A.1.
- Header sign-out previously navigated without revoking the session; retired in 10A.1.
- Class announcements/comments, class invitation decisions, browser class-code generation, and local roster removal were retired in 10A.2. Repository joining/inviting, repository review readiness, activity/project save/publish, score/test edits, feedback release, repository review, and every admin action remain assigned to later milestones and must not be mistaken for integrated behavior.
- Student practice alternates fake pass/fail synchronously. Instructor “Run Tests” forces a fake failed state.
- Student workspace shows fake autosave although no draft API exists.
- Repository controls imply browser file upload/edit, branch/tag creation, ZIP download, IDE launch, and Git mutation although those contracts are absent or explicitly deferred.
- Notification counts, scores, dates, attempts, job states, storage totals, branches, commits, similarity, contribution, integrity, and health signals are hardcoded.
- No fake asynchronous timers, `localStorage`, `sessionStorage`, WebSocket, EventSource, or production mock fallback existed at baseline.

## Mock retirement policy

1. Retire one feature’s production mocks only when its backend-integrated route and empty/loading/error states are complete.
2. Move useful synthetic edge cases to test fixtures; never silently return them after an API failure.
3. Unsupported routes render an explicit unavailable/deferred state rather than an unrelated page.
4. Remove duplicate inline data only after route-level searches prove no pending milestone still depends on it.
5. Marketing illustrations may remain static only when clearly presented as product previews rather than live user data.

## Visual preservation

Preserve the student/instructor landing and login presentation; shells, sidebars, headers, tabs, cards, forms, tables, workspace panes, modals, repository grids, responsive breakpoints, and reduced-motion behavior. Add only scoped loading/error/empty states, accessibility corrections, dynamic route/data bindings, and the smallest adjustment required for truthful backend behavior. Avoid broad `App.css` cleanup or unrelated markup refactoring.

The admin interface is not protected. Phase 10D must replace its generic dense shell and unsupported information architecture with student/instructor typography, spacing, hierarchy, cards, chips, tables, dialogs, responsive behavior, confirmations, reason collection, and stale-version recovery. It may show only Phase 9-supported metrics and actions.

## Frontend testing

Phase 10A.1 establishes Vitest, jsdom, React Testing Library, user-event, and jest-dom as development-only tooling. Tests cover API envelopes/errors, credentials, CSRF, refresh concurrency, login/logout/bootstrap, role guards, account-setup fragment handling, sensitive-field cleanup, and absence of browser credential persistence.

Later milestones add feature integration tests plus controlled loopback acceptance against `projex_test`, guarded Java execution, and guarded Git storage. Frontend tests never contact normal `projex`.

## Backend-gap handling

| Gap | Classification | Phase 10 handling |
| --- | --- | --- |
| Global student submissions and instructor review queue | Missing read contract | Propose bounded backend follow-up before completing 10B; no schema expected |
| Repository activity feed | Missing safe read contract | Propose bounded backend follow-up before completing 10C; no schema expected |
| Class invitations, streams/comments, notifications | Missing/new product scope | Explicitly defer; do not simulate |
| Analytics, similarity, verified contribution | Research/product scope | Explicitly defer |
| Attachments, project rubrics/grades | New product scope | Explicitly defer |
| Browser Git file/branch/commit/merge/tag operations | Previously deferred scope | Remove/disable; use local Git client and approved Smart HTTP |
| Exact inactive-account reason during login/session restore | Existing authentication contract intentionally returns the same generic 401 used for other authentication failures | Preserve anti-enumeration behavior. `ProtectedRoute` renders an account-unavailable state when a trusted profile reports a non-active status; the client does not infer or disclose a status from a generic login failure. |

Any required schema, migration, new architecture, dependency, or security relaxation remains a separate approval boundary.

## Phase 10 milestones

Phase 10A.1 is complete. Phase 10A.2 is implemented and awaiting its separate final review/commit boundary; the remaining bullets describe milestone ownership rather than incomplete status.

- **10A.1 — Shared foundation and authentication:** API client, CSRF, session bootstrap/refresh, login/logout, account setup, role guards, safe states, tests, and this baseline.
- **10A.2 — Classes and memberships:** class list/selection/create/update/lifecycle, join codes, student join, rosters, and membership transitions.
- **10B — Activities, submissions, and assessment:** activity/test-case authoring, visible-test practice, attempts, assessment, correction, review, feedback, and release.
- **10C — Projects, repositories, and Git:** project tasks, teams, invitations, repository lifecycle/provisioning/inspection, feedback, credentials, and local Git guidance.
- **10D — Admin redesign and integration:** supported Phase 9 account, academic oversight, operations, recovery, and audit experiences only.

Each milestone may use multiple reviewable commits on `phase/10-frontend-integration`. Integration into `development/fullstack` remains a separate approval after complete Phase 10 acceptance.
