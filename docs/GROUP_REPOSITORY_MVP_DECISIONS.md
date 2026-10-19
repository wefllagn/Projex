# Group Repository MVP — Product decisions

Status: APPROVED / LOCKED FOR MVP
Approved by: Product Owner
Date: 2026-10-18

## Product Owner scope clarification (2026-10-19)

Native Git clone/commit/push is sufficient for Group Repository MVP. Browser
editing of .java/.md is deferred to a later milestone. Preserve
architecture/GROUP_REPOSITORY_BROWSER_EDITING_PROPOSAL.md with unresolved queued
source retention, job expiry and ambiguous commit recovery. Do not implement its
schema, commit-job system or write endpoints now. UI acceptance remains separate.
Demo database recovery is also deferred; preserve existing Git storage and follow
DEMO_DATABASE_RECOVERY_ISSUE.md. The next development milestone is the previously
approved Admin and Instructor Class Provisioning MVP, not browser editing.

## Identity and domain

Familiar GitHub/GitLab concepts, existing light Projex design and academic context.
Reuse Class → ProjectTask → Team → CLASS_PROJECT Repository, one repository per
Team/ProjectTask. No duplicate Group/Project system. CLASS_WORKSPACE stays individual.

## Formation and membership

Student-led creation is approved. An eligible Student creates the Team/repository
and becomes Maintainer. Eligible classmates receive access only after accepting
the Maintainer's invitation. Preserve active account/enrollment, same-Class,
one-active-Team-per-project, capacity, atomic synchronization, database constraints
and concurrency controls. Instructor assignment is deferred.

## Roles

- Maintainer = existing Team LEAD + Repository OWNER; exactly one, no transfer.
- Developer = existing Team MEMBER + Repository MEMBER.
- Primary and active Co-Instructor = read-only Git oversight, unchanged academic
  management/review authority.
- Admin = existing metadata/operational authority, no automatic source or write.

Maintainers retain supported membership management and main integration. Developers
clone/fetch, commit locally and create/push/delete permitted non-main branches.
No arbitrary role editor or arbitrary user/email invitation.

## Git, merge and review

Preserve protected main, no main deletion/non-fast-forward/force push, rejected
unsupported refs/tags, existing limits. Developers push features; Maintainer
fetches/merges locally and pushes main. No browser Merge, PR or MR.
Preserve Ready for Review / Changes Requested / Approved and write freezes.
Ready for Review is metadata review, not an immutable commit snapshot or an
ActivitySubmission. Accepted pushes are authenticated account signals; Git authors
are self-asserted. No verified commits-per-member or automatic contribution grades.

## Experience and access

Student journey: My Projects → My Group → Group Repository. Prioritize the
Student's active group, invitations and available projects; clearly separate any
legitimate class-visible metadata. Removed repository members receive neither
member-only detail nor source. Current class eligibility gates group metadata and
participant activity; teaching staff retain legitimate oversight.

Academic header: Project, Class, Team, current teaching staff, deadline, Maintainer,
member count and repository/review state. Code | Commits | Branches | Members |
Activity. Reuse real files/history/diffs, bounded plain-text README preview and
honest authenticated push activity. No invented ahead counts or events.

Code dropdown follows Activity UX: credential-free clone URL, username, temporary
token and actual expiry. Scope is derived from backend authority, never a manual
READ/WRITE choice. Secrets stay in component memory, clear on close/unmount/expiry,
ignore late responses, and never enter URLs, logs or persistent browser storage.

## Exclusions and preservation

No instructor-assigned groups, multiple maintainers, transfer, browser merge/PRs,
full IDE/terminal, verified contribution grades, Git submission snapshots, SSH,
Docker, Azure or Admin MVP. Preserve frozen Activity behavior, PERSONAL and
CLASS_WORKSPACE. No speculative migrations. Stop at Group Repository MVP review;
no commit, push or integration before Julius approves.
