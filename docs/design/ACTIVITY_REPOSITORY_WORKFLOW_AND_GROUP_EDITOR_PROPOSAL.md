# Activity repository workflow and Group editor decision

Date: 2026-10-22. Working branch: `codex/student-ui-ux-continuation`.
This is an implementation review and bounded proposal, not permission to migrate, integrate, expose, or deploy.

## Implemented Activity and repository workflow

- Activity Detail exposes Open workspace, View repository, and the separate academic Attempt history dialog. The former Activity Repository overlay and its nested automatic credential issuance are retired from normal navigation.
- An intentional workspace/repository action first reads the authenticated Student's Activity association. Existing repositories are reused, including authorized closed/read-only repositories. Only an absent association for an open, published Activity with provisioning enabled triggers the existing POST provisioning service.
- A client single-flight operation absorbs duplicate clicks. Server uniqueness and its serializable creation transaction remain the cross-client authority. The existing service returns 409 for a creation race; the client then reads and reuses the winning association. An ambiguous POST failure is retried by reading the association first. No parallel provisioning service was introduced.
- Pending preparation is polled without overlapping requests for a bounded period; failure and manual Check again remain local to the action. Late results cannot navigate an unmounted Activity. No provisioning occurs from ordinary Activity, repository, dashboard, or list reads.
- Activity repository pages reuse the Group tabs, branch selector, immutable-commit file browser, file finder, latest commit, history/diff and branches views. Activity pages show Code, Commits and Branches; they do not obtain Group membership or review controls. Linked Activity/Class, owner, private visibility, creation date, storage/lifecycle, description and recorded repository activity remain accessible.
- Open IDE uses the existing full-page Activity workspace. Submission history/record Open workspace actions use the same intentional preparation helper. A workspace deep-link itself remains observational and does not create a repository on page load.
- Empty repositories show No commits yet and a contextual Open IDE action. Native Git commands are available inside Code rather than dominating the browser.
- Both Activity and Group Code menus show clone access without issuing a credential. Generate read access / Generate write access are explicit actions. Group issuance rereads server Group authority; the credential endpoint remains authoritative for every repository type. Secrets stay in component memory, clear on close/unmount/expiry/access loss, and are never inserted into clone URLs. Credential metadata and explicit revocation remain available under Manage access. Failed issuance is never automatically repeated.

No backend schema, migration, provisioning transaction, authorization rule, Git worker/hook, official submission transaction, attempt policy, accepted source snapshot, deadline or feedback-release rule was changed by this work order. Git saves and pushes continue to be distinct from official academic submissions.

## Group editor audit: concrete architectural gap

Current evidence:

| Concern | Existing authority / finding |
| --- | --- |
| Browser source operations | `server/src/modules/repository-content/repository-content.routes.ts` exposes GET summary, branches, commits, tree, file and diff. There is no general file-write/commit endpoint. |
| Durable browser writes | `RepositoryCheckpointJob` in `server/prisma/schema.prisma` requires a ProgrammingActivity ID and Student ID, stores one Java source file, and scopes idempotency to Student + Activity. It cannot truthfully represent a Group commit. |
| Worker target | `server/src/infrastructure/git/git-activity-checkpoint-writer.ts` accepts a safe Java entry filename and `main` only, checks the expected HEAD, and performs a normal non-forced push after reauthorization. It cannot safely be reused by supplying a Group repository ID. |
| Group write permission | `server/src/modules/git-transport/git-authorization.ts` requires an active Student, active class enrollment, active team and repository membership, non-VIEWER role, ACTIVE repository/class, open published project before its deadline, and WORKING or CHANGES_REQUESTED review state. |
| Protected main | Updating main additionally requires the repository owner to be the team's lead. Developers cannot gain this permission through a browser editor. |
| Native Git integrity | The existing Smart HTTP receive hook rejects protected-ref violations, unsupported refs, non-fast-forward/force updates and unsafe ref changes. Native Git remains the current functional Group write interface. |
| Concurrent clients | A Group browser save would compete with native pushes and other Students. Immutable reads alone do not supply a durable, authorized compare-and-swap write contract. |

A new Group editor therefore needs backend infrastructure and a schema migration. No fake editor, disconnected browser file store, or nonfunctional Open IDE button was added. Existing Group browsing, membership, feedback, review/freeze controls and native Git remain functional.

## Smallest secure implementation proposed for approval

Approve a bounded Group browser commit feature with these limits:

1. A full-page editor loads an authorized existing branch and its exact commit snapshot. V1 supports bounded UTF-8 text/source files, explicit editing and in-memory drafts. It may add bounded text files to initialize an empty repository only for the authorized Maintainer. Binary files, symlinks, submodules, renames, deletions, merges and force updates stay outside V1.
2. Saving a draft in the editor retains unsaved work in memory. Only an explicit Commit changes operation writes to Git. The repository remains the sole persistent file authority; there is no disconnected draft database or Activity-style Submit, tests, grading or compiler promise. Navigation with unsaved changes requires an intentional discard decision.
3. Introduce a separate durable Group browser commit job with repository/actor IDs, exact branch ref, expected HEAD (null only for authorized first initialization), bounded normalized paths/content, payload hash, scoped idempotency key, commit message, outcome hash, lease/retry state and safe failure codes. Add the corresponding migration without repurposing historical Activity checkpoint rows.
4. Add authenticated, CSRF-protected create-job and own-job-status contracts. Enforce the same Group read/write/main policy at request, worker claim and immediately before accepting the ref update. Reuse existing safe Git process/storage boundaries; Git execution remains outside the API process. Bind author identity to the authenticated user, validate paths/ref names and reject unsupported objects and oversized input.
5. Compare the exact expected branch HEAD at the final ref update, including unborn branches. Concurrent native/browser pushes must result in a conflict rather than silent overwrite. Use an atomic non-forced update path under the existing receive authorization and repository lifecycle coordination; a preflight HEAD check alone is insufficient. Never silently rebase or merge. The UI keeps drafts and offers explicit reload/comparison/retry after conflict.
6. A developer uses an already authorized feature branch; only a Maintainer may establish/update protected main. Viewers, instructors and frozen/reviewed/closed/archived projects do not receive browser write controls, and server denial remains decisive after permissions change.
7. Add focused request/worker/native-push race, stale HEAD, branch protection, role/freeze/deadline, job replay/recovery, safe path/content and editor draft-retention tests before enabling Open editor.

Approval requested: this specific durable Group browser commit API + worker + migration + full-page editor scope. Applying that migration to a normal development database, integration, deployment and non-loopback exposure remain separate approval gates.

## Verification record

Final verification in the continuation worktree:

- `client: npm test` — 77 files, 572 tests passed, including shared browser, provisioning race/retry/cancellation, Student-owner binding, explicit credentials, expiry/revocation, closed/read-only cases and academic submission regressions.
- `client: npm run lint` — passed.
- `client: npm run build` — passed; Vite retains its existing warning about a JavaScript chunk larger than 500 kB.
- `server: npm test -- src/modules/git-transport/git-authorization.test.ts src/modules/activity-workspace-checkpoints/activity-workspace-checkpoint.service.test.ts src/modules/activity-workspace-checkpoints/activity-workspace-checkpoint-worker.service.test.ts src/modules/repositories/repository.service.test.ts src/modules/repository-content/repository-content.service.test.ts` — 5 files, 21 tests passed.
- `git diff --check` — passed. HEAD remains `53ee6d9`; no changes staged or committed. All 15 pre-existing untracked files remain and there are no deleted paths.
- Browser check on the existing loopback review environment: Activity Detail → View repository reused the existing association and navigated directly with Class context. The shared empty repository and Code menu were inspected at the desktop viewport and at 390 × 844. The temporary viewport override was reset. Opening Code displayed no token. No live credential was generated, submission/attempt created, or live source committed/pushed for visual verification.

Creation races, cancellation and credential mutations were verified with isolated mocks/unit tests. Full live multi-user/native-Git end-to-end testing and deployment preparation remain subsequent work; this report does not claim those were run. Existing backend dirty files predate this work order and were preserved. No database migration or dependency change was made.
