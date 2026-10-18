# MVP integration preparation — no branches merged

2026-10-18. Status: **VERIFIED — PENDING REVIEW** for stable-contract preparation;
combined integration is **BLOCKED — APPROVAL REQUIRED**.

## Exact independent bases

- Approved Activity baseline: `42666278d7987018cdf24af3499d10e7b84c4e4b`
  (`iteration-2/julius-activity-mvp`; implementation ancestor `4030e86`).
- Group local checkpoint: `9203a2c827e8f68e07e920a8a246d34b6d33af42`
  (`work/julius-overnight-group-mvp`), pending Product Owner review.
- Admin: `codex/julius-overnight-admin-mvp`, same approved Activity base;
  resolve checkpoint SHA through `git log`, not the unreviewed Group branch.

No merge, cherry-pick, rebase, protected-branch change or push was performed.
The primary dirty Julius checkout was not switched or edited.

## Stable workflow coverage

| Boundary | Evidence | Remaining gate |
| --- | --- | --- |
| Admin → Course → prepared offering | New academic-foundation integration test uses Course HTTP contract and existing Class service; join code inactive before assignment | Final Admin product decisions/review |
| Admin → responsible Primary → ACTIVE Class | Same test exercises reasoned/versioned existing staff router; Instructor cannot read before assignment, can after | No new assignment policy assumed |
| Admin invitation → Student acceptance | Same test: preview/confirm creates pending invitation, zero memberships until acceptance; another Student cannot accept | Real-cookie/CSRF covered by existing dedicated integration suites, not this test's injected test actor |
| Instructor → published Activity | Same test: existing activity/test-case services; Admin author denied | No Admin teaching override |
| Student → Activity repository → official attempt | Same test: enrolled Student creates own Activity workspace; outsider denied; repository creation consumes zero attempts; immutable source submission and idempotent replay create exactly one queued job | No Java process/assessment/release is claimed by this queue-only test |
| Admin metadata-only oversight | Same test: safe repository/submission projections, unreleased score null, no source/test/secret/storage key | No source or credential issuance authority |
| Group invitation → shared remote → feature → local merge → review freeze | Group Smart HTTP regression (12 tests), repository PostgreSQL regressions, Developer/Instructor manual read states | Group review and combined branch validation |
| Existing Activity Java/Git/submission behavior | Group full checkpoint 795-test matrix, including unchanged Java/real Git regressions | No claim of hosted isolation, network Git or combined-branch pass |

The new test spans stable APIs/services and real PostgreSQL, not a fabricated UI
success. Its focused router harness uses an injected test actor; dedicated existing
cookie/CSRF regressions remain necessary and passed in the full integration suite.

## Conflict and compatibility review

Compared changed paths with the common base. Group changes repository/project
views, group route wrappers and repository services/tests. Admin changes Admin
views/layout and academic-foundation tests. No production source file overlaps
at this checkpoint. Documentation overlaps in `CODEX_HANDOFF.md` and
`OVERNIGHT_AUTOPILOT_REPORT.md` and must be reconciled deliberately after approval.
Absence of path overlap does not prove runtime integration.

Important runtime contracts to preserve:

1. Activity submission source remains browser source, never repository HEAD.
2. Save/clone/push does not consume academic attempts or submit Group review.
3. Group Maintainer/Developer Git access stays separate from academic staff access.
4. Active Co-Instructor read access follows current Class staffing; removed Class
   members cannot retain source via a repository owner/member shortcut.
5. Admin sees metadata only, including Activity repository filters, not the Group
   Code menu, repository source, private grading drafts or hidden tests.
6. Existing Personal/Class Workspace/Activity repository types keep their routes,
   default branch protection, credential cleanup and immutable academic records.

## Required integration procedure after explicit approval

- Product Owner reviews the two independent checkpoint diffs and pending decisions.
- Name approved exact SHAs and the intended integration destination in a new work
  order. Do not assume `main`, `development/fullstack`, or an Aaron branch.
- Create a separate integration worktree from the explicitly selected approved
  base. Combine only approved SHAs; resolve documentation chronology deliberately.
- Inspect schema/migration diff (none introduced by these two slices); do not apply
  base migrations to normal `projex` without separate authorization.
- Run client/backend lint/types/build/unit checks and guarded PostgreSQL, real Git,
  Smart HTTP and Java suites sequentially whenever they share mutable fixtures.
- Recreate disposable role fixtures after database suites; verify both paths on
  desktop/390 with current primary/co/member/removed/metadata-only roles.
- Review diff, secrets, projection boundaries and current Git state before any
  separately authorized commit/push/merge. No deployment or network exposure.

No synthetic merge result, temporary integrated branch or combined-pass claim is
created here. The independent checkpoints and this plan preserve reviewability.
