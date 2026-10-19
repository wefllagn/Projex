# Group preservation and final-verification checklist

Inventory checked 2026-10-19 from the existing separate Group worktree. No Group
file, Git storage, branch, staged state or database record changed in this Admin task.

Branch: work/julius-overnight-group-mvp. HEAD: 9203a2c827e8f68e07e920a8a246d34b6d33af42.
HEAD alone does not contain the latest UI implementation. The preserved pending
inventory is 23 modified tracked files plus 128 untracked files, nothing staged.
Tracked diff: 1,253 insertions / 222 deletions in 23 files; untracked content is
additional and is not represented by that diff statistic.

| Pending-file category | Count | Treatment |
| --- | ---: | --- |
| Application source/styles | 26 | Preserve; review tracked AND untracked implementation |
| Tests | 19 | Preserve; review nearest feature and security regressions |
| Generated icons/contact sheets | 87 | Existing kit; do not regenerate or blindly stage |
| Asset export tooling | 1 | Review separately from generated output |
| Documentation/guidance | 18 | Includes handoff, proposal, error standard and recovery issue |

No installed skills appear in the Group pending inventory. Installed skills are
instead present in the separate Admin worktree (173 untracked skill files plus
skills-lock.json), and remain user-owned. Group pending filename screening found
no environment/private credential/log/dump/build/coverage/tmp/output paths. This
is a filename inventory, not certification that all file contents are secret-free.
Runtime artifacts and private review credentials must stay outside either diff.

## Preservation and acceptance gates

- [x] Non-destructive Group inventory; no reset, discard, overwrite, merge or staging.
- [x] Browser editing remains deferred; preserve the proposal and unresolved
  queued-source retention, job expiry and ambiguous commit recovery decisions.
- [x] Missing demo records are NOT reconstructed/restored. Existing Git untouched.
- [x] Admin work continues independently; no automatic Group cherry-pick or copy.
- [ ] Product Owner reviews Group tracked/untracked source, tests, docs and assets.
- [ ] Review file contents for secrets before any explicitly approved staging.
- [ ] Establish disposable DB/storage isolation before future mutable Group suites.
- [ ] Complete outstanding Smart HTTP and current search-popover desktop/mobile
  verification against separately authorized safe fixtures; old screenshots do
  not verify the current popover.
- [ ] Resolve the separately deferred database recovery issue only under a future
  explicit recovery work order. Git does not recover deleted academic DB history.
- [ ] Final UI acceptance, commit, push and integration each require approval.

The current Group handoff and separate recovery issue remain in that worktree's
docs/design/GROUP_REPOSITORY_FINAL_HANDOFF.md and docs/DEMO_DATABASE_RECOVERY_ISSUE.md.
This checklist does not promote Group work to an approved integrated baseline.
