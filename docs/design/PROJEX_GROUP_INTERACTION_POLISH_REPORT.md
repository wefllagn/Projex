# Group Repository interaction polish

Later continuation supersedes this checkpoint's exact-path-as-search and
HTTP/reference/Home error presentation. See
[error recovery and hierarchy report](PROJEX_ERROR_RECOVERY_IMPLEMENTATION_REPORT.md)
for actual matching, contextual recovery, permanent standards and latest tests.

Status: implemented, uncommitted; Product Owner visual approval remains pending.
This is the follow-up to the seven annotated/current/GitHub screenshots supplied
after the prior GitHub-familiar UI report. It supersedes that report's toolbar
placement and omission of Add File, not its backend boundaries.

## Outcome

- Code dropdown now has consistent 16px gutters, separated clone/authentication/
  footnote sections, readable field spacing and equal single-line Copy buttons.
  The chevron uses centred CSS geometry, not a misaligned text glyph. The menu
  is viewport-contained with internal scrolling; mobile uses the available
  screen area. Resizing repositions it without issuing a credential.
- Copy shows a small "Copied!" popup at the pointer, or beside the button for
  keyboard activation. It expires after 1.4 seconds, adds no paragraph below the
  list, and never contains copied content. Clipboard rejection is not reported
  as success. Pending feedback is cancelled on dismissal/unmount.
- The real branch total is at the right of the latest-commit row, matching the
  newer GitHub screenshot. The original exact pagination total and stale-tip
  protection remain unchanged. There is no duplicate count next to Branch.
- Author, message and short hash open that real commit. Subject hover/focus
  shows its actual author/time/hash preview, with Escape dismissal. The avatar
  is initials from Git metadata, not a verified Projex user/profile association.
  Tab, branch and selected commit are URL-backed; branch changes clear a prior
  selection. Existing history, changed files and parent diff are reused.
- Go to file is one input; Enter opens an exact repository-relative path. The
  duplicate submit button is removed, not renamed into a false working action.
  Add file is a separate, role-aware preview button with an accessible "You found
  a work in progress" dialog. It clearly says browser creation/upload is not
  available and explains the existing local Git alternative. It sends no write
  request. Background refresh defers while the preview is open.
- Group source/history/file/credential error views use the new calm illustrated
  recovery component. 404/5xx, including 505, get safe short text and an exit;
  retry controls are retained where the loader supports retry. Permission denial
  remains a restriction, not a Coming soon feature. Loading/empty states are not
  misrepresented as errors. No global error route was rewritten.

## Scope and safety

Worktree: `C:/Users/Wefllagn/.codex/worktrees/aaron-activity-runnable/projex-ui`.
Branch: `work/julius-overnight-group-mvp`, HEAD unchanged at
`9203a2c827e8f68e07e920a8a246d34b6d33af42`. Existing dirty work was preserved;
remote evidence was fetched. No staging, commit, push, merge, migration, normal
database mutation, dependency change, exposure or deployment. No production
backend/schema, frozen Activity or separate Admin file changed.

The user's newer explicit preview request replaces the previous requirement to
omit unsupported Add File controls. It does not authorize implementing an Add
File API, weakening permissions, pretending an operation succeeded, or globally
rewriting all deferred UI. The reusable design rule is recorded in Design System
v1 for future approved adoption. Existing review freeze and credential authority
checks remain; separate URL/username/token copying, close/unmount/expiry cleanup
and ignored late issuance are covered by the existing and extended regressions.

## Changed files in this follow-up

Production: GroupCodeMenu.jsx, GroupRepositoryView.jsx, GroupFileBrowser.jsx,
RepositoryGitViews.jsx, group-repository.css; new GroupLatestCommit.jsx,
GroupCopyFeedback.jsx and GroupRequestState.jsx, all under client/src/repositories.

Tests: GroupRepositoryView.test.jsx, GroupFileBrowser.test.jsx,
RepositoryGitViews.test.jsx; new GroupCopyFeedback.test.jsx and
GroupRequestState.test.jsx. Documentation: this report, handoff, Group checklist,
Design System v1 and owning project/repository collaboration contract.

All original 21 SVG / 63 PNG icons remain unchanged; no icon regeneration.
The computer-use skill was used for live desktop/mobile inspection.

## Verification

Final client matrix: 60 test files / 403 tests PASS; lint and production build
PASS. The existing >500 kB application bundle warning remains. No frontend
type-check script exists; JSX was verified by tests/lint/build. Backend/database/
Git/Java integration suites were not rerun because production backend contracts
were unchanged. The preceding report owns their historical results.

Coverage includes transient pointer/keyboard feedback, timeout/dismissal/unmount,
clipboard rejection, no secrets in feedback, separate credential copies and no
issuance on resize; real latest-commit navigation; exact count placement; preview
modal no-write behavior, focus return and Escape; 404/500/503/505 safe recovery;
preserved permissions, review and freshness regressions. An initial modal focus
assertion used a synthetic click without focusing its opener; the fixture now
models actual focus before asserting focus return. Final checks are green.

Live checks use the existing disposable loopback fixture, not normal project
data: keyboard commit preview and click-through, actual copy popup, Add file
dialog, exact-path navigation, genuine missing-file 404 and return to Files.
During the walkthrough, Git reads briefly returned 503; Retry recovered the
comparison. Later the demo session expired and correctly returned to login;
signing back into the disposable demo restored source access. No root-cause or
backend fix is claimed from those UI observations. Friendly failures were not
silently treated as successful loads.

Desktop and 390px layouts were inspected; dropdown bounds and 16px padding were
measured without dumping/screenshotting credentials. No horizontal overflow in
the checked Code view. Screenshots outside Git in the task artifact directory:
group-interactions-wip.png, group-interactions-commit-preview.png,
group-interactions-copy-feedback.png, group-interactions-404.png,
group-interactions-code-mobile.png and group-interactions-code-desktop.png.
Temporary viewport overrides are reset before handoff.

## Remaining boundary

Browser Add File/upload remains unimplemented and explicitly labelled as such.
Go to file is exact-path navigation, not recursive fuzzy search. No fake
contribution totals, verified author profiles, diff statistics or roadmap actions
were invented. Broader app-wide WIP/error adoption is a future scoped pass;
Activity/Admin and unrelated routes remain untouched. Product Owner review and
any commit/integration remain separate approval gates.
