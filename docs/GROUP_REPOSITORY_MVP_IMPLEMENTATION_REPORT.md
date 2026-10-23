# Group Repository MVP implementation report

Status: **IMPLEMENTED — PENDING PRODUCT OWNER REVIEW** / VERIFIED — PENDING REVIEW.
Date: 2026-10-18. Local checkpoint branch: `work/julius-overnight-group-mvp`.
Approved Activity base: `42666278d7987018cdf24af3499d10e7b84c4e4b`.
No Product Owner acceptance, push, merge or deployment is implied.

## Outcome and locked decisions

Reused Class → ProjectTask → Team → CLASS_PROJECT. Student-led creation and
invitations remain approved. One Maintainer maps to Team LEAD / repository OWNER;
Developers map to MEMBER. Instructor and active Co-Instructor retain read-only
Git plus existing academic review. Admin remains metadata/operations only.
No new role, authority, schema, migration or membership-transfer policy.

## Implementation

- Current backend group-context projection supplies safe academic identity,
  current teaching staff, active member count and effective capabilities. Git
  permissions reuse the existing evaluator; response never exposes internal
  access records, paths or secrets.
- Student catalog and detail eligibility agree: active Class membership is
  required; removed repository members and former Class-member owners cannot
  bypass access through ownership. My Group and other Class metadata are distinct.
- Project-specific invitation inbox and My Group entry reuse existing services;
  no duplicate Create Group when already a member. No Instructor assignment UI.
- Group-only Code-first detail offers Code, Commits, Branches, Members, Activity;
  academic Class/project/deadline/state context remains visible. Branch tip and
  bounded source/diffs are real inspection results. Main is labelled protected.
- README is exact-commit bounded plain text, never rendered HTML/Markdown.
- Code rechecks live backend capabilities and automatically requests READ or
  READ+WRITE. Secrets stay in component memory, clear on close/unmount/expiry or
  authority change, and late asynchronous results cannot restore them. Unchanged
  background refresh does not unexpectedly close the menu. Clipboard persistence
  is explicitly disclosed; clone URLs contain no embedded credentials.
- Instructor review and feedback use existing backend mutations. Source/transport
  authorization remains server-owned. Ready-for-review freezes writes; no Git
  action creates an Activity academic submission.
- Existing Activity, Personal and Class Workspace workflows remain separate.
  No changes to Java workers, Git hooks/evaluator, dependencies or Prisma schema.

## Actual automated verification

| Check | Files | Passing tests |
| --- | ---: | ---: |
| Client full `npm test -- --reporter=dot` | 52 | 352 |
| Server unit `npm test -- --reporter=dot` | 41 | 285 |
| Guarded PostgreSQL `npm run test:integration` | 22 | 110 |
| Real Git `npm run test:git` | 2 | 10 |
| Smart HTTP `npm run test:smart-http` | 1 | 12 |
| Java `npm run test:java` | 3 | 26 |
| Total (not counting repeated focused checks) | 121 | 795 |

Client and server lint/build and server type checks passed. Integration test
TypeScript validation passed. Final Instructor explanatory-copy correction
passed ProjectViews focused regression (6 tests). `git diff --check` passed.
Client bundle-size warning remains; one existing Activity fixture prints a
missing-route warning while its assertions pass. Neither is a new test failure.

Database suites used disposable `projex_test`, never normal `projex`. The first
overlapping PostgreSQL/real-Git run was invalidated and excluded. After workers
were stopped, final PostgreSQL (110) and real Git (10) ran separately and passed.
Smart HTTP and Java were also independently successful. A root-specific Git
quarantine failure was diagnosed using an isolated OS-temp test root; no Git
security controls were relaxed to obtain the passing run.

Real Smart HTTP proof covers service invitation/acceptance, shared remote clone,
Developer feature push, denied Developer main, atomic multi-ref denial, Maintainer
fetch/local merge/main push, two-parent merge inspection, Instructor source/diff
read and denied write, truthful accepted-push events, review freeze with existing
token, and removal revocation. Claimed commit author is not authenticated actor.

## Browser evidence

Loopback API + Vite used disposable randomized test accounts and `projex_test`.
Desktop and 390 × 844 verified My Projects → My Group, real files/branch selection,
source preview, README, protected main, history/diff, members, invitation state,
activity, Code access and no horizontal overflow. Developer has no Maintainer
management/review controls. Instructor sees read-only Git and existing feedback
draft controls. Code menus were closed before snapshots; no secrets captured.

Private fixture metadata and screenshots live outside Git in the task artifact
directory. The UI fixture was initialized locally for source presentation, not
through authenticated transport; it intentionally has no fabricated push events.
Authenticated push/merge proof belongs to the automated Smart HTTP test above.
No claim of manually testing an external IDE, network Git, mobile native Git,
every Co-Instructor state, or a normal-development database is made.

## Files and review surface

Client: GroupRepositoryView, GroupCodeMenu, scoped group CSS and tests; repository
API/projections/foundation/collaboration/Git views and nearest tests; ProjectViews
and tests; StudentPages/InstructorPages group route wrappers.
Server: repository repository/service/controller/routes/schemas/types;
group-context.types; repositories and collaboration API PostgreSQL tests;
expanded real Smart HTTP regression. Documentation: decisions, checklist,
this report, owning collaboration architecture, handoff and overnight report.
Exact filenames remain owned by the checkpoint commit (`git show --stat`).

## Security / final review

No credentials, runtime storage, environment files, demo scripts, debug logging,
generated output, dependency changes or schema changes are included. The new
context is authenticated, projection-allowlisted and backed by current permission
evaluation. Hidden tests/submission policy and unrelated Activity implementation
are unchanged. Membership operations continue through existing synchronized
transactions. No persistent environment or account credentials changed.

## Outstanding Product Owner review

- Review group header, Code-first tabs, role labels and Student-led group flow.
- Confirm the chosen plain-text README presentation and native local merge UX.
- Accept or request changes to the milestone before any integration.
- Keep full IDE/browser merge/terminal, maintainer transfer, analytics, schema
  redesign, deployment and network exposure at separate approval gates.

Next: independently audit Admin from the approved Activity baseline under the
new overnight work order; preserve this Group checkpoint without pushing.
