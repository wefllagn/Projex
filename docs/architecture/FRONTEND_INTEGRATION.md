# Frontend Integration

## Ownership and current boundary

This is the single current owner for Projex frontend integration: API-client behavior, browser authentication and CSRF, role routing, frontend state ownership, mock retirement, visual preservation, frontend testing, backend-gap handling, and Phase 10 milestone tracking.

The client remains React 19, Vite 8, JavaScript/JSX, React Router, and the existing CSS. Phase 10 does not authorize a TypeScript migration, a general state/query/form library, or a student/instructor redesign. The current admin pages are only a historical feature inventory and must be replaced in Phase 10D using the student/instructor visual language.

Phase 10A completed shared infrastructure, authentication, classes, and memberships. Phase 10B completed activity/test-case authoring, student practice/submissions, and instructor assessment/release. Phase 10C.1 connects project-task and repository-foundation workflows and is implemented pending final review. Collaboration/review, Git inspection/credentials, and admin data remain later boundaries. Backend records are authoritative; production routes never fall back to mocks after an API failure.

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
| Activity and test-case authoring/lifecycle | Yes | Yes | Core | INTEGRATED | 10B.1 | Real selected-class drafts, supported edits, atomic test replacement, version-safe lifecycle actions, and read-only published/closed/archive states |
| Student activity catalog and details | Yes | Yes | Core | INTEGRATED | 10B.1 | Authorized selected-class records, dynamic IDs, truthful due/lifecycle state, and visible-only test examples |
| Student programming workspace and visible-test practice | Yes | Yes | Core | INTEGRATED | 10B.2 | Real selected-activity starter source, memory-only editing, guarded practice requests, and bounded polling |
| Official submission attempts and operational results | Yes | Yes | Core | INTEGRATED | 10B.2 | Immutable per-activity attempts, idempotent ambiguous retry, canonical detail, and backend-provided attempt/replacement labels |
| Released student score and feedback | Yes | Yes | Core | INTEGRATED | 10B.2 | Render only fields present in a backend-released student projection; unreleased values remain omitted |
| Persistent activity drafts and autosave | Yes | No | Deferred | DEFERRED | Future product decision | Honest memory-only source message; fake autosave removed and no browser persistence added |
| Arbitrary custom stdin | Yes | No | Deferred | UNSUPPORTED PROTOTYPE | 10B.2 retirement | Removed from the authoritative workspace because Phase 6 accepts only activity-defined visible tests |
| Hidden-test student breakdown | Yes | No | Deferred | UNSUPPORTED PROTOTYPE | 10B.2 retirement | Never render hidden-test names, identifiers, definitions, outcomes, points, or count |
| Instructor per-activity queue, assessment, correction, feedback, failure resolution, and release | Yes | Yes | Core | INTEGRATED | 10B.3 | Real activity-scoped queue and canonical review with immutable evidence, append-only corrections, version-safe drafts/release, retry, and replacement resolution |
| Arbitrary instructor reassessment, per-test point editing, and released-record reopening | Yes | No | Deferred | UNSUPPORTED PROTOTYPE | 10B.3 retirement | Omit fake Run Tests, editable assessment evidence, and Review Again behavior; preserve the immutable Phase 6 lifecycle |
| Global student submissions and cross-class instructor review queues | Yes | No | Core | BACKEND GAP | 10B follow-up gate | Require bounded backend contracts before global queue integration |
| Project-task catalog, detail, authoring, and lifecycle | Yes | Yes | Core | INTEGRATED | 10C.1 | Real selected-class student/instructor records, version-safe authoring, and backend lifecycle actions |
| Personal and class-project repository creation, catalogs, metadata, provisioning, and archived presentation | Yes | Yes | Core | INTEGRATED | 10C.1 | Real role-scoped records, supported metadata edits, bounded provisioning polling, and truthful terminal states |
| Teams, invitations, synchronized membership, repository review, and project feedback | Yes | Yes | Core | UI GAP | 10C.2 | Connect approved collaboration and review workflows without local-only mutations |
| Repository Git summary, branches, commits, tree, blob, and diff inspection | Yes | Yes | Core | UI GAP | 10C.3 | Replace isolated visual references with authorized read-only Git projections |
| Repository-scoped Git credentials and local-client guidance | No | Yes | Core | UI GAP | 10C.3 | Add short-lived issuance flow and local Git instructions; never persist the secret |
| Browser Git file editing, upload, ZIP, branch/tag creation, merge, or fake history | Yes | No | Deferred | UNSUPPORTED PROTOTYPE | 10C retirement | Remove or disable controls because they conflict with the approved boundary; direct users to the approved local Git client workflow |
| Repository activity feed | Yes | No | Core | BACKEND GAP | 10C follow-up gate | Require a bounded read contract before displaying real activity; do not derive one from provisioning events |
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
| `/student/activity` | `ActivitiesPage` | Connected in 10B.1 | Real bounded selected-class records and status filtering | Class activity list | 10B.1 complete | Existing assignment board with authoritative counts and states | Inline activity/project rows retired from this route |
| `/student/activity/:activityId` | `ActivityDetailPage` | Connected in 10B.1 | Real instructions, lifecycle, deadline, limits, and visible test examples | Activity detail and student test-case projection | 10B.1 complete | Existing detail/work-rail composition | Fixed activity record retired |
| `/student/activity/:activityId/workspace` | `StudentProgrammingWorkspace` | Connected in 10B.2 | Real activity starter source, memory-only editing, visible-test execution, immutable submission confirmation, and ambiguous-request recovery | Visible-test run and submission APIs | 10B.2 complete | Preserved workspace composition with truthful states | Fake files, autosave, compiler success, custom input, fixed IDs, and one-attempt claim retired |
| `/student/activity/:activityId/submissions` | `StudentSubmissionHistory` | Connected in 10B.2 | Bounded activity-specific history and status filtering | Activity submission list | 10B.2 complete | Existing assignment-card language with backend labels | No hardcoded attempts or global totals |
| `/student/activity/:activityId/submissions/:submissionId` | `StudentSubmissionDetail` | Connected in 10B.2 | Student-safe source, visible outcomes, bounded assessment refresh, failure/replacement state, and released result | Submission detail | 10B.2 complete | Canonical submission record | Deliberately allowlisted projection; no hidden or instructor-only evidence |
| `/student/activity/:activityId/submission-record` | `LegacySubmissionRoute` | Redirect | Redirects to canonical activity attempt history; no fabricated record | Canonical submission routes above | 10B.2 complete | Compatibility redirect | Fixed submission prototype retired |
| `/student/submissions` | `DeferredStudentPage` | Backend gap state | No fake global aggregate | Global role-scoped submission list missing | 10B backend follow-up | Require a bounded read contract | Incorrect activity-list alias retired |
| `/student/activity/:activityId/feedback` | `LegacySubmissionRoute` | Redirect | Feedback is shown only within a backend-released canonical submission | Released submission projection | 10B.2 complete | Compatibility redirect | Fake score, feedback, and hidden-test claims retired |
| `/student/projects` | `StudentProjectCatalog` | Connected in 10C.1 | Real published/closed selected-class catalog | Class project-task list | 10C.1 pending final review | Dynamic backend IDs and truthful empty/error states | Authoritative project cards retired |
| `/student/projects/:projectTaskId` | `ProjectDetailPage` | Connected in 10C.1 | Real project detail and eligible class-project repository creation | Project detail and repository create; direct join absent | 10C.1 pending final review | Class identity is verified before rendering | Fixed project identity retired |
| `/student/projects/:projectTaskId/repository` | `RepositorySelectionRequired` | Safe compatibility state | Does not guess a repository ID | Identifier-bearing detail routes | 10C.1 pending final review | Direct the student to an authorized repository catalog | Identifier-less mock workspace retired |
| `/student/projects/:projectTaskId/repositories/:repositoryId` | `RepositoryFoundationDetail` | Connected in 10C.1 | Real repository metadata and provisioning state; collaboration/Git controls deferred | Repository detail/update | 10C.1 pending final review | Cross-resource identity is verified | Fake files/history/review controls isolated from authoritative routes |
| `/student/projects/:projectTaskId/repositories/:repositoryId/contributions` | `DeferredStudentPage` | Deferred | No fabricated contribution percentages | Verified contribution contract absent | Deferred/new scope | Honest unavailable state | Contribution mocks remain non-authoritative references |
| `/student/repositories` | `StudentRepositoryCatalog` | Connected in 10C.1 | Real role-scoped personal/class catalog and personal creation | Repository list/create | 10C.1 pending final review | Bounded catalog projections only | Static repository groups retired |
| `/student/repositories/:repositoryId` | `RepositoryFoundationDetail` | Connected in 10C.1 | Real repository detail, owner metadata edit, provisioning polling, and archived state | Repository detail/update | 10C.1 pending final review | No source, credential, path, or review mutation | Fixed repository identity retired |
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
| `/instructor/activity` | `InstructorActivitiesPage` | Connected in 10B.1 | Real bounded selected-class records and lifecycle filters | Activity list | 10B.1 complete | Existing activity table with dynamic configure links | Inline activity rows retired |
| `/instructor/activity/:activityId/settings` | `CreateActivityPage` | Connected in 10B.1 | Supported edits, atomic visible/hidden test replacement, version adoption, and lifecycle actions | Activity update/test-case replace/lifecycle | 10B.1 complete | Existing form composition with scoped test editor | Fake settings alias and local-only controls retired |
| `/instructor/activity/new` | `CreateActivityPage` | Connected in 10B.1 | Creates a server-backed Java draft using supported fields only | Activity create | 10B.1 complete | Existing form visual without attachments, rubrics, fake toggles, or release settings | Prototype defaults and local success messages retired |
| `/instructor/activity/:activityId/monitor` | `InstructorActivityMonitorRedirect` | Canonical redirect in 10B.3 | Redirects to the real activity queue; no fabricated progress, presence, similarity, missing-student, or submission totals | Per-activity submission states only; live presence/idle absent | 10B.3 complete | Use supported attempt state through the canonical queue | Monitoring fixture records retired |
| `/instructor/activity/:activityId/submissions` | `InstructorSubmissionQueue` | Connected in 10B.3 | Real bounded status filtering, pagination, and dynamic submission links | Per-activity submission list | 10B.3 complete | Authorized accepted attempts only; no inferred missing students | Queue fixture records retired |
| `/instructor/activity/:activityId/submissions/:submissionId` | `InstructorSubmissionReview` | Connected in 10B.3 | Immutable source/evidence, append-only correction, review draft, release, retry, and failure resolution | Get/correct/review/release/retry/resolve | 10B.3 complete | Existing instructor visual language around explicit projection and lifecycle sections | Fake compiler, per-test edits, similarity, grade, release, and reopening retired |
| `/instructor/submission-review` | `DeferredInstructorPage` | Safe legacy navigation state | Does not invent a selected submission | Identifier-bearing canonical route above | 10B.3 complete | Tell the instructor to choose an activity submission | Identifier-less mock review retired |
| `/instructor/projects` | `InstructorProjectCatalog` | Connected in 10C.1 | Real selected-class project-task catalog and safe repository/team summaries | Project-task list | 10C.1 pending final review | Dynamic detail/settings routes | Static oversight cards retired |
| `/instructor/projects/new` | `InstructorProjectEditorPage` | Connected in 10C.1 | Creates a backend draft using supported fields only | Project-task create | 10C.1 pending final review | Rubrics, attachments, grading configuration, and fake schedules omitted | Local save/publish retired |
| `/instructor/projects/:projectTaskId` | `InstructorProjectDetailPage` | Connected in 10C.1 | Real lifecycle, teams, repository summaries, and bounded monitoring data | Project detail/teams/monitoring | 10C.1 pending final review | No fabricated contribution, presence, similarity, or progress | Monitoring fixtures isolated |
| `/instructor/projects/:projectTaskId/settings` | `InstructorProjectEditorPage` | Connected in 10C.1 | Supported edits and version-safe publish/close/archive/restore | Project update/lifecycle | 10C.1 pending final review | Stale conflicts preserve form values and require deliberate retry | Prototype settings retired |
| `/instructor/projects/:projectTaskId/repository` | `RepositorySelectionRequired` | Safe compatibility state | Does not guess a repository ID | Identifier-bearing detail route | 10C.1 pending final review | Direct the instructor to project repositories | Identifier-less mock review retired |
| `/instructor/projects/:projectTaskId/repositories/:repositoryId` | `RepositoryFoundationDetail` | Connected in 10C.1 | Real repository metadata and provisioning state; review/Git controls deferred | Repository detail/update | 10C.1 pending final review | Project/repository identity is verified | Fake source/invite/review isolated |
| `/instructor/projects/:projectTaskId/repositories/:repositoryId/contributions` | `DeferredInstructorPage` | Deferred | No fabricated contribution evidence | Verified contribution contract absent | Deferred/new scope | Honest unavailable state | Contribution mocks remain non-authoritative references |
| `/instructor/projects/:projectTaskId/repositories/:repositoryId/similarity` | `DeferredInstructorPage` | Deferred | No fabricated similarity percentage | Similarity projection/computation absent | Deferred/new scope | Honest unavailable state | Similarity copy remains non-authoritative evidence |
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

`client/src/data/projexData.js` retains roles, course/section options, the route catalog, non-authoritative project/Git visual references, analytics/archive records, instructor contribution/similarity/student-profile records, and all admin tables/summaries. Phase 10B retired activity, workspace, submission, score, feedback, and instructor assessment fixtures from authoritative routes. Phase 10C.1 retires fixed project-task/repository identity and foundation records from authoritative routes while isolated collaboration/review and Git-inspection references remain for 10C.2/10C.3.

### Student page inline records

Phase 10A.2 retires student class/home/stream/invitation/roster fixtures. Phase 10B retires inline activity, coding workspace, submission, score, feedback, and assessment records. Phase 10C.1 routes use real project/repository records and dynamic identifiers; `repositoryInviteCandidates` and the old collaboration/Git workspace visuals remain isolated references for 10C.2/10C.3 and are never attached to a real record after an API failure.

### Instructor page inline records

Phase 10A.2 retires `instructorClass`, class dashboard/home cards and statistics, stream items, browser join-code generation, and the old roster. Phase 10B removes the inline activity catalog, local create/settings behavior, and instructor assessment fixtures. Phase 10C.1 disconnects project-task/repository foundation fixtures from production routes; collaboration/review/Git visuals remain assigned to 10C.2/10C.3 and contribution/similarity fixtures remain deferred.

### Layout records

The layout class arrays and both client-side class-code generators were retired in 10A.2. The role shell now consumes authorized class projections from the bounded class context.

The activity example identifier `act-loops-01` was retired from production routing in 10B.1. Project/repository examples such as `prelim-group-project-1` and `repo-campus-nav` were retired from production routing in 10C.1; they remain only inside unreachable visual-reference components. `stu-alyssa` remains assigned to a later or deferred milestone.

## Local-only and visually misleading actions

- Login and prototype role switching previously bypassed authentication; retired in 10A.1.
- Header sign-out previously navigated without revoking the session; retired in 10A.1.
- Class announcements/comments, class invitation decisions, browser class-code generation, and local roster removal were retired in 10A.2. Activity authoring, test configuration, lifecycle, practice, submissions, and instructor assessment became real in 10B. Project-task authoring/lifecycle and repository foundation actions become real in 10C.1; collaboration/review, Git, and admin actions remain later milestones.
- The following student-practice statement records the Phase 10 baseline behavior and is superseded by the 10B.2 retirement directly below it.
- The Phase 10 baseline alternated fake student practice pass/fail and made instructor “Run Tests” force a fake failed state; both behaviors are retired.
- The student practice, submission, score, feedback, fake local compiler output, custom-input, and fake-autosave prototypes are retired in 10B.2. Phase 10B.3 retires fake instructor compiler output, test execution, per-test point edits, similarity, local grading/release, and released-record reopening.
- The authoritative workspace states that edited source exists only in the current browser tab. No draft API or browser-storage fallback exists.
- Phase 10C.1 authoritative repository routes omit browser file upload/edit, branch/tag creation, ZIP download, IDE launch, and Git mutation. Old visual references remain unreachable pending 10C.2/10C.3 retirement.
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

Phase 10A and Phase 10B are complete and committed on `phase/10-frontend-integration`. Phase 10C.1 project-task and repository-foundation integration is implemented and awaits its separate final review/commit boundary; the remaining bullets describe milestone ownership rather than incomplete status.

- **10A.1 — Shared foundation and authentication:** API client, CSRF, session bootstrap/refresh, login/logout, account setup, role guards, safe states, tests, and this baseline.
- **10A.2 — Classes and memberships:** class list/selection/create/update/lifecycle, join codes, student join, rosters, and membership transitions.
- **10B — Activities, submissions, and assessment:** activity/test-case authoring, visible-test practice, attempts, assessment, correction, review, feedback, and release.
- **10C — Projects, repositories, and Git:** project tasks, teams, invitations, repository lifecycle/provisioning/inspection, feedback, credentials, and local Git guidance.
- **10D — Admin redesign and integration:** supported Phase 9 account, academic oversight, operations, recovery, and audit experiences only.

Within the Phase 10B umbrella, **10B.1 activity and test-case integration is complete**: selected-class lists/details, dynamic routes, draft creation, supported edits, atomic test-case authoring, lifecycle actions, and stale-version recovery. **10B.2 student practice/submissions is complete**: memory-only source, visible-test polling, immutable/idempotent attempts, per-activity history, canonical student-safe detail, and released results. **10B.3 instructor assessment/release is complete**: real per-activity queue, explicit instructor projection, immutable source and hidden/visible evidence, append-only automated-score correction, instructor points and private feedback draft, sequential version adoption, release, failure retry/resolution, replacement expiration, and bounded polling.

Within Phase 10C, **10C.1 project-task and repository foundation is implemented pending final review**: selected-class catalogs/details, supported authoring and lifecycle with optimistic concurrency, student personal/class repository creation, role-scoped catalogs, repository metadata, bounded provisioning polling, archived presentation, and cross-resource identity checks. **10C.2 collaboration/review** and **10C.3 Git inspection/credentials** remain explicit future implementation boundaries.

Each milestone may use multiple reviewable commits on `phase/10-frontend-integration`. Integration into `development/fullstack` remains a separate approval after complete Phase 10 acceptance.
