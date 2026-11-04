# Practice Again acceptance and release readiness

Historical component acceptance. The combined release and corrected explicit-feedback policy are documented in [Origin integration release candidate](ORIGIN_INTEGRATION_RELEASE_CANDIDATE.md); its newer verification and platform/deployment gates supersede this component's release conclusions.

Review date: 2026-11-04, Asia/Manila. Isolated branch `feature/released-practice-mode`. Scope: all 48 files introduced by `19b53df`, additive migration, and the bounded acceptance fixes in this review. Live Windows and Azure were neither inspected for private configuration nor changed.

## Ancestry and policy

`fc2b5fa01b6ff547832a644a49c2aa8398047574` is an ancestor, directly parented by `5158280de5f7036e7371bf7fa1a31c5e68cf6385`. The latter includes frozen `2a2a3e51946b3e919d4d10be7a7a9b770b6a7cff`; both release trees are `e4a178e5e348bf7dd5ccc3c5554999ca550c37b7`. `22123d7` integrity hardening is also preserved. No release tag or integration ref changed.

The shared gate requires exhausted counting attempts, the latest attempt's released graded score and corresponding released optional feedback, no pending official assessment/review/unresolved failure, and no valid unconsumed replacement. Zero scores and explicitly released empty feedback qualify. Deadline expiry alone does not consume attempts. Current owner/student/membership/class/repository authority remains required. Archival blocks practice. Replacement/attempt reopening suspends the same workspace. LATEST/HIGHEST credit remains independent and unchanged.

Practice can add its own reserved branch to an existing activity repository; it does not overwrite main or other existing refs. Its saves/reset never mutate official submissions, grades, or feedback. This is supported by actual repository and immutable evidence comparisons, not an assertion that no Git metadata is ever added.

## Focused findings and fixes

- Confirmed reset already supplies its starter tree and resulting commit. Removed its redundant asynchronous reload, preventing late reads from regressing newer editor metadata or reporting failure after a successful reset. Typing during reset remains preserved. Added a reset/offline/immediate-navigation regression.
- Completed post-release visible-test and console results now recheck practice authority. Revoked membership or archival cannot use the ordinary result endpoint to bypass suspension. Ordinary preview-run contracts are unchanged.
- Heading now consistently says **Practice Again**. Save practice keeps the primary style; Start Over and Reload saved practice retain secondary styles. Reset and dirty reload confirmation, navigation protection and idempotent uncertain-save retry remain.
- Paired-backup quiescence now checks RUNNING practice Git jobs when the additive table exists. It remains compatible with earlier schemas where the table is absent. Added read-only guard checks; no backup or deployment was executed.

## Schema compatibility and approval gates

Migration `20261104000000_activity_practice` adds two new tables, unique/index/FK constraints and one nullable column on existing `practice_executions`. Existing rows require no backfill; old binaries can ignore new columns/tables. No destructive SQL, data rewrite, official snapshot change, dependency update or historical migration modification is included. The prior isolated run applied all 31 migrations; this review revalidated that disposable target. The migration file itself is unchanged from `19b53df`.

This is schema compatibility, not permission to roll mixed versions. Deploy API, Git worker/compiled hook, Java worker and client as one reviewed release under maintenance. Old Git permission code does not enforce the reserved practice namespace. Do not admit writes while old/new worker/API combinations coexist.

Actual Windows demo/Azure migration drift and production data were not inspected. On a demo with only 24 migrations, the earlier missing migrations are separate reviewed changes: do not apply all pending migrations as an incidental practice upgrade. Stop for failed/drifted migrations; never use db push/reset or mark migrations applied to evade a discrepancy.

The branch retains the release baseline's Linux Git version rejection. The separate Linux runtime fix `68881c8` is not in this ancestry. Therefore this PR can be reviewed, but **Azure deployment remains blocked** until a separately approved compatible baseline passes its real production preflight. Hosted Smart HTTP stays disabled by its existing production protections. Do not enable it as part of this release.

## Future operator procedure — not executed

1. Review/approve the exact release SHA, platform, pending migration list and service inventory. Rehearse with a paired restored database/Git root in isolation, including all existing repositories and grade/source evidence. Never run acceptance against real student data.
2. Build in a clean checkout with locked dependencies; generate the Prisma client, run tests/type-check/lint and builds. The existing Ubuntu builder is `deploy/pilot/build-release.sh SOURCE_CHECKOUT FULL_SHA`, run unprivileged; stage its checksum-verified artifact using `stage-release.py ARTIFACT SHA256 FULL_SHA`. On Windows, use the existing native launcher and private configuration; do not copy Linux node_modules or change the current demo during review.
3. Arrange maintenance that blocks API mutations and native Git receive admission. Drain official execution, provisioning/checkpoint, group browser and practice Git jobs; resolve ambiguous receipts without editing statuses manually. Stop only the deployment's API/Git/Java services after draining. Keep PostgreSQL and volumes intact.
4. Create a coherent, private paired backup while all writers remain stopped: custom-format PostgreSQL dump, entire Git storage including hidden receipt refs, exact private configuration, previous binaries/release pointer, migration inventory and checksums. Use restrictive permissions and keep it outside Git/web roots. Verify archive checksums and restoration to NEW resources before proceeding. Never print secrets or upload these artifacts.
5. For the existing fixed-path Ubuntu pilot operator ONLY after its identity guards match the actual installation, the reviewed commands are:

   ```bash
   sudo systemctl stop origin-api origin-git origin-java
   sudo python3 /path/to/reviewed/deploy/pilot/pilot.py backup --confirm CREATE_PAIRED_BACKUP
   # Set FULL_SHA and BACKUP_PATH to the reviewed full SHA and returned private backup directory.
   sudo python3 /path/to/reviewed/deploy/pilot/pilot.py activate --commit "$FULL_SHA" --confirm SWITCH_ORIGIN_RELEASE
   sudo python3 /path/to/reviewed/deploy/pilot/pilot.py migrate --backup "$BACKUP_PATH" --confirm MIGRATE_ORIGIN_PILOT
   ```

   The operator pins the actual target identity and checks the matching backup; do not substitute a different database or bypass its refusal. Activation changes source only and requires all services stopped. The migration uses the new release's complete ordered migration set. Keep services stopped if validation fails. This branch's Ubuntu preflight limitation must be resolved before these steps are approved.
6. Verify migration status/schema, production preflight with actual protected configuration, Java isolation acceptance, storage ownership and release identity. Start only matching Git/Java/API services, serve the matching client, and validate login, official immutable review/grade, practice lifecycle and Git/Java behavior before lifting maintenance. Do not change Nginx exposure, credentials or Smart HTTP flags for practice.

## Rollback limitations

Before any new writes, stop affected services and restore the recorded prior binaries/client/config/pointer while leaving additive schema/data in place. Do not drop the practice tables or rewrite repository history. Restoring an older release without practice namespace authorization requires continued Git-write maintenance (or Smart HTTP disabled) until compatible authorization is restored.

After new writes, a full database rollback loses later official work unless reconciled. Never restore the database alone against newer Git storage. Restore only the matching private database/Git/config pair into NEW resources, verify counts/fingerprints/fsck, and obtain a separate recovery cutover approval. The existing pilot restore command performs a new-target drill; it is not an in-place rollback. No production restore was performed here.

## Acceptance ledger

Final policy/authentication/submission unit rerun: 46 passed in 7 files.

**READY FOR PR** for the reviewed local-first feature scope. This is not deployment approval. No unresolved acceptance failure or known data-loss/authorization defect was found within that scope after the bounded fixes. Earlier comprehensive evidence remains in [ACTIVITY_PRACTICE_VERIFICATION.md](ACTIVITY_PRACTICE_VERIFICATION.md).

Fresh focused reruns: frontend student/workspace/activity/adapter 86 passed; final reset/recovery/adapter rerun 8 passed; authenticated student/instructor/submission/checkpoint/real-Java regressions 49 passed; native Git practice cases 9 passed (19 unrelated native cases intentionally not rerun); paired-backup guards 9 passed. Backend integration type-check, frontend/backend lint and both builds pass; the existing Vite chunk-size warning remains. These are focused reruns, not a claim that every repository test ran again.

Fresh actual-browser acceptance: student login and activity-level action; original starter; Git save; visible tests PASS; Java output `ok` and exit 0; Start Over followed by immediate navigation without a false warning. Instructor login then confirmed released 90/100, the original feedback and exact immutable submitted Java source after practice reset. A real interruption of only the disposable API produced safe failure/retry; after API restoration the original request saved while newer unsaved typing remained. The final status explicitly read “Practice saved. Newer edits are unsaved.” Private local screenshots retain instructor and recovery evidence.

Remote read-only verification still reported main `5158280` and the frozen tag peeled to `2a2a3e5`. All original 48 feature files and the additional focused UI, result-authorization, operator-guard, test and handoff changes were reviewed for scope. The original migration is unchanged. No live database, demo service, remote branch, tag, secrets, Azure configuration or deployment was changed.

Remaining limits: no production database drift attestation/paired restore rehearsal was executed; Linux/Azure preflight remains blocked as described above; no historical publication-time instruction version exists; unsaved drafts remain memory-only and do not survive forced reload/crash/development hot replacement; native transport policy locks can briefly delay lifecycle changes. Receipt retention has no new cleanup job. These are explicit operational/product constraints, not hidden acceptance passes. PR review can proceed; migration, deployment and any platform integration require their own approved checks.
