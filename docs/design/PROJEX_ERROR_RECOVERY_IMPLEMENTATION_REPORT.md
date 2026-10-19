# Error recovery + Group content hierarchy

2026-10-18. Implemented, uncommitted; Product Owner review pending.

## Safety and evidence

The primary checkout on iteration-2/julius-i2-1-academic-workspace (90d8c4a)
was left untouched. Implementation reuses the existing Group worktree on
work/julius-overnight-group-mvp, unchanged HEAD 9203a2c. Prior dirty work preserved.
Fetch succeeded after sandbox escalation; no same-named origin ref/upstream,
so no remote ahead/behind is asserted. No staging, commit/push/merge, migration,
fixture reseed, Git write, review mutation, Activity implementation or Admin worktree change.
Machine-specific host paths are intentionally omitted from this document.

## Findings and implementation

GroupFileBrowser submitted partial text as an exact path. GroupRequestState
displayed diagnostics and a generic Home exit. App.jsx has no custom route
errorElement and its wildcard redirects Home; file selection is component-owned,
not a route. Fixing this async boundary requires no routing overhaul.

- Enter now searches actual filenames/paths case-insensitively on the selected
  immutable commit. main matches src/Main.java. Only selecting a result fetches
  that file. Empty matches say “No matching files.”, never request a guessed path.
- Open exact path is a separate disclosure. Missing files stay inline;
  Retry file repeats the same repository/commit/path; Back to folder reaches the
  requested directory. Repository/class/branch/tab context stays intact.
- Discovery uses existing authorized tree GETs, not a new API/content search.
  Explicit submit; maximum 64 directories/5,000 entries/10 seconds; cancellation,
  snapshot validation, mounted-memory index and late-response guards. Partial
  results are disclosed, never called a complete negative. First 100 matched
  paths render; narrow query for more. Failed reads retain query/exact input;
  late file completion cannot clear newer input.
- Shared RequestState hides request IDs. describeApiError uses UI-owned category/
  business copy, not arbitrary transport messages. ApiError retains original
  status/code/message/details/requestId. Group errors no longer add Home links,
  status/reference text or unsubstantiated assurances about retained work.
- Permission/not-found language conceals private existence; denied traversal
  never displays partial matches. Compact errors use small icons. No production
  backend, authorization, review, schema or Git semantics changed.
- A later actual temporary source failure exposed background-refresh unmounting.
  Temporary metadata, context and source failures now retain an already loaded
  Group view and input, with safe inline Retry refresh. Clear dirty search before
  a full refresh. Confirmed denied/not-found access still hides protected content;
  other repository types keep their previous loader behavior. The underlying
  intermittent service failure was not diagnosed or fixed by this frontend pass.

## Attached content hierarchy requirements

Repository name stays dominant; Group/Class/Project/Due form labelled metadata.
Use actual project title and combined server className: no separate class-code/
name contract exists, so none is inferred from punctuation. One calendar SVG
extends the existing vector kit; original assets were not regenerated. Members
shows one active/limit count, pending reservations and available slots; staff rows
show Instructor/Co-Instructor and Git read-only. Capacity/eligibility unchanged.
Branch tutorial removed; Default/Protected retained. Code security copy shortened
as requested; expiry/scope/cleanup/clipboard behavior intact. Existing Project
Detail, Commits and Activity retain their compact presentation and functionality.

UI/UX Pro Max and fresh Vercel Web Interface Guidelines guided labels, inline
feedback, hierarchy, keyboard/focus and wrapping. Fixed review findings:

- GroupFileBrowser.jsx:78 — path-as-search → real filename matching.
- GroupFileBrowser.jsx:90 — absent retry → exact contextual request.
- GroupRequestState.jsx:5 — diagnostics/Home → safe local recovery.
- components/RequestState.jsx:12 — diagnostic reference removed.
- GroupMembersView.jsx:97 — sentence explainer → structured capacity.

Reference: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

## Permanent standard and remaining adoption

PROJEX_ERROR_AND_RECOVERY_STANDARD.md defines categories/copy, real recovery,
smallest boundaries, navigation/draft protection, logging separation, accessibility
and tests. AGENTS.md adds one mandatory referencing rule. Design System now
mandates structured information over paragraphs, preserving essential safety text.
Roadmap records router fallback/boundaries, field-error mapping, login raw-message
exception, CSV preview loss, Java import exceptions, Admin operational projections
and cross-route drafts. This is not a completed application-wide UI migration.
Browser editing/committing remains deferred; review locks stay enforced.

## Files touched in this continuation

- AGENTS.md
- client/src/api/api-client.js, api-client.test.js
- client/src/components/RequestState.jsx, RequestState.test.jsx
- client/src/repositories/GroupFileBrowser.jsx, GroupFileBrowser.test.jsx,
  group-file-search.js, GroupRequestState.jsx, GroupRequestState.test.jsx,
  GroupRepositoryView.jsx, GroupRepositoryView.test.jsx, GroupMembersView.jsx,
  GroupMembersView.test.jsx, GroupCodeMenu.jsx, group-repository.css,
  RepositoryCollaborationViews.test.jsx, RepositoryFoundationViews.jsx,
  RepositoryFoundationViews.test.jsx
- client/src/assets/icons/projex/calendar.svg
- server/src/middleware/error-handler.test.ts (tests only)
- docs/design/PROJEX_ERROR_AND_RECOVERY_STANDARD.md, this report,
  PROJEX_DESIGN_SYSTEM.md, PROJEX_UI_POLISH_ROADMAP.md,
  PROJEX_GROUP_INTERACTION_POLISH_REPORT.md
- docs/CODEX_HANDOFF.md, docs/GROUP_REPOSITORY_MVP_CHECKLIST.md

Cumulative diff also contains prior Group changes/icons and an older server
integration-test edit, not new work in this continuation.

## Actual verification

| Check | Result |
| --- | --- |
| Client full tests | 61 files / 426 tests passed |
| Client lint / build | Passed; existing >500kB warning, 824.70kB JS |
| Server error-handler tests | 1 file / 2 tests passed, no DB |
| Server type-check / lint | Passed |
| Git diff --check | Passed |
| Integration/Java/real Git suites | Not rerun; production backend unchanged |

Sandbox child-process EPERM prevented some attempts from starting; normal-access
retries passed. Initial run had three old copy expectations; static safe cooldown
copy retained, other expectations updated. Existing Activity test router warning
is non-fatal; Activity source unchanged. No concurrent database suites.

New tests cover partial/nested matching; empty matches without file calls;
exact-path separation; real retry/folder recovery; class/tab/feature-branch URL;
denial concealment; bounded/late discovery; retained query/exact/newer input;
hidden diagnostics with intact error fields; actual server logging/status/details.
Additional tests retain text during in-flight source failure, retry safely after
clearing search, preserve Group metadata on temporary failure and conceal it on
confirmed access denial/not-found.
Full client suite includes other repository types, roles, review/credentials and
draft regressions. No new editor or reload-safe draft persistence is claimed.

Manual loopback checks: 1366×768, 1600×900, 390×844. main found src/Main.java;
selection showed real source. No-match retained the open preview. Explicit
src/NoSuchFile.java stayed inline without status/reference/Home exit. Retry stayed
local and Back returned to src with index.java/Main.java. Main, two user commits
and Ready for Review/read-only were preserved. No horizontal overflow. Mobile
Members counts/staff and wide Default/Protected branches checked. No real conflict/
permission mutation or synthetic server failure injected; those are unit-tested.
Viewport override reset after checks.

Proof screenshots are held outside Git in the private task artifacts:
group-recovery-search-desktop.png, group-recovery-missing-desktop.png,
group-recovery-search-mobile.png, group-recovery-members-mobile.png.
No credentials in captures.

Next gate: Product Owner review. No commit/push/merge authorization.
