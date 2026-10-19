# Projex UI polish roadmap

Source-assessed 2026-10-18. Group screens are the first Design System v1 adoption,
not proof of a completed application-wide redesign. Apply the standards in
PROJEX_DESIGN_SYSTEM.md and the icon kit; do not reopen product/security policy
or locked Activity behavior under a cosmetic task.

## Priority and impact

P0 incident: do not run DB-cleaning regression suites while the live demo uses
their projex_test target. See ../DEMO_DATABASE_RECOVERY_ISSUE.md. On 2026-10-19 the
Product Owner deferred demo metadata recovery; preserve Git storage and do not
restore/reconstruct now. Establish isolation before any future mutable DB suite.
Current search popover is code/test verified but manual walkthrough is blocked.
Browser editing is deferred to a later milestone; preserve the proposal and its
unresolved retention/expiry/ambiguous-recovery decisions. Native Git suffices for
Group MVP. Next is the previously approved Admin and Instructor Class Provisioning
MVP, not started in this Group closure. See GROUP_REPOSITORY_FINAL_HANDOFF.md.

| Priority | Area / observed evidence | Reusable improvement | Gate / verification |
| --- | --- | --- | --- |
| P0 | Group Project Detail: repository CTA was below requirements | Delivered actionable right pane; narrow primary-first layout | Current UX review; member/invited/unassigned/closed tests |
| P0 | Group source/review: routine refresh and form-loss risk | Delivered event freshness, cancellation, throttling, dirty-dialog guard, retry | Current UX review; actual external fixture change and draft tests |
| P1 | StudentActivityViews.jsx: separate Refresh status / polling-stopped paths | Audit shared stale-read affordance, preserve bounded job polling and submission locks | Separate frozen Activity approval; Run/stdin/tests/save/submit regressions |
| P1 | InstructorProjectEditor in ProjectViews.jsx: backend-supported explanations, multiple lifecycle actions | Short task-first help and shared form/error/version-conflict pattern | Separate Instructor pass; preserve publish/close/archive gates |
| P1 | AdminViews.jsx, AdminOperationsViews.jsx: Refresh / Refresh observations and dense operational explanations | Shared optional event revalidation and concise observation-time presentation | Separate Admin branch approval; no implied worker health or broader authority |
| P1 | ClassStaffPanel.jsx and ClassInvitationViews.jsx: role/invitation forms with different feedback placement | Shared labelled fields, contextual status/error and guarded destructive confirmation | Class ownership/staff transfer tests; no policy changes |
| P1 | Student/Instructor profile menus and navigation shells: repeated role-specific implementations | Shared accessible menu primitive while retaining role routes and identity labels | All role routes, keyboard/390/900/1366 checks |
| P1 | App.css: layered overrides and legacy 721–1100px stacked desktop sidebar | Consolidate responsive shell only after route-wide screenshot matrix | Separate broad-CSS approval; Group exception is narrowly scoped now |
| P2 | Non-Group RepositoryGitViews: older history/branch/local-Git presentation | Adopt verified compact Git primitives by opt-in, not blanket replacement | Personal/Class Workspace/Activity owner/read-only/empty/Git regressions |
| P2 | Student/Instructor lists: many cards, repeated authorized-record/metadata copy | Shared compact list/pagination/empty state and concise status chips | Preserve safe response projections, legitimate metadata and context |
| P2 | Group and other tabs: local state not URL-synced | Evaluate shareable tab/filter/page state and predictable Back restoration | No source/credentials in URL; existing links remain valid |
| P2 | Forms: no app-wide cross-route unsaved-draft guard | Shared router-compatible warning/draft policy, not localStorage for secrets | Product choice on draft persistence; preserve current form versions |
| P2 | App bundle warning (current ~811KB minified JS) | Route-level splitting after measuring navigation/loading impact | Separate performance task; no dependency upgrade assumed |
| P3 | Icon kit adoption beyond Group | Migrate representative surfaces gradually, semantic labels and fixed sizes | Per-surface approval and screenshots; don't replace branding |

## Error/recovery audit — 2026-10-18

Permanent authority: `PROJEX_ERROR_AND_RECOVERY_STANDARD.md`. The following is a
source audit, not a claim that every screen has been migrated. No Activity/Admin
implementation files or separate worktrees were edited in this task.

| Priority | Actual source finding | Disposition |
| --- | --- | --- |
| Delivered | GroupFileBrowser submitted partial text as a literal path; GroupRequestState added status/reference and Home | Bounded filename finder; distinct exact path; inline retry and containing-folder recovery; safe errors |
| Delivered | components/RequestState.jsx rendered requestId; api/api-client.js returned arbitrary error.message for many statuses | Removed visible diagnostic ID; UI-owned category/business copy; raw error contract retained |
| P1 | App.jsx has no custom route errorElement; wildcard navigates to `/` | Separately approve route/render error boundaries and contextual unknown-route fallback; preserve protected routes and work |
| P1 | api-client.js fieldErrors still projects backend issue messages; forms consume them in feature-owned paths | Review static field/business mapping per form without hiding necessary validation; do not blindly strip actionable messages |
| P1 | pages/LoginPage.jsx special-cases unauthorized errors with error.message | Map reviewed sign-in error codes to safe authored copy in a scoped authentication UI pass |
| P1 | submissions/JavaSourceEditor.jsx renders import error.message | Audit controlled import validation versus unexpected FileReader exceptions; frozen Activity follow-up, preserve Java/stdin |
| P1 | classes/CsvInvitationPanel.jsx clears preview on failed operation | Verify whether retry loses useful preview/selection; Class invitation pass with retained CSV/form input |
| P1 | AdminOperationsViews.jsx includes request IDs in authorized audit projections | Distinguish operational records from ordinary error feedback; review only in approved Admin task, no blanket backend projection removal |
| P1 | AuthProvider/ProtectedRoute handles session loss by protected-route login | Test meaningful safe return and volatile-draft warning; never persist secrets/source incidentally |
| P2 | Group README read error has concise unavailable text but no local Retry | Add local retry without credential issuance or replacing working file content |
| P2 | Several non-Group Git states retain technical helper copy and broad card errors | Opt-in per repository type, preserve owner/readonly/empty/history/diff behavior |
| P2 | No application-wide render-boundary/draft retention policy | Gradual per-feature boundary adoption; no automatic global reset or promise of reload-safe drafts |

Safe presentation defaults now benefit shared consumers; per-screen semantics,
field wording and navigation still need the scoped checks above. Server status,
structured details and correlation logging stay unchanged.

## Future execution checklist

1. Inspect branch/dirty state, owning architecture, affected source and nearest
   tests; respect separate Activity/Admin/integration gates.
2. Use the v1 standards before selecting new spacing/colors/components. Reuse
   existing shared patterns; prefer one bounded vertical slice over broad CSS.
3. Establish the actual primary task and supported states from source/API, then
   remove duplicate explanations. Never invent data/actions to fill an empty pane.
4. Test mobile and ordinary desktop, long names, loading/empty/denied/error,
   keyboard, slow/late responses and preservation of unsaved input.
5. Verify semantics and contrast; list any remaining findings by file:line.
   Do not claim all-app or assistive-technology certification from this source audit.
6. Report exact executed checks and remaining gates. No background fetch may
   issue credentials, replay writes or replace protected authorization.

Admin observations include read-only inspection of the separate Admin worktree;
its installed .agents skills and skills-lock.json were left intact. No Admin or
Activity implementation is included in this refinement.
