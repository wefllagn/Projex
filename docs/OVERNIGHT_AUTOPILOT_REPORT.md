# Overnight milestone evidence — historical

Current direction, 2026-10-19: the Product Owner secured Group 3105cbb and Admin
332e6b5, then authorized isolated integration Gate A on codex/mvp-integration-readiness.
See [current handoff](CODEX_HANDOFF.md) and [Gate A report](MVP_INTEGRATION_GATE_A_REPORT.md).
The two original accounts below are retained as historical evidence, not current
status or instructions. Their test counts were not rerun by resolving this file.

Instructions below about shared projex_test, stopping old demo processes, seeding
or restoring fixtures, pending milestone approval and future work are superseded.
No database test/migration/recovery, push, protected merge, deployment or browser
editing is authorized by this historical report. Gate B requires separate approval.

## Historical Group branch account

# Overnight autopilot progress

Authority: Product Owner overnight work order, 2026-10-18. Local checkpoints only;
no push, merge, normal `projex` mutation, deployment or delegated acceptance.

## Group Repository

**VERIFIED — PENDING REVIEW / IMPLEMENTED — PENDING PRODUCT OWNER REVIEW.**
Branch `work/julius-overnight-group-mvp`, approved Activity base
`42666278d7987018cdf24af3499d10e7b84c4e4b`.
Checkpoint SHA is recorded by Git after this report is committed.
Full implementation, affected areas, 795-test matrix, browser evidence,
invalidated-run disclosure, limitations and review items are in
`GROUP_REPOSITORY_MVP_IMPLEMENTATION_REPORT.md`.

- [x] Finish Group implementation, live role/desktop/390 checks and regressions.
- [x] Final scoped diff/security review and detailed report/checklist/handoff.
- [x] Create authorized local Group checkpoint (inspect Git live state for SHA).
- [ ] Independent Admin audit/plan from approved Activity base.
- [ ] Implement and test safe existing-scope Admin improvements.
- [ ] Prepare integration coverage/merge plan without combining branches.
- [ ] Record independent Admin checkpoint and consolidated evidence.

## Boundaries / next task

Product Owner review and integration remain pending. Admin must not inherit
unreviewed Group implementation. New authority, ownership, hierarchy and schema
decisions must be marked AWAITING PRODUCT OWNER APPROVAL; independent safe work
may continue. Shared mutable test-database suites must run sequentially.

## Historical Admin branch consolidated account

# Overnight autopilot consolidated report

2026-10-18. Local checkpoints only. Product Owner review remains authoritative.

## A. Group completion and verification

**IMPLEMENTED — PENDING PRODUCT OWNER REVIEW.** Dedicated local checkpoint
`9203a2c827e8f68e07e920a8a246d34b6d33af42` on
`work/julius-overnight-group-mvp`. Approved Activity base `42666278d7987018cdf24af3499d10e7b84c4e4b`.
795 tests / 121 files passed: client 352, server unit 285, PostgreSQL 110,
real Git 10, Smart HTTP 12, Java 26; lint/types/build and desktop/390 checks passed.
Detailed Group report/checklist/locked decisions are committed on that branch.

## B. Group review items

Review Student-led My Group/invitation flow, Code-first academic header, temporary
Code access, native feature/local-merge workflow, role presentation and plain-text
README. No final acceptance, integration or broader IDE policy is inferred.

## C. Admin audit

Completed `ADMIN_MVP_AUDIT_AND_PLAN.md` from the approved Activity base, not Group.
Existing account, academic foundation, governance, membership, oversight,
operations and audit systems were reused. New hierarchy/authority/schema decisions
remain pending; no second administration system was built.

## D. Admin implementation

Paginated Course catalog, URL search, loading/error/retry, stale reads, pending-safe
edit/CSV handling; Class identity/version-matched history and fail-closed correction;
separate cancellable search/impact reads; truthful teaching-staff loading/error;
existing Course async selection fix; direct Course navigation; truthful operations
copy; missing ACTIVITY_WORKSPACE metadata filter. No backend authority changed.

## E. Integration/hardening

One new real-PostgreSQL stable-contract test connects prepared Admin setup,
Primary assignment, invitation acceptance, Instructor publication, Student Activity
repository and immutable/idempotent queued submission, with cross-role denials and
minimized Admin projections. No Java execution or complete grading cycle claimed.
`MVP_INTEGRATION_PREPARATION.md` records the independent bases, compatibility
review, doc conflict points and required post-approval matrix. No merge performed.

## F. Actual Admin test evidence

- Initial Admin baseline: 11 files / 62 tests passed.
- Final full client checkpoint: 53 files / 353 tests passed; lint/build passed.
- Last bounded Activity repository filter addition: nearest suite 8 tests passed,
  including its new test; lint passed. No repeated full matrix for one option.
- PostgreSQL: 22 files / 109 tests passed; new workflow included.
- Server lint and integration TypeScript check passed. No production server source
  changed; unit/Java/Git matrices were not rerun for this independent Admin slice.
- Desktop and 390 × 844 browser checks passed for catalog pagination, navigation,
  Class/staff/history/current Course. No page overflow; viewport reset.
- `git diff --check` passed. Existing bundle warning and Activity fixture route
  warning remain; suites pass. No invented result or normal DB verification.

The earlier overlapping Group DB/Git run was invalidated, not counted; final
isolated Group reruns passed. Admin database suite ran alone with demo API stopped.
Walkthrough fixtures were seeded only after test cleanup. Two external seed-helper
module-resolution mistakes occurred before writes and were fixed; no product
dependency was installed or changed to solve them.

## G. Branches and checkpoints

Group SHA above is local only. Admin branch `codex/julius-overnight-admin-mvp` is
independent from `42666278d7987018cdf24af3499d10e7b84c4e4b`; checkpoint SHA is
owned by Git after this report is committed. Implementation checkpoint:
`0e755bd710b1572c5849239bc8e8c12d62b1789c`. No pushes, merges or history rewrites.
The primary dirty checkout remains untouched on its original branch.

## H. Affected files

Admin production: `AdminCourseCatalog.jsx`, `AdminClassFoundationPanels.jsx`,
`AdminAcademicViews.jsx`, `AdminViews.jsx`, `layouts/DashboardLayout.jsx`.
Tests: new Course/foundation panel tests, updated academic/layout tests,
`server/tests/integration/academic-foundation.integration.test.ts`.
Docs: audit/plan, integration preparation, this report, handoff and frontend contract.
Group exact 30-file inventory is in commit `9203a2c` and its implementation report.
No schema, migration, package/lockfile, env, runtime output or private fixtures in Git.

## I. Roadmap and checklist

- [x] Preserve approved Activity baseline unchanged.
- [x] Finish Group implementation/verification/report and local checkpoint.
- [ ] Product Owner Group review/acceptance.
- [x] Independent Admin architecture audit and existing-scope safe improvements.
- [x] Admin automated/manual verification and local checkpoint (inspect Git SHA).
- [x] Stable-contract integration test and non-destructive integration plan.
- [ ] Lock remaining Admin product requirements; no full Admin approval claimed.
- [ ] Authorized combined integration / full integrated regression.
- [ ] Adviser review; portable Docker; release freeze; Azure (separate gates).

## J. Approval-required decisions

Group acceptance; independent Admin acceptance and decision lock; any new Admin
hierarchy/delegation, direct enrollment/registrar import, Course archive/schema,
audit export/retention expansion, or source/grade override; intended integration
base/destination/SHAs; normal database changes; deployment/network exposure.

## K. Remaining work and runtime

No integrated Group+Admin pass is claimed. No external IDE walkthrough or hosted
isolation was added. Course pickers still use bounded search (up to 100 matching
options), not an unbounded directory; catalog now has real pagination. Broader
dialog accessibility and additional end-to-end mutation walkthroughs can be
scoped separately; no global frontend redesign was attempted.

Admin preview is loopback `http://localhost:5180`, API loopback port 3301,
disposable `projex_test`. Login uses a randomized test Admin, already signed in
in the preview tab. Credentials live privately outside Git. Group screenshot
evidence is preserved; DB suites clear disposable fixtures, so old Group URLs
must not be treated as permanent data. After the checkpoint, Group fixtures were
recreated without clearing Admin fixtures. Group is runnable at
`http://127.0.0.1:5174` with compiled API on loopback port 3300 and its local Git
provisioning worker. Admin stays at `http://localhost:5180` / API port 3301.
Different loopback hostnames isolate test login cookies. Both previews were
signed in with their disposable role; sessions still expire normally.
Private `group-demo-private.json` and `admin-demo-private.json` in the external
task artifact directory contain test login details, never committed here.

Group startup initially failed using the TypeScript source entrypoint: native
Smart HTTP validates an on-disk compiled `.js` hook. The verified compiled build
was started successfully; no hook validation or transport control was bypassed.
Future mutable database suites must stop these demo APIs/workers first and run
serially, then recreate disposable fixtures as needed. No normal `projex` changes, persistent
config, dependency upgrades, deployment or worker Java exposure.

## L. Recommended first action

Review Group checkpoint/report and the live independent Admin preview. Accept or
request changes on each separately; then explicitly name approved SHAs and an
integration destination. Do not deploy or infer adviser approval from passing tests.
