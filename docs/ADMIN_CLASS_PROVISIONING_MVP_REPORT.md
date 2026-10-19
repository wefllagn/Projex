# Admin and Instructor Class Provisioning MVP review report

2026-10-19. Status: IMPLEMENTED / VERIFIED, PENDING PRODUCT OWNER REVIEW.
Authority: current approved Class provisioning work order and explicit approval
for temporary fictional browser-review accounts/private credentials. Not final
acceptance, branch integration, deployment or normal-database migration approval.

## A. Actual worktree and preservation

Existing Admin worktree: codex/julius-overnight-admin-mvp at
c6b50ab31d30d85245985ccdd23252cda94f1cf7. Prior tracked work was committed;
173 installed skill files under .agents plus skills-lock.json were already
untracked. They remain untouched and unstaged. Remote fetch completed; no
same-named origin task ref was returned, so no ahead/behind comparison is claimed.

Group is unchanged at work/julius-overnight-group-mvp, 9203a2c, with 23 tracked
modifications and 128 untracked files. See [preservation checklist](GROUP_PRESERVATION_CHECKLIST.md).
The launching academic-workspace checkout and its unrelated dirty work remain
untouched. No reset/discard/merge/cherry-pick/staging/commit/push in this milestone.

## B–C. Existing capabilities and reconciliation

| Approved requirement | Source evidence / disposition |
| --- | --- |
| Instructor creates own Class, no approval | Existing class.service/create + class.routes authorization retained; Instructor ID always derived from caller |
| Name / standardized term / academic year | Shared AcademicFields UI and classes/academic-fields.ts validation added; createClassSchema requires term/year |
| Optional logistics | Existing section/schedule/days/room fields reused; no curriculum or new entity |
| Separate generated join code | Existing class-code generation, unique constraint, collision retries, join service and code lifecycle retained |
| No mandatory Course | Instructor catalog controls removed; Admin creation no longer fetches/requires Courses |
| No Formal/Informal labels | Class modal, offering-label fallback, Admin catalog/detail/action text updated; source scan found no production JSX/JS matches |
| Admin support creation | Existing createClass API, ACTIVE Instructor search/selection and immediate working Class; no new approval queue |
| Account oversight | Existing AdminViews/users routes: Student/Instructor provisioning, setup, versioned status and session controls |
| Instructor assignment/correction | Existing AdminTeachingStaffPanel + class-staff routes; reasons, version checks and explicit former-Primary disposition retained |
| Academic and repository oversight | Existing minimized Admin projections; no new Git source, credential, grading or authoring authority |
| Co-Instructor / teaching compatibility | Existing accepted staff membership and class-scoped Activity/Project/roster permissions retained |

The earlier audit's Course pagination, URL filtering, stale-read protection,
official-history/version matching, asynchronous Course selection and navigation
fixes remain. The subsystem is not rebuilt and no Group implementation is merged.

## D–E. Instructor creation and academic fields

The ordinary creation modal requires only Class name, Semester / Term and academic
year; section and logistics remain optional. Native dropdowns offer First Semester,
Second Semester and Short Term. The year dropdown offers seven rolling consecutive
year pairs, including the current year. Optional Student invitations are secondary.
Successful creation upserts the Class catalog and navigates into the new Class.
Pending saves lock controls; failed requests retain entered values for retry.

The backend rejects misspelled/unsupported terms, missing term/year, malformed or
nonconsecutive year pairs. It stores normal terms in the existing semester text
column. Existing official requests can still provide their two-value academicPeriod
instead; Short Term is never mislabelled as an old enum value. Saved legacy term/year
values stay readable and unchanged values are omitted from unrelated correction
payloads, avoiding forced historical rewrites. No schema or migration required.

## F. Classification removal and internal compatibility

Students/Instructors/Admins see Classes, not Formal/Informal Classes. Existing
Course relationships and official metadata constraints are preserved internally.
The older optional audited catalog-correction panel is secondary, not a creation
prerequisite. Existing PREPARED records remain inspectable and assignable through
the existing reasoned staff-recovery flow; no new prepared-offering workflow added.

## G–H. Admin creation and oversight

Admin support creation uses name, term/year, optional logistics and an ACTIVE
Instructor picker. Selecting a Course is unnecessary. Query changes clear old
Instructor selections, stale responses are discarded, failed saves retain fields,
and an empty search has a concise next step. Only the real backend response causes
successful navigation to the created Class. The backend still validates current
Instructor eligibility independently of the picker.

Existing Class corrections, roster, join codes, archive/restore, teaching staff,
account setup/status and operational metadata remain functional. Account roles
are assigned through supported Student/Instructor provisioning; no arbitrary
role-conversion endpoint exists or is fabricated. Admin does not become teaching
staff and does not gain private Git source/credential or grading access.

## I. Student joining

The existing generated-code workflow is unchanged. Real-session integration verifies
unique codes, Student enrollment, Instructor roster visibility, Class access,
Activity publication/access and Group Project/repository metadata compatibility.
The live browser walkthrough additionally created a self-service Class and joined
it with the fictional Student; Admin catalog showed its active membership count.
Codes were kept in memory, not logged or saved in report/screenshots/URLs.

## J. UI/UX and error recovery

Existing Projex branding, sidebar, icons/CSS and native control styles reused;
no new icon kit or unreviewed Group assets imported. UI/UX Pro Max's focused
validation/accessibility guidance and fresh [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
informed labelled native controls, focus treatment, announced errors, submission
locks, compact hierarchy and responsive layout. Instructor selects now share the
existing input styling. Catalog correction is optional/secondary; no fake control.

Ordinary shared errors no longer expose request IDs or arbitrary exception/server
messages. Validation has concise UI-owned guidance; setup cooldown remains useful.
HTTP status/error objects and backend correlation/logging contracts are unchanged.
Tests verify retained Class input and absence of private diagnostic text. Existing
allowlisted business messages remain compatible; broader per-module error adoption
is not claimed complete. No global Student/Admin redesign was performed.

## K. Authorization and security

The new real HTTP scenario uses production composition, actual cookies/CSRF,
PostgreSQL and a separate API process, not bypass-auth middleware. It verifies:
Student creation denial; missing CSRF rejection; invalid academic fields; Instructor
ownership-spoof denial; unrelated Instructor and accepted Co-Instructor denial of
Primary-only edits; accepted Co-Instructor roster access; independent teaching;
Admin inspection and support creation; no Course prerequisite. Existing isolated
unit and PG suites cover account status/last-admin protections, owner/membership
rules, staff recovery, invitation/capacity and minimized source/academic boundaries.

For tests, a NEW PostgreSQL cluster listens only on 127.0.0.1:54873. Before cleanup,
read-only SQL verified database name, server port, the newly created temporary
cluster directory, and one exclusive connection. projex_test in THAT cluster is
disposable and mutable suites run serially. All 24 existing migrations were applied
only there, then reported no pending migrations. The original normal/shared demo
databases and preserved Git storage were never targeted or reconstructed.

A separate fresh projex_provision_review database in that new cluster supports
the approved browser walkthrough; destructive tests do not target it. Three fictional
accounts and their generated temporary credential file were explicitly approved
by the Product Owner after the safety reviewer initially blocked that operation.
Credentials and screenshots remain in the private task artifact area, outside Git.
The loopback review frontend is on port 5190 and API on 3317, using process-local
settings only. Java and Git execution are disabled in that review runtime.

## L. Files changed

- client/src/classes/AcademicFields.jsx and AcademicFields.test.jsx (new)
- client/src/layouts/DashboardLayout.jsx; pages/InstructorPages.jsx
- client/src/classes/class-links.js and ClassWorkflows.test.jsx
- client/src/admin/AdminAcademicViews.jsx and AdminAcademicViews.test.jsx
- client/src/App.css (scoped select styling)
- client/src/api/api-client.js and api-client.test.js
- client/src/components/RequestState.jsx and RequestState.test.jsx (new)
- server/src/modules/classes/academic-fields.ts and academic-fields.test.ts (new)
- server/src/modules/classes/class.schemas.ts, class.service.ts, official-metadata.routes.ts
- server/tests/integration/class-provisioning-mvp.integration.test.ts (new)
- docs/CODEX_HANDOFF.md; owning User/Class, Admin and frontend architecture docs
- this report, ADMIN_CLASS_PROVISIONING_MVP_DECISIONS.md and GROUP_PRESERVATION_CHECKLIST.md

Installed skills and skills-lock.json are pre-existing, not implementation changes.
No Prisma, Activity/submission/checkpoint, Group, dependency or saved environment
file changes. Review new/untracked source/tests/docs explicitly; do not stage all.

## M. Exact verification

| Check | Result |
| --- | --- |
| Client full suite | 55 files / 359 passed |
| Client lint | Passed |
| Client production build | Passed; existing >500kB warning, JS 766.79kB / gzip 199.65kB |
| Server unit suite | 42 files / 298 passed |
| Server lint / type-check / integration type-check | Passed |
| Server build | Passed |
| Serial PostgreSQL integration | 23 files / 110 passed, including new cookie/CSRF scenario |
| Git diff whitespace / classification scan | Passed; no production Formal/Informal JSX/JS labels |
| Schema/migration and Activity/Group preservation | No implementation changes in these protected areas |

Initial sandbox process/build restrictions were resolved through approved tool
escalations. Initial assertions expecting old free-text UI/server response shapes
were corrected, not worked around in production. Two existing Java-worker tests
initially lacked MAIL_FROM_NAME/MAIL_FROM_ADDRESS; supplying process-local fixture
values made the full suite pass without editing Activity/worker code. No dependency
upgrade, schema bypass or reduced test coverage was used.

## N. Actual browser walkthrough

Using the approved fictional accounts in the fresh review DB:

1. Instructor signed in, opened the creation modal, selected Short Term/2026-2027,
   created Programming MVP Review without Course/Admin approval, and saw Class Info
   plus the dashboard/sidebar Class entry.
2. Generated join code was present. Student signed in, joined by that code and
   opened the new Class with the correct Instructor and term/year.
3. Admin signed in, inspected the Class catalog, created Admin Support Class for
   the ACTIVE Instructor using First Semester/2026-2027, and reached Class detail.
4. Admin catalog displayed both Classes and the first Class's active Student count.
5. Inspected 1366x768, 1600x1000 and 390x844. Changed forms/detail views showed no
   page-level horizontal overflow. Native dropdowns and mobile modal scrolling work.
   Temporary viewport override reset. Private screenshots retained outside Git.

Activity authoring/publication, Group Project creation, Co-Instructor and denial
steps were verified by the real HTTP scenario and regressions, not claimed as a
complete manual click-through of every teaching/Admin feature. The browser's
post-mutation view was observed before continuing; no guessed success.

## O–P. Remaining decisions, Git state and next step

No unresolved decision blocks this bounded creation workflow. Role conversion,
legacy official-catalog Short Term enum expansion, curriculum and new approval
subsystems are not implemented and require separately approved scope if wanted.
The existing bundle-size warning remains. Current Admin UI/product acceptance is
still a Product Owner review gate; no all-application redesign certification.

The Admin task tree has 17 modified tracked files and nine new task files, all
unstaged; its HEAD remains c6b50ab. Tracked diff is 217 insertions / 100 deletions;
new files are additional. The 174 pre-existing untracked skill/lock files are not
part of this implementation. Whitespace and handoff-link checks passed. Group's
exact preserved inventory remains separately recorded; no unapproved integration.
Review the current diff plus new files and run the two role-specific creation
flows in the isolated review environment. Do not run integration cleanup against
the shared demo database. Missing demo recovery/browser editing remain deferred.
No commit, push, merge, reset, discard, normal-data migration or deployment without
explicit approval.
