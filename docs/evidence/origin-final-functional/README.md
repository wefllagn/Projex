# Final functional verification evidence

See [the handoff](../../ORIGIN_FINAL_FUNCTIONAL_HANDOFF.md) for scope, calculations, compatibility decisions and remaining pilot gates.

- `regression-results.json`: executed suite counts and private log hashes; 1,390 tests passed.
- `migration-preservation.json`: original 40 application tables preserved by additive migration 30.
- `legacy-record-compatibility.json`: original academic rows remain unchanged after real new-model browser work.
- `feature-backup-recovery.json`: fresh paired restore; all 41 tables match, both released 91-point records survive, four Git repositories pass fsck.
- `preservation-after.json`: 5,181 protected fingerprints and original worktree states match; four protected previews healthy on original migrations; all 363 frozen client files match the reconciled RC.
- `manual-class.json`: new preview-only roster size and Activity counts; no fabricated released grades.

Screenshots were captured directly from the isolated browser:

- `weighted-tests.jpg`: importance-based authoring, calculated maximum and visible example.
- `correction-history.jpg`: append-only original 70 → effective 65 correction after release.
- `gradebook-48-dark.jpg` / `gradebook-48-light.jpg`: 48-row overview with five graded Activities per period.
- `gradebook-narrow.jpg`: table contained within the 390px layout.
- `student-gradebook.jpg`: authenticated Student's own released records and period summaries.

Credentials, raw backups, tokens, full runtime logs, row fingerprints and managed Git storage are not included in the repository. Captured identities and academic records are fictional QA data.
