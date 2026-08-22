# Projex Authentication and Authorization

## Scope and account policy

Phase 3 implements backend authentication and authorization only. There is no public registration endpoint, frontend authentication integration, password-reset flow, Google OAuth, class-management API, or feature-specific academic endpoint in this phase.

Phase 10A.1 later integrates the existing React client with these contracts. The browser keeps server-issued access and refresh material only in HTTP-only cookies, reads the CSRF cookie only when constructing protected mutations, performs one shared refresh after eligible 401 responses, and persists no session/setup credential in browser storage. Setup tokens are consumed from a URL fragment, removed from the visible URL immediately, and retained only in component memory.

Projex accounts are provisioned:

- Instructors may provision students only into a class they own and must supply that `classId`.
- Administrators may provision students with or without an initial class.
- Only administrators may provision instructors.
- Administrators cannot be provisioned through HTTP. The first administrator is created with the controlled `npm run admin:create` command.

The server fixes the created role. Request bodies cannot select `STUDENT`, `INSTRUCTOR`, or `ADMIN` authority.

## Account statuses

| Status | Meaning | Authentication behavior |
| --- | --- | --- |
| `SETUP_PENDING` | Provisioned account has not chosen a password. | Cannot log in or be activated through the status endpoint. |
| `ACTIVE` | Account is usable. | May log in and use active sessions. |
| `INACTIVE` | Administratively deactivated. | Cannot log in or refresh; active sessions are revoked immediately. |
| `SUSPENDED` | Administratively suspended. | Cannot log in or refresh; active sessions are revoked immediately. |

Allowed administrative transitions are `ACTIVE` to `INACTIVE`/`SUSPENDED` and `INACTIVE`/`SUSPENDED` to `ACTIVE`. Phase 9A adds a mandatory bounded reason, optimistic concurrency, transactional audit persistence, self-disable rejection, and a PostgreSQL advisory transaction lock that prevents concurrent requests from leaving zero ACTIVE administrators. Role changes remain unavailable over HTTP.

An ACTIVE administrator may request a safe account summary and revoke all active unexpired sessions for a target user. Revocation is idempotent and dynamically effective; projections and audit records never contain refresh tokens, cookies, CSRF hashes, IP addresses, or complete user-agent data.

## Provisioned account and setup-link flow

1. An authorized instructor or administrator submits a student's name and normalized university email, or an administrator submits an instructor's details.
2. The backend creates the user with `passwordHash = null` and `status = SETUP_PENDING`. Student membership, when requested, is created in the same transaction.
3. The backend generates at least 32 cryptographically random bytes. Only the SHA-256 hash is stored in `account_setup_tokens`.
4. A provider-neutral email client delivers a setup link shaped as `FRONTEND_ORIGIN/account-setup#token=RAW_TOKEN`.
5. The raw token is carried in the URL fragment, not a query string. Fragments are not sent in HTTP requests; a future frontend submits the token in a JSON body.
6. The token expires after 24 hours by default and is single-use. Completion verifies pending status, hashes the selected password with Argon2id, activates the account, marks the token used, and invalidates other unused tokens transactionally.
7. Setup does not create a session. The user must log in normally afterward.

Resending is limited to pending accounts, has a five-minute cooldown, invalidates previous unused tokens, and applies instructor student/class-ownership checks again.

For manual controlled-test delivery, an ACTIVE administrator receives the same newly generated setup link only in the successful provisioning or explicit reissue response. The response is marked `no-store`, and the Admin frontend retains the link only in the issuing dialog's component memory so it disappears on close/navigation/reload. Instructor provisioning and resend responses remain mail-only and never receive the raw link. Normal user directories, account summaries, audit events, health/operational projections, and later reads never expose it. Because only the hash is persisted, a raw link cannot be recovered; an administrator must explicitly issue a new one for a still-`SETUP_PENDING` account, subject to the existing cooldown and invalidation rules.

## Password security

Passwords are hashed with Argon2id. They are never trimmed, returned, logged, placed in URLs, or stored as plaintext.

The password policy is:

- 10 through 128 characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one number.
- At least one special character.

Login always returns `Invalid email or password.` for unknown email, incorrect password, pending setup, inactive status, or suspension. Internal logs may record a non-secret reason.

Changing a password verifies the current password, applies the same policy, updates `passwordChangedAt`, and revokes every other refresh session. The current validated session is preserved.

## Cookie design

| Cookie | HttpOnly | Path | Lifetime | Purpose |
| --- | --- | --- | --- | --- |
| `projex_access` | Yes | `/` | 15 minutes by default | Signed access JWT. |
| `projex_refresh` | Yes | `/api/v1/auth` | 7 days by default | Opaque refresh token. |
| `projex_csrf` | No | `/` | Refresh-session lifetime | Double-submit value bound to the refresh session. |

`Secure` and `SameSite` are validated environment settings. `SameSite=None` requires `Secure=true`. No cookie domain is configured by default. Authentication material is never placed in response JSON, `localStorage`, `sessionStorage`, query strings, or logs.

## Access-token lifecycle

The access JWT uses an HMAC secret and includes only:

- `sub`: user UUID.
- `role`: role at issuance time.
- `sid`: refresh-session UUID.
- `tokenType: access`.
- standard issue and expiry timestamps.

The role claim is not authoritative. Every authenticated request verifies the JWT signature/type, loads the referenced user and refresh session from PostgreSQL, requires current `ACTIVE` status, and rejects revoked or expired sessions. Authorization uses the current database role, so logout, status changes, and role changes are not delayed until JWT expiry.

## Refresh-session lifecycle

Refresh tokens are opaque values generated from at least 32 random bytes. Only SHA-256 hashes are stored in `refresh_sessions`.

Every successful refresh:

1. Validates the refresh cookie and its active database session.
2. Validates CSRF against that session.
3. Revokes the current refresh-session row.
4. Creates a replacement in the same family.
5. Links the previous row through `replacedBySessionId`.
6. Issues new access, refresh, and CSRF cookies.

Use of a revoked or replaced refresh token is treated as possible theft. All active sessions in that family are revoked, authentication cookies are cleared, a generic authentication error is returned, and a token-free security event is logged.

Logout revokes the current session. Logout-all revokes all active sessions for the user. Deactivation and suspension also revoke every active session immediately.

## CSRF protection

On login and refresh, the backend generates a random CSRF token, stores only its hash on the refresh session, and sets the readable `projex_csrf` cookie.

Authenticated state-changing requests require:

- The raw token in the `X-CSRF-Token` header.
- The same raw token in the `projex_csrf` cookie.
- A SHA-256 hash matching the current refresh session's `csrfTokenHash`.

Comparisons use timing-safe operations. CSRF is required for refresh, logout, logout-all, password changes, provisioning, setup resend, and status changes. Login, account-setup completion, and health checks do not require authenticated CSRF. JSON mutation endpoints require `Content-Type: application/json`.

## Authorization

Reusable middleware provides authentication, one-role checks, and multiple-role checks. Middleware reads `request.auth.user.role`, which was loaded from PostgreSQL for that request. It never trusts request-body roles, URL roles, stale JWT roles, or frontend visibility.

Role middleware is only the coarse boundary. Provisioning services and repositories enforce class ownership and target membership again where resource-specific authorization is required.

## Rate limiting

Temporary in-memory throttles protect login, refresh, setup completion, setup resend, and student/instructor provisioning. Keys use IP, normalized email, or authenticated user ID as appropriate. These throttles do not permanently lock accounts.

The store is suitable for the current single-instance controlled deployment only. A shared bounded store is required before multi-instance deployment so limits are consistent across instances.

## Email delivery

The `EmailClient` interface is provider-neutral.

### Preview transport

`MAIL_TRANSPORT=preview` writes rendered setup messages to the ignored `server/.mail-preview` directory or `MAIL_PREVIEW_DIR`. It sends no network email. Structured logs include only the generated preview filename; they never include the setup URL or raw token. Preview transport is rejected automatically when `NODE_ENV=production`.

### SMTP transport

`MAIL_TRANSPORT=smtp` requires separately configured host, port, TLS mode, username, and password. No Gmail, Google Workspace, or provider hostname is hardcoded. Deployment may use an approved institutional, owned-domain, or provider-managed sender.

SLU Gmail recipients receive setup messages as ordinary email recipients. Projex does not require Google Workspace administrator access merely to send email to them.

Google Sign-In may be added later as a separate authentication method. Phase 3 creates no Google-specific tables or endpoints, and authorization remains based on the current Projex user/session records rather than the password mechanism itself.

## Initial administrator

The first administrator is created manually:

```powershell
npm run admin:create
```

The command validates `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` separately from normal server startup, applies the password policy, hashes with Argon2id, creates `role = ADMIN` and `status = ACTIVE`, sets `passwordChangedAt`, and refuses a duplicate email. It never prints the password and does not run automatically.

## Security assumptions and limitations

- HTTPS and `AUTH_COOKIE_SECURE=true` are mandatory for hosted internet testing.
- The access-token secret must be a high-entropy hosted secret and must differ between development and hosted environments.
- Preview email is development-only; production must use approved SMTP configuration.
- Rate limiting is process-local until a later shared-store decision.
- JWT signing uses one configured symmetric secret in Phase 3; key rotation requires a later documented deployment procedure.
- Password reset, MFA, Google Sign-In, session-management UI, and security-notification email are not implemented.
- Prisma queries are parameterized. Request input must never enter unsafe raw SQL.
- Logs redact password, token, cookie, authorization, database, and SMTP-secret fields and never log complete request bodies.
