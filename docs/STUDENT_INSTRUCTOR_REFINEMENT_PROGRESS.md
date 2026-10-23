# Projex Student / Instructor refinement handoff

Updated: 21 October 2026 (Asia/Manila).

## A. Status and source authority

Implementation is ready for Product Owner inspection, with the post-deadline practice permission change explicitly blocked below. All work remains uncommitted and unstaged.

- Worktree: `C:/Users/Wefllagn/.codex/worktrees/student-ui-ux-continuation/projex-ui`.
- Branch: `codex/student-ui-ux-continuation`.
- HEAD unchanged: `53ee6d9c8c274bfc6486b802ad01e6e4c788b8d3`.
- Intake status was clean. The earlier 72-path candidate had already been checkpointed; the work-order statement about substantial uncommitted work was historical. No existing uncommitted work was discarded.
- The latest pasted refinement work order and autonomous addendum govern this candidate. No staging, commit, push, merge, deployment, schema, migration, ownership or academic authorization change was made.

## B. Design audit and shared system

Used installed Taste app-screen guidance and UI/UX Pro, retaining the existing local Inter/`--sans` font and Projex assets. Taste draw: devtools / framed-sheet, seed `803037226`, existing type and palette retained. No dependency installation or external font/image fetch.

The primary objects remain Classes, due work, repositories and accepted assessment evidence. Home prioritizes finding/opening/joining a Class; repositories prioritize finding code; Activity Detail prioritizes instructions and Your work; To Review prioritizes Activity review decisions.

- Quiet neutral navigation frame, white working sheet, equal gutters, restrained existing blue and visible keyboard focus.
- Corrected the navigation grid stretching a few links across the entire sidebar height.
- Removed dotted backgrounds from Student and Instructor working surfaces.
- Compact headings, rows, controls, icons and Class headers; consolidated Class statistics into inline figures on both Home pages.
- Preserved full academic context, useful state/error guidance, attempt/deadline constraints and deliberate consequential confirmations.
- Shared dialog typography, spacing, field/action hierarchy and compact empty/error states. No browser confirmation replacements were added in this change; the prior application-dialog implementation remains.
- Tablet Class headers and review counters fold without clipping. Mobile controls retain touch-sized targets.

### Browser critique after corrections

1. Class identity and task/repository titles now carry the working content; large decorative statistics no longer lead Home or the catalog.
2. The working sheet uses equal gutters. The review list intentionally uses a centered reading column following the reference. Blank space below the two/three real records is real empty capacity, not fabricated filler. Corrected stretched navigation, tablet header/filter overflow and doubled dialog padding.
3. Existing Inter is visible on the first screen. Blue marks actions/selection and the retained brand; status colors describe actual state. No chart or decorative animation was introduced.
4. Live Student summary is 2 joined / 2 active / 0 archived; Instructor summary is 3 / 3 / 0. Catalog is 2 repositories (1 Activity + 1 Personal). Each of the 2 review Activities shows 0 submitted, 2 assigned, 0 reviewed and 0 released, matching the database. Sidebar/Class/catalog identity copies agree.
5. Real zeros remain zero; loading Home summaries use an em dash. The pending invitation marker is based only on the authoritative queue, with no invented unread counter.
6. Charts/legends are not applicable. Source/console text stays monospaced; other interface text uses the shared sans face.
7. Phone navigation folds away; filters, rows, dialogs and work actions remain usable. The IDE stacks its existing panes and reveals output for run actions. Native editor horizontal scrolling is retained.

## C. Student Home, To-do and navigation

Home retains My Classes, Class sidebar navigation, Join Class by code and invitations in the bell overlay. Join, notification decisions, account overlay and sign-out behavior remain API-backed and unchanged. The mascot is smaller and Class statistics no longer dominate the page.

To-do keeps Assigned/Missing/Done, Class filtering, debounced search, local-calendar due groups, automatic revalidation, real API state and existing completion semantics. Its outer card, row spacing and metadata are quieter; no Home/Refresh/Search buttons were reintroduced.

## D. Repository catalog and retired UI

- Removed the standalone New Class Workspace action and creation dialog from the normal Student UI.
- Existing legacy Class Workspace filter, category, direct routes, backend creation/read contracts and storage remain intact. The backend type has ownership, enrollment, provisioning and Git transport dependencies; it was not deleted.
- Personal / Activity / Project repositories lead with one aligned type/action toolbar, real count/pagination and recognizable repository icons.
- Rows carry appropriate repository/Class/Activity/Project context and a restrained readiness state. Project metadata visibility never implies source access.
- Added allowlisted read-only catalog metadata: `className`, `activityTitle`, `projectTitle`, `contextClassId`. The existing nullable direct `classId` projection retains its foreign-key meaning. The derived context ID fixes Activity links when that direct FK is null.
- New repository dialog retains existing name/description validation and private-account creation. Error keeps the draft; busy prevents dismissal/repeated creation. Cancel/Escape performs no write and restores focus.
- No Activity repositories were automatically created to populate the catalog.

## E. Activity Detail, Git and IDE

View Git in Your work opens a contextual Activity repository dialog. It reuses existing provisioning/status polling, latest-commit summary and explicit Code/native access behavior. Browse repository opens the full existing route. The large Git section below instructions is removed.

The full browser leads with Git/files, followed by secondary metadata. For Activity repositories it reuses GroupFileBrowser, GroupLatestCommit and existing Group history/diff/branch presentations, with file reads pinned to the selected immutable commit. It does not fabricate Group membership or reuse Group authorization. Existing API permission checks remain authoritative. Personal and legacy file-browser behavior remains supported.

An empty writable Activity repository now correctly points to Save to Git in the coding workspace as well as native Git, instead of incorrectly claiming that Projex cannot save browser code. Save/push still does not submit an Activity.

The IDE retains its three panels, keyboard/pointer sizing and four separate actions: Run Code, Run Visible Tests, Save to Git and Submit. Refined toolbar/editor metadata and literal-code typography. On narrow screens, run actions reveal diagnostics/input rather than leaving the selected output off-screen. Empty stdin is labeled `(no input)`. Runtime requests, accepted submission behavior and Git writes are unchanged.

## F. Instructor To Review and count semantics

New read-only endpoint: `GET /api/v1/work-hub/instructor/review-activities`.

- Requires active authentication and Instructor role; scopes to ACTIVE primary/co-teaching Classes.
- Published/closed Activities; Class/state/search predicates apply before bounded pagination/count.
- Repeatable-read aggregation over the returned Activity page; no source, hidden cases, scores, feedback or credentials projected.
- To review includes zero-submission Activities and Activities with any pending attempt.
- Reviewed requires at least one reviewed attempt and no pending attempt. A new pending attempt returns the Activity to To review.
- Review recognizes REVIEWED / RELEASED and reviewed FAILED_RESOLVED; automated assessment alone is not review.

| Visible count | Exact unit |
| --- | --- |
| Submitted attempts | Accepted ActivitySubmission records across attempts |
| Assigned students | Current ACTIVE Class memberships for ACTIVE Student accounts |
| Reviewed attempts | Accepted attempts with `reviewedAt` |
| Released attempts | Accepted attempts with `releasedAt` |

Assigned is the current cohort, while attempt counts can include historical attempts. Reviewed does not mean everyone has submitted. No graded counter or review/release equivalence is invented.

The UI has To review/Reviewed tabs, Class filter, collapsible due groups, compact rows and existing per-Activity submission-queue links. Due-group counts describe the returned page; the toolbar and pagination describe the complete authorized query. Existing Project repository review links remain separately paginated and use the same selected Class. Automatic Activity refresh retains rows during pending reads and ignores stale prior-filter responses.

## G. Ownership, evidence and practice audit

Existing contracts already satisfy these parts:

- Activity repository provisioning passes the authenticated Student as owner and enforces Activity/owner uniqueness. Submission and grading paths do not transfer ownership or create Instructor-owned graded branches.
- Acceptance persists exact browser source/hash plus Activity/test snapshots in its serializable submission transaction. Assessment and Instructor review use accepted evidence, not the current Git HEAD. Browser checkpoints/native pushes remain separate operations without submission records, attempts or automatic regrading.
- Attempt limits, deadlines, replacement grants, Graded/Ungraded semantics and released-only Student results remain authoritative. The repository catalog adds no grading interface.
- An authorized Student retains repository read access after submission/grading while the existing active-account/Class/membership rules hold. Pre-deadline practice is independent of remaining submission attempts.

Source references: `repository.service.ts` createActivityWorkspace/canView; `repository.repository.ts` createActivityWorkspace; `submission.repository.ts` acceptance and practice/code-run creation; `git-authorization.ts`; `activity-workspace-checkpoint.service.ts`; `StudentSubmissionViews.jsx` canRun/canSubmit. Owning contract: `docs/architecture/SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md`.

**Blocked requirement: post-deadline/closed-Activity execution and Git practice.** Current accepted assessment policy explicitly rejects new practice after closure/deadline. Checkpoints and native Git writes use the same open lifecycle. Safely separating learning/practice from official submission needs a coordinated permission change across Java, checkpoint acceptance/worker execution and Git transport, with evidence and cutoff regressions. No bypass, schema change, ownership transfer or duplicate graded branch was introduced. The work order explicitly requires this substantial authorization change to stop for review while independent UI work continues.

This is an application-contract/source audit, not a claim of database-level WORM protection. The live review database has zero accepted submissions; no historical evidence was fabricated or mutated to demonstrate the lifecycle.

## H. Verification and limitations

| Check actually executed | Result |
| --- | --- |
| Frontend unit/component tests | 72 files; 530 passed (`final-client-tests.log`) |
| Backend unit tests | 49 files; 373 passed, 1 existing Windows skip |
| Frontend / backend ESLint | Passed |
| Backend type-check | Passed |
| Integration test type-check | Passed; does not execute integration fixtures |
| Frontend / backend builds | Passed |
| Git whitespace check | Passed |
| Changed-source UTF-8 / secret-pattern review | Passed; no private-key, credential-URL or live-token patterns; no env/schema/package changes |
| Taste static app lint | 0 FAIL; warnings mainly match `box-shadow: none`, `backdrop-filter: none`, hidden existing eyebrows and literal date zero-padding |
| Read-only live API/PostgreSQL comparison | Passed for both existing Activities, Class-filtered counts, Activity catalog context and Student 403 denial |
| Loopback listeners | 5197 / 5300 / 55493 bound to 127.0.0.1 |

The Windows skip is the existing Unix non-executable-wrapper permission test in `server/src/infrastructure/git/git-smart-http.test.ts`.

Browser inspection used CUA screenshots/DOM measurements at 1440, 768 and 390 widths (rather than the skill's separate CDP inspector). Inspected Home, To-do, catalog, personal creation, Activity Detail/Git, IDE, Instructor Home/To Review and Class creation dialog. Verified Escape/focus restoration, keyboard pane sizing, mobile navigation, compact empty states and review links. No page-level horizontal overflow was observed in inspected states. Source editor content retains its own horizontal scrolling.

Populated review/released counts, nonempty commit/file browsing and failure paths were covered with unit/component fixtures. The current live data has two empty repositories and zero accepted attempts; these paths were not manufactured live. No full Student journey, official submission, grade/release, new Java execution, Git push or repository creation was performed.

Existing PostgreSQL integration fixtures call destructive cleanup helpers. They were not run under the current no-deletion guardrail. Actual review-database verification instead used an explicit read-only transaction. No integration suite result is claimed from type checking alone.

Evidence: `C:/Users/Wefllagn/.codex/visualizations/2026/10/20/01a15a3d-b1a5-7990-b286-2bd8c98fc9f4/projex-live-review-20261021/evidence/refinement/`. Includes logs, screenshots, Taste direction, baseline and read-only verification script/report. No credentials were written into this handoff.

## I. Runtime and preservation

- Actual frontend: http://127.0.0.1:5197/student
- Instructor entry: http://127.0.0.1:5197/instructor-login
- API: http://127.0.0.1:5300/api/v1
- Existing isolated PostgreSQL: database `projex_student_review`, application role `projex_review_app`, loopback port `55493`.
- Existing owned review root: `C:/Users/Wefllagn/.codex/visualizations/2026/10/20/01a15a3d-b1a5-7990-b286-2bd8c98fc9f4/projex-live-review-20261021`.
- Owner marker/database identity and all 25 already-applied migrations verified read-only. No migration was applied in this task.
- Owned launcher restarted API, frontend, Java worker and Git worker from the final build. This confirms running processes, not a new execution/transport end-to-end proof.
- Existing fictional accounts, review academic data, original databases/environments/worktrees and Git storage were preserved. Original checkout has its own existing README/env-example/team-doc/setup/output/tmp work, which was not edited or cleaned.
- No source `.env`, package dependency/lock, Prisma schema/migration, branch history, original service or historical repository was changed. Evidence/runtime files remain outside Git. No production simulation is imported or activated.

Start/restart from PowerShell:

```powershell
& 'C:\Users\Wefllagn\.codex\visualizations\2026\10\20\01a15a3d-b1a5-7990-b286-2bd8c98fc9f4\projex-live-review-20261021\Review.ps1' start
# Use restart after rebuilding backend changes; status is read-only.
```

Use the existing local review account instructions from the prior live-environment handoff. No credentials changed or were copied.

## J. Inspection / continuation

Product Owner sequence: Home/Join/notifications → To-do → My Repositories → Activity instructions/Your work/View Git → full repository → coding workspace; then Instructor Home → To Review filter/tabs/groups → existing submission queue. Real submission/review/release and trusted Java/Git testing remain deliberate manual actions in the owned review environment.

Resume only for Product Owner feedback or separately approved post-deadline practice permission design. Do not stage/commit/push/merge/deploy this candidate without separate authorization.

Exact continuation-worktree status (21 modified + 7 untracked; no staged changes):

```text
 M client/src/App.jsx
 M client/src/activities/ActivityViews.test.jsx
 M client/src/activities/StudentActivityViews.jsx
 M client/src/layouts/DashboardLayout.jsx
 M client/src/pages/InstructorPages.jsx
 M client/src/pages/StudentPages.jsx
 M client/src/repositories/RepositoryFoundationViews.jsx
 M client/src/repositories/RepositoryFoundationViews.test.jsx
 M client/src/repositories/RepositoryGitViews.jsx
 M client/src/repositories/RepositoryGitViews.test.jsx
 M client/src/repositories/repository-projections.js
 M client/src/submissions/InstructorSubmissionViews.jsx
 M client/src/submissions/StudentSubmissionViews.jsx
 M client/src/submissions/StudentSubmissionViews.test.jsx
 M client/src/work-hub/WorkHubViews.jsx
 M client/src/work-hub/WorkHubViews.test.jsx
 M docs/architecture/FRONTEND_INTEGRATION.md
 M server/src/modules/repositories/repository.repository.ts
 M server/src/modules/repositories/repository.types.ts
 M server/src/modules/work-hub/work-hub.routes.test.ts
 M server/src/modules/work-hub/work-hub.routes.ts
?? client/src/design/academic-refinement.css
?? client/src/repositories/StudentRepositoryCatalog.jsx
?? client/src/work-hub/InstructorReviewView.jsx
?? client/src/work-hub/InstructorReviewView.test.jsx
?? docs/STUDENT_INSTRUCTOR_REFINEMENT_PROGRESS.md
?? server/src/modules/repositories/repository-projection.test.ts
?? server/src/modules/work-hub/instructor-review-activities.ts
```


## K. Product Owner follow-up: Classroom-led class pages (in progress)

The subsequent Product Owner correction supersedes the prior home-summary direction: remove both welcome/mascot blocks and summary-stat cards. Keep the larger blue/icon sidebar and Projex typography. New shared ClassCardGrid renders actual class records, colored covers, status/term information and functional class-scoped work links. No fabricated schedules, due tasks or teacher photographs.

Completed implementation: persistent Instructor Activity/Group Project sub-tabs; contextual Project empty states; concise Student Project rows; Student topic filter and empty No topic group; View your work profile/list/filter presentation using existing Student work-hub reads; Class Info summary plus Edit details dialog; focused Co-Instructor invitation dialog and progressive ownership/lifecycle sections. Account menu removes Hi/uppercase and the fake management button. Unavailable Class stream panels removed from both roles. Review panel no longer shrinks across tabs.

Verification so far: initial correction passed all 532 frontend tests; current Classroom follow-up passed 65 affected tests. Full final frontend suite/lint/build and final responsive/diff review remain to be completed. Backend unchanged by these follow-ups. No live invitations, class edits, submissions, Java/Git jobs, database changes, staging or commits performed. Automatic approval review rejected weakening a new class-mismatch assertion; the assertion was retained and a safe fixed mismatch UI message implemented instead. No requirement remains blocked by that review.

Known existing API limits: All in Your work follows published work in active classes; Submitted also includes eligible closed Activities. Archived history remains in the existing Activity/submission routes. Topic options follow the current authorized topic page with explicit topic paging. No guessed grades or synthesized submission states.

Resume: finish scoped regression for Class Info disclosure, full frontend checks, actual desktop/mobile browser review, final incremental diff/security review and status inventory; leave everything uncommitted. Current implementation uses the isolated continuation at HEAD 53ee6d9. Earlier status blocks above are historical snapshots; Git owns current status.


## L. Floating-label controls and Activity history follow-up (verification stage)

Implemented the Product Owner's latest six-image direction: floating border label + custom in-theme Topic popup; shared Classwork heading/filter/View your work alignment; Group Projects naming; Classwork-style project rows with honest No topic label; only due date and attempt usage in Your work facts; compact attempt-history dialog from Activity and IDE. Existing safe history API/projection reused; full historical routes preserved. Escape popup/dialog interaction corrected and covered. No project-topic association exists in schema/API; no migration or fabricated association added.

The preceding Classroom follow-up completed full frontend verification: 538 tests in 73 files, lint and build passed. Latest focused suite found only a stale rail-policy presentation expectation, explicitly superseded by the Product Owner's only-two-facts instruction. All hidden-test/score/feedback assertions remain; 34 focused Activity/dropdown tests pass after updating that expectation and fixing nested Escape handling. Final full frontend suite/lint/build are next, then final status evidence. Earlier K resume instructions are superseded by this record.

Browser evidence so far uses the real loopback app with existing fictional Student account: desktop toolbar/dropdown, Group Project row, simplified Activity facts, empty history modal, nested Escape, and 390px modal. No accepted attempts were created for preview; populated history is tested with API fixtures only. Existing databases, environments, Git repositories and original checkout were not modified. All work remains uncommitted.


## M. Final verification and handoff for the follow-ups

Completed: Classroom-led Student/Instructor homes (no welcome/metrics blocks), consistent blue/icon navigation, natural-case account menu without fake management action, stable review frames, no unavailable stream placeholders, persistent Instructor activity/project navigation, simplified Class Info/staff dialogs, Student own-work list, contextual empty states, Group Projects activity-style rows, floating-border Topic filter with themed listbox and keyboard/outside close, aligned Classwork toolbar, due/attempt-only Activity facts, concise history overlays from Activity and IDE.

Final checks executed: **543 frontend tests passed in 74 files**, frontend ESLint passed, Vite production build passed. Existing >500 kB chunk-size advisory remains; no build errors. A final tablet-only CSS containment correction was browser-checked at 768px and followed by another production build. `git diff --check` passed. No backend source changed during these follow-ups; earlier backend candidate work is preserved, and backend checks were not rerun for this frontend-only correction.

Actual browser inspection: 1440px desktop, 768px tablet and 390px phone; floating-label popup, Project row, Activity rail, empty attempt overlay from both Activity and IDE, Escape closes dropdown before dialog, dialog focus restoration, no horizontal page overflow and controls within the tablet card. Populated/filtered attempt rows and unreleased score/feedback safety are covered by API-fixture tests. No live accepted attempts were manufactured and no Run/Tests/Save/Submit actions were invoked. Default browser viewport restored. Evidence is under the existing review runtime `evidence/outlined-followup/` (earlier class-layout evidence under `evidence/classroom-followup/`).

Limitations: Group Projects have **No topic** because ProjectTask has no topic relationship in the accepted schema/API. Assigning project Topics requires a separately approved backend/schema change. Student own-work availability continues to follow the existing API rules described in K/L. No independent hidden-state/backend verification is claimed by visual checks.

Resources preserved: original Windows checkout/worktrees, original environment files, existing databases, migrations, Git storage and submission evidence. No schema/migration, dependency, credential, public exposure or deployment changes. No staging, commit, push or merge. Existing uncommitted backend/repository work remains intact. No UI requirement remains blocked except actual Project-topic assignment; the requested label is displayed truthfully.

Review URL: http://127.0.0.1:5197/student (existing local review services). Inspect Classwork's Topic control / View your work, Group Projects, Activity Your work / Attempt history; Instructor Class Info and Group Project navigation. Stop here for Product Owner visual inspection. Do not begin additional features or commit without a separate instruction.

Continuation HEAD: `53ee6d9c8c274bfc6486b802ad01e6e4c788b8d3`. Current status: **29 modified + 13 untracked**, no staged changes. Earlier status blocks are historical snapshots.

```text
 M client/src/App.jsx
 M client/src/activities/ActivityViews.test.jsx
 M client/src/activities/StudentActivityViews.jsx
 M client/src/activities/TopicViews.jsx
 M client/src/activities/TopicViews.test.jsx
 M client/src/classes/ClassStaffPanel.jsx
 M client/src/classes/ClassStaffPanel.test.jsx
 M client/src/classes/ClassWorkflows.test.jsx
 M client/src/components/AccountMenu.jsx
 M client/src/components/AccountMenu.test.jsx
 M client/src/layouts/DashboardLayout.jsx
 M client/src/pages/InstructorPages.jsx
 M client/src/pages/StudentPages.jsx
 M client/src/projects/ProjectViews.jsx
 M client/src/repositories/RepositoryFoundationViews.jsx
 M client/src/repositories/RepositoryFoundationViews.test.jsx
 M client/src/repositories/RepositoryGitViews.jsx
 M client/src/repositories/RepositoryGitViews.test.jsx
 M client/src/repositories/repository-projections.js
 M client/src/submissions/InstructorSubmissionViews.jsx
 M client/src/submissions/StudentSubmissionViews.jsx
 M client/src/submissions/StudentSubmissionViews.test.jsx
 M client/src/work-hub/WorkHubViews.jsx
 M client/src/work-hub/WorkHubViews.test.jsx
 M docs/architecture/FRONTEND_INTEGRATION.md
 M server/src/modules/repositories/repository.repository.ts
 M server/src/modules/repositories/repository.types.ts
 M server/src/modules/work-hub/work-hub.routes.test.ts
 M server/src/modules/work-hub/work-hub.routes.ts
?? client/src/activities/StudentWorkOverview.jsx
?? client/src/activities/StudentWorkOverview.test.jsx
?? client/src/classes/ClassCardGrid.jsx
?? client/src/components/AcademicEmptyState.jsx
?? client/src/components/OutlinedSelect.jsx
?? client/src/components/OutlinedSelect.test.jsx
?? client/src/design/academic-refinement.css
?? client/src/repositories/StudentRepositoryCatalog.jsx
?? client/src/work-hub/InstructorReviewView.jsx
?? client/src/work-hub/InstructorReviewView.test.jsx
?? docs/STUDENT_INSTRUCTOR_REFINEMENT_PROGRESS.md
?? server/src/modules/repositories/repository-projection.test.ts
?? server/src/modules/work-hub/instructor-review-activities.ts
```


## N. Stable panel width and class-layout follow-up

The latest Product Owner requests are implemented in the existing continuation worktree without staging or commits. Instructor Home now contains only Classes; sidebar To Review remains. Both overviews share the compact status/teacher identity presentation without Instructor overview shortcuts. Class Info now has the wide details/compact staff layout, date-only creation fact, aligned archive footer and an archive confirmation overlay. Live archive dialogs were cancelled; no class was archived during visual checking. Mocked tests verify cancellation writes nothing and confirmation calls the existing archive API once.

The remaining wide-screen panel defect was a CSS specificity conflict: legacy :not(...) rules overrode the shared frame below their 1360/1460px caps. The frame selector now outranks those rules. At a 1920x1080 viewport, all four Student/Instructor Activities/Group Projects panels measure identically: left 281, right 1872, width 1591, height 760. Earlier desktop/mobile layout checks cover the split details and stacked staff presentation. Final width proof and the Student outlined project filter screenshot are in the local review evidence folder `evidence/panel-layout-followup/`.

Student Group Projects now reuses OutlinedSelect with Project filter and All projects / Active projects / Closed projects. Existing server lifecycle queries are preserved; this does not change due dates or write eligibility.

Verification: the preceding class-layout changes passed 547 frontend tests in 74 files, lint and build. After the final width/filter correction, only the focused ProjectViews suite (14 tests), one frontend build, diff whitespace check and a bounded 1920px browser comparison were run, honoring the Product Owner request for minimal checking. All passed; the existing >500kB bundle advisory remains. No backend changes or checks were added in these follow-ups. Earlier uncommitted backend work is preserved. The original checkout, database, environment and branch integration are unchanged; all work remains an uncommitted review candidate.


## O. People-tab refinement — 2026-10-22

Both People panels now share the Classwork frame width and viewport-based height, overriding historical People-panel width limits. Student teaching/classmate sections have clearer row dividers and blue avatars. Instructor People removes the Class Roster hero, mascot, descriptive paragraph and three summary counters; a compact toolbar retains join-code/CSV access and opens the existing invitation form in a busy-guarded dialog. Roster data, membership operations and archival guards remain unchanged. Empty rosters have one contextual empty state; populated rows have compact lifecycle chips and responsive field labels.

Minimal verification at the Product Owner's request: 22 tests passed across ClassWorkflows and ClassInvitationViews, including dialog cancellation with no writes; one frontend build passed with the existing bundle-size advisory. Visual review is left to the Product Owner; no browser walkthrough, full regression suite or backend checks were run for this follow-up. All changes remain uncommitted in the existing continuation worktree.


## P. Join-code overlay — 2026-10-22

Manage join code now opens a compact themed dialog from Instructor People, preserving the existing copy/rotate/revoke actions and confirmation behavior. Opening only reads; code mutations keep their deliberate confirmations, and the dialog blocks closing during an active mutation. Inactive code remains hidden, archived guards remain, and the direct route stays compatible. Minimal verification: 16 ClassWorkflows tests and one frontend build passed; the existing bundle-size advisory remains. The new regression covers on-demand loading, revoke cancellation with no write, Escape and trigger-focus restoration. Visual review remains with the Product Owner. No live code was read, copied, rotated or revoked during this follow-up. Changes remain uncommitted.


## Q. Work-hub panel makeover — 2026-10-22

Student To-do and Instructor To Review now share full-width, stable-height panels, aligned spacing, outlined class filters, blue icon tabs and matching controls. Search, list rows, review counts, paging and contextual loading/empty/error cards receive a small Projex-themed refinement. Existing server feeds, URL filters, refresh behavior, due groups, attempt-count units and permissions are preserved. No backend connectivity change is claimed for the network-error screenshots.

Minimal checks: 19 affected tests passed across StudentTodoView, InstructorReviewView and WorkHubViews; one frontend build passed with the existing bundle-size advisory. Native-select presentation assertions were updated for the reused outlined control; endpoint, stale-response, refresh, retry and paging assertions remain intact. No full-suite or browser walkthrough was run; visual review remains with the Product Owner. All edits remain uncommitted in the continuation worktree.
