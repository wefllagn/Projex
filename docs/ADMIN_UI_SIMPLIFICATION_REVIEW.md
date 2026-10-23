# Admin UI simplification — review handoff

2026-10-19. Implemented and verified; Product Owner visual acceptance pending.
No commit, staging, push, merge, reset, migration or deployment performed.

## A. Worktree and safety

Existing Admin worktree: `julius-overnight-admin-mvp/projex-ui`.
Branch `codex/julius-overnight-admin-mvp`, unchanged HEAD
`c6b50ab31d30d85245985ccdd23252cda94f1cf7`.
Preserved the existing provisioning implementation and installed skills. The
launch checkout and separate Group implementation were not edited. Group stays
at `9203a2c` with its prior 23 modified/128 untracked files. Frozen Activity,
preserved Git storage, missing-demo recovery and deferred browser editing remain
outside this pass. No normal database or persistent environment change.

## B. Design guidance

Read both installed UI/UX Pro Max and Web Design Guidelines. Used focused UX table
and React debounce guidance rather than generating another theme. Read existing
Group design/error standards as reference only; imported none of its implementation.
Reused Projex brand and CSS icons. Fresh Vercel guidance:
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

## C. Overview

Before: eyebrow, architecture introduction, Refresh, oversized secondary panels,
green zero-attention metric, storage implementation caption and generated footer.
Now: linked Users/Classes/Repositories/Setup attention metrics; neutral zero setup
attention; concise role and academic counts. No routine Refresh or footer.

## D. Users

One Add User disclosure reaches the existing Student/Instructor provisioning
dialogs, never Admin creation or role conversion. Compact identity/email, role,
status, updated and View account columns. Search debounces 350ms to the bounded
server endpoint; role/status changes apply immediately. Clear cancels pending
search state. URL filters, page reset, server totals and Back remain functional.
One-page results show only their count. Setup-link warnings and lifecycle remain.

## E. Classes

Removed governance/catalog boilerplate and Apply. Search/status/combined Sort now
drive the existing server query. Shows Class, Instructor, Term/Year, enrolled
Student count from `membershipCounts.ACTIVE`, status and Manage. Zero displays
`0 enrolled`, not None. Existing Create Class and ACTIVE Instructor picker are
unchanged; no Course prerequisite. Academic Records no longer also selects here.

## F. Course Catalog

Secondary Tools destination remains reachable at the existing route. List/search
first; Add/Edit Course and secondary Import open compact dialogs. Preview then
fingerprint confirmation remains, with no automatic import or weakened validation.
Failed saves retain form inputs; invalid file size uses inline accessible error
feedback, not a success notice. Existing pagination and update contracts remain.

## G. Academic Records

Replaced six oversized explanatory cards with four compact named destinations:
View Activities, View Submissions, View Projects and View Repositories. Classes
and Course Catalog remain secondary links. Child oversight lists also use safe
automatic URL/server filters and compact pagination. No source/authoring actions.

## H. Operations

Compact System status, queue observations and Repository storage. API/database
use measured values; Workers says Not monitored. Empty queues say No jobs, not
worker healthy. Provenance, timestamps and measurement limitations are expandable.
Execution jobs, provisioning/recovery, credential controls and Audit remain
reachable via Tools. Independent health/storage failures retain local Retry.

## I. Audit Events

Automatic server filters and compact Action/Actor/Target/Timestamp/Details table.
No reason placeholder or UUID/request reference dominates ordinary rows. Backend
provides target type/ID, not a human target name; none was invented. Authorized
details retain full target ID, request ID, actual reason and allowlisted metadata.

## J. Navigation

Primary: Overview, Users, Classes, Academic Records. System: Operations, Audit
Events. Tools: Course Catalog. Exclusive matching covers child routes. Existing
mobile drawer, account/logout and old routes remain. Added keyboard focus
containment, busy dismissal protection, Escape and focus return to Admin dialogs.

## K. Content cleanup

Removed ordinary landing-page PLATFORM/ACCOUNT ADMINISTRATION, CLASS GOVERNANCE,
SERVER-FILTERED RECORDS, BOUNDED SUMMARIES, CURRENT RECORDS, ACADEMIC FOUNDATION,
PREVIEW MAKES NO WRITES, INSTITUTIONAL ACADEMIC RECORDS, MEASURED OPERATIONAL
OBSERVATIONS, API/DATABASE/PERSISTED QUEUES and MEASURED RECORDS ONLY headings,
plus repeated architecture paragraphs. Actual diagnostic evidence is retained in
appropriate operational disclosures and authorized Audit details.

## L. Data freshness

Shared `useAdminFreshness`: entry/query reads plus stale focus/visibility return
(15-second threshold). Background events coalesce; no intervals or WebSockets.
Loaders ignore success/error after abort, even when the transport ignores it.
Background reads pause for active forms/dialogs. Mutations explicitly refresh
read state without being repeated. No setup/credential/join-code generation from
freshness. Controlled filters preserve focus and URL Back behavior. Existing leaf
account/Class governance retains deliberate refresh/version-conflict behavior.

## M. Security and authority

No backend implementation or API contract change in this UX pass. Earlier
provisioning server edits are preserved, not new UX changes. Account setup/status,
session revocation, last-Admin protections, staff corrections, Co-Instructor,
Class lifecycle, roster/join codes, import validation, credential revocation,
versioned provisioning retry and audit allowlists remain. Ordinary errors retain
safe UI messages, local recovery and form/filter state; backend correlation and
authorized investigative evidence remain available. No new private Git/source,
hidden-test, grading, credential-issuance or process-execution access.

## N. Files changed by this pass

Client implementation:

- `client/src/admin/AdminViews.jsx`
- `client/src/admin/AdminAcademicViews.jsx`
- `client/src/admin/AdminCourseCatalog.jsx`
- `client/src/admin/AdminOperationsViews.jsx`
- `client/src/layouts/DashboardLayout.jsx` (Admin navigation + scoped CSS import)
- New `client/src/admin/AdminListControls.jsx`
- New `client/src/admin/use-admin-freshness.js`
- New `client/src/admin/admin-refinement.css`

Tests:

- `client/src/admin/AdminViews.test.jsx`
- `client/src/admin/AdminAcademicViews.test.jsx`
- `client/src/admin/AdminCourseCatalog.test.jsx`
- `client/src/admin/AdminOperationsViews.test.jsx`
- `client/src/admin/AdminLayout.test.jsx`
- New `client/src/admin/AdminSimplification.test.jsx`
- New `client/src/admin/use-admin-freshness.test.jsx`

Docs: this report, new `docs/design/ADMIN_UI_DESIGN_SYSTEM.md`,
`docs/CODEX_HANDOFF.md`, `docs/architecture/FRONTEND_INTEGRATION.md`, and
`docs/architecture/ADMIN_FUNCTIONALIZATION_AND_OPERATIONS.md`.
Other existing dirty files belong to the prior provisioning milestone and were
preserved. Installed `.agents/` and `skills-lock.json` remain unstaged.

## O. Actual verification

| Check | Result |
| --- | --- |
| Full client `npm test` | 57 files, 377 tests passed |
| Client lint | Passed |
| Client production build | Passed; JS 763.83 kB, existing >500 kB chunk warning |
| Server `npm test` | 42 files, 298 unit tests passed |
| Server lint / type-check | Passed |
| Server integration type-check / production build | Passed |
| Git whitespace check | Passed; existing LF/CRLF conversion notice only |

New coverage includes exclusive nav, debounced server search, page-one reset,
Back/focus, ignored late reads, safe denied-state Retry, modal focus return,
focus throttling/coalescing/abort, paused dialogs, automatic Class/Audit filters,
Audit evidence retained in details, Course draft retention and invalid upload.
Existing provisioning, last-Admin, stale retry, credential and CSV fingerprint
tests still pass. Initial failures were stale expectations for deliberately
removed/moved controls; corrected tests pass. No database suite ran during this
frontend pass; prior PG results are not counted as new verification.

## P. Browser verification and screenshots

Used the existing loopback isolated Admin review at `127.0.0.1:5190` with its
already approved fictional accounts/data. No new records were created. Inspected
all seven screens at 1366×768, 1920×1080 and 390×844 (21 captures). Every screen
has one current sidebar destination and no document horizontal overflow. At
390px, the 15px vertical scrollbar leaves client width 375px; scroll width is
375px on all seven. Wide/desktop scroll width equals the viewport width.

Mobile table content intentionally scrolls within its container. Found/fixed
absolute screen-reader header labels expanding the document. Verified live Users
search/role filtering, Add User access, Course dialogs, Audit identifiers/details,
Escape/focus return and Tab/Shift+Tab modal containment. No real mutation was
needed for the visual pass; save/import/recovery contracts are regression-tested.

Screenshots are outside Git in the private task artifact directory:

| Screen | Basename (each has `-desktop.jpg`, `-wide.jpg`, `-mobile.jpg`) |
| --- | --- |
| Overview | `admin-ui-overview` |
| Users | `admin-ui-users` |
| Classes | `admin-ui-classes` |
| Course Catalog | `admin-ui-courses` |
| Academic Records | `admin-ui-academic` |
| Operations | `admin-ui-operations` |
| Audit Events | `admin-ui-audit` |

Additional evidence: `admin-ui-course-dialog-mobile.jpg` and
`admin-ui-audit-details-mobile.jpg`. Temporary viewport is reset for handoff.

## Q. Remaining limits / follow-up

- Product Owner visual approval remains pending; no final acceptance declared.
- Worker monitoring, host capacity and realtime status are not implemented or
  fabricated; event-driven reads are not a realtime guarantee.
- Wide record tables use contained horizontal scrolling on phones. A future
  per-record mobile card treatment is optional, not a hidden permission change.
- Review database contains no Courses; live catalog inspection includes its
  honest empty state and forms. Populated rows/import/save are automated-tested.
- Existing bundle-size warning remains; global code splitting is out of scope.
- This is not full keyboard/screen-reader certification of every legacy Admin
  detail page. Existing leaf governance forms retain their established behavior.

## R. Git diff and next gate

This pass touches 20 files: 15 client implementation/test files and five docs;
seven are newly created. The complete worktree diff also includes prior approved
provisioning changes: 24 tracked modified files (+496/−348) plus 16 task-owned
untracked files. Another 174 untracked entries are installed skills/lock, not staged.
The tracked line totals exclude untracked files. Nothing is staged or committed.
No dependencies, schemas,
migrations, normal database, Group implementation or Activity baseline changed
by this pass. Review this cumulative Admin worktree before any commit/integration.

READY FOR ADMIN UI SIMPLIFICATION REVIEW
