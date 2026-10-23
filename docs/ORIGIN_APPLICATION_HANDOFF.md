# Origin application handoff — 2026-10-23

Branch: `design/origin-application`. This is a published integration checkpoint for Mac acceptance, not deployment approval.

## Sources and preservation

- Functional authority: `demo/projex-presentation` at `ead3ab262f6f408230269a8fa22dd5eb31838981`.
- Approved public appearance: `codex/origin-landing-macos` at `29891f901fdb64a2b61e6ab6f7568bd1e5edf34e`.
- Public integration checkpoint: `55022ee`; selected landing/login assets and components were reconciled onto the functional authority without merging the older application.
- Existing Windows checkouts, shared branches, and Mac presentation resources were preserved.

## Saved implementation

Origin branding and shared authenticated light/dark surfaces cover Student, Instructor, Admin, Activity IDE, and repository components. Original class-card markup and grid are retained. The final pass changes only CSS colors, border shades, icon filters, and disabled opacity; sampled browser geometry matched before and after in both themes.

Earlier Windows verification fixes are preserved: explicit UTF-8 stdout/stderr for interactive Java, Windows ESM fixture URLs and newline/cancellation expectations, and database-clock-safe test fixtures. No assessment policy, authentication contract, Git operation, schema, or migration was changed.

## Verification performed

- Final frontend lint and production build: passed. Build retains a large-chunk warning.
- Earlier complete frontend regression: 657 passed. After restoring original class cards: 16 focused class workflow tests passed.
- PostgreSQL integration: 128 passed; real Java: 36 passed; real Git: 48 passed; Smart HTTP: 12 passed.
- Backend lint, application/integration type checks, build, and Prisma validation passed.
- All 28 committed migrations were checked and applied to isolated QA databases; canonical LF and Windows-applied checksums were recorded privately.
- Real browser login and role redirects for all three roles; activity draft/starter/test creation and publication; interactive Scanner prompts and two inputs; visible tests; official submission, Instructor draft/release, and matching Student 100/100 result were exercised.
- Group repository initialization, branch creation, one-file commit, and fast-forward merge succeeded through browser controls.
- IDE keyboard/pointer resizing was exercised. Screens were captured in both themes and at desktop/tablet/phone widths before the final shade-only pass; the final role home pages were inspected in both themes.

## Acceptance still required

This is PARTIAL against the original exhaustive acceptance request. Final full-browser coverage of every role restriction, native credential issuance/revocation, stale/conflict/deadline/review-freeze state, all responsive dialogs and keyboard paths, Save-to-Git outcome assertion, and complete unsaved-change/Stop/EOF/error sequences remains incomplete. Automated suites cover many of these contracts but do not replace the missing browser acceptance. The complete functional suites were not repeated after the final shade-only pass, as requested.

Screenshots, private demo credentials, QA databases/storage, logs, and runtime settings remain outside Git. The loopback Windows preview was left running at `http://127.0.0.1:5193/`, with API on port 3193 and isolated PostgreSQL on 56437.

## Mac acceptance

Fetch `origin design/origin-application` and create a separate checkout from that remote branch. Install the committed client/server lockfiles and generate Prisma Client. Restore a separate copy of the presentation database and Git storage; point private environment settings and workers to those copies with loopback ports. Verify migration status/checksums against all 28 committed migrations before testing. Do not reset the preserved demonstration database or reuse its managed storage. Run the repository's existing checks and the outstanding acceptance flows above. Windows QA scripts are local artifacts and are not deployment tools. No merge or deployment is authorized by this handoff.
