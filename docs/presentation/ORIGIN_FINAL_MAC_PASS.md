# Origin final Mac presentation readiness

Verified locally on 23 October 2026 (Asia/Manila). Application fixes: `a7abde1113792d88642de8023a92d9cc150005fc`, based exactly on `94861c77309903f912d631450984e5e8c58cb1e8`. Only `fix/origin-final-pass` is published. The final documentation checkpoint is obtained with `git -C ../origin-final-pass rev-parse HEAD`; controllers are pinned to that final reviewed clean checkpoint.

Primary frontend: **http://127.0.0.1:5198/**. API: **http://127.0.0.1:3024/api/v1/health**. The primary remains running for manual inspection. Use this exact hostname to preserve cookie isolation from frozen Projex at `http://localhost:5196/`.

| Resource | Origin identity |
|---|---|
| Application worktree | `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-final-pass` |
| Private operations root | `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/origin-presentation-20261023` |
| Dedicated PostgreSQL cluster | `pgdata/` under this operations root; loopback port **55492** |
| Database / restricted application role | **origin_presentation / origin_local** |
| Managed Git root | `git-managed/` under this operations root |
| Java jobs / preview-only mail | `java-jobs/`, `mail-preview/` under this operations root |
| Private credentials | `private/accounts.json` (600); never publish or project |
| Private environment / process identities | `private/server.env`, `private/pids.json` |
| Fresh standby | **origin_presentation_standby**, `restores/standby/git-managed` (services stopped) |
| Completed destructive rehearsal | **origin_presentation_rehearsal**, `restores/rehearsal/git-managed` (services stopped) |
| Final recovery guard proof | **origin_presentation_guard_verify**, `restores/guard_verify/git-managed` (not started) |
| Verified paired Origin backup | `backups/ready-20261023T053006Z/` |

The new cluster, role, databases, storage, signing secrets, jobs, process logs and configuration are independent of the frozen presentation. Its original paired backup was read and verified, not modified. Restored account hashes and private credentials remain consistent. No account was reset, no grade or Git object was fabricated, and no migration was added or applied to a preserved database.

## Academic starting inventory

Exactly **5 accounts, 2 Classes, 5 individual Activities, 1 Group Project, 1 team, 2 repositories and 3 official submissions** in primary and standby. All 28 migration SQL checksums match the Origin source.

| Class | Activity | Primary demonstration state |
|---|---|---|
| Computer Programming 1 — CS101 | Prelim Programming Exercise No. 2 | Reviewed/released, genuine 100/100 |
| CS101 | Palindrome Checker | Published, **zero official attempts used** |
| CS101 | Student Grade Calculator | Published, unsubmitted |
| Computer Programming 2 — CS202 | Classes and Objects: Student Record | Assessed, awaiting Instructor review |
| CS202 | Fraction Class: Basic Operations | Reviewed/released, genuine 100/100 |

Separate Group Project: **Prelim Group Project 1 — Fraction Arithmetic**. Repository **CS202AlvarezBennettPrelimGroupProject**, package **edu.slu.prog2.pregroup01**. Sofia Alvarez is Maintainer; Noah Bennett is Developer. Original main/feature head **bc5725a43ef611b62292855d692373d4f203a2b2**, with all three genuine original commits and membership/provisioning records retained.

Accounts: instructor@origin.test (Dr. Elena Cruz), student@origin.test (Alex Morgan), leader@origin.test (Sofia Alvarez), member@origin.test (Noah Bennett), admin@origin.test (Claire Reyes). Read passwords privately from the credentials file. Admin retains the existing Instructor login entry; there is no separate Admin login URL in the approved architecture.

## Application fixes and evidence

The login controller previously redirected every authenticated login-page visitor to the current role dashboard. Cross-role visits now show the requested explicit account-switch state; same-role visits and the shared Admin entry keep their existing behavior. Switching waits for the CSRF-protected backend logout, then clears auth/credential state and leaves the requested login form. Network/server logout failures remain retryable. A current session is never logged out simply by visiting the landing page or using Back/Forward. New-role permissions still come only from actual backend authentication.

Backend session revocation, role authorization, CSRF and cookie configuration are unchanged. Captured access/refresh cookies were actually rejected after logout. Student and Instructor Admin denials, legitimate Admin access, missing-CSRF rejection, failed credentials and browser Back/Forward after logout passed. Session expiration is covered by automated backend regressions; a wall-clock idle-expiry rehearsal was not repeated.

Seven light-mode color tokens improve page/surface separation, borders, controls and secondary text. Dark tokens are unchanged. One scoped `margin-inline-start: auto` aligns the Instructor account control to the right. No card, page, sidebar, button, font-size, padding, spacing, IDE column or Group editor layout was redesigned. Desktop and narrow role-switch screens were inspected; both separators passed Arrow-key and pointer resizing.

Checks passed: **665 frontend tests, 421 backend tests, 36 real Java tests** (1,122 total); both lints, backend and integration type checks, Prisma validation, both builds and Git whitespace validation. Full destructive PostgreSQL integration/real-Git regression suites were not repeated against presentation resources. Actual worker-backed browser workflows and bounded live API checks supplied integration evidence.

The complete browser rehearsal ran only on `origin_presentation_rehearsal`:

- Student Java Scanner prompt appeared while running; Enter sent Level and returned Palindrome, exit 0.
- All three visible tests passed. Save to Git succeeded against the real workspace.
- Official Palindrome submission **7ac8d1ef-4b58-4bda-a1d5-e7d3b0ad507e** was genuinely assessed, 4/4 tests, 80 automatic points; Instructor inspected submitted code/results, saved 20 reviewed points and real feedback, then released 100/100. Student saw the returned grade and feedback.
- Group Maintainer created `demo/origin-final-rehearsal`; Developer committed a real README edit at **24604e936e737c051006bb26fb8f2e942807472b**. Maintainer reviewed one commit/file and completed a real fast-forward. Git ancestry, matching heads and fsck passed. Primary retains the original head.
- All five identities authenticated in the browser. Admin academic management/operations rendered real data. Preserved Fraction 100/100 and feedback were also checked as Student.

Recovery passed: paired backup/restore checksums, counts, all migration checksums, DB/repository markers and native Git validation; cold startup with all four services; recovered authentication; actual interactive Java worker execution; Git source access; nonmember 404 concealment and Developer protected-main 403 denial; Admin health; controlled shutdown. Standby keeps zero official attempts.

See **ORIGIN_DEMO_WALKTHROUGH.md** for the 15-minute sequence and **ORIGIN_RECOVERY.md** for startup, shutdown, backup, fresh restore and exact commands. Java references are in `solutions/`. Machine-readable evidence and screenshots are in `evidence/`.

## Operational limits

No local presentation blocker remains. The Admin UI says **Workers Not monitored** by design; process checks and completed jobs supply worker evidence. Browser autofill can replace an earlier identity: replace both fields and verify the dashboard name. Keyboard Enter was used successfully for Group merge review/confirmation. The Vite build retains an existing >500 KB chunk warning. Public exposure/deployment, hosted Java isolation and a new deployment platform were not attempted.

The original Projex services remained online; no command migrated, reset, modified or stopped its database, credentials, Git root or services. All 89 sampled original scripts/private configuration/storage file hashes remained identical, and fallback frontend/API health remained 200/connected. All historical worktrees and protected branch refs were preserved.

**ORIGIN FINAL MAC PASS & PRESENTATION — VERIFIED**
