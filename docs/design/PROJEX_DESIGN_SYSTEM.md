# Projex Design System v1

Status: implemented first adoption on Group screens; Product Owner visual review
pending. This is a reusable direction, not permission to redesign frozen Activity
or separate Admin work. React 19/JSX, Router and existing CSS remain.

## Identity and hierarchy

Latest search interaction supersedes the inline finder below: Go to File uses a
compact anchored typeahead overlay, exact filename/path then prefix then partial
path ranking, primary filename/secondary directory, keyboard selection, Escape,
outside dismissal and Clear. Preserve underlying files without layout shift.
Reuse bounded authorized snapshot discovery; no fake paths or full-page misses.
Hide unsupported Add File (latest work order supersedes earlier WIP preview).
Browser .java/.md editing is deferred by Product Owner (2026-10-19) to a later
milestone; native Git is sufficient for MVP. Preserve the separate durable-write
proposal and unresolved decisions, without fake Edit/Commit controls or new APIs.

Light academic developer workspace: existing Projex branding, sidebar, font stack
and blue accent. No dark sidebar, copied GitHub branding, new font downloads or
decorative gradients. GitHub-familiar repository organization, not feature parity.
One primary task per pane; repository names outrank generic relationship headings.
Preserve Class, Project, due date and academic review context concisely.

## Tokens and typography

Implementation: client/src/design/projex-tokens.css. Tokens are namespaced px;
Group CSS adopts them incrementally, without rewriting global App.css.

| Purpose | Foreground | Background | Calculated text contrast |
| --- | --- | --- | ---: |
| Primary/action/selected | #0961ed | #ffffff | 5.32:1 |
| Main text | #122350 | #ffffff | greater than 4.5:1 |
| Secondary text | #53647d | #ffffff | 6.02:1 |
| Ready/success | #17653c | #edf8f0 | 6.51:1 |
| Pending/warning | #85520b | #fff6df | 6.08:1 |
| Error/destructive | #a52c37 | #fff0f1 | 6.30:1 |
| Neutral surface/border | #eff2f6 / #dce6f4 | #ffffff | decorative, not text |

These are pair calculations, not a claim of application-wide WCAG certification.
Focus is #245ec7 with a visible 3px outline. Use semantic text plus color.
Ready storage does not mean academically approved: show separate statuses when
both affect the decision. Working is neutral, requested changes amber.

Inherit the existing app typeface. Page titles 22–25px, pane titles 17–20px,
list primary text 14px/600, supporting text 12–13px, body 14–16px according to
context. Code uses the existing monospace stack, 12px minimum with 1.7 line-height.
Mobile form fields use 16px. No implementation paragraph below every row.

Spacing uses 4/8/12/16/24px; 10px panel radius; 6px controls/badges; 14px dialogs.
Compact desktop rows use about 12–16px vertical padding. Mobile controls are
44px tall where practical; decorative icons need not fill the hit target.
Long user text wraps with overflow-wrap:anywhere in shrinkable grid/flex children.

## Components

- Panels: one border, white surface, restrained or no shadow. No empty giant
  panel for zero records. Avoid nested cards that repeat the same identity.
- Buttons: blue for primary action, outline for secondary, red text for
  destructive actions. Native disabled semantics and visible progress labels.
  Links navigate; buttons mutate or reveal. Confirm removal/revocation.
- Forms: explicit visible labels, limits and optional state where helpful;
  native inputs/selects; no paste blocking. Preserve drafts across background
  reads; explain conflicts and require deliberate retry of versioned writes.
- Dropdowns: concise labelled controls; no duplicate Code action. Credentials
  appear only after explicit Code interaction; never issue during refetch.
- Dialogs: labelled heading, initial focus, Tab/Shift+Tab containment, Escape,
  focus return, close affordance, background scroll lock and contained scrolling.
  Busy invitations/confirmations cannot close mid-write. Unsaved review text
  requires confirmation before dialog dismissal. No new router-wide draft store.
- Tabs: five repository labels; visible blue selected state and keyboard arrows/
  Home/End. Icons supplement text on desktop and are hidden on narrow screens
  to keep all labels in one compact row. Never rely on hover alone.
- Lists/tables: readable primary/secondary text, subtle dividers and hover/selected
  state; group related data, not oversized disconnected cards. Keep pagination.
- Feedback: short contextual status/alert, polite success announcements, no focus
  theft. Avoid repeated architecture disclaimers; move necessary caveats to help.
- Loading/empty/error: keep stable content during safe background source reads;
  fail closed on denied/mismatched responses; use explicit Retry controls.
  No infinite retry, fake records or success inferred from loading completion.

### Honest previews and graceful recovery (approved interaction refinement)

Deferred capabilities may remain visible as intentionally designed previews,
not inert or misleading working controls. Group Add file opens the accessible
"You found a work in progress" dialog, states that browser file creation/upload
is not available, offers the existing local-Git alternative, and changes no data.
Permission restrictions are different from unfinished functionality: never label
an authorization failure "Coming soon" or enable a privileged write action.
This does not authorize adding every future-roadmap action to frozen screens.

Group read failures use a calm illustrated 404/5xx recovery state with short
safe copy, existing Retry when appropriate, a clear exit and optional request
reference. A failed request must not erase drafts or masquerade as an empty
success. This adoption is Group-scoped; global routing/error boundaries and
unrelated Activity/Admin screens have not been redesigned.

Copy feedback is a small transient pointer-anchored "Copied!" popup (button-
anchored for keyboard activation), announced politely without layout shift.
Clipboard failure is stated honestly. Never include the copied value in feedback,
especially credentials; cancel pending feedback when the menu closes/unmounts.
Dropdown sections have consistent 16px gutters and single-line copy controls,
with viewport-contained scrolling. The Code chevron is CSS geometry rather than
a font-baseline-dependent character. Reuse the existing icon kit.

Code toolbar now follows the revised GitHub reference: branch at left; one
Go to file input (Enter opens an exact path), Add file preview and Code at right.
The exact branch commit count is at the right of the latest-commit summary row,
not beside the branch selector. Author, subject and hash navigate to real commit
details; subject hover/keyboard focus reveals actual metadata, dismissible with
Escape. Git author initials are not verified Projex profile avatars.

## Group composition and Git components

Project Detail: readable requirements left, actionable Collaboration pane right.
Member state shows repository name, real group/count/capacity, storage/review state
and Open Repository. Pending invitation state shows repository, inviter, expiry,
Accept/Decline while permitted. Unassigned state uses existing Create Group form.
Closed/restricted state offers no unauthorized creation or invitation actions.
Other class summaries are secondary disclosure, absent for zero records.

Repository: name, group/class/due/status, Code and academic review actions;
Code | Commits | Branches | Members | Activity. Exact commit-pinned file tree,
inline text and root README. Keep bounded safe projections.

Commit history groups by local calendar date; subject first, Git author/time
second, aligned short hash/Copy and selected row. Authorship caveat is contextual;
never equate self-asserted Git authors with authenticated Projex users. Keep
changed files, pagination, branch filter and all parent comparisons.

Unified diff: metadata headers neutral, hunk headers blue-subtle, additions green
and removals red; actual +/- signs remain. Parse hunk counts and line prefixes,
not substrings in source. Preserve exact text/newlines and escape source.
Branches are compact rows with default/protected labels, no invented counters.
Activity uses only supported real events and authenticated push counts, not grades.

## Responsive and accessibility acceptance

Test 1366x768, approximately 900px, and 390px. Primary project action is visible
at ordinary desktop size; narrower layouts place Collaboration before requirements.
Group-only 721–1100px shell correction preserves the sidebar beside content rather
than inheriting the legacy full-width stacked desktop sidebar. Other routes are
not migrated by this exception. No hiding overflow to conceal broken layout.

Maintain semantics, names, visible focus, labelled fields and status text.
Decorative images have empty alt/aria-hidden; standalone icons require a label.
Measure contrast; use reduced-motion CSS; keyboard-test actual dialogs and tabs.
Do not claim assistive-technology certification from automated tests alone.

## Automatic data freshness contract

useGroupFreshness is event-driven, not realtime: initial loaders plus stale
tab/branch entry, focus return and visible-document regain. Stale threshold 15s.
One in-flight revalidation per mounted screen; rapid events share it; hidden
documents do not refresh. Abort on identity/unmount. No interval, background poll
or automatic error retry. Mutations refresh authoritative state independently.

Defer background reload while review/confirmation/Invite dialogs or dirty group
creation are active. On safe return, stale state can revalidate. Keep selected
branch; remount file preview only when its immutable commit changes. Review
drafts retain text and version checks; failed writes are never silently replayed.
Backend authority is checked on every operation; cached UI is not authorization.
Tab, branch and selected Group commit are URL-backed for browser Back and direct
navigation. Remaining limits: no realtime push notification or cross-route draft
persistence. Revisit safely through the roadmap.

## Permanent content and recovery principles

Show structured information rather than explaining the interface through
paragraphs. Prefer clear headings, metadata labels, semantic statuses, consistent
icons, compact counts, short actions and contextual feedback. Remove repeated
instructions and developer-oriented implementation explanations. Keep essential
security, authentication, permission, validation, consequential-action, data-loss,
accessibility and recovery text. Icons do not replace essential labels.

Repository name is dominant; label Group, Class, Project and Due separately.
Use actual server-provided identity: the current Group contract supplies className,
not a separate class code/name split, so do not infer either from punctuation.
Capacity badges show active/limit, pending reservations and available slots without
changing their calculation. Teaching staff entries retain Instructor/Co-Instructor
and Git read-only. Branches retain Default/Protected labels, not a Git tutorial.
Use existing neutral metadata, blue action, green success, amber attention and red
error/destructive tokens; every status must also have meaningful text.

Follow [the error and recovery standard](PROJEX_ERROR_AND_RECOVERY_STANDARD.md).
The earlier HTTP-labelled Group panels and generic Home exit above are superseded:
no diagnostic codes/references in ordinary feedback, no invented recovery target,
and no blanket claims about saved/preserved work. Use the smallest local boundary.
Filename search is now distinct from explicit exact-path opening; Enter searches
the selected immutable snapshot, result selection opens only a returned path.
Keep empty matches neutral and inline. Discovery is capped at 64 directories,
5,000 entries and 10 seconds, with partial-result disclosure. Cache only in the
mounted snapshot; cancel on clear, new query, branch change or unmount.

## Skills applied

UI/UX Pro Max was read from the installed Admin-worktree skill without modifying
it. Its dense/minimalist light layout, core-content priority, consistent icon
geometry, semantic tokens, focus, contrast and responsive rules influenced this
adoption. A first search suggested dark coding UI and was rejected; a narrower
search verified minimalist dashboard guidance. Its generic marketing pattern,
gold palette, fonts and optional animation were not adopted.

Vercel Web Design Guidelines were fetched fresh and used for the semantic-control,
focus, source-escaping, async-feedback, reduced-motion, wrapping, and final code
review checks: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
Product/repository boundaries override generic recommendations.
