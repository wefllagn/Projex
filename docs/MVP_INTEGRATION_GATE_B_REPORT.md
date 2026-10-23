# macOS Gate B execution report

2026-10-20, Asia/Manila. Developer evidence for the Product Owner and separate
Development Reviewer. **Suite verification passed; the full browser gate remains
incomplete.** No final MVP acceptance is declared. This report records actual Mac
execution and explicitly identifies API/native proof and blocked UI checks.

## A. Branch, HEAD and candidate

Worktree: `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/projex-gate-b-macos`.
Branch: `codex/mvp-gate-b-macos`.
HEAD: `a6ef2427a7e27183977c9b66ff6ce14b988bf6f7`.
Single parent: `5da3ef767fa29a0c01294788ee941dc885bc0fbc`.
Message: `fix: support native git on macOS`.

That local checkpoint contains exactly the eight approved compatibility files
(296 insertions, 38 deletions), and its complete staged diff matched the reviewed
snapshot. The original checkout remained clean. No push followed the commit.
The full Gate B work order then authorized execution and bounded defects, while
explicitly excluding any further staging/commit. The tested candidate is this
HEAD **plus the unstaged fixes listed in N**, not the unchanged checkpoint alone.

## B. Exact resource and database identities

Root R: `/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7`, mode 0700,
new task ownership marker. Absence, plain ancestors, disjoint storage, free ports,
canonical executables and runner cleanup were checked before creation.

| Resource | Actual identity |
| --- | --- |
| PostgreSQL | 18.6, system identifier `7698462431321079325` |
| Data directory / private socket | R/pgdata; R/pgsocket |
| TCP / postmaster | 127.0.0.1:55483; task PID 11812 |
| Operator | projex_macos_gate_b_operator |
| Test database / owner | projex_test / projex_macos_gate_b_test |
| Review database / owner | projex_mvp_review / projex_macos_gate_b_review |
| Suite temp / guarded Git parent | R/test-temp; R/tests/projex_git_test |
| Review Git / Java / mail | R/review/git; R/review/java-jobs; R/review/mail |
| Review frontend / API | 127.0.0.1:5192 / 127.0.0.1:3321 |

The owners are separate non-superusers without CREATEDB/CREATEROLE; PUBLIC
CONNECT is revoked. Each restricted identity and cross-database denial was
verified. The operator never enters suite or app environments. Independent
control-file, PID/command, canonical data-directory, operator SQL address/port/
system-ID and restricted connection checks ran before each serial mutable suite.
Final inspection found no test consumers, only recorded review connections.
Only the approved loopback listeners were found on the three new ports.

Canonical tools: PostgreSQL tools under
`/opt/homebrew/Cellar/postgresql@18/18.6/bin/`, Git
`/opt/homebrew/Cellar/git/2.55.0/bin/git`, backend
`/opt/homebrew/Cellar/git/2.55.0/libexec/git-core/git-http-backend`, and Java/javac
under `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/`.
No installation, upgrade or persistent environment edit was needed.

## C. Migrations

Exactly 24 existing committed migrations were deployed through the existing
procedure to **each** new database. Final read-only inspection checked all 24
finished rows in each database, no rollback, and every migration checksum against
its committed migration.sql. No schema changes, generated migrations, reset,
db-push, original DB connection or drift acceptance occurred.

## D–G. Newly executed Mac suites

All four suites ran sequentially against attested exclusive test resources.
Review fixtures were established afterward in the separate review database.

| Section | Real command | Final actual result |
| --- | --- | --- |
| D — PostgreSQL integration | npm run test:integration | 23 files, **114 passed** |
| E — Java | npm run test:java | 3 files, **26 passed** |
| F — Native Git | npm run test:git | 2 files, **11 passed** |
| G — Smart HTTP | npm run test:smart-http | 1 file, **12 passed** |

The integration run exercised real cookies/CSRF, account/Class/enrollment
contracts, authorization, submissions, Group capacity/concurrency, academic
records and safe administrative projections. Java executed the installed JDK
with bounded temp jobs. Git provisioned and inspected real bare repositories.
Smart HTTP exercised actual native transport, membership/credentials, protected
main, review freeze, read/fetch and hook validation.

Initial failures/skips are retained in private logs: concurrent invitation
acceptance exposed a raw-query serialization retry gap; the Git fixture asserted
Windows suffixes on Mac; Smart HTTP required execution permission on readable
compiled JS and generated non-executable POSIX wrappers. These were corrected
and affected suites rerun to the all-pass counts above. An initial integration
launcher attempt also exposed the test-only tsx IPC requirement; its narrow temp
socket allowance was corrected before successful execution.

The explicit test environment excludes private original/review credentials and
uses a disclosed review-only preload to force ephemeral HTTP listeners to
127.0.0.1 and support test-runner IPC only within canonical TMPDIR. It changes no
production authorization or test assertion. Existing suite teardown deletes only
the exclusive test DB's application fixtures and sentinel-owned UUID Git child;
review storage is never supplied to it. Local-process Java is controlled local
proof, not a hosted or production isolation certification.

Historical Windows counts 114/26/11/12 are separate prior handoff evidence.
Windows was not rerun here. Matching counts above are fresh Mac execution.

## H. Three-role academic, Activity and Group workflows

New fixtures comprise one Admin, Primary/Co-Instructor and 18 Students, including
Maintainer/Developer roles. All are fictional example.invalid accounts. Existing
provisioning/setup contracts were used; no original data or repository metadata
was restored. Password activation was API-based; it is not claimed as browser
account-setup verification.

**Actual Admin/Instructor/Student browser chain:** Admin provisioned the Primary
Instructor; that Instructor signed in, created Gate B Programming Lab without a
mandatory Course, invited a Co-Instructor, and created the draft Double Integer
Activity and its visible test. Student 10 signed in and joined using the
Instructor-generated Class code through the real enrollment dialog, then opened
the published Activity and coding workspace.

Actual browser Run Code used Student stdin 21 and produced 42. Run Visible Tests
passed the Instructor's 7 → 14 example. Browser Save to Git completed. The
Student cancelled the official Submit dialog, then deliberately submitted once;
Attempt 1 reached Assessed with the submitted Scanner source and passed case.
The Instructor opened the real cross-Class review queue, inspected immutable
source and 100/100 automated evidence, and saved private feedback. On resumption,
read-only inspection confirmed release had completed at 2026-10-19T20:09:00.479Z
(October 20, 04:09 Asia/Manila). No release mutation was repeated. The actual
Student browser then showed Released, credited 100/100, saved feedback, passed
output 14 and the unchanged submitted Scanner source; one attempt remains used.

Class ID: `00ccde2b-a091-4d05-a983-df9af178de86`.
Browser Activity: `316baa4e-6f36-43c8-87bd-4198d1402f80`.
Browser submission: `17b4688c-11ac-4c73-843e-9e54eac19eef`.
Browser-created repository: `9a9f50a0-bb81-44a5-8a8d-aae86530f3c5`.

**Actual native/API proof on that browser fixture:** native clone obtained the
saved Scanner source, then commit/push changed Git Main.java to print 999.
Read-only API checks confirmed one attempt before and after and unchanged
submitted Scanner source. Git push never became academic Submit.

**Separate API/Java/native backstop, not browser proof:** another clearly named
Activity exercised 21 → 42, visible tests, checkpoint, native clone/commit/push,
zero attempts until explicit Submit, immutable browser-source contract, automatic
assessment, Instructor review/release and Student-visible 100/100 feedback.
Its submitted source differed from Git HEAD and remained preserved.

**Group API/native proof, not completed browser walkthrough:** the Instructor
created/published Gate B Collaboration; the Maintainer created Gate B Team and
its repository. Seven invitations were accepted, producing eight active members;
a ninth invitation returned 409 TEAM_CAPACITY_REACHED. Native Maintainer clone/
initial main push, Developer feature push, rejection of Developer main push,
Maintainer fast-forward integration and Instructor read-only clone passed.
Instructor write issuance/push was denied, and Admin/nonmember source reads
returned 404. Ready for Review froze writes; the same still-valid credential
could fetch, as could the Instructor. A rejected post-freeze push was not
misreported as successful. Repository:
`4779ef92-7b33-4821-8fbb-16cde59e1baf`.

**Resumed Group browser proof:** Instructor opened the original frozen repository,
viewed commits and both branches, eight active members with Maintainer/Developer
roles, Primary/Co-Instructor Git read-only access, and searched `notes` to obtain
StudentNotes.md. ArrowDown/Enter opened its actual content. Student 09's nonmember
view of that repository showed only Class-visible metadata and no source.

Student 10 then created **Gate B Browser Team / Gate B Browser Collaboration**
through the real project page; provisioning reached READY. The browser invited
Student 09 with loaded-Classmate search, showed one pending reserved place, and
Student 09 accepted through My Repositories. Maintainer/Developer source access
was verified. New repository: `e1b486ab-6841-4a8a-8522-3ceef6f05718`.

Real native Git on this browser-created Group established main, pushed a Developer
feature branch, rejected Developer main and allowed Maintainer integration.
The Maintainer cancelled, reopened and confirmed the browser Ready-for-Review
dialog once. UI showed Ready For Review / Git read-only. A new feature commit
could not push, while the same unexpired credential could fetch. The earlier
eight-member capacity / ninth-invitation rejection remains separate API proof,
with the eight-member state additionally inspected in the browser. Group
contextual metadata restriction and back/navigation worked; deliberate transient
transport failure injection in the browser was not performed. Existing regression
tests cover that recovery; no visual claim is made for a synthetic API check.
Co-Instructor invitation was browser-created; acceptance was API-based.

## I. Seven Admin destinations

| Actual browser destination | Observed evidence |
| --- | --- |
| Overview | Real 21 users (18 Students, two Instructors, one Admin), one Class, four repositories, two submissions and two teams before the separate publish probe; probe increased Activities from two to three |
| Users | Browser provisioning and duplicate-email safe recovery retained name/email; actual 21-user Next page, role filter reset page two to page one with two Instructors; earlier Maintainer search passed |
| Classes | Real active Class and 10 enrolled Students; Archived filter returned truthful empty state, Active restored the row; Manage showed term/year, Primary/Co-Instructor, roster and bounded controls with code unrevealed |
| Course Catalog | Fictional GATEB101 preserved; actual row, search, populated Edit dialog and cancellation observed; original browser creation was not repeated |
| Academic Records | Hub navigation, actual Activity/repository/submission tables, two released 100-point submissions, status/type filters and safe metadata; no source/Git/credential issuance or grading controls offered |
| Operations | API Available, DB Connected, Workers Not monitored; six succeeded execution jobs, four provisioning jobs and four measured repositories; provenance disclosures state that leases do not establish worker health or host/storage readiness; actual job/type filtering and safe credential metadata rendered after fix |
| Audit Events | Real 20-row list; Instructor-provision filter returned two rows; authorized detail and Escape close observed; strict projections preserved |

All seven destinations now have actual populated browser proof where their
contracts provide data. Destructive/irrelevant recovery controls were not invoked
to manufacture failures. Duplicate-email proof remains the earlier actual review
API/browser result with retained form values and safe screenshot outside Git.

## J. Activity publish confirmation

The actual Publish control opened the native “Confirm publish for this
activity?” dialog. The browser's documented dialog API returned no dialog and
native interaction stalled. A read-only check during the block showed DRAFT
with publishedAt null. The user subsequently reported cancelling the prompt;
after control resumed the actual UI instead showed Published and “Activity
publish succeeded,” and the Student could open the published Activity.

The original Activity was never published through an API workaround and was
not republished. These observations establish the real prompt and one successful
browser-origin publication, but **do not establish reliable cancellation
semantics or a clean automated confirm/cancel pair**. The user's cancellation
report conflicts with the resulting published state. Preserve that limitation;
do not classify the historical Windows API workaround as Mac dialog proof.
A separate draft and unambiguous human-assisted Cancel/OK observation are still
needed, without publishing the same Activity twice.

## K. Responsive and interaction verification

1366×768 was used for observed Admin/Instructor/Student browser workflows.
Admin duplicate-email retained inputs, Users pagination/search worked, and the
provisioning modal closed with Escape and restored focus. Official Submit
cancel/confirm created only one attempt. Contextual error copy was safe.

A real unsaved-source loss on workspace → Activity navigation was found and fixed
(see L). The resumed actual browser verified the link guard, Back guard, Escape,
Keep editing, focus and Tab containment, unchanged probe source, and deliberate
discard only after explicit choice. No extra academic attempt was created.
At the current desktop, DOM measurement confirmed viewport/scroll width 1366 and
main width 1080, with no page-level horizontal overflow on Admin Overview.

The supported viewport capability timed out twice when asked for 390×844, before
it changed the actual 1366px viewport; no responsive pass is claimed from those
attempts. Wide desktop, approximately 390px mobile, mobile dialog scrolling and
the full role/viewport overflow matrix remain unverified due this tooling
limitation. Existing unit breakpoint tests are not substituted for visual proof.

## L. Bounded defects and retesting

1. Prisma P2010 with PostgreSQL 40001 from row-lock queries now enters the existing
   bounded three-attempt serializable retry. Three regressions cover success,
   the bound and non-retry of unrelated failures. No isolation/authorization
   reduction; integration rerun passed 114.
2. Native Git fixture checks the host format while preserving Windows suffix and
   windowsBuild expectations. Native Mac rerun passed 11.
3. Smart HTTP distinguishes readable compiled Node scripts from executable
   binaries/wrappers, writes new wrappers 0700 and fails closed for invalid
   existing wrappers. Four unit regressions preserve missing/link/non-executable
   rejection. Cleanup no longer masks a setup failure before server creation.
   Real Smart HTTP rerun passed 12.
4. Audit and generic operational-list mapping no longer pass an array index as
   a projector's optional expected identity. Strict projectors remain unchanged.
   Multi-row regressions cover Audit, execution, provisioning and Git-credential
   lists. Actual populated browser lists/filter/detail recovery passed.
5. Unsaved Activity code now blocks internal route/history departure with a
   focused stay/discard dialog. Escape preserves source and restores focus;
   Tab is contained. Existing beforeunload remains, no browser storage is added,
   and successful official acceptance can navigate to its immutable record.
   Route and Back regression and actual browser cancellation/focus/source
   preservation passed.
6. Admin Activity repositories are accurately labelled Activity workspace rather
   than the Group-project fallback. The safe metadata-only projector is unchanged.
   Regression and actual two-row Activity-type browser filtering passed.

Fresh non-DB checks: server **45 files / 333 tests passed**, lint, production and
integration type checks passed; compiled server build passed in the transport
runner. After the latest frontend fixes: fresh client **67 files / 492 tests passed**,
lint and production build passed. Fresh resumed server unit **45 files / 333 tests**
and server lint/both type checks also passed. The four mutable suites were not
rerun during resumption; their preserved earlier Mac results remain the evidence. Existing bundle warning remains (~1.27 MB
minified main JS); no dependency change was made. A failed first new regression
was a test-input escaping mistake; its corrected rerun and full client suite pass. The first new Activity-label test assertion also
matched a legitimate filter option; scoping it to the actual row corrected the
fixture assertion and all 492 tests pass.

Resumption tooling deviation: an attempted nonexistent test:unit script ran no
tests but reused server-gate-b-unit.log/json, replacing the earlier unit log.
The preserved four mutable-suite logs and other evidence were unaffected. Fresh
333-test output is retained as server-resume-unit.log/json. The helper now opens
new log files exclusively and refuses overwrite; do not treat the failed script
invocation as a failed product test or as the historical successful unit log.

## M. Security and original preservation

Original checkout `/Users/iluvza/Development/Projex` remains clean on main at
`af819aacf12f014321807e6cf80fc4b4b875cd77`. Recorded private environment, schema and
both lockfile hashes match the baseline. The original PostgreSQL datadir
`/opt/homebrew/var/postgresql@18`, system ID `7681333450351963468`, port 5432 was
never connected to or targeted. Its listener was observed read-only through
lsof. No original storage, data, refs, dependencies or configuration was changed.

Fresh diff checks found no new schema/migration/dependency, private config,
generated artifact or generated-secret exposure. Git index is empty. Windows
version/long-path behavior and environment allowlist remain; cookies/CSRF,
source authorization, academic-source/attempt rules, protected main, native
command restrictions, symlink/plain-path and review-freeze controls remain.
Private credentials/logs are outside Git; credentials are not included here or
in screenshots. No public listener, push, merge, reset, clean, rebase, deployment
or whole-root/cluster teardown was performed.

## N. Changed files and Git status

The exact checkpoint-eligible set is **18 source/test/documentation files**
listed below, subject to Reviewer and Product Owner approval. All remain
**unstaged and uncommitted**, on the checkpoint above.
No second commit SHA exists. Modified tracked files:

- AGENTS.md
- client/src/admin/AdminAcademicViews.jsx
- client/src/admin/AdminAcademicViews.test.jsx
- client/src/admin/AdminOperationsViews.jsx
- client/src/admin/AdminOperationsViews.test.jsx
- client/src/submissions/StudentSubmissionViews.jsx
- client/src/submissions/StudentSubmissionViews.test.jsx
- docs/CODEX_HANDOFF.md
- docs/MVP_INTEGRATION_GATE_B_PLAN.md
- docs/architecture/FRONTEND_INTEGRATION.md
- docs/architecture/GIT_SMART_HTTP_TRANSPORT.md
- server/src/infrastructure/git/git-smart-http.ts
- server/src/modules/class-invitations/class-invitation.repository.ts
- server/tests/git/git-smart-http.git.integration.test.ts
- server/tests/git/repository-provisioning.git.integration.test.ts

New untracked source/report files:

- server/src/infrastructure/git/git-smart-http.test.ts
- server/src/modules/class-invitations/class-invitation.repository.test.ts
- docs/MVP_INTEGRATION_GATE_B_REPORT.md

The sibling `/Users/iluvza/Documents/ChatGPT/ITPROJECT2/gate-b-review` holds
launchers, sanitized identity/suite/check manifests, source diff and safe image.
Exclude **all** sibling gate-b-review tooling/evidence/screenshots, runtime roots,
private credentials/sessions/previews, node_modules, dist, caches and generated
artifacts from a source checkpoint. The 18-file inner worktree allowlist is the
candidate; no broad git-add is appropriate. Private raw runtime logs, sessions,
setup previews and credentials remain under R/private. The chat's outer container repo sees these directories as untracked;
it is not the Projex branch. Review the inner worktree only. Exact content hashes
and tracked patch SHA256 are in gate-b-review/gate-b-diff-safety.json.

## O. Remaining blockers, limitations and deferrals

The prior result-release prompt has resolved; read-only status and the actual
Student browser prove release. No uncertain release was replayed. The original
resources and prior fictional records were preserved; only the new browser Group
and separate publish-probe fixtures were added through approved contracts.

Pending: the separate publish-probe native Cancel/OK observation (human Cancel
has been requested because the documented dialog API cannot access this native
prompt), wide/mobile and remaining full viewport/overflow checks. The viewport
capability timed out twice; actual desktop remained 1366px. Do not mark these
items complete or infer MVP acceptance. Browser transient network-failure recovery
is regression-covered but was not manually injected during this resumption.

The original Activity remains published once, has one released academic attempt,
and has not been republished. Current review inventory: 21 users, one Class,
three Activities including the separate probe, two submissions, four repositories,
two teams. All four bare repositories passed read-only git fsck --full; private
credential and process inventory files retain mode 0600.

Existing bundle warning and local-process Java limits remain. Windows execution
was not repeated. Original metadata recovery, Group browser editing, SUS,
analytics expansion, new features/schemas, public/cloud deployment and whole-root
cleanup remain excluded. This is a reviewable candidate with explicit remaining
browser limitations, not final MVP acceptance.

## P. Local review and safe access

Frontend: **http://127.0.0.1:5192**. API: **http://127.0.0.1:3321**.
Use Student login for Students and Instructor login for Primary/Co-Instructor or
Admin (Admin is redirected to its own role). Credentials are generated solely
for this isolated review and stored in:
`/private/tmp/projex-mvp-gate-b-macos-20261020-5da3ef7/private/review-credentials.json`
(mode 0600). Open it privately on this Mac; use keys admin, primary, co,
maintainer, developer, student10, or other numbered Student fixtures. Do not copy
it into source, chat, screenshots or reports. Class codes and one-time Git
credentials should likewise stay private. Native Git credentials expire; use
existing authorized issuance rather than persisting expired secrets in clones.

The new cluster/API/Java worker/Git worker/Vite environment remains running for
inspection, with recorded task PIDs 11812/16954/16955/16956/16957 in R/private/
processes.json. Reattest live PID/port identity before operating on it. Do not
rerun init or destructive suites against review fixtures. No teardown authorized.

## Q. Recommendation and exact next boundary

The real Mac PostgreSQL/Java/native Git/Smart HTTP suites are suitable for
Development Reviewer assessment with the unstaged fixes and preserved failures.
Hold final Gate B/MVP acceptance until the remaining publish/viewport proof is
completed and reviewed. The existing work order already authorizes continuation
of those checks and bounded defects on these exact resources; it grants no
commit or integration authority.

After technical review, a **separate repository-policy approval** is needed to
stage/commit the explicitly reviewed Gate B fixes/docs locally. Push, merge into
main/development/fullstack, deployment/public exposure, new migrations/features,
original-data operations and whole-root/cluster teardown are separate excluded
boundaries. Product Owner acceptance remains the Product Owner's decision.

Evidence: gate-b-identity-*.json, gate-b-suite-*.json,
gate-b-completion-inspection.json, gate-b-diff-safety.json, client-navigation-*.json,
server-resume-*.json, client-resume-final-*.json and review contract summaries in the sibling gate-b-review
directory. Raw private logs and browser captures remain under R/private.

**READY FOR PROJEX MACOS GATE B REVIEW**
