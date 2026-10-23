# Instructor UI/UX implementation review — 20 October 2026

Prepared by Codex Developer for the Product Owner → ChatGPT Development Reviewer procedure. This is an uncommitted implementation candidate, not a deployment or migration authorization. The written Product Owner specifications and the complete October 20 implementation order are authoritative; no direct comparison with unavailable screenshots is claimed.

## Product Owner follow-up — dialog and Classwork polish

The later October 20 UI review requested these refinements, now implemented:

- Compact dedicated 44×44 SVG close control across shared application dialogs, independent of full-width action styles.
- CSV modal narrowed to 560px with a clearer title/content/footer hierarchy, styled example file, accessible upload area, visible filename and Preview → Confirm flow. Existing validation, preview fingerprint and duplicate/invalid-row handling remain.
- Removed the Instructor Grading section's completion explainer paragraph when choosing Ungraded. Completion behavior and backend rules are unchanged.
- Removed the separate per-row Submissions links and visible Status label from Classwork. The filter retains an accessible name. Each whole row is now a semantic link to Activity settings/detail, with hover/focus treatment and a chevron. Instructor View submissions is available inside the opened Activity.
- Reused Projex styling and extended its SVG kit. UI UX Pro was requested but was not installed in the available/local skill locations; it was not used or installed.

Verification: full frontend suite 508/508 passed (`client-instructor-polish-full`), then the final inside-Activity navigation addition passed the 63-test affected suite (`client-instructor-polish-targeted-final`). Client lint and production build passed (`client-instructor-polish-lint`, `client-instructor-polish-build`); the existing chunk-size warning remains. Desktop and actual 390px browser checks confirmed 44×44 close dimensions, no horizontal overflow, modal focus trapping/Escape restoration, whole-row whitespace click, keyboard focus/Enter navigation and absent explainer text. Proof is outside Git in `../gate-b-review/instructor-*-polished*.jpg`. Preview route aliases were updated only in the external visual harness; all responses remain simulated.

This follow-up changes seven frontend source/test files already present in the inventory and this report. It makes no backend/schema/database/runtime-service changes. All files remain unstaged and uncommitted. The exact review-database migration/activation approval in L is still required.

## Product Owner follow-up — New Class dialog and required Class Code (21 October)

The New Class form now uses a plain form inside the shared dialog rather than a second rounded, scrolling modal. This removes the 22px inner clipping that cut off the C in Class Name. It has a full-width Class Name, aligned two-column desktop fields, single-column mobile fields, a distinct footer, and the shared compact 44×44 close control. Real preserved review UI was inspected without submitting it; screenshots are `new-class-dialog-polished-desktop.jpg` and `new-class-dialog-polished-mobile.jpg` in the external evidence folder. The Class Code input is required and the mobile document fits 390px without horizontal overflow.

The Product Owner replaced Block with **Class Code** and made it required. Instructor creation/Class Info and Admin normal creation use this label. The former Block's existing `section` field is deliberately retained for storage/API compatibility; no historical values are rewritten and no migration is added. New normal Class requests reject a missing/empty/whitespace-only value. The private generated join code and guarded Admin official catalog code retain their separate fields and permissions. Historical nulls and unrelated legacy updates remain valid; the request does not grant Instructor access to protected official identity changes.

Final checks: 509 frontend tests (68 files), 356 backend unit tests (47 files), and 120 serial PostgreSQL tests (24 files), all passed. The new HTTP validation cases reject the three missing/blank forms of Class Code; existing authorization and official catalog contracts still pass. Client/server lint, both builds and integration type checking passed. Evidence: `client-new-class-full.*`, `server-instructor-unit-new-class.*`, `gate-b-suite-integration-1792512078417.json`, `*-new-class-lint.*`, `*-new-class-build.*`, `server-new-class-types.*`. Disposable fixtures were cleaned under the existing approval (`new-class-20261021-approved-test-fixture-cleanup.json`); no review Class was created. The current review API remains the preserved earlier process; activating new server-side validation is part of the existing approval boundary in L.

UI UX Pro remains unavailable locally; the implementation uses the existing Projex components/design language. No dependency, schema, migration, checkpoint or protected database change was made for this follow-up.

## A. Git and preservation state

- Worktree: `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/projex-gate-b-macos`.
- Branch: `codex/mvp-gate-b-macos`.
- HEAD: `a6ef2427a7e27183977c9b66ff6ce14b988bf6f7` (`fix: support native git on macOS`). Parent: `5da3ef767fa29a0c01294788ee941dc885bc0fbc`.
- All candidate files remain unstaged; index empty. No new commit, push, merge, reset, clean, stash, rebase or deployment.
- Original `/Users/iluvza/Development/Projex`: `main`, HEAD `af819aacf12f014321807e6cf80fc4b4b875cd77`, original clean status and baseline private configuration/schema/lockfile hashes preserved. No connection or mutation to its database/storage.
- Existing isolated PostgreSQL system ID `7698462431321079325`, datadir `/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7/pgdata`, loopback `127.0.0.1:55483`, postmaster PID 11812 retained. Restricted test/review owners and cross-database denial verified again.
- Preserved review processes remain the original API 16954, Java worker 16955, Git worker 16956 and Vite 16957. They were not restarted.

## B. Prior fixes versus this implementation

Before editing, all 18 existing changed files and their complete contents/diff were saved outside Git under `../gate-b-review/instructor-overhaul-before/`. Thirteen remain byte-for-byte identical to that snapshot. Five were extended: `AGENTS.md`, Admin Academic view/test, Student Submission view/test. The earlier Admin projection corrections, Activity workspace label, Student unsaved-source guard and accepted-navigation bypass remain present and covered by the passing regressions.

Prior fixes retained: native Git backend script readable/executable distinction and Windows support, parameterized/guarded Git transport, bounded serializable invitation retry, platform-specific Git fixtures, Admin projection callback correction, unsaved Student source protection, Gate B evidence and handoff documentation. No prior modifications were discarded.

New work is the coordinated Instructor overhaul, shared components, Topics, Program, completion-based Ungraded, required Student/Admin projections, narrow persistence/API changes and tests described below. The inventory distinguishes every prior file from new scope.

## C. Instructor pages

| Page | Implemented behavior |
| --- | --- |
| Home/navigation | Visible bottom-left Sign out; accessible collapsed/mobile alternative; To Review terminology; real first four pending reviews with View all; removed redundant queue link and overview explainer; retained Teaching/Active/Archived summaries and clearer Class cards. Component tests explicitly cover two, three and four preview records. |
| Account overlay | Neutral avatar, name without Hi, usable identity and Sign out; removed dead Profile/Settings/account-management/legal controls. Real browser inspected. |
| Assignments/Classwork | Persistent Topic groups, concise title/status/deadline/grade-mode/submission metadata, whole-row detail/settings navigation, expandable sections, no long instruction text. Full instructions remain on Activity detail/settings. |
| People | Exact-email eligibility lookup after valid input, 450 ms debounce, abort/stale-response protection, checking/found/unavailable/member/pending states, Invite action. Existing privacy and rate limiting retained. |
| CSV invitations | Button opens accessible modal; .csv/email-header example, styled Upload CSV, filename, 100-row/256 KiB limits, existing preview/duplicates/invalid-row handling and preview fingerprint confirmation; no JSON-file claim. Focus trap, Escape and focus restoration checked in real browser; send behavior covered by components/integration tests. |
| Create Class/Class Info | Explicit Program on new Classes; historical unset Program preserved; Class Code label (replacing Block, required for new normal Classes); Schedule Type retained; visible Days removed without sending deletion; term placeholder hidden and unavailable as a selectable choice. |
| Teaching Staff | Shorter role/help text and application-owned confirmations; existing Primary/Co-Instructor authorization and transfer/leave protections retained. |
| Activity setup/tests | Grouped forms, reusable Topic picker/create modal, Graded/Ungraded selection, compact selected-case workbench, styled controls and actionable validation. |
| Submission review | Complete/Ungraded presentation, no numeric review controls, private comment draft and deliberate feedback release; existing failure-resolution controls retained. |

## D. Shared icons and dialogs

`client/src/components/icons/ProjexIcon.jsx` supplies inline SVGs with consistent 24-unit geometry, 1.8 stroke and accessible/decorative modes: Create Class, Home, To Review, Classes, review preview, teaching, active, archived, Create Activity, Draft/Published/Closed, expand/dropdown, bell, Sign out and neutral avatar. No gender is inferred. CSS supplies consistent dropdown indicators. No raster exports, generated illustrations, dependencies or external assets were required.

The bell component supports a real count badge and readable accessible count. It is **not wired to a notification service**; see M. The misleading disabled Instructor bell was removed. The separate Student pane's pre-existing deferred notification/account controls are outside this full Student visual review.

`AppDialog` provides an application-owned portal, title, modal semantics, focus containment/restoration, Escape handling, busy protection and scroll lock. Instructor confirmations no longer depend on the native publish/release prompts that blocked earlier automation. `UnsavedChangesGuard` protects Activity drafts during supported route navigation and before unload. The existing Student source guard remains intact.

## E. Topics and ordering

- One Class-specific `ClassTopic` system; no pre-existing Topic model was duplicated.
- New Topics append in creation order. Atomic up/down actions persist manual order and work by keyboard; drag-and-drop was not added. Publishing/creating an Activity does not change Topic positions.
- Activities use `createdAt DESC, id ASC`, never due date for chronology. No topic is last, on the final Topic page.
- Primary and active Co-Instructors manage Topics; Students only read authorized Published/Closed content. Student filtering happens before Topic pagination/counting, hiding empty/draft-only Topic names and counts. Admin does not gain authoring privileges.
- Create/rename/reorder/remove use a Class organization version and row lock. Stale versions fail with 409. Same-Class composite FK also rejects cross-Class assignment.
- Removal confirms, detaches Activities into No topic, advances affected Activity versions and deletes only the Topic. Test cases, submissions and Git records remain.
- Topic pages are bounded at 100, with independent 20-Activity pages per Topic. This avoids grouping an incomplete global Activity page. The selector loads additional Topic pages and can create a Topic without losing or accidentally submitting its parent Activity draft.

## F. Program

API/schema persist nullable `Class.program`, enum `INFORMATION_TECHNOLOGY` / `COMPUTER_SCIENCE`. New Class creation requires an explicit valid Program, including the Admin creation form so it remains compatible. Updates may set it. Existing null values remain null; no historical default/backfill and no removal of stored Days. Program does not change official Class identity, ownership or enrollment rules.

## G. Completion-based Ungraded contract

| Event/state | Ungraded behavior |
| --- | --- |
| No accepted official submission | `NOT_SUBMITTED`; UI Not submitted. |
| Edit / Run Code / Visible Tests / Save to Git / native Git push | Technical work only; cannot establish completion. |
| Server accepts official Submit | `COMPLETE` immediately, before worker assessment. Acceptance evidence remains immutable and idempotency replay creates no extra attempt. |
| Compilation/output/test failure | Remains Complete. Technical feedback is separate; no academic pass/fail, zero, percentage or numerical grade. |
| Later permitted submission | Separate immutable attempt; same deadlines/limits/replacement rules. Earlier completion remains. |
| Instructor comment draft | Private until deliberate release; completion already exists. |
| Feedback release | Student can see saved comments; no final numeric score. |

Activity mode is frozen after publication. Existing Activities/submissions default to Graded. Graded scoring, credit policy, corrections and historical records retain their contracts. Completion stores NULL academic totals/component maxima/result points/scores; projections never convert them to artificial zeroes. Run/test outcomes retain technical Passed/Failed terminology only within technical evidence.

Infrastructure failure still requires the existing authorized retry/resolution workflow before review; this implementation does not bypass replacement/reason controls. Resolved Completion attempts remain complete and can receive comments. Student detail/history/workspace/Classwork/work lists, Instructor review and Admin summaries are consistent.

Real browser proof used only new fictional users in disposable `projex_test`: Run Code printed 42 and visible test passed with zero official submissions; submitting source that printed 0 created one Complete attempt before processing. The failed visible test did not change completion. A private comment stayed hidden, Cancel did not release, Confirm released once, and Student/Admin rendered no academic score. SQL confirmed `RELEASED` with all academic scores NULL. These disposable fixtures were then cleaned under the explicit test approval; the preserved review fixtures were not used.

## H. Activity and test-case authoring

Details, Topic, grading, deadline/attempts, Java starter, test cases and availability have clear groups. Removed server-backed/server-matching copy. Existing source remains memory-only unless deliberately saved/submitted through existing controls.

The case navigator shows one selected editor, visible/hidden labels, accessible move/remove controls and conveniently placed Add. Add selects/focuses the new case; switching preserves edits. Textareas grow between sensible limits. Mobile stacks the workbench. Removal confirms. Graded points validate against totals; Ungraded hides numeric points and stores NULL. Cases remain immutable after publication.

Draft grading-mode conversion updates case point configuration only when the mode actually changes. An ordinary Graded draft save preserves all weights; PostgreSQL regression verifies this. Recoverable save/conflict failures retain form values; stale mutations are not automatically replayed.

## I. Publishing and validation

User-facing section is Publishing & availability. Structured prerequisites and field validation replace raw lifecycle text. Graded publication still requires positive configured test credit within the total; Ungraded removes academic-point prerequisites while retaining Java/source/visible-test/deadline rules. Published grading/source/cases stay locked; existing permitted deadline/attempt changes remain.

Application-owned explicit Confirm/Cancel dialogs, current-version writes and a mutation lock protect availability changes. The disposable Activity was published once after a verified cancellation. No prior review Activity was republished, reopened or closed during this implementation.

## J. Backend, API and migration

- `GET /api/v1/classes/:classId/topics?page=N` and CSRF-protected Instructor `POST .../topics` for create/rename/remove/up/down with `expectedVersion`.
- Activity list supports Class-scoped `topicId` (UUID or `none`); create/update accept `topicId` and grading configuration under existing authorization/version checks.
- Classes expose/persist Program. Submission/assessment/work-hub/Admin projections include mode/completion semantics and deliberate released-feedback gating.
- Worker assessment preserves technical execution and NULL Completion academic components. Numeric corrections/review inputs are rejected for Completion.
- Prisma adds Program/Topic/version/mode fields, same-Class Topic relations and required indexes; nullable academic values are bounded by mode-aware database constraints and grading consistency triggers. Historical records default Graded, unset Program and No topic.
- Migration: `server/prisma/migrations/20261020000000_instructor_classwork_completion/migration.sql`.
- Exact SHA-256: `bcedd2fd5c6701db6953d8203cf7c071d463dc0ef8250792062da8865e9b2588`.
- User explicitly approved this exact migration **only on `projex_test` at `127.0.0.1:55483`**, serial suites and fixture cleanup. Applied successfully there: 25 finished migrations. Applied SQL was not subsequently edited.
- Preserved `projex_mvp_review` remains at 24 finished migrations. The original Mac database/storage was never targeted. Populated review-database migration/activation has not been executed or claimed validated.

## K. Verification actually executed

Evidence root: `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/gate-b-review` (outside Git).

| Check | Final result | Evidence |
| --- | --- | --- |
| Full frontend suite | 509 passed, 68 files | `client-new-class-full.log/json` |
| Backend unit suite | 356 passed, 47 files | `server-instructor-unit-new-class.log/json` |
| PostgreSQL integration, serial | 120 passed, 24 files | `gate-b-suite-integration-1792512078417.json` |
| Real Java | 26 passed, 3 files | `gate-b-suite-java-1792508295665.json` |
| Native Git | 11 passed, 2 files | `gate-b-suite-git-1792508310175.json` |
| Smart HTTP | 12 passed, 1 file | `gate-b-suite-smart-http-1792508315019.json` |
| Client/server lint | Passed | `*-instructor-release-lint.log/json` |
| Server integration type check | Passed (includes source) | `server-instructor-release-types.log/json` |
| Client/server builds | Passed | `*-instructor-release-build.log/json` |
| Prisma generate, offline validate | Passed | `server-instructor-schema-generate-final.*`, `server-instructor-schema-validate.log` |
| Whitespace/index/private/generated-file audit | Passed; zero staged; no high-confidence secret matches | `instructor-final-audit.json` |
| Four preserved review bare repositories | All `git fsck --full` passed | `instructor-final-audit.json` |
| Approved disposable fixture cleanup | Zero users/Classes/Topics/Activities/submissions/repositories/jobs; cluster/migrations retained | `instructor-approved-test-fixture-cleanup.json` |

The integration suites cover authorization, same-Class FK, organization ordering/versioning, hidden draft-only Topic privacy, Topic removal preserving academic records, unchanged Graded weights, real Java success/compilation failure, immediate completion, idempotency and private/released feedback. Existing suites continue to cover attempts/deadlines/failure handling/security/Git isolation.

During development, old fixtures missing required Program or a valid accepted Co-Instructor state failed and were corrected rather than weakening production constraints. A full frontend run overlapped several CPU-heavy builds and hit one default async-query timeout (507/508); the unchanged suite rerun without those competing builds passed 508/508. Unit HTTP tests use the existing loopback-only harness; no security control was relaxed. Earlier failed development runs remain in the evidence folder.

Browser verification is recorded in `instructor-browser-results.json`. Screenshots: `instructor-home-real-test.jpg`, `student-ungraded-complete-before-release.jpg`, `student-ungraded-feedback-released.jpg`. Actual components with a simulated API were separately checked on desktop and at 390px, including stacked test editor, focus after Add, compact checkbox and no horizontal overflow: `instructor-classwork-desktop-verified.jpg`, `instructor-authoring-mobile.jpg`. The real test app stayed at 1280px despite the attempted viewport override; mobile evidence therefore comes from the component preview and component tests, not a claimed mobile live-database run. No complete screen-reader audit or new Windows runtime run is claimed.

## L. Exact remaining approval boundary

Next is the independent Development Reviewer review of this full diff and exact SQL. After that, Product Owner approval is needed to:

1. Apply **only** `20261020000000_instructor_classwork_completion`, SHA-256 `bcedd2fd5c6701db6953d8203cf7c071d463dc0ef8250792062da8865e9b2588`, to existing **`projex_mvp_review` at `127.0.0.1:55483`**, using its existing restricted review owner. Verify cluster system ID `7698462431321079325`, canonical datadir above, current 24 migrations, current records/repositories and recovery evidence immediately before application.
2. Activate the already-tested source/build contracts with a controlled restart of only the preserved review API/Java/Git workers (currently 16954/16955/16956), preserving PostgreSQL, Vite UI, private configuration, accounts, submissions, repositories and existing storage. Recheck the running manifests/PIDs before stopping anything. No reset, fixture reseed or database recreation.
3. Perform bounded post-activation read checks and separately approved manual review on the existing local resources. Any new review-data mutation must have a clear fixture/role purpose and must not repeat uncertain prior lifecycle actions.

This is a coherent bounded resource plan; paths, loopback ports, identities and separation were rechecked read-only. The previous test approval does **not** cover this review migration or restart. A checkpoint stage/commit remains a separate approval after review; push, merge and deployment remain separately excluded.

## M. Remaining blockers and limits

**Notifications:** there is no authorized per-user notification feed/unread/read-state contract in the existing system. The requested SVG/count capability is implemented, but a working notification feature is not claimed. The smallest extension is authenticated recipient-scoped notification reads + unread count + mark-read storage/API and a defined event source; ownership, event selection and privacy must be reviewed before implementing it. No fake unread count/feed was added.

**Review activation:** the live preserved API still runs its earlier compiled build and 24-migration schema. Source HMR on port 5192 can expose the new frontend against that old API; do not use it as a completed integrated overhaul acceptance environment until L is approved/applied. Source implementation and disposable integrated regressions are complete within the authorized boundary.

Optional drag-and-drop, chronological sorting controls beyond the finalized default, a full Student pane redesign, real notifications, production performance/load testing, Windows reruns and deployment are not claimed. Keyboard reorder fulfills the required accessible ordering flow. Large Topic pages remain bounded but can issue one Activity-list request per Topic; production load tuning should follow measured usage rather than silently truncating groups.

## N. Local review URLs and instructions

- [Read-only component preview](http://127.0.0.1:5193): actual Classwork/editor/CSV components with clearly labeled simulated data. It cannot validate persistence or auth; it does not write a database. Switch the preview links and inspect desktop/mobile layouts.
- [Preserved review Instructor login](http://127.0.0.1:5192/instructor-login), [Student login](http://127.0.0.1:5192/student-login), API `http://127.0.0.1:3321/api/v1`: resources/accounts/data preserved, **full overhaul activation pending L**. Use existing private access instructions; credentials are not in this report or Git.
- Disposable `http://localhost:5194` / `http://localhost:3322` were used only for tonight's regression and are now stopped; test fixtures cleaned. Do not treat screenshot IDs as persistent manual fixtures.
- The prior Product Owner manual Activity and Student access remain reserved and untouched. Existing review counts at final audit: 21 users, 1 Class, 5 Activities, 2 official submissions, 4 repositories, 2 teams. The original Student submission `17b4688c-11ac-4c73-843e-9e54eac19eef` remains RELEASED at 100 with feedback; no release was repeated.

## O. Inventory and checkpoint recommendation

Recommend independent review of the complete candidate before any checkpoint. Keep the prior Gate B fixes recognizable as a separate logical slice; Topics/Program/Ungraded source, migration and corresponding projections/tests form one compatible implementation slice. Any split must be checked for a buildable intermediate state. No staging or commit has occurred.

Eligible inventory below is limited to repository source, migration, tests and documentation. Explicit exclusions: all `../gate-b-review/` harnesses, logs, screenshots and snapshots; all `/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7/` credentials/configuration/PIDs/databases/Git/mail/Java resources; generated Prisma client, `dist`, dependencies, caches and attachments. No package/lockfile upgrade, environment file or generated artifact is included. The secret-pattern scan is evidence, not a substitute for Reviewer inspection.

Exact current inventory: **91 files** (72 modified tracked; 19 untracked). All unstaged.

| File | Origin |
| --- | --- |
| `AGENTS.md` | Prior Gate B, extended |
| `client/src/activities/ActivityViews.test.jsx` | New overhaul |
| `client/src/activities/InstructorActivityViews.jsx` | New overhaul |
| `client/src/activities/StudentActivityViews.jsx` | New overhaul |
| `client/src/activities/activity-api.js` | New overhaul |
| `client/src/activities/activity-utils.js` | New overhaul |
| `client/src/admin/AdminAcademicViews.jsx` | Prior Gate B, extended |
| `client/src/admin/AdminAcademicViews.test.jsx` | Prior Gate B, extended |
| `client/src/admin/AdminOperationsViews.jsx` | Prior Gate B, unchanged |
| `client/src/admin/AdminOperationsViews.test.jsx` | Prior Gate B, unchanged |
| `client/src/admin/admin-academic-projections.js` | New overhaul |
| `client/src/classes/AcademicFields.jsx` | New overhaul |
| `client/src/classes/ClassInvitationViews.jsx` | New overhaul |
| `client/src/classes/ClassInvitationViews.test.jsx` | New overhaul |
| `client/src/classes/ClassStaffPanel.jsx` | New overhaul |
| `client/src/classes/ClassStaffPanel.test.jsx` | New overhaul |
| `client/src/classes/ClassWorkflows.test.jsx` | New overhaul |
| `client/src/classes/CsvInvitationPanel.jsx` | New overhaul |
| `client/src/classes/CsvInvitationPanel.test.jsx` | New overhaul |
| `client/src/layouts/DashboardLayout.jsx` | New overhaul |
| `client/src/layouts/DashboardLayout.mobile.test.jsx` | New overhaul |
| `client/src/pages/InstructorPages.jsx` | New overhaul |
| `client/src/pages/Phase10CloseoutRoutes.test.jsx` | New overhaul |
| `client/src/submissions/InstructorSubmissionViews.jsx` | New overhaul |
| `client/src/submissions/InstructorSubmissionViews.test.jsx` | New overhaul |
| `client/src/submissions/StudentSubmissionViews.jsx` | Prior Gate B, extended |
| `client/src/submissions/StudentSubmissionViews.test.jsx` | Prior Gate B, extended |
| `client/src/submissions/instructor-submission-projections.js` | New overhaul |
| `client/src/submissions/submission-projections.js` | New overhaul |
| `client/src/work-hub/WorkHubViews.jsx` | New overhaul |
| `client/src/work-hub/WorkHubViews.test.jsx` | New overhaul |
| `docs/CODEX_HANDOFF.md` | Prior Gate B, unchanged |
| `docs/MVP_INTEGRATION_GATE_B_PLAN.md` | Prior Gate B, unchanged |
| `docs/architecture/FRONTEND_INTEGRATION.md` | Prior Gate B, unchanged |
| `docs/architecture/GIT_SMART_HTTP_TRANSPORT.md` | Prior Gate B, unchanged |
| `docs/architecture/PROGRAMMING_ACTIVITIES_AND_TEST_CASES.md` | New overhaul |
| `docs/architecture/SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md` | New overhaul |
| `docs/architecture/USER_AND_CLASS_MANAGEMENT.md` | New overhaul |
| `server/prisma/schema.prisma` | New overhaul |
| `server/src/infrastructure/git/git-smart-http.ts` | Prior Gate B, unchanged |
| `server/src/infrastructure/job-queue/execution-queue.ts` | New overhaul |
| `server/src/modules/activities/activity.repository.ts` | New overhaul |
| `server/src/modules/activities/activity.schemas.ts` | New overhaul |
| `server/src/modules/activities/activity.service.ts` | New overhaul |
| `server/src/modules/activities/activity.types.ts` | New overhaul |
| `server/src/modules/admin/admin-oversight.repository.ts` | New overhaul |
| `server/src/modules/admin/admin-oversight.service.ts` | New overhaul |
| `server/src/modules/class-invitations/class-invitation.repository.ts` | Prior Gate B, unchanged |
| `server/src/modules/classes/academic-fields.test.ts` | New overhaul |
| `server/src/modules/classes/class.repository.ts` | New overhaul |
| `server/src/modules/classes/class.schemas.ts` | New overhaul |
| `server/src/modules/classes/class.service.ts` | New overhaul |
| `server/src/modules/classes/class.types.ts` | New overhaul |
| `server/src/modules/classes/classes.routes.ts` | New overhaul |
| `server/src/modules/submissions/submission.repository.ts` | New overhaul |
| `server/src/modules/submissions/submission.schemas.ts` | New overhaul |
| `server/src/modules/submissions/submission.service.ts` | New overhaul |
| `server/src/modules/test-cases/test-case.repository.ts` | New overhaul |
| `server/src/modules/test-cases/test-case.schemas.ts` | New overhaul |
| `server/src/modules/test-cases/test-case.types.ts` | New overhaul |
| `server/src/modules/work-hub/work-hub.routes.ts` | New overhaul |
| `server/src/server.ts` | New overhaul |
| `server/tests/git/git-smart-http.git.integration.test.ts` | Prior Gate B, unchanged |
| `server/tests/git/repository-provisioning.git.integration.test.ts` | Prior Gate B, unchanged |
| `server/tests/integration/academic-foundation.integration.test.ts` | New overhaul |
| `server/tests/integration/activities.integration.test.ts` | New overhaul |
| `server/tests/integration/class-invitations.integration.test.ts` | New overhaul |
| `server/tests/integration/class-members.integration.test.ts` | New overhaul |
| `server/tests/integration/class-provisioning-mvp.integration.test.ts` | New overhaul |
| `server/tests/integration/classes.integration.test.ts` | New overhaul |
| `server/tests/integration/database.ts` | New overhaul |
| `server/tests/integration/test-cases.integration.test.ts` | New overhaul |
| `client/src/activities/TopicViews.jsx` | New overhaul |
| `client/src/activities/TopicViews.test.jsx` | New overhaul |
| `client/src/classes/ProgramField.jsx` | New overhaul |
| `client/src/components/AppDialog.jsx` | New overhaul |
| `client/src/components/UnsavedChangesGuard.jsx` | New overhaul |
| `client/src/components/icons/ProjexIcon.jsx` | New overhaul |
| `client/src/components/useConfirmation.jsx` | New overhaul |
| `client/src/instructor-overhaul.css` | New overhaul |
| `client/src/submissions/submission-display.js` | New overhaul |
| `docs/INSTRUCTOR_UI_UX_IMPLEMENTATION_REVIEW.md` | New overhaul |
| `docs/MVP_INTEGRATION_GATE_B_REPORT.md` | Prior Gate B, unchanged |
| `server/prisma/migrations/20261020000000_instructor_classwork_completion/migration.sql` | New overhaul |
| `server/src/infrastructure/git/git-smart-http.test.ts` | Prior Gate B, unchanged |
| `server/src/modules/activities/topic.routes.ts` | New overhaul |
| `server/src/modules/activities/topic.service.test.ts` | New overhaul |
| `server/src/modules/activities/topic.service.ts` | New overhaul |
| `server/src/modules/class-invitations/class-invitation.repository.test.ts` | Prior Gate B, unchanged |
| `server/src/modules/submissions/completion.test.ts` | New overhaul |
| `server/tests/integration/classwork-completion.integration.test.ts` | New overhaul |

READY FOR COMPLETE INSTRUCTOR UI/UX IMPLEMENTATION REVIEW
