# Isolated MVP integration — Gate A report

2026-10-19. Combined code/non-database verification complete. This report belongs
to the local Admin reconciliation merge checkpoint after staged review. Gate B
and Product Owner acceptance remain separate. Read actual branch HEAD/status for
the resulting merge SHA.

## Scope, worktree and pinned ancestry

Dedicated managed worktree:
`C:/Users/Wefllagn/.codex/worktrees/mvp-integration-readiness/projex-ui`.
Branch: `codex/mvp-integration-readiness`.
Fetched origin and confirmed starting baseline remained exactly
`25235b113cc856678221dbbbe3d7cb5a25e22e6d`; no stale local integration branch used.

| Local step | First parent | Approved milestone / second parent | Result |
| --- | --- | --- | --- |
| Activity merge | 25235b113cc856678221dbbbe3d7cb5a25e22e6d | 42666278d7987018cdf24af3499d10e7b84c4e4b | bc123d254d070514100f3fec15a084133c8cb750 |
| Group merge | bc123d254d070514100f3fec15a084133c8cb750 | 3105cbb517db055996532f2658a6a886124abd27 | 3afd037c8cec9f4715b31c7073df30c2a7891bf7 |
| Admin reconciliation merge | 3afd037c8cec9f4715b31c7073df30c2a7891bf7 | 332e6b548ab087d2424497ce6ec27cf666fcc718 | Resulting HEAD is owned by Git; subject: merge: integrate admin MVP and reconcile shared UX contracts |

Activity and Group staged trees exactly equalled their pinned input trees before
their local commits; both whitespace checks passed. Ancestry is retained through
real two-parent merges, not cherry-picks, wholesale file copies or rebases.
Original milestone branches/worktrees and protected integration/stable refs are
not merge destinations and must remain unchanged.

## Actual conflicts and resolutions

The seven cumulative overlapping paths produced FIVE real Admin merge conflicts:

1. `client/src/api/api-client.js` (content): retained Group's static UI-owned
   business/error mapping, timeout handling and isTemporaryApiError. Added Admin's
   VALIDATION_FAILED copy and retained setup cooldown/rate-limit guidance. Generic
   400/422 wording stays consistent with Group; VALIDATION_FAILED uses specific
   Admin form guidance. No arbitrary server-message fallback was restored.
   ApiError fields, cookie/CSRF and refresh contracts are unchanged.
2. `client/src/api/api-client.test.js` (content): resolved differing generic 422
   wording, retained Group diagnostic-contract tests, and added 16 combined
   regression cases for Admin/Group guidance, throttling, temporary versus denied
   reads, unknown/prototype business codes and intact diagnostic fields.
3. `client/src/components/RequestState.test.jsx` (add/add): combined BOTH branches'
   tests rather than dropping either; generic errors hide diagnostics and do not
   invent a Home link.
4. `docs/CODEX_HANDOFF.md` (content): composed one current combined handoff with
   pinned inputs, locked Activity semantics, scoped authority, independent source
   reports and current verification limits. Older no-integration/uncommitted
   statements are historical evidence, not live status or new authority.
5. `docs/OVERNIGHT_AUTOPILOT_REPORT.md` (add/add): retained both original Group and
   Admin accounts under historical headings and added an explicit superseding
   Gate A / no-Gate-B banner. Prior test counts were not recast as new evidence.

The other two overlapping paths:

- `RequestState.jsx` is identical in the pinned Group/Admin heads and combined
  tree: ordinary error notices do not show diagnostic request IDs.
- `InstructorPages.jsx` merged automatically. Reviewed both changes: Group's
  three Project wrappers keep deferredLabel="" while Admin's AcademicFields,
  Primary-only controls and omission of unchanged legacy term/year remain.
  Both survive; no entire-file ours/theirs resolution was used.

No runtime defect required a production backend, schema, dependency or Activity
business-rule change. Added API regression coverage protects the reconciliation.
Existing Group/Admin suites exercise their features in the same combined client.

## Documentation reconciliation

Updated AGENTS current-boundary note, combined CODEX handoff, overnight chronology,
historical MVP_INTEGRATION_PREPARATION overlap/status, and owning frontend error
guidance. Added this report and the separate exact Gate B resource proposal.
The original no-production-overlap statement is now explicitly superseded by the
actual seven paths/five conflicts. Backend status/correlation/audit evidence stay
available; ordinary errors do not expose them. Milestone reports remain history.

Browser .java/.md editing, proposed Group jobs/schema/endpoints, Add File, browser
merge/PRs, IDE, original-demo recovery and deployment remain explicitly deferred.
The proposal's retention/expiry/ambiguous-recovery questions remain unresolved,
not silently implemented. Existing Git storage was not touched.

## Dependency and execution safety

Installed exact locked dependencies ONLY in this new worktree using
`npm ci --offline --ignore-scripts --no-audit --no-fund` for client and server.
No upgrade, lockfile edit, lifecycle installer, private env copy or skill install.
Generated Prisma CLIENT CODE from the unchanged schema with a process-local
non-service loopback URL; this is not a database connection or migration.

Inspected default server unit configuration: database integration, Java and Git
directories are excluded. Unit tests used process-local fixture mail settings and
a non-service loopback datasource, never a normal/demo database. No API/worker,
PostgreSQL process, Java integration runner or real-Git/Smart HTTP suite started.

## Checks actually executed on combined source

| Check | Result |
| --- | --- |
| Client npm test | 67 files / 484 tests passed |
| Server npm test (unit only) | 43 files / 300 tests passed |
| Client npm run lint | Passed |
| Client npm run build | Passed; JS 825.45 kB, gzip 216.08 kB |
| Server npm run lint | Passed |
| Server npm run type-check | Passed |
| Server npm run type-check:integration | Passed; compilation only |
| Server npm run build | Passed |

784 unit/component tests across 110 files; these are actual combined counts, not
the sum of old milestone reports. The known >500 kB frontend chunk warning remains
and is not hidden by changing build thresholds. No failing test/check remains.
The local commit is gated by staged whitespace, conflict-marker, allowlist,
secret and preservation checks, with results in the external final execution
audit. Full SHA is returned with the completion report; no DB proof is implied.

## Preserved boundaries and remaining blockers

- Original Activity 42666278, Group 3105cbb, Admin 332e6b5 and launch checkout are
  preserved; excluded contact sheets/skills/private/runtime files remain outside
  this integration index. No original worktree is used as dependency/write target.
- Activity/client activities/submissions and server activity/submission production
  source remain unchanged from the pinned Activity baseline; shared safe error
  presentation is the already approved Group/Admin behavior.
- No new Prisma schema, migration or dependency delta from Activity. This does
  not assert normal-database migration status; no normal DB was queried.
- Database suites, real cookie/CSRF/transaction/capacity proof, Java, native Git,
  complete Smart HTTP and live three-role desktop/wide/390px validation have NOT
  run on the combined candidate. Integration type compilation is not that proof.
- Current Group finder/popover verification and prior demo cleanup incident remain
  explicit. No old screenshot or interrupted Smart HTTP run is claimed as passed.
- No push, protected merge, deployment, demo restoration or final Product Owner
  acceptance. Gate A makes code ready for Gate B, not a fully verified MVP.

Next approval: [Gate B exact resources/safety plan](MVP_INTEGRATION_GATE_B_PLAN.md).
