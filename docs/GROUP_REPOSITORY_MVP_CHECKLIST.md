# Group Repository MVP progress

## Current review disposition (2026-10-19)

- [x] Browser .java/.md editing deferred by Product Owner; native Git workflow is
  sufficient for MVP. No proposed schema, commit jobs or browser write endpoints.
- [x] Proposal retained with unresolved source retention, job expiry and ambiguous
  commit recovery decisions; not a current MVP implementation requirement.
- [x] Demo DB recovery deferred separately; no restore/reconstruction/reseed or Git
  storage change. See DEMO_DATABASE_RECOVERY_ISSUE.md.
- [x] Current review handoff: design/GROUP_REPOSITORY_FINAL_HANDOFF.md.
- [ ] Verify destructive-suite/live-demo isolation before future mutable DB tests.
- [ ] Complete Smart HTTP regression and current search-popover visual checks
  when safe isolated fixtures become available; no current pass is claimed.
- [ ] Product Owner UI review/acceptance; no commit, push, merge or integration.

Next development milestone: previously approved Admin and Instructor Class
Provisioning MVP; not started by this documentation closure. Historical checklists
below retain their original evidence; editing/recovery gates are superseded above.

## Prior search/edit continuation — PARTIAL / INCIDENT (2026-10-18)

- [x] Anchored typeahead, ranked paths, keyboard/outside/Escape/Clear behavior.
- [x] Add File preview hidden; existing file errors stay local.
- [x] Client 62/433; server unit 42/287; lint/types/build; real Git 2/10.
- [ ] Group durable-write architecture approval and actual editor/endpoint.
- [ ] Restore/reconstruct demo metadata after test cleanup removed projex_test data.
- [ ] Establish live-demo/destructive-suite isolation before any further DB suite.
- [ ] Smart HTTP completion and current desktop/mobile walkthrough.
- [ ] Product Owner approval; no Group/Activity/Admin acceptance or integration.

See docs/design/GROUP_SEARCH_EDIT_REVIEW_REPORT.md. Existing bare Git storage and
last observed main remain. No reseed or restore authorized/performed.

## File recovery + permanent standard (2026-10-18)

- [x] Bounded filename/path matching, separate exact-path navigation.
- [x] No guessed file calls for empty matches; local Retry/Back to folder.
- [x] Repository/class/branch/tab retained; query and late-input protection.
- [x] Safe shared errors; backend diagnostics unchanged.
- [x] Permanent standard, mandatory AGENTS rule and scoped audit roadmap.
- [x] Attached metadata/capacity/staff hierarchy and concise Code copy.
- [x] Transient Group refresh preserves loaded view/input; access denial hides it.
- [x] Client 61/426, lint/build; server diagnostics 1/2, type-check/lint; diff check.
- [x] Desktop/mobile walkthrough; user Git/review state unchanged.
- [ ] Product Owner review. Browser editing remains deferred.

Report: docs/design/PROJEX_ERROR_RECOVERY_IMPLEMENTATION_REPORT.md.

## Interaction polish follow-up (2026-10-18)

- [x] Dropdown section spacing, single-line Copy controls and centred chevron.
- [x] Viewport containment/resizing without credential reissuance.
- [x] Transient pointer/keyboard copy popup; no paragraph or copied secret.
- [x] Real latest-commit hover/focus preview and URL-backed detail navigation.
- [x] Exact branch count in latest-commit row, not branch toolbar.
- [x] Single Enter-to-open path field; Add file opens an honest WIP dialog.
- [x] Group-specific 404/5xx recovery with exit; permission denials stay distinct.
- [x] Client 60/403; lint/build/diff check pass, actual desktop/mobile walkthrough.
- [ ] Product Owner review; no final approval, commit/push/merge or broader rollout.

See design/PROJEX_GROUP_INTERACTION_POLISH_REPORT.md. No new backend/schema,
dependency, migration, Activity or Admin change. Prior verification below is history.

## GitHub-familiar UI refinement (2026-10-18)

- [x] Reviewed all eight supplied annotated/GitHub/concept references.
- [x] Compact Project Detail; Published and square due icon removed.
- [x] One toolbar: branch, exact branch total, existing Go to File, secure Code.
- [x] No fake Add File API/control, per-file metadata, filters or verified badges.
- [x] URL-backed tab/branch; count click and browser Back preserve context.
- [x] Compact history, clickable hashes, selected details only and real activity.
- [x] Preserve read-only/review restrictions, credential cleanup and dirty input.
- [x] Client 58/391, server unit 41/285; lint/build/type checks and diff check pass.
- [x] Live 1366x768, 1848x1000, 390x844 inspection with no horizontal overflow.
- [ ] Product Owner visual approval; no commit/push/merge authorized.

See design/PROJEX_GITHUB_FAMILIAR_UI_REPORT.md for A–Q evidence and deferred scope.
No production backend/schema/migration, Activity or Admin change in this pass.
Database/Git/Java integration results in earlier checkpoints remain historical.

## UX refinement / Design System v1 (2026-10-18)

- [x] Project Collaboration rail handles real member/invited/unassigned/closed states.
- [x] Compact dated commits, safe colored diffs, branch rows and real event hierarchy.
- [x] Event-driven stale revalidation, abort/dedup, dirty-state preservation and Retry.
- [x] Original 21 SVG / 63 transparent PNG icons and inspected contact sheet.
- [x] Design system/icon guide and source-based project-wide polish roadmap.
- [x] Client 57/383; server unit 41/285; lint, type checks and build pass.
- [x] 1366x768 / 900x900 / 390px rendered checks; Group-scoped tablet correction.
- [ ] Product Owner refinement review; no final UI acceptance or branch promotion.

See design/PROJEX_UX_REFINEMENT_REPORT.md. Prior PostgreSQL/Git/Java matrices below
remain historical. No new production backend, migration or dependency change.

## Final UX redesign pass (2026-10-18)

Backend direction approved; compact UI **IMPLEMENTED — PENDING PRODUCT OWNER
REVIEW**. Uncommitted from `9203a2c`; no integration or final UI acceptance implied.

- [x] Compact repository-first header and five tabs; both direct entry paths.
- [x] Commit-pinned file list, exact-path navigation, breadcrumbs and inline preview.
- [x] Compact Members, searchable paginated Invite modal and collapsed history.
- [x] New-project frontend default eight; configured smaller limits preserved.
- [x] PostgreSQL eight-total/ninth-denied/pending/final-slot concurrency tests.
- [x] Header ready/resubmit confirmation; Instructor review and Student feedback.
- [x] Desktop/390px checks, keyboard dialog checks and role walkthrough.
- [x] Client 54/366; backend unit 41/285; PostgreSQL 22/112; real Git 2/10;
  Smart HTTP 1/12. Total 120 files / 785 tests. Lint, build and type checks pass.
- [ ] Product Owner compact UI approval; commit/integration remain separate gates.

Java was not rerun in this frontend-only production change. No production
backend/schema/default/migration changed. See `GROUP_REPOSITORY_UX_REDESIGN_REPORT.md`.

## Historical Group implementation checkpoint

Status: **IMPLEMENTED — PENDING PRODUCT OWNER REVIEW** (verified, not accepted).
Checkpoint branch: `work/julius-overnight-group-mvp`.
Approved Activity base: `42666278d7987018cdf24af3499d10e7b84c4e4b`.
Product decisions: `GROUP_REPOSITORY_MVP_DECISIONS.md`.

- [x] A: locked decisions; context/effective-authority read contract; catalog/detail
  eligibility reconciliation; PostgreSQL coverage.
- [x] B: Student-led creation reused; My Group separated from class metadata;
  project-specific invitation inbox; no Instructor assignment.
- [x] C: group-only academic header and Code-first tabs; other types preserved.
- [x] D: Code menu rechecks backend permission, auto-scopes, clears memory on
  close/unmount/expiry, rejects late results; no persisted secret/URL credentials.
- [x] E: existing commits/files/diffs/branches/members/activity and Instructor
  presentation reused; protected main and plain-text README preview.
- [x] F: real-Git collaboration, final regressions, desktop/390px walkthrough,
  role-specific Instructor/Developer checks and diff/security review.
- [ ] Product Owner review / acceptance and separate integration authorization.

Verified: frontend 52 files / 352 tests; backend unit 41 / 285;
PostgreSQL integration 22 / 110; real Git 2 / 10; Smart HTTP 1 / 12;
Java 3 / 26. Total: 121 files / 795 tests. Client/server lint and builds,
server type checks pass. Final copy-only correction also passed 6 focused tests.
See `GROUP_REPOSITORY_MVP_IMPLEMENTATION_REPORT.md` for evidence and limitations.
No migration created or normal-development database migration applied.
The newer overnight work order authorizes local checkpoint commits and safe
independent Admin work. No push, merge, deployment or Product Owner approval.
