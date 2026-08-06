# Admin Functionalization and Operations

## Phase 9 boundary

Phase 9 is backend-focused. The existing admin React pages remain a temporary mock and feature inventory; Phase 10D owns their redesign and integration using the student/instructor visual language.

Phase 9A implements authorization and accountability only. Phase 9B read-only dashboards/global operational summaries and Phase 9C Git-credential revocation/provisioning retry remain separately approved milestones.

## Administrator role

An administrator manages institutional account and class lifecycle and may receive deliberately minimized academic metadata. Administrator status never implies instructor ownership, grading authority, repository source access, hidden-test access, or arbitrary infrastructure control.

Phase 9A retains existing admin user provisioning, setup resend, user status, class, join-code, and class-membership administration. It adds:

- `GET /api/v1/admin/users/:userId/account-summary`;
- `POST /api/v1/admin/users/:userId/sessions/revoke`;
- active-admin checks at route and service boundaries;
- optimistic concurrency and bounded reasons for disruptive admin changes;
- self-disable and last-active-admin protection; and
- transactional allowlisted administrative audit events.

Admins cannot create/update/publish/close/archive/restore programming activities, replace/list test definitions, retrieve practice outcomes, grade/correct/release/resolve submissions, author project tasks or repository review/feedback, inspect repository source, or issue Git credentials.

## Safe account projection

Account summaries include safe user identity/status timestamps, setup state and nonsecret expiry, aggregate session counts, and class-membership lifecycle summaries. Explicit selections omit password hashes, token hashes/values, cookies, CSRF data, IP addresses, user-agent strings, setup links, source, hidden tests, credentials, host paths, and environment configuration.

Session revocation affects only active unexpired sessions. Repeating a successful request after all sessions are revoked returns a zero count and does not create a duplicate audit event.

## Status concurrency

Admin status changes require the target's `expectedUpdatedAt`. The repository obtains a transaction-scoped PostgreSQL advisory lock before reading/counting administrators and changing status. This serializes administrator-disable decisions; concurrent administrators cannot disable each other and leave zero ACTIVE administrators. Self-disable requests are rejected before repository mutation.

## Administrative audit ledger

`AdminAuditEvent` stores only:

- actor administrator ID;
- allowlisted enum action;
- allowlisted target type and optional UUID;
- a bounded reason where required;
- request UUID;
- internally constructed action-specific metadata; and
- creation timestamp.

The application exposes no update/delete audit API. Successful mutations and audit creation use one PostgreSQL transaction, so audit failure rolls back the mutation. Denied and failed requests use redacted operational/security logs and never masquerade as successful audit rows.

Phase 11 remains responsible for retention, export, tamper-evidence, incident review, and broader durable security-event coverage.

## Verification boundary

The additive Phase 9A migration is deployed to `projex_test` first. Tests cover safe projections, route/service denial, bounded reasons, idempotent session revocation, optimistic concurrency, concurrent last-admin protection, transactional audit rollback, and unchanged instructor/student academic behavior. Applying the migration to normal `projex`, Phase 9B/9C work, frontend changes, commit, push, and integration require later approval.
