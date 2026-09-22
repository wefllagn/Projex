# Instructor Rerun — team WIP handoff

Status: **unaccepted WIP handoff, not migrated to the normal database**. The verified starting branch was `iteration-2/julius-i2-1-academic-workspace`, with pre-checkpoint HEAD/upstream `190e65cfcf9414c6a28059c443ff82294d3cce19` (September 22, 2026). I2.1 core is `448dc5843865ee669f60473bcdb0f543875f084d`; the separate roadmap/checklist commit is `190e65c...`. `development/fullstack` was `75d11ec806ad1d30df8544af46d43eccd894097b` and omitted both the I2.1 core and this WIP. **Freiser must obtain and verify the exact final reviewed, pushed handoff SHA (the second, documentation commit) from Julius’s final report; this document cannot know that future SHA. If absent, stop.**

## What exists and what remains

The Instructor review page can request and inspect a fresh, separate Java rerun of immutable submitted source using its original saved test inputs. An owning ACTIVE Instructor is authorized; Students/Admins are denied. A separate durable queue target and review tables keep the original attempt, assessment evidence, feedback, and released score unchanged. Closed/released records can be rerun; archived records cannot start a new run. See [milestone evidence](milestones/INSTRUCTOR_REVIEW_RERUN.md) and the owning assessment/API documents.

Guarded `projex_test` integration: 19 files/89 tests passed. Final client: 46/294; server isolated: 36/224; Java: 3/24. Client/server lint, server type checks/build, client build, and `git diff --check` passed. The client build retains the known chunk-size warning. The two split migrations are applied in `projex_test`; its earlier rejected enum-migration draft is recorded rolled back, with no incomplete migration. Read-only check found **no** rerun migration in normal local `projex` (13 existing migrations). The Prisma CLI migration-status command could not download its engine in the restricted environment; a direct read-only Prisma query of migration history supplied these status facts. No authenticated desktop/narrow walkthrough of rerun has occurred because normal migration is not approved.

Next work: inspect this exact WIP, verify migration ordering and full diff, decide review-run diagnostic retention with Julius, request **separate approval** for any normal-local migration, then perform authenticated Instructor desktop/narrow validation and report defects. Do not call the feature accepted or commit it as complete yet. Do not start I2.2.

## Exact proposed rerun WIP slice — 27 files

```text
client/src/admin/AdminOperationsViews.jsx
client/src/admin/admin-operational-projections.js
client/src/admin/admin-operational-projections.test.js
client/src/submissions/InstructorSubmissionViews.jsx
client/src/submissions/InstructorSubmissionViews.test.jsx
client/src/submissions/instructor-submission-projections.js
client/src/submissions/submission-api.js
docs/architecture/API_CONVENTIONS.md
docs/architecture/DATABASE_SCHEMA.md
docs/architecture/FRONTEND_INTEGRATION.md
docs/architecture/SUBMISSIONS_AND_AUTOMATED_ASSESSMENT.md
docs/team/ITERATION_2_CHECKLIST.md
docs/team/milestones/INSTRUCTOR_REVIEW_RERUN.md
server/prisma/schema.prisma
server/prisma/migrations/20260922000000_instructor_review_run_type/migration.sql
server/prisma/migrations/20260922000100_instructor_review_runs/migration.sql
server/src/infrastructure/job-queue/execution-queue.ts
server/src/modules/admin/admin-oversight.repository.ts
server/src/modules/admin/admin-oversight.schemas.ts
server/src/modules/submissions/submission.controller.ts
server/src/modules/submissions/submission.repository.ts
server/src/modules/submissions/submission.routes.ts
server/src/modules/submissions/submission.schemas.ts
server/src/modules/submissions/submission.service.ts
server/tests/integration/database.ts
server/tests/integration/submissions-api.integration.test.ts
server/tests/integration/instructor-review-run.integration.test.ts
```

Handoff-only documentation (`TEAM_DEVELOPMENT_WORKFLOW.md`, `CODEX_PROMPT_PACK.md`, `PROJECT_STATUS.md`, `ITERATION_2_ROADMAP.md`, this file) is a separate proposed slice. The workflow file already contains unrelated macOS setup edits: preserve them and stage only the handoff hunks. Also preserve unrelated `README.md`, `server/README.md`, `docs/team/MACOS_LOCAL_SETUP.md`, `output/`, `tmp/`, and the logical-diff-free `client/.env.example` status anomaly. Never include artifacts, private configuration, or credentials in a checkpoint.

## Database continuity recommendation

Each member uses **their own loopback-only** development database and a distinct disposable `projex_test`, with private locally generated credentials and non-overlapping normal/test managed Git roots. Current Julius configuration points `DATABASE_URL` to loopback `projex` and `TEST_DATABASE_URL` to loopback `projex_test`; Git execution is local-process and the configured normal Git root is private. The guarded integration runner accepts only database name `projex_test`, applies committed migrations there, then its fixtures delete all application records; test data is **not** a handoff asset. Git tests similarly require a recognized sentinel-owned test root. Never aim either test suite at normal or demo data.

Source and schema transfer through the reviewed Git checkpoint and committed migrations. Automated tests recreate disposable synthetic fixtures. A reusable nine-exercise demo class is **not yet established**, and sanitized demo-data seeding is **not yet implemented**; do not promise automatic recreation. Persistent demo accounts/classes/submissions and managed bare Git repositories require a coordinated PostgreSQL **plus complete Git-root** recovery point. Recommend one Julius-controlled private demonstration environment after separate approval, not a shared writable development database. Members develop independently; only accepted code and approved synthetic fixtures move to that demo environment. Never transfer raw normal database dumps, real student data, password hashes, sessions, setup links, Git credentials, `.env`, local credential files, or unmanaged Git storage between members.

Existing `operations:backup` can create a guarded paired `pg_dump`/Git archive with checksums after quiescence; `operations:restore:preflight` validates a proposed isolated restore but does **not** restore it. A complete paired restore proof remains pending. Backup execution, any demo environment, restore, and normal migrations require separate approval. Do not expose PostgreSQL or Git over the network for handoff.

If demonstration-state restoration is later approved, the designated operator—not an incoming member—first stops writes, takes/verifies the paired backup, runs restore preflight, restores **both** artifacts into isolated targets, and checks migration history, database/repository correspondence, markers, and `git fsck` before any use. There is no approved one-command restore or automatic demo seeder today. For an incoming member's ordinary workspace, use migrations and disposable synthetic fixtures instead of restoring another person's normal database.

## Incoming member checklist (after checkpoint approval and push)

1. Freiser uses their own Codex/Git account. Clone Julius’s **named pushed handoff branch**, not `development/fullstack`; compare `git rev-parse HEAD` with the exact final checkpoint SHA supplied after both checkpoint commits are reviewed and pushed. If missing or different, stop. Ask Codex to create `iteration-2/freiser-work-01` from that commit; never edit Julius’s branch, use a fork, or create another integration branch. The next member branches from Freiser’s exact reviewed, pushed handoff SHA, and so on.

   ```powershell
   git clone --branch iteration-2/julius-i2-1-academic-workspace https://github.com/wefllagn/Projex.git projex-ui
   cd projex-ui
   git rev-parse HEAD
   ```

   Compare the printed SHA to Julius’s separately supplied final checkpoint SHA. Do not substitute the pre-checkpoint `190e65c...` SHA shown at the top of this document.
2. Read `AGENTS.md`, this handoff, [workflow](TEAM_DEVELOPMENT_WORKFLOW.md), [prompt pack](CODEX_PROMPT_PACK.md), [roadmap](ITERATION_2_ROADMAP.md), [checklist](ITERATION_2_CHECKLIST.md), and the rerun milestone. Open the folder in your own Codex account and use the Developer Setup Prompt; pass the resulting report to a separate ChatGPT checker.
3. Run `npm ci` in `client` and `server`, then `npm run prisma:generate` in `server`. Create private local configuration from `server/.env.example` using your **own** secrets; confirm `server/.env` is Git-ignored. Windows is the current full-capability local reference. The Mac guide is presently an unrelated untracked file, **not yet transferable** in this checkpoint; a Mac member must obtain its separately reviewed/pushed version first and keep the Git worker disabled there. Do not copy Julius’s configuration or records.
4. Verify your own loopback `projex` and separate `projex_test` targets. Do **not** apply the pending migrations to normal `projex` until Julius approves. Guarded integration tests may migrate/clear only disposable `projex_test`. Keep test Git storage separate. Before approved migration, the new rerun UI/API cannot be live-validated against normal records.
5. For ordinary approved local startup, run API (`server: npm run dev`), Java worker only when private controlled-local Java is enabled (`server: npm run dev:worker`), Git worker only on supported Windows configuration (`server: npm run dev:git-worker`), and frontend (`client: npm run dev`) in separate terminals. Keep all services loopback-only. No LAN/Smart HTTP exposure.
6. Continue the **Instructor Rerun unaccepted WIP**: review the exact checkpoint, tests, migration/retention/manual-validation gaps, and report to Julius. Run relevant automated tests and a manual web-app walkthrough before claiming acceptance, but keep the walkthrough pending while the normal migration gate blocks it. Record defects and the next task in Freiser’s handoff; push only Freiser’s own branch after review. No normal migration, credentials, network exposure, merge, force push, or new phase without its own approval.
