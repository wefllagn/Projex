# Group Repository GitHub-familiar UI refinement

Status: IMPLEMENTED, UNCOMMITTED — Product Owner visual approval pending.
Date: 2026-10-18. This report supersedes prior UI verification counts, not the
approved backend contract. No commit, push, merge, deployment or migration.

## A. Worktree and branch verification

The launching checkout was `C:/Users/Wefllagn/projex-ui`, branch
`iteration-2/julius-i2-1-academic-workspace`, HEAD
`90d8c4a3864d2d9b8bc41ca9b1570c1f52d5b096`. Its unrelated dirty files were
preserved. Implementation continued in the existing Group worktree,
`C:/Users/Wefllagn/.codex/worktrees/aaron-activity-runnable/projex-ui`, branch
`work/julius-overnight-group-mvp`, unchanged HEAD
`9203a2c827e8f68e07e920a8a246d34b6d33af42`.

Actual status and source were inspected before edits; the previous uncommitted
redesign, Design System v1 and icon kit were retained. `git fetch --all --prune`
completed successfully. Frozen Activity files and the separate Admin worktree
were not edited. Admin skill files were only read. Nothing was staged.

## B. Screenshot/reference interpretation

All eight supplied references were inspected before implementation. Annotated
Projex images controlled removals and relocations: Published and square due-date
decoration; duplicate back arrow; BRANCH/Files headings; misplaced Code menu;
author explanation; empty commit details; redundant writable status and empty
push summary. GitHub's actual screenshots governed toolbar density, grouped
history rows, right-aligned hashes/copy and README placement. The generated
concept supplied composition only: its sample totals, Add File, author filters,
verified badges, edit pencil and illustrative avatars did not authorize features.

| GitHub convention | Projex result |
| --- | --- |
| Branch and commit-count link on left | Real selected branch and exact history total |
| Go to file / Add file / Code on right | Existing exact-path control / no unsupported Add File / existing secure Code menu |
| Latest commit above compact file rows | Actual branch-tip author, subject, hash and time; real entry names/types/sizes only |
| README beneath files | Existing bounded escaped plain-text root README |
| Date groups, subject-first history, hash/copy | Implemented with contextual selected details and original parent diff |
| GitHub identity and extra product panels | Not copied; Projex light blue branding/sidebar/academic review retained |

## C. Group Project Detail

`client/src/projects/ProjectViews.jsx:208` retains title, Instructor, due date,
requirements and the right-side repository access rail. Published is omitted
only when status actually is PUBLISHED; closed/restricted state remains useful.
The due date no longer inherits the square pseudo-icon. There was no Calendar
asset in the existing kit, so no replacement icon was invented or generated.
The redundant Open suffix in requirements is omitted while non-open due state
remains. The rail continues to show the actual repository/group/member count,
storage/review status and Open Repository; the existing authorized creation,
invitation and restricted entry states are unchanged.

## D. Repository toolbar

`client/src/repositories/GroupRepositoryView.jsx:104` renders branch icon/select,
clickable commit total, right-aligned exact-path form and the single Code menu.
No separate BRANCH label, Files heading, old second form row or header Code menu.
The toolbar reflows on narrow screens; the menu is not clipped by the file-card
overflow boundary. Unavailable/loading/empty source still has a toolbar and safe
Code access where authorized. An actual empty summary displays 0 Commits; no
invented branch is selectable.

## E. Commit total and navigation evidence

`server/src/infrastructure/git/git-repository-reader.ts:284` summary counts the
union reachable from all current heads; it is NOT a selected-branch count.
The existing reader history at line 318 resolves the requested branch to an
exact revision and runs `rev-list --count` for that revision. The existing
service at `server/src/modules/repository-content/repository-content.service.ts:130`
projects that value as `pagination.totalItems`.

New `GroupCommitCount.jsx` requests the existing history endpoint with the
selected branch, page 1, limit 1, and uses totalItems, never data.length. It
validates the positive integer total and first commit against the displayed
branch tip, ignores aborted/late results, and refetches on branch/tip/refresh.
If a count is unavailable or the tip moved during reads, the working link says
Commits without fabricating a number. Open history/revalidation recovers it.
Live fixture checks showed main = 1 Commit and feature/student-registration =
3 Commits. A unit fixture with one returned item and totalItems 103 displayed 103.

Count click selects Commits with the current branch; `tab` and `branch` query
parameters preserve class/project context, reload/deep-link and browser Back.
The existing history endpoint loads the actual associated commits.

## F. Go to File / Add File / Code

`GroupFileBrowser.jsx` still owns exact commit-pinned path navigation. Its form
is supplied into the shared toolbar; this is exact-path opening, not a new
recursive fuzzy file-search service. Enter/Go opens the existing bounded file
endpoint; submitted input clears without losing the selected preview.

`server/src/modules/repository-content/repository-content.routes.ts:13` exposes
read-only source endpoints. Repository mutations do not provide a general Group
file creation/upload action. Activity checkpoints are separately authorized,
fixed-path Activity-only operations, not a Group Add File API. Therefore no Add
File or browser write API was added.

`GroupCodeMenu.jsx` was not edited. Repositioning preserves fresh server scope,
separate URL/username/token copy controls, expiry, in-memory-only secret, close/
unmount/expiry cleanup and late-result rejection. It remains explicit-click
issuance only. It is on Code, not duplicated on other tabs. Initial inspection
loading disables the transitional menu to avoid losing an opened token when the
stable browser mounts. Live menu geometry fitted the viewport; issuance finished
successfully. No credential value was printed or captured in proof screenshots.

## G. File list and README

Latest real branch-tip identity/subject/hash/time are immediately below the
toolbar. File rows retain folder-first order, icons, names, type/size and subtle
dividers. No fake per-file commit column. Root has no redundant Files heading;
folder/file paths retain clickable breadcrumbs and Back to folder. All reads
remain pinned to exact commit IDs. Escaped plain-text README remains below root
files; HTML execution and unsupported edit controls remain absent.

## H. Commits

`RepositoryGitViews.jsx:263` renders date-grouped bordered compact rows with
prominent subjects, secondary author/time, clickable short hashes and separate
Copy buttons. Subject and hash select the same actual detail and selected state.
No idle detail panel is rendered in Group mode. Existing changed-file display,
root-commit handling, multiple parents, pagination, retries and semantic unified
diff remain. Other repository modes retain their previous presentation.

## I. Text and empty states

Removed normal Group author explanation and bounded-metadata instructions.
Commit identity context is in a title tooltip, including detail author text;
no verified Projex identity or contribution claim is introduced. Loading diff
copy is simplified in Group mode. Non-Group screens were not globally rewritten.

## J. Activity and academic review

`RepositoryActivityPanel.jsx` compact mode shows Activity, real provision/push
events with icons/actor/time and a single No Git pushes yet line where needed.
There is no empty Accepted pushes by user heading or always-visible caveat.
Nonzero push totals and pagination remain accessible; contextual help states
push identity does not verify authorship/grades. The default non-Group panel is
unchanged.

Header keeps review state and Feedback/Resubmit/Instructor controls. Routine
Active / Git writable text is gone; Git read-only and non-active/storage failure
states remain visible. Duplicate literal back arrow removed. Review confirmation,
expected version, deadline, roles and write-freeze behavior were not changed.

## K. Automatic refresh

Existing `use-group-freshness.js` retains initial loaders, tab/branch/route reads,
successful-mutation revalidation and focus/visibility-return freshness checks,
15-second throttling, in-flight deduplication and cancellation. No polling or
WebSockets were added. The new count participates in source refresh. Existing
dirty review/creation/open invitation/confirmation protection remains; unfinished
Go to File input now also defers background refresh. Submitted paths release that
block. No automatic refresh path issues a credential. Retry and secondary More /
Reload remain for recovery; normal tabs do not have prominent Refresh buttons.

## L. Skills and icons

Read and reused installed UI/UX Pro Max Quick Reference guidance for this
existing-UI refinement: hierarchy, native controls, labels, focus, touch sizing,
responsive reflow and truthful states. Read Vercel Web Design Guidelines skill,
fetched current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md),
and applied semantic controls, URL state, minimum-width/long-text handling,
focus/hover states and reduced-motion coverage. Existing Projex SVG icon kit,
ProjexIcon, semantic status tokens, branding and sidebar were reused; no icon
regeneration, new icon library or dependency installation.

Scoped guideline review results:

- `client/src/repositories/GroupRepositoryView.jsx:48` — tab/branch URL state fixed.
- `client/src/repositories/GroupRepositoryView.jsx:104` — named branch control,
  clickable count and keyboard-operable semantic controls: pass.
- `client/src/repositories/RepositoryGitViews.jsx:263` — named hash/Copy controls,
  visible selected state and contextual details: pass.
- `client/src/repositories/group-repository.css:45` — wrapping toolbar and menu
  containment checked at requested widths: pass.

This is a scoped refinement review, not a whole-app accessibility certification.

## M. Files changed in this pass

Production frontend:

- `client/src/projects/ProjectViews.jsx`
- `client/src/repositories/GroupRepositoryView.jsx`
- `client/src/repositories/GroupFileBrowser.jsx` (pre-existing untracked component)
- `client/src/repositories/GroupCommitCount.jsx` (new)
- `client/src/repositories/RepositoryGitViews.jsx`
- `client/src/repositories/RepositoryActivityPanel.jsx`
- `client/src/repositories/group-repository.css`

Tests: GroupCommitCount (new), GroupRepositoryView, RepositoryGitViews,
RepositoryActivityPanel, RepositoryFoundationViews. Existing checks were adapted
to separate status chips without removing authority assertions. Documentation:
this report, CODEX_HANDOFF, GROUP_REPOSITORY_MVP_CHECKLIST and the owning
PROJECT_REPOSITORY_COLLABORATION contract. Earlier dirty files/assets/tests remain
preserved and must not be mistaken for newly authored work in this pass.

## N. Actual verification

| Executed check | Final result |
| --- | --- |
| Client `npm test` | 58 files / 391 tests PASS |
| Client `npm run lint` | PASS |
| Client `npm run build` | PASS; existing >500 kB JS chunk warning (813.26 kB minified) |
| Server `npm test` | 41 files / 285 tests PASS |
| Server lint | PASS |
| Server type-check | PASS |
| Server type-check:integration | PASS (compilation, not database execution) |
| Server build | PASS |
| Git diff whitespace check | PASS |

676 tests across 99 files in the executed client/server unit matrices. Focused
reruns are not added again. No client type-check script exists in this JSX project;
the frontend was verified by tests/lint/build. Early failures were outdated
combined-status assertions and a transitional Code-menu timing issue; corrected
before the final green run. No check remains failing.

PostgreSQL, real-Git integration, Smart HTTP integration and Java execution suites
were NOT rerun in this frontend-only production pass. Earlier reports own those
historical results. No concurrent mutable database suites or migrations were run.
Live preview reused the existing disposable loopback test fixture, not normal
development data; no repository role/invitation/review mutation was needed.

New/strengthened regressions cover exact branch counts (including 103 vs one item),
invalid/moving/late count responses, selected-branch tab URL/Back, no duplicate
Code/Add File, contextual detail absence, hash selection/copy/multi-parent diff,
real activity retention, read-only/storage states, dirty file-path and feedback
protection, and no unsolicited credentials. Existing role/member/invitation and
credential cleanup regressions pass in the full suite.

## O. Desktop/mobile visual verification

Manually inspected the running loopback Group UI at 1366×768, 1848×1000 and
390×844. Desktop Project Detail retained above-fold right-side access. Mobile
puts the repository rail first and keeps Open Repository above the fold. Code
toolbar reflows, files/README stay readable, commit rows/hashes stay operable,
unselected details do not reserve a panel, and Members/Invite modal remain usable.
Measured document scrollWidth did not exceed innerWidth in Project, Code and
Commits checks. Tested main/feature counts, count click, exact-path preview,
breadcrumb return, hash-selected changed files/parent diff, activity and Invite
modal opening/closing. No invitation or review mutation was submitted.

Proof PNGs are outside Git in the task artifact directory, with credentials closed:

- github-familiar-code-1366.png
- github-familiar-project-1366.png
- github-familiar-code-wide.png
- github-familiar-project-wide.png
- github-familiar-commits-wide.png
- github-familiar-code-mobile.png
- github-familiar-commits-mobile.png
- github-familiar-project-mobile.png

## P. Deferred capabilities and risks

No general Add File/upload/edit API; no browser merge, pull requests, full IDE,
per-file latest-commit metadata, verified authorship badge or history user/time
filters were invented. README is still safe plain text, not rendered Markdown.
Counts are event-refreshed snapshots, not realtime; a concurrent moving tip omits
the number until a consistent refresh rather than guessing. Existing 15-second
throttle intentionally avoids repeated focus/tab reads. Individual commit
selection remains contextual local state; tab/branch are URL-backed. No schema,
capacity, Git transport, authorization or review-policy change. Existing groups
and the approved eight-member frontend default are unaffected. Bundle splitting
remains separate broader performance work. Product Owner visual approval remains
required, and commit/integration/exposure still require separate authorization.

## Q. Git diff summary

This pass is layered on the prior uncommitted Group UX/design work, not a reset
or a new baseline. The cumulative tracked diff contains frontend source/tests,
documentation and the preserved earlier server capacity integration tests; new
untracked files include earlier UI/icons/design assets plus this pass's count
component/tests/report. At final inventory this is 15 modified tracked files and
110 untracked files (86 existing icon assets included), with the tracked diff at
815 insertions / 176 deletions. `git diff --stat` excludes
untracked assets. No production
server/schema/migration file was changed. Nothing staged, committed, pushed,
merged or deployed; branch and HEAD remain as in A. Whitespace diff check passed.

READY FOR GITHUB-FAMILIAR REPOSITORY UI REVIEW
