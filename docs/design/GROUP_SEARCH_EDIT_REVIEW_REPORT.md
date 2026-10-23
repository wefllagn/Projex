# Group search/edit review — historical partial checkpoint and incident

Superseded disposition — 2026-10-19: the Product Owner deferred browser editing
and demo database recovery. Native Git is sufficient for Group MVP. The original
implementation/test/incident evidence below is retained; its requests for an
immediate editing or recovery decision are no longer current. See
[current handoff](GROUP_REPOSITORY_FINAL_HANDOFF.md),
[deferred proposal](../architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md)
and [separate recovery issue](../DEMO_DATABASE_RECOVERY_ISSUE.md).

## A. Branch/worktree verification

Existing Group worktree retained on work/julius-overnight-group-mvp at 9203a2c.
Primary iteration-2/julius-i2-1-academic-workspace checkout at 90d8c4a unchanged.
Prior dirty work preserved; fetch completed; no same-named origin Group branch.
No staging, commits, push, merge, production backend edits or new migrations.
Activity and separate Admin implementation files/worktrees untouched. Important:
this does NOT imply their demo data was unaffected; see the incident below.
Machine-specific paths/private configuration are not reproduced in this report.

## B. Implemented search

GroupFileFinder replaces the inline Find a file panel with an anchored overlay.
Typeahead debounced 180ms; one shared in-flight discovery and mounted-snapshot
cache, existing 64-directory/5,000-entry/10-second bounds. Exact filename/full
path first, prefix next, partial path next; case-insensitive nested paths. Primary
filename/secondary directory, labelled combobox/listbox with active descendant,
Up/Down, Enter, Escape, outside click, blur dismissal and Clear search. File list
does not receive an inserted result section. Compact neutral empty matches; safe
inline Retry search. Results are actual authorized tree entries. No invented files.
Partial-index exact-path fallback is contextual only, not a permanent expander.
File-open failure retains query, branch and local file recovery. Late completions
cannot erase newer text. No source or secrets in the index or persistent storage.

## C–F. Editor/write/authorization/conflict slice

NOT IMPLEMENTED. Per the work order's significant-security/domain-decision stop
rule, the durable Group write architecture awaits approval in
`../architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md`.
The current queue requires an Activity relation, claims only ACTIVITY_WORKSPACE,
and its writer accepts one .java entry on main with an Activity-owned message.
Reusing that model for Group branches would change the frozen Activity contract.
The proposal defines a separate Group job schema/queue, fenced durable recovery,
expected-HEAD atomic update, authenticated COMMIT projection and source retention.
Existing role/main/review rules remain unchanged. No decorative Edit/Commit action
is shown without a real endpoint. Draft/conflict/role write proofs remain pending,
not covered by read-only search tests.

## G. Native Git interoperability

Existing real-Git regression suite passed (2 files/10 tests). This is NOT proof of
browser editing interoperability, which is not implemented. Read-only inspection
confirmed the original demo bare repository still exists and main still starts
with the last user-observed e9f3cdfc commit. Source was not printed or changed.

## H. Files changed in this continuation

- client/src/repositories/GroupFileFinder.jsx and GroupFileFinder.test.jsx
- client/src/repositories/group-file-search.js
- client/src/repositories/GroupFileBrowser.jsx and GroupFileBrowser.test.jsx
- client/src/repositories/GroupRepositoryView.jsx and GroupRepositoryView.test.jsx
- client/src/repositories/group-repository.css
- docs/architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md
- this report, PROJEX_DESIGN_SYSTEM.md, PROJEX_UI_POLISH_ROADMAP.md
- docs/CODEX_HANDOFF.md and docs/GROUP_REPOSITORY_MVP_CHECKLIST.md

UI/UX Pro Max and fresh Vercel Web Interface Guidelines used; existing Projex
icons reused, no asset regeneration. Findings fixed: old inline section in
GroupFileBrowser, misleading Add File preview, keyboard/dismissal/safe error needs
in the new GroupFileFinder. No unrelated global styles or new dependency.

## I. Actual checks

| Check | Result |
| --- | --- |
| Focused browser/repository tests | 2 files / 33 passed |
| New finder keyboard/ranking/recovery tests | 1 file / 7 passed |
| Full frontend | 62 files / 433 passed |
| Client lint/build | Passed; existing >500kB warning, JS 825.21kB |
| Server unit incl. authorization | 42 files / 287 passed |
| Server lint/types/integration types/build | Passed |
| Real Git | 2 files / 10 passed, but destructive test-DB cleanup occurred |
| Smart HTTP | INTERRUPTED; no passing result claimed |
| Git diff --check | Passed |

Initial focused run failed on old accessible result names/Add File expectations;
explicit full-path option names and updated assertions fixed those failures.
Existing non-fatal Activity test route warning remains. Database-mutating suites
were sequential, but database-name isolation was insufficient for the live demo.

## J. Manual walkthrough — BLOCKED, data incident

The official real-Git runner correctly used projex_test and a guarded temporary
Git root. However, its fixtures call cleanIntegrationDatabase before/after tests.
That helper deletes ALL test-DB users/classes/projects/teams/repositories and other
records. The running demo also used projex_test. I failed to inspect that cleanup
and establish separation before running it. This was an agent isolation error.

The demo login failed afterwards. Read-only checks confirmed the demo account and
repository metadata are absent. The existing demo storage and bare Git repository
remain; main matches the last observed commit. Normal development DB was not
targeted. Other demo records sharing projex_test may also have been removed.
Do not infer that only Group metadata was affected.

Smart HTTP was interrupted once the issue was identified; no matching Node runner
remained in the read-only process check. No reseed/reconstruction/restore or
further mutable database suite was performed. Do not rerun these suites while the
live demo shares their cleanup target. No current desktop/mobile popover screenshot
or manual success is claimed: authentication is blocked by missing demo records.

Recovery needs Product Owner direction: restore a valid database backup if one
exists, or explicitly reconstruct demo metadata around the preserved Git storage.
Reconstruction is not a full recovery of deleted feedback/history/submissions.
Do not overwrite the preserved bare repos or silently restore the old seed state.
Separating live demo data from destructive suites is a prerequisite to further
integration testing. Test-name allowlisting alone is not enough.

## K. Add File

Hidden, preview dialog removed per latest order. Creation/upload/rename/delete
remain deferred until a real safe API exists; optional enhancement after existing
file editing is verified. This supersedes the previous WIP-button direction.

## L. Limitations and gates

Group editing is not complete; durable-write design approval is outstanding.
Live demo metadata recovery and current desktop/mobile checks are outstanding.
No Admin continuation or Group completion/acceptance is claimed. No unsafe
API-process writer, Activity-job repurposing, native Git force update, review-lock
bypass or hidden failure. Preserve Git storage pending recovery instructions.

## M. Diff summary

This continuation changes frontend search/presentation/tests and documentation.
No production server/schema implementation changed. The cumulative dirty diff
also contains earlier Group work/icons and a historical server integration-test
edit; do not attribute all cumulative changes to this pass. Nothing staged.
