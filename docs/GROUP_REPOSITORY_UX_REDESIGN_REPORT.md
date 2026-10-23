# Group Repository final UX redesign — review report

Date: 2026-10-18. Status: **IMPLEMENTED — PENDING PRODUCT OWNER UX REVIEW**.
Backend direction is approved; implementation is not final UI acceptance.

## A. Baseline verification

Worktree: `C:/Users/Wefllagn/.codex/worktrees/aaron-activity-runnable/projex-ui`.
Branch: `work/julius-overnight-group-mvp`.
HEAD remains `9203a2c827e8f68e07e920a8a246d34b6d33af42`.
Worktree was clean before this pass. Remote refs were fetched without integrating;
the approved Activity base `42666278d7987018cdf24af3499d10e7b84c4e4b`
is one commit behind this Group checkpoint (comparison 0/1).
The primary checkout and separate Admin branch were not used for implementation.
Existing primary-checkout user changes were preserved. No commit, push or merge.

## B. UX simplifications implemented

Repository-name-first header; one group/class/deadline line; compact lifecycle,
review and Git-write status; Code, feedback/review and permitted ready actions.
No repeated metadata cards or separate ordinary-management route. Existing
archive/restore controls are retained in the secondary Repository actions
disclosure when authorized. Existing provisioning/retry behavior is retained.

## C. GitHub-familiar layout

Existing Projex sidebar, light colors and academic links remain. Five tabs:
Code, Commits, Branches, Members, Activity. Code shows branch, real branch-tip
commit summary, file navigation and root README. No branding imitation or
unsupported GitHub feature was introduced. Code remains a single header control.
My Repositories and Group Project already linked directly; both links are retained.

## D. File browsing

New Group-only file browser replaces the large shared split-pane presentation.
Folders first, clickable root/folder breadcrumbs, parent/back navigation, exact
path Go to file and inline bounded text preview. Go to file is not a global
filename index. Tree/file/README reads use the selected branch's existing commit
ID; result identities are checked and late file responses ignored. Branch changes
remount the inspector; README is shown only beneath the root list. Text stays
escaped, not executable HTML or rendered Markdown. Shared non-Group FilesView
is unchanged. No invented per-file commits, editing, uploads, PRs, merges, SSH
or terminal.

## E. Members and invitation modal

Compact initials/name/active-state/role/action rows show actual active/configured
capacity. Authorized Maintainer can invite; removed members and invitation
history remain reachable in disclosures; pending invitations and revoke remain
visible. Instructor corrective reasons and permitted remove/reactivate controls
are retained; oversight names occupy one short line.

Invite Member uses the existing Student-safe paginated Class roster (100/page),
case-insensitive loaded-name search, selection and Load more. Known owner,
active members and unexpired pending invitees are excluded. Candidate presence
does not guarantee eligibility: the existing backend validates enrollment,
other-group membership, capacity and concurrency. Success closes and refreshes;
conflicts refresh authority and leave a useful error. Dialog supports labelled
heading, Escape, Tab trap, scroll locking, busy close protection and focus return.
Visual QA caught and corrected inherited oversized radio styling.

## F. Eight-member default and boundary validation

Only new Group Project frontend form default changes from four to eight, with
the 2–8 selector and label Maximum members (including Maintainer). Existing
published limits and Prisma/database default four remain unchanged. No migration.

Two additional real PostgreSQL integration tests prove owner plus seven active
members in both Team and Repository membership tables; ninth invitation denied;
pending final-slot reservation; two concurrent invitations yield exactly one
success; winner acceptance reaches eight, not nine. Existing smaller-limit tests
remain and passed. UI tests cover a new default-eight payload, smaller selection
and existing published-four preservation. Members tests show actual four as well
as the disposable browser fixture's eight.

## G. Academic review relocation

Maintainer Mark Ready/Resubmit lives in the header, with confirmation:
“Marking ready freezes Git writes for review.” Existing expectedUpdatedAt and
409 refresh handling remain. Instructor Review opens the existing feedback
draft/save/request-changes/approval controls; Student Feedback shows only released
feedback. Developers do not receive Maintainer readiness controls. Loading and
error states keep a closable labelled review dialog. Backend freeze semantics
and Git authorization are unchanged.

## H. Preserved features and trust boundaries

Student group creation, invitation acceptance, synchronized membership and
capacity, role controls, Instructor read-only Git, auto-scoped temporary Code
credentials, main protection, native collaboration, source/commit/diff inspection,
review/feedback, credential close/unmount/expiry cleanup, authenticated push
activity, provisioning/retry, member transitions and archive/restore remain.
Group-specific presentation is gated; Activity, Personal and Class Workspace
production files are untouched. No server production source, Prisma, migration,
dependency, persistent environment or normal development data changed.

## I. Files changed

- Added GroupDialog.jsx, GroupFileBrowser.jsx and GroupMembersView.jsx under
  client/src/repositories; added the latter two test files.
- Updated GroupRepositoryView.jsx/test and group-repository.css.
- Added optional Group presentation to RepositoryCollaborationViews.jsx and
  RepositoryActivityPanel.jsx; default other-type presentation retained.
- Updated RepositoryFoundationViews.test.jsx assertions for compact header.
- Updated client/src/projects/ProjectViews.jsx/test for the new form default.
- Added boundary tests to server/tests/integration/repositories.integration.test.ts.
- Updated this report, CODEX_HANDOFF.md, GROUP_REPOSITORY_MVP_CHECKLIST.md and
  architecture/PROJECT_REPOSITORY_COLLABORATION.md.

The disposable demo seeder outside Git was adjusted to create an eight-place
fixture with an eligible candidate. Private manifests, storage and screenshots
remain outside the repository; no runtime credential is included in the diff.

## J. Verification executed

| Suite | Files | Tests | Result |
| --- | ---: | ---: | --- |
| Full frontend | 54 | 366 | PASS |
| Backend unit | 41 | 285 | PASS |
| PostgreSQL integration | 22 | 112 | PASS |
| Real Git | 2 | 10 | PASS |
| Smart HTTP | 1 | 12 | PASS |
| Total (not repeated focused runs) | 120 | 785 | PASS |

Frontend lint/build, server lint/type-check/type-check:integration and
git diff --check passed. Database checks used projex_test; all 24 committed
migrations reported current. No normal database migration was applied. Mutable
DB suites ran sequentially with preview API/workers stopped; the disposable
Group fixture was recreated afterward. Java was not rerun: no Java production
boundary changed. Historical Java results are not counted in the table.
Initial old-heading assertions and one callback dependency lint failure were
corrected; acceptance counts above are successful reruns, not those failed runs.
Existing Activity fixture route warning and large Vite chunk warning remain.

## K. Desktop/mobile walkthrough

Live browser verified both direct entry paths and all tabs; src/Main.java folder
preview, root/back breadcrumbs, feature branch src/Student.java exact-path preview;
main latest commit and root README; root-commit changed-files detail; protected
main; truthful Activity with no fabricated accepted-push records.

Maintainer modal excluded active/pending people, searched and invited the test
candidate, closed on success, refreshed pending from one to two and capacity
from five to four. History remained accessible. Shift+Tab stayed inside modal;
Escape restored Invite Member focus. Mark Ready changed repository to read-only.
Instructor created a draft and requested changes, releasing feedback; Instructor
Git credential was verified READ only. Developer separately signed in: released
feedback visible, no Resubmit control. Maintainer restored for final preview.
Real rejection of Git writes while frozen is also covered by the passing Smart
HTTP regression, rather than inferred solely from the UI badge.

At desktop 1299px and mobile 390x844, the inspected Code/Commits/Branches/Members/
Activity views had no document horizontal overflow. Mobile modal bounds were
x12..378 (366px wide) within 390px. Root preview has no large empty split pane;
mobile actions/tabs wrap and README scrolls normally. Viewport override reset.
Screenshots outside Git: group-ux-before-desktop.png, group-ux-desktop.png,
group-ux-390.png in the task visualization artifact directory.

Review preview: http://127.0.0.1:5174/student/repositories (signed in as disposable
Maintainer). API 3300 and Git worker use only the disposable test database/root.
Fixture remains Changes Requested, Git writable, with released test feedback.
No Java runner is started. Separate Admin preview API was not restarted or
integrated after isolated tests; no Admin source changes were made.

## L. Known limitations / security note

Roster search covers loaded pages, not a server-side directory; large rosters
use Load more (covered in component tests, not a large live fixture). Pending
local expiration display uses client time, but backend time/authorization remains
authoritative. README is bounded plain text and Go to file needs exact path.
No new browser editor or other unsupported Git operations. All role/lifecycle
permutations are automated regressions; manual walkthrough is representative,
not a claim that every test was repeated by hand.

One temporary READ-only disposable Instructor token appeared in diagnostic
output during browser verification. It was immediately revoked in the guarded
test database; menu content was cleared. No production credential was involved,
and no token, password or manifest is included here or in Git. Future diagnostics
must inspect control presence without serializing credential label text.

## M. Git diff summary and next gate

Scoped frontend presentation/default plus tests/documentation; no production
backend or schema change, no frozen Activity modification and no Admin merge.
Four new Group component/test files plus GroupDialog (five new code/test files).
All changes remain unstaged/uncommitted at the verified checkpoint for review.
Next gate is Product Owner compact-UX review, then separately authorized commit
and integration. No push, deployment or final product acceptance implied.

READY FOR SIMPLIFIED GROUP REPOSITORY UX REVIEW
