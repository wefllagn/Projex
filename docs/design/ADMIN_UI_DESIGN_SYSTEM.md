# Admin UI design system

2026-10-19 implementation direction; Product Owner visual acceptance is pending.
This supplements existing architecture, not new Admin permissions.

## Identity and content

Preserve Projex's light sidebar, blue actions, typography, branding and existing
CSS icons. React 19/JSX and Router remain. Scope presentation changes beneath
`.admin-app-shell` in `client/src/admin/admin-refinement.css`; other roles must
not inherit this pass. Do not import unreviewed Group implementation or new themes.

Communicate tasks, state and actions, not backend architecture. Use one short page
title, contextual actions, filters and records. Omit redundant eyebrows and
directory/ledger/catalog headings. Keep validation, security warnings, required
reasons, destructive consequences and recovery guidance. Operational provenance
belongs in concise status cards and contextual details, not introductory essays.

## Layout and interaction

- Use 4/8/12/16/24px spacing, approximately 10px panels and 6px controls; restrained
  borders/shadows. Page titles 24–28px, body/table 14px, secondary text 12–13px.
  Mobile inputs use 16px. Small contextual actions have intrinsic widths.
- Links navigate; buttons reveal or act. Keep visible hover/focus, readable labels
  and native disabled states. Icons supplement rather than replace action labels.
- Primary navigation: Overview, Users, Classes, Academic Records. System:
  Operations, Audit Events. Secondary tools: Course Catalog. Select one destination;
  Academic Records excludes Classes/Course Catalog descendants.
- Tables group user identity/email. Use readable statuses and actual counts.
  One-page tables show a small count instead of large disabled paging buttons;
  empty pages beyond page one retain Previous recovery.
- Narrow layouts wrap controls and contain horizontal table scroll. Position the
  scroll wrapper so absolute screen-reader-only headers cannot expand the page.
  Do not hide document overflow to mask broken layout.
- Dialogs provide labels, initial focus, Tab containment, Escape, focus return and
  explicit Cancel/close. Block dismissal during writes. Preserve entries on failure;
  only deliberate dismissal discards the modal draft.
- Course metadata remains secondary and optional, never a Class prerequisite.
  Import preview and reviewed fingerprint confirmation remain distinct steps.

## Semantic and truthful states

Blue identifies actions/navigation; green verified success/availability; amber
attention; red errors/destructive actions; neutral ordinary/unmeasured information.
Always include meaningful text. Zero setup attention is neutral, not a large
success panel. Empty matches are not failed application routes.

Use actual API data only. Workers are **Not monitored**, not healthy/offline or
inferred from jobs. Empty queues mean no recorded jobs. Known repository size is
not host capacity. Preserve degraded/unknown observations and independent health
and storage failures. Keep timestamps, provenance and limits in disclosures.

## Freshness and drafts

`useAdminFreshness` performs entry/query reads and 15-second-stale focus/visibility
revalidation; overlapping background events coalesce. No interval, WebSockets,
unlimited directory fetch or mutation replay. Each participating loader checks its
AbortSignal before committing success/failure, even if transport ignores abort.
Explicit recovery or post-mutation refresh supersedes an older read.

Search debounces 350ms and uses the existing bounded backend API. Role, status,
sort, type and page update URL-backed queries immediately. Query changes reset
page one; Back restores filters. Do not remount the focused search/select on each
automatic update. Client filtering is not a substitute for backend pagination.

Pause background reads for active forms/dialogs, including setup secrets, Course
editing/import and operational confirmations. Keep drafts separate from request
state. Successful writes refresh reads explicitly, never issue setup links,
credentials or join codes implicitly. Leaf account/Class governance retains its
existing deliberate-refresh and concurrency contracts.

## Graceful recovery and diagnostics

Ordinary feedback uses reviewed UI-owned copy, not raw server messages, HTTP
numbers, request IDs, exceptions, SQL, endpoints or host paths. Retry the failed
read locally; preserve filters, entries and navigation. Never route recoverable
failures Home or disguise denied access as empty success. Use inline alerts and
polite status announcements without unnecessary modals or focus theft.

Backend structured errors, logging/correlation and audit evidence are unchanged.
Authorized Audit details retain target/request IDs, reasons and allowlisted
metadata. Keep them out of list rows and ordinary error notices, not investigative
evidence. Do not invent target names absent from the API.

## Acceptance checks

Test bounded queries, debounce, URL Back, pagination, stale/aborted responses,
focus throttling/coalescing, paused drafts, local Retry, safe errors and exclusive
navigation. Preserve provisioning, last-Admin, versioned recovery, import preview
and authorization regressions. Inspect all touched screens at 1366×768, wide and
approximately 390px; check document width, table scrolling and keyboard dialogs.
This is not a comprehensive assistive-technology certification.

UI/UX Pro Max informed scoped table/responsive/debounce guidance. Vercel Web
Interface Guidelines informed semantics, focus, async feedback, URL state and
contextual recovery. Product/security boundaries override generic suggestions.
