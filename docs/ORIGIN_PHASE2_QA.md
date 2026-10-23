# Origin Phase 2 verification — 23 October 2026

Source fetched and verified: `fix/origin-final-pass` at `97c0f5a39899b765e0596724ed5a6b1a4f9deef5`.
Worktree: `origin-phase2-polish`; publish branch: `ui/origin-phase2-polish`.
Branch: https://github.com/wefllagn/Projex/tree/ui/origin-phase2-polish

## Screenshot reconciliation

| Attachment | Implemented result |
| --- | --- |
| 1 | Account-switch actions share a full-width grid, equal alignment and consistent gap; primary switch and quieter continue action retain the login composition. Browser measured equal 412.48px widths, equal left edges and a 10px gap. |
| 2 | Class Overview uses the passive surface instead of activated metal fill. Content, size and placement remain. |
| 3 | Sidebar keeps the approved control material; only the query-selected Class receives current styling. Fixed pathname-only NavLink selection that marked multiple Classes current. |
| 4 | Existing approved login segmentation retained; equivalent workspace segmented controls reuse edge/elevation and short transitions. |
| 5 | Existing toolbar dimensions/hierarchy retained; shared control focus, hover and press treatment applies. |
| 6 | Activity rows use quiet default, subtle hover, visible keyboard focus and inset press feedback. |
| 7 | Group Project rows share Activity row states; comparable To-do, To Review, attempt and repository rows use the same tokens. |
| 8 | Shared Class badge component frames the existing initial in the sidebar and Class cards, retaining size and positioning. |
| 9 | Dark badges use the same component and theme-adjusted frame/material contrast. |
| 10 | Student/Instructor Class headings use the shared badge with their existing size class. |
| 11 | Shared fixed-color neutral SVG avatar, two explicit local silhouette assets and solid theme-dependent circular background. No inferred gender or upload feature. |
| 12 | Instructor People rejects incomplete role projections, guards undefined strings, and offers safe recovery. Global component/route failures use branded blocking recovery; session changes have separate contextual recovery. |

See `design/ORIGIN_PHASE2_STANDARDS.md` for all five named standards and their actual source locations. Other changed components include AuthProvider, API client, ProtectedRoute, AppDialog, LoginPage/OriginLogin, AccountMenu, DashboardLayout, ClassCardGrid, StudentWorkOverview, Student/Instructor pages and InstructorSubmissionViews. Static landing showcase identities now use Frank Ocean and Tony Stark; academic accounts, emails and Git history are unchanged.

## Executed checks

Final frontend: **87 files / 688 tests passed**, including shared authentication, Admin, classes, activities, submissions, Java workspace and repository UI suites. Frontend lint and production build passed. Existing bundle-size warning remains (approximately 939KB minified JS); no dependency or bundling project was added.

Backend: **51 files / 421 unit tests passed**. Server lint, build, normal TypeScript check, integration-test TypeScript check and Prisma validation passed. The client remains JavaScript/JSX and has no standalone type-check script. Database-backed integration, Java execution and Git transport suites were not rerun; backend source/schema/transport were not changed.

Automated Test 9:

| Check | Executed evidence |
| --- | --- |
| 1. Invalid login | LoginPage tests and real-browser invalid credentials; fixed safe copy, password cleared. |
| 2. Empty login | Required form test and browser constraint validation; no login request. |
| 3. Required fields | ClassWorkflows nonblank Class Code test and browser empty New Class form; no Class created. |
| 4. Disabled explanation | Submission-review test and browser: score 100 exceeds automated maximum 80 with a specific explanation; score 70 plus valid reason enables the action. |
| 5. Input retained | Failed Class save test, correction validation test, same-account focus/code test; browser Class draft and correction reason retained after validation. |
| 6. Unavailable route | UnavailablePage test and real unknown URL; real Back to Origin action verified. |
| 7. Friendly errors | Component/Router boundary tests and disposable browser exception fixture; technical sentinel, TypeError and framework crash text absent from rendered body. |

QA-002/003: unit tests and two real same-profile browser tabs verified Student → Instructor, Instructor People → Student, Admin → Instructor, and external logout. Previous private content was absent from the DOM/accessibility tree, interactions blocked, and continuing reached the current account's actual dashboard. Successful People reload used the full permitted roster. API tests discard stale private responses, avoid stale refresh/replay and report access denial before and after refresh.

QA-005: real-browser Student credentials on Instructor login stayed on the mismatch choice; intentional continuation reached Student. Unit tests cover Student, Instructor and Admin wrong-workspace choices, failed logout retry, and existing shared Admin/Instructor entry. No backend role changes/elevation.

Real browser smoke: landing, both login entry states, account-switch alignment, Student/Instructor dashboards and Class badges, Overview, People, Activity and Group Project lists, To-do, To Review, submission review/tools, repository list/code and the Java workspace with existing splitters. Light/dark Class cards, Overview/account avatar and controlled neutral/male/female avatars were inspected and captured. Activity and Group Project hover differs from persistent sidebar selection; default rows are quiet. Existing loading/success/failure UI suites passed.

Controlled exception pages were temporary ignored local fixtures and are excluded from commits and the production build. Presentation services were never fault-injected.

## Open functional requirements and limits

- **QA-001 remains functionally open.** The observed 100-versus-80 case is explained and valid 70 input enables the button in browser and unit tests. No correction was recorded in the browser; this does not establish a fix for every reported submission/persistence case. Functional follow-up must reproduce the original case with a valid automated score, record/reload a correction and confirm audit/release behavior. Backend business logic is unchanged.
- **QA-004 remains open for activated-account recovery.** Admin User Detail → Account setup already exposes Generate new setup link for `SETUP_PENDING`. `admin-api.js` calls the existing provisioning `resendSetup`, whose service rejects activated accounts with `ACCOUNT_NOT_SETUP_PENDING`. An active-account recovery backend and its confirmation/expiry/error flow are still required. No misleading extra button was added. Place eventual recovery beside Account setup, use the existing confirmation dialog, keep failures inline/retryable and success nonblocking; never expose a token in routine notices/logs.
- Responsive browser override calls for 780px and 390px did not change the actual 2104px viewport, including after reload/new tab. Narrow-screen browser visuals are **unverified**. Existing mobile navigation tests (including query-current selection) passed; the temporary override was reset. A physical narrow-window browser pass remains before claiming complete visual acceptance.
- Reduced-motion CSS overrides are implemented; an OS-level reduced-motion visual pass was not executed. No comprehensive accessibility, penetration, deployment or backend workflow certification is claimed.

## Isolated preview and preservation

Review URL: **http://phase2.localhost:5202/**. Separate API on loopback port 3026, PostgreSQL cluster port 55494/database `origin_phase2_review`, separate restricted application role, managed Git storage, jobs and private credentials. Restore used the verified paired pristine Origin backup; all 28 existing migrations matched. No new migration/reseed was applied to either presentation.

The distinct `phase2.localhost` hostname prevents host-only auth-cookie collisions with `127.0.0.1:5198` and `localhost:5196`. Both original frontends returned 200 and both APIs reported healthy databases after QA. All **198** fingerprinted presentation credential/script/managed-Git files were unchanged. This work sent authentication and test interactions only to the isolated preview; original services were neither stopped nor reset, and no original academic or Git records were changed.

Private runtime/evidence stays outside Git in the sibling `origin-phase2-review` directory. Screenshots include role mismatch/session change, safe People, passive Overview light/dark, Class cards light/dark, Activity/Project hover, account-switch alignment, avatar variants light/dark, correction-ready state and controlled recovery. User attachments supply the before references. No credentials, cookies, database URLs, storage or generated runtime files belong in the branch.

**ORIGIN PHASE 2 — PARTIAL**: implemented changes and executed regressions pass; narrow-screen visual acceptance and the explicitly retained functional follow-ups above remain.
