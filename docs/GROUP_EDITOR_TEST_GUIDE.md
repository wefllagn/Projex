# Group editor — manual test guide

## What caused the failed README commit?

The recorded requests used CREATE for README.md on feature/group-editor, where README.md already existed. The backend refused with BROWSER_FILE_CHANGED. This was not a permissions denial. A later successful new-file commit also confirmed the Developer account could write that branch.

The refined UI opens existing README.md as UPDATE automatically. New file opens a small dialog and checks the exact selected Git snapshot before preparing a draft. A duplicate filename offers Open existing file. A later server file collision preserves source/message and offers Compare latest followed by explicit adoption of the current base; it never silently changes CREATE into UPDATE.

## Sign in and choose the right practice repository

Use the fictional QA Maintainer account at http://127.0.0.1:5212/student-login. Private sign-in details and direct links are supplied in the owner handoff, outside Git. This role can edit main and existing feature branches while the task is open. Developer can edit feature branches but cannot initialize/update protected main. Viewer cannot commit. No permission rules were relaxed.

Two new repositories were added to the existing disposable QA class, without resetting or deleting the earlier repository or its history:

- Editor practice: initialized README.md on main, plus existing feature/practice. Both are available to the Maintainer. The verification created notes.md on feature/practice; main is ready for ordinary README editing.
- First commit practice: empty repository reserved for the owner to initialize manually. The editor prepares a README draft; no commit occurs until the owner explicitly commits it.

## Test the supported actions

| Capability | Steps | Expected result |
| --- | --- | --- |
| Welcome/help | Open editor, choose I understand; reopen using the question-mark button | The guide returns on each editor visit unless Do not show this again is checked. Only that opt-in boolean preference is stored locally. Help always reopens it; unchecking restores future welcomes. Local IDE advice stays outside the workbench. |
| Existing-file editing | In Editor practice/main, edit README.md, enter a short message, click Commit changes | Unsaved changes becomes Saved snapshot; a real hash appears. |
| New file | New file → notes2.md or src/Main.java → Create file; enter contents/message → Commit changes | Only one file is committed; the explorer refreshes with the new file. |
| Duplicate prevention | New file → README.md → Create file | Clear already-exists notice and Open existing file; no Git write. |
| Branch selection | Switch main ↔ feature/practice | Actual selected branch files load. Unsaved changes require discard confirmation. |
| First commit | Open First commit practice, edit the prepared README.md, enter Initialize README, click Commit changes | First actual main commit; file/history visible through Back to repository. |
| Unsaved protection | Change source, then select another file/branch or Reload latest | Cancel retains the source; confirm deliberately discards it. |
| Keyboard | Tab/Shift+Tab in source; Escape then Tab | Indentation and a way to leave the editor without a keyboard trap. |
| History | Click View real commit or Back to repository → Commits | Actual Git commit, actor and file changes. Native clone/fetch retrieves the same commits. |
| Stale edits | Keep an old draft open while another client pushes, then commit | Conflict, draft retained, Compare latest; explicitly review/adopt before retrying. |

No terminal commands are needed for normal browser editing. A commit message is a short description, not a Git command. Typing does not save a commit. Empty messages, unchanged files, oversized content and read-only branches keep Commit changes disabled.

## Deliberate V1 limits

One UTF-8 text/source file per commit, up to 64 KiB. Relative ASCII filenames; supported extensions are in Editor help. New Branch creates a feature branch from the selected exact source commit. Merge Branch fast-forwards an authorized target after preview and confirmation; divergent merges use native Git. No file deletion/rename, binary or symlink editing, terminal, compilation, grading, academic submission or persistent draft autosave. A Maintainer account does not override closed/review-frozen/deadline restrictions. Drafts remain in memory and cannot be promised to survive closing/reloading the tab.

## Verification of this refinement

Frontend suite: 602 passed, including 13 Group editor tests. Final focused Group/Activity editing checks: 44 passed. Client lint and production build passed; the pre-existing large-bundle warning remains. Actual browser tests verified the welcome dialog, duplicate prevention, opening existing files, branch selection, new-file creation and a durable commit on feature/practice, plus Maintainer editing/committing on main. Native authenticated Git fetch retrieved both new commits. Desktop/narrow checks are recorded in the owner handoff. Backend authorization/job/migration logic was unchanged; mutable cleanup-based backend suites were not rerun against owner review fixtures.

Source changes remain an isolated candidate refinement. No migration, reset, merge, push or deployment is required or performed for these presentation changes. Preserve the disposable fixture history during manual review.

### Question-mark help and welcome preference

The refined guide uses a question-mark icon button, focused local-IDE advice, a View clone options action, and I understand. The optional Do not show this again checkbox saves only a non-sensitive boolean on this browser. Leaving it unchecked shows the guide again on each editor entry; manual help is always available, and unchecking removes the preference. Closing with X or Escape without opting out does not suppress future welcomes. Unavailable browser storage falls back to showing the guide.

Verification: all 606 frontend tests across 78 files passed, including 17 Group editor tests covering opt-in persistence, repeat welcomes, manual reopening, focus restoration, dismissal and unavailable storage. Client lint, production build and Git whitespace checks passed. The existing large-bundle warning remains. The local editor preview returned HTTP 200. No live credentials, Git commits, database mutations or visual browser checks were needed for this help-only change.

### Three core actions

New Branch: enter a feature name and confirm; source/message drafts move with the editor. Commit Changes: describe the change and save one file through the existing durable commit path. Merge Branch: choose source/authorized target, Review merge, then Confirm merge. Main is reserved for the existing Maintainer authority. Diverged/stale refs refuse the update; review again or use a local client. No branch is created or merged merely by opening a dialog.

Use the separate UI 5213/QA account handoff for the three-action candidate. Earlier UI 5212 fixtures are preserved. See THREE_CORE_GROUP_GIT_ACTIONS_REVIEW.md for current verification and boundaries.
