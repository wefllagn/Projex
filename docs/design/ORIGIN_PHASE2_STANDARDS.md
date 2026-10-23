# Origin Phase 2 standards

The approved layout, typography, spacing, Class cards, IDE panes and navigation remain the source of truth. This is a small extension of `origin-application.css`, `origin-workspace.css` and the academic styles, imported last through `origin-polish.css`. No new dependency, schema or backend contract is introduced.

| Standard | Implementation | Usage |
| --- | --- | --- |
| Origin Control Surface | `client/src/origin/origin-polish.css`; existing `--origin-metal`, `--origin-control`, `--origin-edge-light`, `--origin-shadow` | Existing primary/outline actions, Admin actions, dialogs, segmented tabs; borders and short material transitions retain original geometry. |
| Origin Interactive Row | Same stylesheet; `--origin-hover` and `--origin-pressed` derive from existing surface tokens | Activity/Group Project Classwork rows, To-do, To Review, sidebar Classes and repository lists. Default is quiet, hover is lightly filled, press is inset, current uses the approved metal material. Focus has an independent visible outline. Composite repository rows highlight when their actual links are hovered/focused; navigation remains on those links. |
| Origin Passive Surface | `.academic-overview-card` in the same stylesheet | Class Overview uses the normal surface and a restrained edge highlight, without a selected/pressed treatment. |
| Origin Identity Badge | `client/src/classes/ClassIdentityBadge.jsx` and `.origin-identity-badge` | Shared circular framing for Class cards, sidebar and Student/Instructor headings. Legacy size/position classes remain. The Class initial is the fallback; optional `imageSrc` allows a future image contract. |
| Origin User Avatar | `client/src/components/UserAvatar.jsx` and `.origin-user-avatar` | Neutral fallback in account menus and Your work. Explicit `male`/`female` variants use local assets; no gender inference. Optional `imageSrc` is ready for a future image contract. Skin, clothes and hair have fixed SVG fills; only circular background/frame tokens change by theme. Existing initials-based roster/staff identities and Admin text-only identity layouts remain intact. |

Local assets: `client/public/assets/origin/avatars/male.svg` and `female.svg`. Profile uploads are outside this phase.

Use 150ms material transitions for controls/rows and a 160ms, 5px modal entrance. Respect `prefers-reduced-motion`; avoid extra ambient animation in the reading/editing workspaces. Public controls receive the same focus/transition refinement. No new decorative artwork or moving hero is added.

## QA-STD-001 — Origin Graceful Error & Recovery Standard

`RecoveryScreen.jsx` composes the existing `AppDialog.jsx` with Origin theme tokens. Blocking dialogs trap focus, cannot be dismissed with Escape, and make the application root inert and hidden from accessibility navigation. Recovery backgrounds contain only branding; the old private tree is unmounted rather than blurred in place.

`ApplicationErrorBoundary.jsx` contains provider/component failures. The root Router `errorElement` contains route failures. Both offer real retry and safe-home actions; unavailable links receive their own helpful message. Diagnostic exceptions go to the development console, while production emits a render-failure event without putting diagnostics into the UI. This is browser-console reporting, not a new remote monitoring service.

`AuthContext.jsx`, `ProtectedRoute.jsx` and `SessionRecovery.jsx` handle session problems separately. BroadcastChannel plus a nonce-only storage fallback announce changes without storing credentials or account data. Focus, visibility, pageshow, protected navigation and denied/exhausted authenticated requests revalidate the server identity. Changed/expired/unverifiable sessions unmount protected providers and content. Pending responses from the old API generation are discarded. Continuing uses the confirmed account's dashboard; switching calls server logout. Backend role, session and ownership enforcement remain authoritative and unchanged.

Instructor People validates the role-dependent roster projection before rendering it and guards optional strings. A Student-safe roster projection cannot become an Instructor management table. A recoverable malformed response offers retry.

Ordinary validation remains inline/native and preserves editable input. A same-account focus check retains the mounted form/code. An account change deliberately removes that account's private draft from the active UI; this phase does not introduce draft transfer between accounts. Existing safe API error mapping, nonblocking success notices and loading feedback remain in use.
