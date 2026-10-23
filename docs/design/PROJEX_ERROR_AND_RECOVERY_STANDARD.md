# Projex error and recovery standard

Product Owner approved permanent standard, 2026-10-18. Applies to every future
Student, Instructor and Admin feature, and to existing features as they are
touched. This standard does not authorize a bulk redesign or weaken access rules.

## Mandatory principle

Every feature must fail gracefully, preserve available work and navigation
context, and offer meaningful recovery. A recoverable failure is not navigation.
Never automatically send a user Home because one read or mutation failed.
Do not claim work was saved, retained or unchanged unless that is actually true.

## Categories and recommended copy

| Category | User-facing message | Appropriate recovery |
| --- | --- | --- |
| Field validation | Please select an academic year. | Inline beside the labelled field; retain all entries |
| Empty search | No matching files. | Clear search/change query; do not request an invented path |
| Not found | We couldn’t find that file. It may have moved, or it isn’t available to your account. | Retry the file, Back to folder |
| Access denied | You don’t have permission to edit this repository. | Keep authorized read view; return to project/catalog if access is lost |
| Authentication expired | Your session has expired. Please sign in again. | Explicit sign-in; safe return location when supported; no silent write replay |
| Network unavailable | Projex could not reach the server. Check the connection and try again. | Retry the failed read, not the whole application |
| Server unavailable | We couldn’t load this right now. Please try again. | Explicit retry in the affected region |
| Timeout | This is taking longer than expected. Please try again. | Cancel stale request; bounded explicit retry |
| Git conflict | The branch changed while you were working. Compare the latest version before trying again. | Retain proposed changes and commit message; explicit reload/compare without overwriting drafts |
| Operation rejected | This action isn’t available in the current state. | Explain the known consequence/next permitted step; never simulate success |
| Unexpected render failure | This view couldn’t load. Please try again. | Local boundary reset; contextual back link only if meaningful and known |

Copy must be accurate to the actual operation. Concealed not-found/permission
responses must not confirm private existence, names, authors, source or membership.
Do not reinterpret denied access, validation or failures as work-in-progress.

## Boundaries and navigation

Use the smallest useful failure region: field → operation → file/card → tab →
screen. Keep working siblings, sidebar, branch selector and academic context.
Use full-screen errors only when the screen cannot meaningfully render.
Async request errors belong to their owning component; render boundaries do not
catch them. Render boundaries should isolate independently meaningful panels,
have explicit reset recovery, and never log source/secret/form state.

The owning view supplies actual recovery actions; shared components must not
invent a Home link when context is absent. Keep repository/class/project IDs,
selected tab/branch/commit, filters and pagination where supported. Do not put
source, credentials, draft feedback or sensitive input into URLs.

File → containing directory; commit → current history; repository → linked
project or authorized catalog; activity → Activity Detail; submission → existing
workspace; class → relevant class list; Admin action → current management screen.
Home is a last resort only when there is genuinely no useful nearer context.

Every Retry must perform the intended operation with the same relevant identity.
Cancel/ignore stale responses and deduplicate in-flight reads. No infinite retry.
Retry mutations only through their established idempotency/concurrency protocol;
an ambiguous write is not safe to blindly repeat. Never reissue Git credentials
as part of automatic read recovery.

## Unsaved work

Keep controlled form/editor state separate from request state. A failure must not
unmount/reset drafts: Java source, stdin, form values, feedback, repository edits,
commit messages. Retain expected versions; do not silently replace them with a
new version or overwrite concurrent Git pushes. Background refresh must defer
while dirty/interaction state would be lost. Explicit discard requires warning.
Do not persist secrets or source to browser storage as an incidental fix.
Memory-only drafts cannot be promised to survive logout, reload or navigation;
future cross-route persistence needs a separately approved retention policy.

## Diagnostics versus presentation

Ordinary UI must not display status numbers, request/correlation UUIDs, exception
names, stacks, database constraints, endpoints, host paths or raw error objects.
Use UI-owned messages keyed by safe category/business code; never fall back to
`error.message`. Explicit authored helper text must not come from raw transport.
Field validation must use reviewed user-friendly messages, not arbitrary thrown
text. Avoid logging form/source content while debugging.

Do not remove actual HTTP status, structured error codes/details, request IDs or
safe operational logging from backend contracts. `ApiError` keeps these fields;
`describeApiError` is presentation only. Server error logging retains correlation,
code, status and error type, without source/secret/raw exception text. Browser
console/network panels are diagnostic surfaces, not normal user-facing UI.
Authorized operational audit records are not ordinary error notices; any redesign
of Admin diagnostic projections requires its own scoped review.

## Visual and accessibility rules

Use compact inline feedback for minor failures, not alarming illustrations or
modals. Neutral empty states, red errors/destructive actions, amber attention,
green confirmed success; use established Projex tokens/icons and explicit labels.
Never convey meaning through color/icon alone. Associate field errors using
`aria-describedby`/`aria-invalid`; use an accessible focusable error summary for
multi-field failed submission. Use `role="alert"` for actionable errors and polite
status regions for loading/empty matches. Keep focus visible and keyboard actions
operable; no focus stealing for transient notices. Small screens must reflow.

## Required tests for affected features

- Empty matches never navigate or request a guessed file; exact paths are distinct.
- Missing/denied/timeout/network/server responses are safe, contextual and local.
- No status number, raw message, diagnostic reference or private record leaks.
- Retry really repeats the relevant request; Back leads to its useful context.
- Branch/tab/project/folder identity remains; stale responses cannot cross it.
- Failures and refresh do not clear dirty text, stdin, feedback or commit drafts.
- Conflicts never silently overwrite changes or replay writes.
- Backend status/details/correlation and safe logs remain available.
- Existing role permissions and other repository types remain functional.
- Relevant frontend tests, lint, build, desktop and narrow visual checks pass.

## Current adoption boundary

Group finder and local file errors implement this standard. Shared RequestState
no longer renders request IDs; shared error description uses UI-owned copy rather
than raw server messages. Broader route/render boundaries, validation mapping,
cross-route drafts and per-module recovery are tracked in
`PROJEX_UI_POLISH_ROADMAP.md`, not claimed complete by this document.
