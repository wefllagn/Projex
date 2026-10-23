# Admin Architecture MVP audit and bounded plan

2026-10-18. Status: **VERIFIED — PENDING REVIEW** for audit and bounded fixes.
The full Admin product milestone is not declared approved. Authority: overnight work order.
Independent branch: `codex/julius-overnight-admin-mvp`.
Base: approved Activity `42666278d7987018cdf24af3499d10e7b84c4e4b`.
Group checkpoint `9203a2c` is not an ancestor and must not be merged implicitly.

## Architecture reconciliation

Admin is not a missing subsystem. Phase 9 backend and Phase 10D frontend already
provide most MVP administration; Iteration 2 adds Course/offering/staff foundation.
`AGENTS.md` and the owning user/class document contain historical status text
(I2.2 not started / foundation unaccepted WIP) that conflicts with the later
roadmap and actual approved Activity base. This audit uses source, schema and
nearest tests for behavior, not those old status sentences as new authority.
No new entity hierarchy or second academic administration system is proposed.

## Evidence inventory

| Area | Actual implementation and boundary | Finding |
| --- | --- | --- |
| Accounts | users directory/provisioning services; AdminViews, admin-api and strict projections | Admin-only global list/detail; Student/Instructor provisioning, one-time setup, reissue, versioned status and session revocation already connected |
| Activation/status | User SETUP_PENDING/ACTIVE/INACTIVE/SUSPENDED; setup tokens and refresh sessions | No public Admin registration, role editor or password reset; self-disable/last-active-admin and active-Class Primary safeguards already enforced |
| Course | Course model, courses/course.routes, AdminCourseCatalog | Number/name only, unique normalized number, Admin writes, Instructor read, bounded CSV preview/atomic confirmation; UI currently hides records after first 100 and conflates read failure with empty catalog |
| Offering | Class optional Course + saved snapshots + official code/period/year; AdminAcademicViews | Official PREPARED without Primary; ACTIVE needs eligible Instructor; legacy informal classes preserved; no duplicate Section/enrollment entities |
| Official correction | official-metadata.routes and AdminOfficialMetadataPanel | Version, reason and history acknowledgement enforced; preserves Class UUID/history; frontend impact and search requests lack cancellation and failure recovery, allowing stale presentation |
| Instructor assignment | class-staff.routes and AdminTeachingStaffPanel | Existing reasoned Admin recovery, explicit former-Primary disposition, PREPARED activation; Primary invites Co, Co accepts, class-scoped access; UI loading failures currently look like Unassigned |
| Membership | ClassMember unique Class/Student + preserved status timestamps; class invitations and CSV | Removal/reactivation and history retained; registered ACTIVE Student invitation import creates pending invitations, not forced enrollment |
| Academic oversight | admin-oversight repository/service/routes; AdminAcademicViews | Minimized activity/submission/project/repository metadata; unreleased scores, tests, source, private feedback excluded; no grading/release authority |
| Repository/operations | AdminOperationsViews and admin service/oversight | Metadata, measured storage, bounded queues, credential revocation and eligible provisioning retry; no token issuance/source/terminal/worker-online claims |
| Audit | AdminAuditEvent allowlisted projection + separate ClassStaffEvent | Atomic audit for supported account/class/member/recovery operations; staff recovery has separate event ledger; Course mutation audit expansion is not invented here |
| Navigation | admin-routes + App route guard + Phase10D shell | Canonical routes use live views; legacy sections/enrollments/assignments redirect to Classes; courses redirects to real catalog; no prototype fallback |

Reviewed schema: User/Course/Class/ClassTeachingStaff/ClassStaffEvent/ClassMember,
existing enums/uniqueness; related migrations already committed in base. No schema
or migration changes needed for the safe fixes below. No normal database access.

## Security and authorization

Admin router repeats authenticated ACTIVE ADMIN checks and CSRF on mutations;
directory/provisioning/oversight services also enforce current role/status.
Course/staff/official-metadata routers enforce role/active/CSRF and existing
transaction locks. Admin is not Instructor impersonation: it cannot author
activities, read Student repository source, issue Git credentials, assess Java,
grade or release. Student/Class membership and repository permissions remain
server-owned. Existing account status changes preserve responsible Primary and
last active administrator. No policy expansion is needed for UI state fixes.

## Existing test evidence / gaps

Baseline executed here: 11 client Admin/route files, 62 passing tests.
Inspected admin unit/route tests and real PostgreSQL admin/admin-oversight/
admin-operations/academic-foundation suites: safe projection, role denial,
CSRF, concurrency, stale versions, audit rollback, CSV all-or-nothing and
staff/metadata preservation already covered. Inspecting a test is not a new pass.

Gaps to address: Course catalog pagination/load/error/search state, aborted/late
searches, impact response identity and Class-switch cleanup, staff read failures,
and missing full-path academic setup authorization coverage where stable.

## Safe implementation plan

1. Course catalog: server pagination with URL-owned filters; loading/error/retry
   distinct from empty; cancel/discard obsolete reads; refresh after writes using
   current query, preserve existing create/edit/import contracts. Add regressions.
2. Official metadata/staff panels: independent cancellable reads, fail closed on
   missing/mismatched impact, explicit retry and non-fictional loading states;
   no submission while authority/context reads unavailable. Add race/error tests.
3. Stable-contract integration proof: exercise Admin setup → responsible Instructor
   → invited Student acceptance and minimized Admin oversight without importing
   Group implementation. Reuse guarded test launcher; serialize mutable DB suites.
4. Desktop/390 visual check, focused/full client verification, backend checks
   proportional to tests, final diff/secret review, local checkpoint and handoff.

## AWAITING PRODUCT OWNER APPROVAL

No implementation is authorized here for these possible extensions:

- New Admin roles/hierarchy, delegation or role-edit authority: retain the existing
  single ADMIN capability set, or specify a separately approved hierarchy.
- Direct registrar enrollment / offering CSV / unregistered-person invitations:
  retain registered-email invitation + Student acceptance, or approve a new policy.
- Course archive/delete, department/program/units/curriculum: keep Number/Name-only
  catalog, or approve schema and academic ownership requirements first.
- Comprehensive Course/staff audit UI/export/retention policy: retain current
  ledgers, or define new action/schema/projection policy in a bounded milestone.
- Admin source/Git/grade override: retain minimized oversight; any expansion is a
  separate security/product decision, not a missing button to connect.

These choices do not block the independently safe fixes above. Group acceptance,
protected integration, recovery operations, Docker/Azure and release remain gates.

## Implemented safe slice / verification

Plan items 1–4 completed. Course catalog now uses paginated URL-owned search,
separate loading/error/retry/empty state and obsolete-read cleanup. Existing
create/edit/import contracts remain unchanged, CSV preview does not write, and
edit switching is locked while a save is pending. Existing Course selection is
controlled so asynchronous options select the current offering's Course.

Official impact must match both Class ID and the displayed Class version. A
newer impact cannot silently adopt a version while submitting old form values.
Reads are separated from Course searches, aborted/late results are discarded,
context retries refresh the Class, and unavailable context disables corrections.
Staff loading/failure no longer masquerades as Unassigned. Primary search resets
old selection and is pending-safe. All mutation authority remains unchanged.

Added the existing Course Catalog to Admin navigation; replaced stale deferred
operations wording. Added the existing backend ACTIVITY_WORKSPACE filter to
read-only repository oversight; no source, token, or teaching control added.

Actual final full client checkpoint: 53 files / 353 tests, lint/build passed.
After the final one-option repository filter correction, the nearest academic
suite passed all 8 tests (including its new filter regression), and lint passed;
the full matrix was not needlessly repeated for that final bounded change.
There are 12 new frontend tests relative to the approved base (11 in the full
353 run, plus the final filter test). Guarded PostgreSQL: 22 files / 109 tests
passed, including one new setup-to-submission workflow test. Server lint and
integration TypeScript checks passed. No production backend source changed;
Java/Git/unit matrices were not rerun for Admin-only UI/test changes.

Live browser: disposable Admin login, canonical navigation, Course catalog page
2 and disabled terminal-page Next, active/prepared Class catalog, Class identity,
current staff/history and existing Course selection were checked. Desktop and
390 × 844 have no page-level horizontal overflow; tables retain bounded internal
scrolling. Viewport override was reset. No join code or setup credential revealed.
Read failures/races and CSV writes were automated tests, not manual mutation
claims. Screenshots/private fixture credentials remain outside the repository.

No schema, migration, dependency, persistent environment or normal-data changes.
Final diff review found no runtime artifacts or credentials. Existing bundle-size
and Activity fixture-route warnings remain disclosed; all checks above passed.
Checkpoint filename inventory belongs to Git, not a claim of full Admin acceptance.
