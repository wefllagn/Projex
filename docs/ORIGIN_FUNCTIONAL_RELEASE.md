# Origin functional release candidate

Branch: `release/origin-functional-completion`

Approved base: `ui/origin-phase2-polish` at `2f5831ef8a3f8cc98acd66127e0158e28a2f8ae5`

Verification date: 2026-10-24 (Asia/Manila; regression runs on October 23–24)

Status: **ORIGIN FUNCTIONAL RELEASE CANDIDATE — VERIFIED**

This is a functional release candidate for deployment security review. Azure deployment, production security approval and branch integration have not been performed.

## Delivered scope

| Requirement | Result | Evidence |
| --- | --- | --- |
| QA-001 overall automated-score correction | Verified existing capability; original results and append-only correction ledger retained | Bounded correction, reason, reload, multiple corrections, stale versions and release locks in submission integration suites |
| QA-006 unsaved release protection | Completed | Preview uses persisted points; unsaved points, rubric awards, feedback or an unrecorded correction block release and its confirmation |
| Instructor rubrics | Completed | Draft allocation validation, frozen published criteria, submission snapshots, per-criterion review and immutable released result |
| Grading-period Gradebook | Completed | Prelim/Midterm/Final and explicit Unassigned; released credited attempt only; server-side Class/Student authorization |
| QA-004 activated-account recovery | Completed | Admin-only issuance, one-hour expiry, replacement, single use, session revocation, safe audit, private copy control |
| Activity icon | Completed | Existing outline Activity icon inside a restrained transparent bordered frame; Group Project icons unchanged |
| Protected demonstrations | Preserved | 293 protected file hashes unchanged; all three environments healthy on their original 28 migrations |

## Grading model and compatibility

The scoring model remains `final = effective automated points + saved Instructor points`.

Automated maximum is the sum of visible and hidden test-case point weights. Instructor maximum is Activity total minus that automated maximum. Passing test cases award their configured points; rubric criteria do not replace test cases.

A new Activity authored through the UI starts with explicit rubric configuration. Drafts can be incomplete while test cases are being authored. Publication requires a period and an exact allocation of all remaining Instructor points. Criteria have stable IDs, names and positive point maxima, with at most 20 criteria and two decimal places. A zero remaining Instructor maximum permits an empty rubric.

Published rubric criteria, grading period, total points, grading mode, test rules and credited-attempt policy remain frozen through the existing publication rules. Each official submission stores the configured rubric independently of the Activity. Review saves every criterion award and calculates the aggregate Instructor score on the server. Award bounds, complete criterion coverage and matching aggregate values are validated.

Switching a draft to Ungraded clears numeric rubric configuration; feedback-only review and release remain functional. Decimal point validation uses the same tolerance as the backend. Test-weight sums use exact Decimal arithmetic on the server and integer cents in the UI; 0.10 + 0.20 is verified through publication, release and Gradebook as 0.30. Legacy Activities with a null rubric retain aggregate Instructor points. Existing published Activities remain Unassigned rather than receiving an assumed period. Older API clients that omit rubric configuration retain the aggregate workflow. No existing score, submission, published rule or release history was backfilled or rewritten.

Review drafts retain the latest saved criterion values and feedback. Automated corrections retain the existing separate append-only history, including original score, previous effective score, new score, reason and author. After release, review and correction APIs reject edits. The saved rubric breakdown remains readable in Score breakdown.

The release preview always uses persisted values. Unsaved review/feedback/criterion changes or a proposed correction prevent release. Saves, corrections and release retain `expectedUpdatedAt` optimistic concurrency checks and transactional row locking. Concurrent same-version reviews produce one accepted save and one stale-version rejection. A stale UI reload preserves the local draft and explains that the latest server version must be reviewed before saving again.

### Actual verified example

The isolated browser Activity had 100 total points, one 70-point automated test and one 30-point readability criterion. The real Java worker awarded 70. An Instructor recorded a reasoned correction to 65 and awarded 26/30 for readability. Reload showed original 70, effective 65 and saved Instructor 26. Release produced **91/100**. The Student saw no numeric result before release and 91/100 after release; both Gradebooks showed 91%.

The integration fixture also verifies two criteria awarded 8/10 and 18/20, with the same 26-point Instructor total. Invalid per-criterion awards and post-release edits are rejected.

## Gradebook calculation

Only published or previously published Activities in the chosen period are listed. Authorized primary/co-Instructors see active enrolled Students; an active Student sees only their own row. Outsiders cannot read a Class Gradebook, and a Student cannot request another Student through a query parameter.

The existing `selectCreditedReleasedAttempt` function selects the latest released attempt for LATEST, or the highest released score for HIGHEST, with a later-attempt tie break. An unreleased higher or later attempt cannot replace a released grade.

Each Student's total is the sum of earned and possible points from their credited **released graded** results. Possible points come from the selected submission's frozen total. The percentage is `earned / possible × 100`, rounded to two decimal places. No released denominator means no percentage. Missing, not submitted, pending, unreleased and ungraded work is explicit and excluded from numeric totals.

Verified example: released 90/100 and 45/50 yield **135/150 = 90%**. A later 99-point unreleased attempt is excluded. Completion Activities do not contribute numeric points. This is an Activity score summary, not an official university course grade.

## Password recovery

Admin User Management exposes Generate password recovery link for ACTIVE Student and Instructor accounts. The existing confirmation, sensitive-link dialog, copy/manual-copy behavior and account setup form are reused. Pending-account setup continues to use its existing workflow. Admin accounts and inactive accounts are excluded from this recovery operation.

Issuance requires authentication, active Admin role and CSRF protection. The opaque token is returned once in a fragment link, stored only as a hash, and expires after one hour. New issuance invalidates earlier outstanding recovery links for the account. Redemption enforces the existing password policy, atomically claims the token, preserves identity/status/academic data, revokes existing refresh sessions and invalidates other outstanding tokens. Authenticated requests using an existing access token fail after revocation because session state is checked server-side.

A login already verifying the old password cannot create a session after a reset: session creation atomically rechecks the verified password hash while holding the User row lock. A deterministic integration test verifies rejection of that in-flight old login and successful login with the new password.

The fragment is removed from the address bar and retained only in memory while needed. Invalid/expired/replaced/used links explain how to obtain a new link. Temporary recovery failures allow retry without losing the in-memory token. Password fields are cleared after a request. Passwords and raw recovery tokens are absent from ordinary logs and audit metadata.

Persistent issuance audit uses `USER_PASSWORD_RECOVERY_ISSUED` with expiry only. Token `usedAt` and `passwordChangedAt` retain redemption evidence; structured completion logs record session revocation without a secret. Audit filtering and the existing detail view show the safe expiry metadata. No email service was introduced, and generating a link does not itself change the password or end sessions.

## Database and API changes

One additive migration: `20261023000000_origin_functional_completion`.

- `programming_activities`: nullable `grading_period`, nullable JSONB `rubric_criteria`.
- `activity_submissions`: nullable JSONB `rubric_snapshot` and `rubric_scores`.
- `account_setup_tokens`: `purpose`, default `ACCOUNT_SETUP`, also permitting `PASSWORD_RECOVERY`.
- `AdminAuditAction`: `USER_PASSWORD_RECOVERY_ISSUED`.
- Constraints validate allowed period/purpose values and JSON array containers. Service/schema validation checks criterion structure, point precision, allocation and awards.

Existing Activity create/update endpoints accept `gradingPeriod` and `rubricCriteria: [{ id, name, maximumPoints }]`. Existing review PUT accepts `rubricScores: [{ criterionId, points }]`; rubric reviews require complete awards, and any supplied aggregate must match their server-calculated sum. Existing automated correction and release endpoints retain their contracts.

New routes, beneath `/api/v1`:

| Method | Route | Access |
| --- | --- | --- |
| GET | `/classes/:classId/gradebook?period=PRELIM\|MIDTERM\|FINAL\|UNASSIGNED` | Authorized Instructor or own enrolled Student; no-store |
| POST | `/users/:userId/password-recovery` | Active Admin + CSRF; strict body; rate limited; no-store |
| POST | `/password-recovery/complete` | Valid single-use token + password policy; rate limited; no-store |

### Source ownership

- `server/src/modules/activities/activity-grading.ts`: `rubricCriteriaSchema`, `rubricAllocationValid`, `awardedRubricPoints`.
- `activity.repository.ts`: publication allocation checks; `activity.service.ts`: `publishedFieldViolation`.
- `server/src/modules/submissions/submission.repository.ts`: submission rubric snapshot, `saveReview`, existing transactional correction/release behavior; `submission.service.ts`: Instructor projection.
- `client/src/submissions/InstructorSubmissionViews.jsx`: `saveReview`, persisted preview, dirty-state guards, criterion fields and released breakdown.
- `server/src/modules/gradebook/gradebook.ts`: `readGradebook`, `createGradebookRouter`; `submission-credit.ts`: existing credited-attempt selection.
- `client/src/gradebook/Gradebook.jsx`: period selection, table, totals, retry and aborted-request handling.
- `server/src/modules/password-recovery/password-recovery.ts`: `createPasswordRecoveryService`, `createPasswordRecoveryRouter`.
- `server/src/modules/auth/auth.repository.ts` and `auth.service.ts`: atomic verified-credential check during login session creation.
- Account setup/provisioning and Admin projections now distinguish token purpose, preserving initial setup lifecycle reporting.
- `client/src/activities/ActivityGrading.jsx`, `AdminViews.jsx`, `AccountSetupPage.jsx`: existing Origin form/dialog standards.

## Isolation, migration and recovery evidence

All writes, migrations and test cleanup ran on the dedicated loopback RC cluster at port 55496, with separate app/test roles, databases, managed Git, worker roots and credentials. Regression cleanup was guarded to the recognized `projex_test` database on that cluster. Original ports 5198, 5196 and 5202, their service sets and storage were not modified or restarted.

The verified paired presentation backup was restored into unused disposable databases. Applying migration 29 preserved every original row and column across all **40 original application tables**. Legacy new fields remained null. A fresh pre-migration restore returned migration state 28 and identical original values.

After the browser workflow, only RC services were stopped to make a quiescent paired backup. Restoring that backup into a fresh RC database preserved all **41 tables including migration metadata**, the released 91-point rubric result and its correction evidence. The paired managed Git archive restored all three repositories and passed full Git fsck. RC services were restarted successfully.

Recovery is a fresh paired restore, not a destructive down migration. Before deployment, take and verify a current matching database/Git backup. Once new academic writes occur, prefer a forward repair; restoring a pre-feature backup would discard those newer writes and is not an acceptable silent rollback.

Sanitized evidence is in `docs/evidence/origin-functional/`: `migration-recovery.json`, `feature-backup-recovery.json`, `preservation-after.json` and `regression-results.json`. Private runtime files, raw tokens, credentials, database dumps and managed repositories are outside Git.

## Regression results

| Suite | Files | Passing tests |
| --- | ---: | ---: |
| React/frontend | 89 | 700 |
| Backend unit | 52 | 424 |
| PostgreSQL integration | 26 | 134 |
| Git workflows | 4 | 48 |
| Git Smart HTTP | 1 | 12 |
| Java runner/interactive console | 4 | 36 |
| **Total** | **176** | **1,354** |

Frontend/backend lint, server and integration TypeScript checks, Prisma validation and both production builds passed. The frontend retains its existing large-bundle warning; no dependency upgrades or build-system redesign were made.

Automated suites cover legacy graded/completion Activities, test cases, real Java worker assessment, correction history, review persistence, concurrency, final release/privacy/locks, attempt-credit policy, Class authorization, rubric allocation/awards, Gradebook exclusion and aggregation, setup/recovery expiry/replacement/single-use/session behavior, account switching, graceful recovery, Git branch/commit/fast-forward merge and transport.

Live isolated browser checks additionally covered Instructor authoring/publication locks, Student and Instructor Class navigation, Scanner input/output, Run Visible Tests, Save to Git, official Submit, per-criterion review, unsaved release blocking, correction reload, final release, Instructor/Student Gradebooks, Admin core screens/recovery issuance/audit filtering, light/dark rendering and keyboard IDE resizing. Desktop and narrow Gradebook rendering were inspected; the table scrolls horizontally at narrow widths.

Screenshot evidence includes Activity icons in both themes, rubric authoring, Scanner output, unsaved release blocking, corrected review, both Gradebooks and token-free recovery confirmation/audit. The before icon is the Product Owner's supplied Screenshot A; no screenshot containing a raw recovery token was saved.

## Preserved design and deployment handoff

The approved Phase 2 base was fetched and verified. Its branch/HEAD and existing uncommitted work were retained. Landing/login styling, animations, avatars, Class identity badges, workspace/IDE/Git layouts and existing error/session recovery components were not redesigned. Added controls use the existing Origin form, tab, table, button and dialog treatments. The sole new visual refinement is the requested Activity outline icon container.

There are no known incomplete requirements in this functional sprint. Deliberate limits are: legacy published grading rules remain frozen/Unassigned, review drafts retain their latest saved rubric awards rather than a new rubric-edit ledger, no email delivery, no rubric scales/templates/analytics, and no university course-grade formula.

This branch is ready for a deployment security review. Before Azure deployment: review authentication/recovery threat handling and operational rate limits; verify TLS, secure cookies, trusted proxy, secrets and backup retention; provide and validate production-safe Java/Git worker isolation (the existing production guard rejects local-process execution); rehearse the approved migration and paired recovery on Azure staging; then obtain deployment approval. The Mac local-process runtime is functional test evidence, not production isolation approval. No Azure deployment or merge to main/development was attempted.
