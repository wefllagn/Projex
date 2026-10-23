# Origin final functional development handoff

Date: 2026-10-24 (Asia/Manila). Status: **implementation and local verification complete; Product Owner Manual Acceptance Testing is next.**

Branch: `codex/origin-final-functional` in `wefllagn/Projex`.

Verified source checkpoint: `589da229df0419e049c922233282ee1ad2d2b1be`. The later documentation checkpoint contains this handoff and evidence. No merge or Azure deployment was performed.

## Preview and manual testing

Open **http://final.localhost:5206/** on this Mac. API: `final.localhost:3030`. This is a separate runtime/database/storage and uses a separate host-only session cookie from the four protected previews.

Use the existing fictional review accounts. Their credentials are in the local, untracked `origin-final-functional-review/private/accounts.json`; never publish that file. The additional fictional roster is in `private/manual-class.json`. All 47 QA Learner accounts use the existing preview Student password; these are disposable local accounts, not pilot credentials.

Suggested checks:

1. Instructor → create a new Activity. Confirm default 70/15/10/5 allocations. Customize percentages if desired; all four must total 100%. Select Prelim/Midterm/Final before publishing.
2. Save the draft; add visible/hidden Java tests with Normal/High/Very High importance. Origin calculates points; save Activity allocation changes before saving tests.
3. Student → submit; Instructor → review. Correct aggregate Correctness through Tools & history with a reason, award the other three criteria, save, reload and release. Unsaved changes block release; released reviews and corrections lock.
4. Computer Programming 1 → Gradebook → Alex Morgan. Two released Prelim Activities show **182/200 · 91% · 2/2 released**. Midterm/Final show no released grade; historical Unassigned remains available.
5. **Final QA · Programming Lab (48 Students)** contains 48 enrolled fictional Students and 15 published new-model Activities, five per period. It starts without fabricated released grades. Exercise 2 in each period is worth 50 points; exercise 5 uses Highest released attempt. Other exercises use Latest released attempt. Alex is enrolled and can submit normally.

The browser-created **Final verification · Weighted Scanner** is already released at 91/100; it is deliberately locked. Use another Activity or create a draft to test editing. These records exist only in the new preview.

## What changed

### Rubric-first grading

New Activities created through the current UI carry `gradingConfiguration.version = 1`:

| Criterion | Default allocation | Awarded by |
| --- | ---: | --- |
| Correctness | 70% | Existing Java test-case assessment, with the existing reasoned Instructor correction |
| Readability | 15% | Instructor criterion award |
| Organization | 10% | Instructor criterion award |
| Documentation | 5% | Instructor criterion award |

Percentages support two decimal places. Correctness must be positive; manual criteria may be zero and then require no award. Total points retain the existing 0.01–1,000 bounds. Published rules freeze through existing lifecycle checks; no templates, grading scales or rubric designer were added.

Normal/High/Very High use internal weights **1:2:3**. Integer-cent largest-remainder allocation distributes the Correctness budget exactly; ties follow saved case order. The same method derives criterion maxima from percentages. Every positive allocation/test must receive at least 0.01 point, otherwise validation explains that the total or allocation must increase. Reordering a draft may move a rounding cent; publication freezes the resulting points.

Draft allocation, total or mode changes recalculate stored test points atomically with the Activity version check. Test replacement also requires the latest Activity version. Official submissions snapshot the versioned configuration, manual criteria, total and test maxima. Correctness is not duplicated as a manual criterion.

Final score remains **effective automated Correctness + persisted manual awards**. Original engine results and the append-only correction ledger remain intact. Individual manual awards may change before release; saved drafts retain the latest values. Existing concurrency controls, immutable release evidence, privacy and unsaved-release protection remain in use. Release arithmetic now uses exact Decimal addition, fixing the `0.10 + 0.20` edge case; the preview uses integer cents. No existing released grade is recalculated.

**Actual browser verification:** total 100; tests Normal/High/Very High derive **11.67 + 23.33 + 35 = 70**. Real Java passed all tests. Instructor corrected original 70 to effective 65 with a reason; manual awards 12/15 + 9/10 + 5/5 = 26. Reload and release produced **91/100**. An unsaved award change kept the saved preview at 91 and disabled release. The Student saw no numeric draft grade, then 91 and released feedback. Editing locked after release.

### Compatibility decisions

All existing Activities, **including drafts**, keep NULL configuration and their original manual per-test allocation/custom rubric or aggregate Instructor workflow. None are converted. Older API clients that omit configuration keep that legacy contract; new UI authoring explicitly supplies version 1. An existing Activity cannot switch grading models. New Ungraded drafts retain their version marker for a later switch to Graded, but have no numerical awards. The UI saves default configuration when selecting Ungraded; customize again after switching back if needed.

Read-only comparison against the isolated pre-migration copy confirmed all original values across 9 Activities, 18 test cases, 4 submissions, their assessment results, feedback and correction records remained unchanged after the new browser workflow. The 9 legacy Activity configurations remain NULL.

### Student-centered Gradebook

The Instructor overview has Student rows and Prelim/Midterm/Final columns. Student links open all their Activity records grouped by period, including Unassigned, with Activity queue/review navigation and separate credited-result navigation when another attempt exists. Students automatically see only their own records; server authorization also rejects foreign Student IDs and unauthorized Classes.

Only credited **released graded** results contribute earned and possible points. Possible points come from the credited submission's frozen maximum. Latest uses the latest released attempt; Highest uses the highest released score with the existing tie-break policy. A draft/new attempt does not displace released evidence. Relevant outstanding attempts keep the summary provisional and remain accessible for review.

Example: **90/100 + 45/50 = 135/150 = 90% · Provisional · 2/5 released**. Missing, not submitted, pending, failed assessment, awaiting review and reviewed/unreleased are distinct. They do not silently become zeroes. A genuinely released 0/100 contributes 0%, unlike an absent grade. Ungraded work has status but no numeric contribution. No released denominator means no percentage.

Coverage counts all applicable published or previously published graded Activities in that period, including retained archived history. It is not a due-to-date filter or an official SLU course grade. No course formula, period weights, export, sorting, paging or advanced analytics were added. The 48-Student scenario is verified; much larger cohorts are outside this pass.

### Aaron's contribution

Integrated only **`a0907b47e6700ab4747ac51ae2ba55ee4eb8a56a`**, via `git cherry-pick -x`, as `376a191c7aaa01bb2fac8501ffa759d3733ad2e5`. Aaron Ysuay's authorship and original commit reference are preserved. It attests the connected restore target's real database identity and port rather than trusting a supplied connection description. The actual changes were compatible and passed 55 focused safety tests, also included in the full backend suite. No whole-branch merge or artificial contribution commit was made.

Admin deletion/archival was **not implemented**. Existing setup/recovery and Admin behavior were preserved and covered by regressions.

## Database, API and source ownership

One additive migration: **`20261024000000_rubric_first_grading`** (migration 30).

- `programming_activities.grading_configuration`: nullable JSONB, object constraint.
- `test_cases.importance`: nullable VARCHAR(16), restricted to NORMAL/HIGH/VERY_HIGH.
- `activity_submissions.grading_configuration_snapshot`: nullable JSONB, object constraint.
- No backfill, new table, historical grade rewrite, authentication schema change or Admin deletion field.

Existing Activity create/update accepts optional versioned `gradingConfiguration`. New-model tests accept `importance`; numeric test points are server-derived. Legacy tests retain `points` and reject new importance semantics. Existing submission review, correction and release routes retain their contracts.

New GET routes under `/api/v1`:

- `/classes/:classId/gradebook/overview`
- `/classes/:classId/gradebook/students/:studentId`

Both require active authorized membership/teaching access, reject unexpected query parameters, and use `Cache-Control: no-store`. The existing period Gradebook endpoint remains as a compatibility projection. The query loader uses a repeatable-read transaction and batched roster, Activity and submission queries.

Key files/functions:

- `server/src/modules/activities/weighted-grading.ts`: `gradingConfigurationSchema`, `distributePoints`, `configuredAllocation`, `configuredTestPoints`.
- `activity.repository.ts`: derive/recalculate draft rules atomically; `activity.service.ts`: preserve model and publication immutability.
- `server/src/modules/test-cases/test-case.repository.ts`: derive persisted maxima during versioned replacement.
- `server/src/modules/submissions/submission.repository.ts`: snapshot configuration and exact release addition; `submission.service.ts`: authorized Instructor projection.
- `server/src/modules/gradebook/gradebook.ts`: `loadGradebook`, `buildScores`, `summarize`, `readGradebookOverview`, `readGradebookStudent`, compatibility `readGradebook`, routes.
- `client/src/activities/weighted-grading.js`, `ActivityGrading.jsx`, `InstructorActivityViews.jsx`, `activity-utils.js`: defaults, allocation/importance controls and validation.
- `client/src/gradebook/Gradebook.jsx`: period overview, Student drill-down, status/coverage, refresh/retry and stale-request protection.
- `client/src/submissions/InstructorSubmissionViews.jsx`: Correctness explanation, existing correction tools, exact saved preview and release locks.

## Verification and recovery

| Suite | Passing files | Passing tests |
| --- | ---: | ---: |
| Frontend | 90 | 709 |
| Backend unit | 54 | 447 |
| PostgreSQL integration | 27 | 138 |
| Git workflows | 4 | 48 |
| Smart HTTP | 1 | 12 |
| Java runner/interactive console | 4 | 36 |
| **Total** | **180** | **1,390** |

Frontend/backend lint, backend/integration type checks, Prisma validation, both production builds and the isolated local runtime preflight passed. The existing frontend bundle-size warning remains. New database tests cover weighted real Java, hidden-test privacy, snapshots, correction/criterion/release locks, precise decimals, draft mode changes, stale writes, legacy-model rejection and a 48-Student × 15-Activity Gradebook with statuses, 135/150 totals, released zeroes, attempt policies and authorization. Existing suites also exercise authentication, setup/password recovery, sessions, Java Scanner, Git transport/branch/commit/fast-forward operations and legacy academic workflows.

Live browser checks additionally covered new Activity defaults/publication, all three importance levels, Java Scanner input/output, visible tests, Save to Git, official Submit, correction persistence, criterion review persistence, unsaved release blocking, immutable release, Student visibility, overview/drill-down links, 48-row rendering and light/dark themes. At 390px the page remains 390px wide and the table is contained in its horizontal overflow region; its columns retain a readable minimum width.

All migration/write testing used the dedicated **55498** cluster and separate app/test roles, databases, Git storage, Java jobs and signing secret. The verified RC paired backup seeded this environment without touching its source. Migration 30 preserved every old row/column across 40 application tables; legacy new fields remained NULL. A separate pre-migration restored copy remains available on migration 29.

After the real grading workflow, only the new four-process preview was stopped. A matched database/Git/private-runtime backup was created, checksummed and restored into fresh unused resources on the same isolated cluster. **All 41 tables matched**, including metadata; both the inherited and new weighted 91-point released results survived, configuration version 1 survived, and all **4 Git repositories passed full fsck**. The preview restarted healthy. Raw backups, credentials and full row fingerprints stay outside Git.

Recovery uses a fresh paired restore, not a destructive down migration. Never replace a database containing newer academic writes with a stale pre-feature backup; prefer forward repair or a separately approved recovery decision.

Sanitized evidence and screenshots are in `docs/evidence/origin-final-functional/`.

## Design and protected environments

Source/worktree discovery was repeated before implementation. The reconciled RC **`5bc86d00f417ae6e081b9e3f119f4cdf90911166`** includes the exact later Phase 2 working-tree polish and the approved landing refinements. The preserved Phase 2 dirty worktree and design handoff changes were accounted for; no competing unique UI delta was discarded.

All **363 unchanged client files** match that reconciled RC, including every CSS file, landing/login, themes, animation, avatars, Class badges, IDE, Git layouts and error/session components. New controls reuse existing Origin styles and components. No design asset, dependency, new language, repository workflow or unrelated UI change was introduced.

All **5,181 protected source/private-runtime/Git file fingerprints**, plus original worktree HEAD/status states, matched at completion. Projex 5196, Origin 5198, Phase 2 5202 and RC 5204 all remained healthy on their original 28/28/28/29 migrations. No writes, migration, reset, cleanup, restart or credential change was performed against those environments. Active PostgreSQL clusters were not compared byte for byte; the preservation evidence is file/Git comparison, source/operation isolation, original migration counts and health checks.

## Before Azure pilot

The branch is ready for Product Owner manual acceptance and a deployment security review, **not Azure deployment approval**. Remaining gates:

1. Product Owner accepts the two final workflows and freezes the release.
2. Review authentication/recovery, authorization and operational limits for the intended pilot.
3. Supply and verify production-safe Java/Git execution isolation. This Mac uses controlled local-process workers; existing production configuration explicitly rejects that mode.
4. Verify Azure staging secrets, TLS, secure cookies, proxy/CORS settings, persistent storage, worker permissions and backup retention.
5. Rehearse migrations and matched database/Git recovery on staging, then obtain explicit deployment approval.

There are no known incomplete approved features from this pass. Deliberate limits are the compatibility/rounding rules above, latest saved manual rubric awards rather than a separate award-edit ledger, no official course-grade formula, and deferred Admin deletion. Public/pilot security and scale are not proven by local functional tests.
