# Projex UX refinement and Design System v1 — review report

2026-10-18. **Implemented — pending Product Owner review.**

## A. Worktree, branch and baseline

Group worktree: C:/Users/Wefllagn/.codex/worktrees/aaron-activity-runnable/projex-ui.
Branch work/julius-overnight-group-mvp, HEAD
9203a2c827e8f68e07e920a8a246d34b6d33af42. Existing compact-UX changes were
uncommitted and preserved, not reset to the historical checkpoint. Fetch/prune
completed; origin/iteration-2/julius-activity-mvp remained
42666278d7987018cdf24af3499d10e7b84c4e4b, comparison 0/1.
Primary checkout user changes and separate Admin implementation were preserved.
No commit, push, merge, deployment or normal-database migration.

## B. Skills discovered and used

The Group worktree had no .agents/skills. Both named skills were found under the
Admin worktree's .agents/skills and read directly without copying/overwriting
them. Python 3.12.3 was available; UI/UX Pro Max searches ran with bytecode writes
disabled. Initial dark coding-platform recommendation was rejected. One narrower
search matched light minimalism/dashboard guidance; generic marketing layout,
gold palette and new fonts were not adopted. Applicable hierarchy, contrast,
focus, density and icon consistency informed implementation and evaluation.

Vercel Web Design Guidelines were fetched fresh from their official raw source.
Semantic controls, labelled interactions, async notices, reduced motion, readable
wrapping and destructive confirmations were checked. Computer-use skill guided
real viewport verification; no native OS automation, third-party assets or
dependency installation was used.

Final guideline review (representative changed boundaries):

- client/src/projects/ProjectViews.jsx:128 — named labelled creation fields; pass.
- client/src/repositories/GroupFileBrowser.jsx:48 — labelled exact-path input,
  autocomplete/spellcheck disabled for code path; pass.
- client/src/repositories/GroupDialog.jsx:4 — labelled focus-managed dialog,
  keyboard close and dirty-discard warning; pass.
- client/src/repositories/GroupRepositoryView.jsx:47 — tab state is local rather
  than URL-synced; remaining P2 roadmap item, not claimed complete.

## C. Group Project Detail before/after

Before: requirements left; explanatory Collaboration rail right; My Group link
and class metadata below requirements. After: the existing rail owns the actual
repository identity and Open Repository, immediately beside requirements at
1366x768. Narrow views put the actionable rail before requirements. No duplicated
large repository section or giant empty metadata card.

## D. Repository entry and invitation states

Member: real repository name, group name/count from existing group-context API,
actual project capacity, storage/review state and direct link. Invited: compact
existing invitation identity, inviter, expiry and allowed Accept/Decline in the
same rail. Unassigned: existing Student-led Create Group form. Closed/restricted:
no unauthorized create/accept/decline. Backend remains final eligibility authority.
Mismatched academic context fails closed. My Repositories direct links remain.

## E. Duplicate information removed

Removed My Group/generic relationship headings and repeated owner/team-sync/
arbitrary-join explanations. Other class repository summaries are a collapsed
disclosure, absent for zero records. Requirements remain readable, including
deadline and actual configured capacity. No legitimate access grant was removed.

## F. Commit history

Group-only optional HistoryView presentation groups commits by local date with
subject, author/time, short hash/Copy, selected/hover row and subtle timeline rail.
Long authorship explanation is contextual help, not repeated on each row.
Details/changed files, branch filtering, pagination and all parent comparisons
remain. Existing other-type history presentation is retained.

## G. Branches and Activity

Compact Group branch rows show real name, tip hash/subject, Default and Protected
labels; default branch first. No fabricated ahead/behind or merge/PR action.
Group Activity shows structured real provisioning/accepted-push events, icon,
actor and time, with contribution caveat in contextual help. No event was
fabricated by the UI. Pending invitations/history and member transitions remain;
Remove/Revoke now confirm before invoking the existing APIs.

## H. Diff highlighting

GroupDiff/unified-diff.js track unified hunk counts and anchored line prefixes.
Headers neutral, hunks subdued blue, additions green and removals red. Actual
signs and exact text/newlines remain; HTML is escaped. Header-like source inside
a hunk is not misclassified as file metadata. Multi-file, zero-count hunk,
no-newline marker and HTML cases are tested. Non-Group diff presentation remains.

## I. Automatic refresh and limits

Initial loaders remain. New useGroupFreshness revalidates stale tab/branch entry,
focus return and visibility regain with a 15-second freshness window, in-flight
deduplication, abort cleanup and no interval polling or automatic retry loop.
Mutations re-fetch authority; explicit Retry controls cover failures. A secondary
More > Reload repository remains for recovery rather than routine tab use.
No background credential issuance, WebSocket or claim of realtime behavior.

Open review/Invite/confirmation dialogs and dirty creation forms defer background
reload. Review drafts survive background events and require discard confirmation
on dialog dismissal. Branch selection remains; immutable file snapshots remount
only if commit changes. Backend operation/version checks are unchanged.
Limits: fresh reads may be reused for 15s; a stationary screen does not continuously
update; no cross-route durable draft store or URL-synced tab state was introduced.

## J. Design system

PROJEX_DESIGN_SYSTEM.md defines identity, semantic tokens, type/spacing, density,
panels, actions, forms, dropdowns, dialogs, tabs, Git lists/diffs, feedback/states,
responsive/accessibility and freshness standards. New px-prefixed tokens are
adopted only where relevant; App.css was not rewritten. Calculated core foreground/
background pairs exceed 4.5:1. This is not application-wide WCAG certification.

## K. Original icon inventory

21 original SVG masters: class, assignment, group-project, repository, folder,
file, java-source, branch, commit, members, invitation, code, run, tests,
submission, review, feedback, activity, admin, archive, restore.
63 transparent PNGs at 24/48/96px plus SVG/PNG contact sheet. Export used existing
Sharp, checked dimensions, alpha, transparent pixels and visible artwork, and
the contact sheet was visually inspected. No heavyweight framework installed.
See PROJEX_ICON_SYSTEM.md and client/scripts/export-projex-icons.mjs.

## L. Integrated icon component

ProjexIcon uses known SVG URLs with explicit dimensions, decorative hiding or
standalone alt labels. Adopted in Project/repository headers, desktop tabs,
folder/file/Java rows, commit/date, branches, Invite and event rows. Decorative
tab icons hide at mobile width so all five labels stay compact. No application-
wide replacement; no copied branding or essential icon-only meaning.

## M. Affected files

Production frontend changed this pass:
client/src/projects/ProjectViews.jsx and group-project.css;
client/src/repositories/GroupRepositoryView.jsx, GroupFileBrowser.jsx,
GroupMembersView.jsx, GroupDialog.jsx, RepositoryGitViews.jsx,
RepositoryCollaborationViews.jsx, RepositoryActivityPanel.jsx;
new GroupDiff.jsx, unified-diff.js, use-group-freshness.js;
new client/src/design/ProjexIcon.jsx, ProjexStatus.jsx, projex-tokens.css;
new client/src/assets/icons/projex masters/exports and export script.

Tests: ProjectViews, GroupRepositoryView, GroupMembersView, RepositoryGitViews,
new GroupDiff, use-group-freshness and ProjexIcon tests. Earlier uncommitted
GroupFileBrowser/Foundation tests and the two eight-member PostgreSQL tests are
preserved carry-over, not new backend implementation in this pass.

Docs: design system/icon system/polish roadmap/this report; current handoff,
Group checklist and owning collaboration architecture. Earlier redesign report
is preserved as historical evidence. External disposable-fixture helper and
private manifests/screenshots remain outside Git.

## N. Executed checks

| Current pass | Files | Tests | Result |
| --- | ---: | ---: | --- |
| Full client regression | 57 | 383 | PASS |
| Backend isolated unit regression | 41 | 285 | PASS |
| Total, not counting repeated focused runs | 98 | 668 | PASS |

Client lint/build, server lint/type-check/type-check:integration passed.
Final CSS-only tablet correction was rendered and production-built afterward.
Final named-field/Group-rendering cleanup also passed 46 focused tests across
four files, lint and production build; repeated tests are not added to totals.
git diff --check passed. Icon export/validation passed.
Sandbox child-process failures were rerun with approval and passed. Initial
old-presentation assertions and one unsupported test matcher were corrected;
no unresolved test failure remains.

PostgreSQL/real-Git/Smart-HTTP/Java suites were NOT rerun in this refinement.
The prior pass's 112/10/12 integration counts remain historical evidence, not
included above. No server production source/schema or Git/Java policy changed.
Existing client Activity-fixture route warning and >500KB Vite chunk warning
remain; minified JS is approximately 811KB.

## O. Rendered walkthrough

1366x768: member Open Repository visible with zero scroll (final compact rail
button around y388–431); unassigned Create Group bottom around y665. 390x844:
member entry before lower-priority details, invitation and unassigned states
rendered, Create Group visible; Members modal fits; branches/Activity/commits
remain accessible without document horizontal overflow. 900x900 exposed an
inherited full-width stacked sidebar; a Group-only 721–1100px correction restored
the two-column shell and Open Repository became visible around y380–424.

Actual backing Git fixture was advanced outside the browser. Re-entering stale
Code fetched Validate registration names and its updated src/Student.java without
Refresh; commit-pinned inspection matched the new tip. Real parent diff showed
both green additions and red removal. This fixture push used local backing
storage; it is NOT claimed as a new authenticated Smart HTTP transport test and
no accepted-push event was fabricated. Source freshness tests also verify
throttling, visibility, cancellation and blocked-draft behavior.

Screenshots in the task's external visualization directory:
refinement-project-desktop.png, refinement-project-390.png,
refinement-commits-desktop.png and refinement-diff-desktop.png.
Live preview remains http://127.0.0.1:5174 with the disposable Group API/worker.
No normal development records were changed to alter existing four-member groups.

## P. Preservation and security

No production backend/Prisma/migration/package changes. Activity Workspace,
Run/stdin/tests/save/submit and separate Admin work remain untouched.
Existing role-specific source controls, protected main, review freeze, Instructor
read-only access and temporary credential cleanup tests pass. Group-specific
presentation is opt-in. No token was generated during this pass's browser
walkthrough; diagnostics/screenshots did not inspect an open Code secret.
All new fixture accounts are confined to projex_test and the existing temporary
fixture Git root; no normal development migration/data mutation or public exposure.

## Q. Project-wide roadmap

PROJEX_UI_POLISH_ROADMAP.md prioritizes shared form/status/error/navigation/
freshness primitives using actual Student, Instructor, Admin, Activity, Class
and repository source examples. Broader Activity/Admin adoption, shell cleanup,
route-level splitting and durable drafts are follow-up scopes, not silently
implemented here. Installed Admin skill files remain untouched.

## R. Git diff summary

Cumulative unstaged/uncommitted diff includes the preserved prior UX pass plus
this refinement: Group/frontend presentation, icons/tooling, tests and design
documentation. The only server file remains the earlier capacity integration
test additions. No frozen Activity/Admin production path changed. No files were
staged; HEAD unchanged; no reset/clean/rebase/merge/commit/push.
Final inventory against HEAD: 14 modified tracked files and 107 new files,
including 86 icon/contact-sheet assets; no private manifests, environment files,
runtime logs or build outputs in the new-file inventory. Nothing staged.

## S. Product decisions / review gate

No unexpected backend or security policy decision was required. Product Owner
visual review is still required. Cross-route durable drafts, global design-system
adoption, Admin/Activity redesign and branch promotion remain separate decisions.
This report does not declare final UI approval.

READY FOR PROJEX UX REFINEMENT REVIEW
