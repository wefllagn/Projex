# Minimal Group repository editor — owner review

STATUS: READY for owner review as an isolated implementation candidate. Integration and deployment are not approved or performed.

## A. Implementation

Group Repository → Open editor opens a full-page Student workspace with real repository identity, existing branch selection, file browsing, bounded file creation/editing, unsaved-change protection, explicit message/commit, durable outcome and return-to-repository links. The small local-IDE recommendation is dismissible. Existing Projex styling is retained.

## B. Reuse

`SourceEditorSurface` and `source-editing.js` extract the existing Activity editor's textarea, line numbers, indentation guides, scrolling, Enter/Tab indentation and Escape-then-Tab accessibility. Java file import, entry-class rules, execution, official submission and checkpoint semantics remain in their original wrapper. The baseline has no syntax-highlighting engine; none is newly promised or introduced. Existing shared request, confirmation and bounded-polling patterns are reused.

## C. Capabilities and limits

One UTF-8 text/source file per commit, at most 64 KiB, safe ASCII relative path up to 240 characters, explicit single-line message up to 300 characters. Extensions: java, md, txt, json, js, ts, jsx, tsx, css, html, xml, yaml, yml, sql, py, c, h, cpp. Existing branches only. No terminal, compiler, test runner, grading, autosave, branch creation, deletion, rename, binary/symlink/submodule editing, automatic merge/rebase or force overwrite. Drafts remain in memory and require deliberate discard; they are not persisted across closing/reloading the tab. Existing executable text files keep their mode.

## D. Empty initialization

Authorized Maintainers can initialize an empty main with README.md through the editor. Opening the page prepares only a draft and never creates a Git commit. Ordinary Developers cannot initialize or update protected main and are directed to their Maintainer/existing feature branch. Native clone remains available.

## E. Real commit and authorization

Authenticated Student + CSRF + existing native Git read/write/branch policy at request time. The separate worker fences its lease/claim, locks policy rows and reevaluates active account/class/team/repository membership, lifecycle, due date and review state before publishing. Server-controlled UUID identity binds author and committer. Atomic `update-ref` compares exact expected HEAD and creates a private job receipt together. Native pushes win safely with a conflict. Receipt recovery handles interruption between Git publication and database completion without duplicate commits. Idempotent retry cannot expand authority or start a new frozen write. Terminal jobs clear content. Hidden receipts cannot be pushed via native transport. No Activity identities or evidence are repurposed.

## F. Migration and runtime

Migration: `20261023000000_group_browser_commits` (one new Group-only job table, direct User/Repository relations, existing generic job-state enum).

SHA-256: `12a4c117ef8579550334e56d0bbe4512065695840cd3321b2149606f64e1eb78`.

Validated only in the newly created PostgreSQL cluster at loopback port 55513, database `projex_test`, with isolated Git storage under an owned temporary QA root. All 26 migration checksums match and migration status is current. `prisma validate` passes. The new table matches the Prisma mapping. A raw schema-only ORM diff still reports baseline SQL defaults/constraints/index names; comparison against base SHA shows the same existing differences. No reconciliation migration/reset/db-push was attempted.

Requires the existing supported Git executable, managed storage, PostgreSQL migration, and separate `git-worker` process. No new dependencies. Group job scheduling preserves provisioning/Activity checkpoint progress. The QA API runs on 5352 and frontend on 5212, loopback only. Java execution is disabled in this Group-only preview; separate Java worker regressions ran successfully. Preserved demo/review databases and Git roots were not targeted.

Unknown post-publication outcomes retry every 30 seconds until the receipt is resolved; persistent infrastructure failure requires operator recovery. The UI bounds automatic polling and offers status checking. Prepared unreachable Git objects may remain after refusal; storage limits still apply. Receipts/history are retained. This is not production isolation or deployment approval.

## G. Verification actually run

| Check | Final result |
| --- | --- |
| Full frontend Vitest | 595 passed |
| Final affected editor/Java frontend rerun after polish | 37 passed |
| Backend unit Vitest | 399 passed |
| PostgreSQL integration, serial | 121 passed in 24 files |
| Real Git provisioning/Activity/Group suites, serial | 26 passed in 3 files |
| Native Smart HTTP regression suite | 12 passed |
| Client/server lint | Passed, no remaining warnings |
| Backend/application and integration type checks | Passed |
| Client production build and server/worker build | Passed |
| Prisma validate / migration status / applied checksums | Passed / 26 current / all match |
| Git diff whitespace | Passed |

Initial regression attempts exposed missing test-worker runtime values, supplied only to test processes; all final suites above passed. The frontend build retains the existing warning for a bundle above 500 KiB. Existing bounded repository inspection can return a temporary 503 during rapid overlapping requests; the actual editor Try again action recovered successfully without losing a draft. Limits were not relaxed.

Actual browser acceptance (not fixtures): Maintainer navigated the empty Group repository, opened the editor, edited README.md, explicitly committed and returned to the real repository browser. Native authenticated Smart HTTP clone retrieved commit `f81870c2351cf82b9e8b4d1cee2c7802315d4fbd`. Native Git created/pushed `feature/group-editor`. Developer saw protected main, selected that existing branch, edited README.md and explicitly committed `82d5ea97d3b29195b06a4d7ed6ec636fce84eb48`. Native fetch verified exact content and server-bound Developer author. Existing repository history displayed both browser commits and a later native commit.

Actual API checks: anonymous 401; Viewer and protected-main Developer 403; unrelated Student 404; Instructor/Admin 403; missing CSRF 403; unsafe paths 400. No denied request created a job.

Actual native/browser stale conflict: browser retained an older file draft; native Smart HTTP push advanced the feature branch; browser commit became CONFLICTED, preserved source/message and displayed the separately fetched latest file. No overwrite/success was fabricated. Canceling a discard confirmation retained the draft; Escape then Tab moved focus to the message field. Desktop 1280px and mobile 390×844 layouts were inspected; mobile page width 375px, no horizontal document overflow, bounded editor height about 405px. Automated tests additionally cover worker interruption/receipt recovery, queued permission withdrawal, frozen/closed/deadline states, unsafe existing Git objects, binary files, case collisions, path validation, failed-job retention and identical-key network retry.

Final live audit: exactly two successful browser jobs and one conflicted job, all terminal content cleared, no Activity submissions/checkpoint jobs created by this feature.

## H. Isolation and changed files

Branch: `codex/group-browser-editor-mvp`.
Base: `19fb0f33bbef532af902c8b056a9bc98cfdcc2cd`, verified against the Windows acceptance checkpoint evidence.
Candidate SHA: use the final handoff / `git rev-parse HEAD` on this isolated branch (a commit cannot contain its own SHA).

The original continuation remains at that base with its 18 modified files and 3 untracked entries preserved. The newer uncommitted panel/returned-grade refinements are intentionally absent from this candidate; they were not copied, merged or overwritten. Historical branches, worktrees, databases, storage and review records were left intact. No push, merge, cherry-pick or deployment.

Changed-file inventory is grouped by function below; the final handoff includes the exact Git manifest.

- Shared source surface/editing helper; Java wrapper/helper extraction.
- Group editor component, validation/API/CSS and focused tests.
- Student route registration and Group repository/empty-state editor entry.
- Group job schema/migration, validation/service/router/worker and real Git tests.
- Typed Git runner input, atomic Git writer, hidden transport receipt namespace, transactional authorization projection.
- API/worker wiring, guarded QA cleanup and this review/owning architecture documentation.

## I. Owner preview

- Login: http://127.0.0.1:5212/student-login
- Repository: http://127.0.0.1:5212/student/projects/b8eaf5af-fe3d-4f53-bda8-7b05a162f5ff/repositories/952ea7b4-0888-4afe-b890-759b2f33ec26?classId=ed8551ed-fb91-4bde-9d54-b4967105cd8c&tab=code&branch=feature%2Fgroup-editor
- Commits: http://127.0.0.1:5212/student/projects/b8eaf5af-fe3d-4f53-bda8-7b05a162f5ff/repositories/952ea7b4-0888-4afe-b890-759b2f33ec26?classId=ed8551ed-fb91-4bde-9d54-b4967105cd8c&tab=commits&branch=feature%2Fgroup-editor
- Editor: http://127.0.0.1:5212/student/projects/b8eaf5af-fe3d-4f53-bda8-7b05a162f5ff/repositories/952ea7b4-0888-4afe-b890-759b2f33ec26/editor?classId=ed8551ed-fb91-4bde-9d54-b4967105cd8c&branch=feature%2Fgroup-editor

Fictional QA sign-in details are in the private QA `review-access.txt` file outside Git; see the final handoff link. The browser is left signed in as Developer, with a retained conflict draft in one tab and actual repository history in another. To demonstrate fresh initialization again, use a newly approved disposable fixture rather than deleting/rewriting this Git history. To edit protected main, sign in as QA Maintainer; Developer uses the existing feature branch.

Read-only evidence and logs live outside Git in the new QA root. Screenshots live under this chat's visualization folder. Preserve that environment for manual review; do not rerun cleanup-based integration suites while reviewing these fixtures.

## J. Integration recommendation

READY for Product Owner/independent reviewer assessment of this isolated candidate. No unresolved data-integrity/authorization defect was found in completed checks. V1 limits and temporary inspection recovery above remain explicit. Integration with the dirty UI continuation, migration of any preserved database, Friday candidate inclusion and deployment require separate owner approval. Native Git remains the presentation fallback.
