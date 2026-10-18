# Group Repository MVP progress

Status: **IMPLEMENTED — PENDING PRODUCT OWNER REVIEW** (verified, not accepted).
Checkpoint branch: `work/julius-overnight-group-mvp`.
Approved Activity base: `42666278d7987018cdf24af3499d10e7b84c4e4b`.
Product decisions: `GROUP_REPOSITORY_MVP_DECISIONS.md`.

- [x] A: locked decisions; context/effective-authority read contract; catalog/detail
  eligibility reconciliation; PostgreSQL coverage.
- [x] B: Student-led creation reused; My Group separated from class metadata;
  project-specific invitation inbox; no Instructor assignment.
- [x] C: group-only academic header and Code-first tabs; other types preserved.
- [x] D: Code menu rechecks backend permission, auto-scopes, clears memory on
  close/unmount/expiry, rejects late results; no persisted secret/URL credentials.
- [x] E: existing commits/files/diffs/branches/members/activity and Instructor
  presentation reused; protected main and plain-text README preview.
- [x] F: real-Git collaboration, final regressions, desktop/390px walkthrough,
  role-specific Instructor/Developer checks and diff/security review.
- [ ] Product Owner review / acceptance and separate integration authorization.

Verified: frontend 52 files / 352 tests; backend unit 41 / 285;
PostgreSQL integration 22 / 110; real Git 2 / 10; Smart HTTP 1 / 12;
Java 3 / 26. Total: 121 files / 795 tests. Client/server lint and builds,
server type checks pass. Final copy-only correction also passed 6 focused tests.
See `GROUP_REPOSITORY_MVP_IMPLEMENTATION_REPORT.md` for evidence and limitations.
No migration created or normal-development database migration applied.
The newer overnight work order authorizes local checkpoint commits and safe
independent Admin work. No push, merge, deployment or Product Owner approval.
