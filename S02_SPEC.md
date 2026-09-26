# S02 — Identity and Sessions: implementation specification

Status: DESIGN APPROVED FOR IMPLEMENTATION. Owner authorized S02 on 2026-09-26 and answered the first-Owner bootstrap and staff invitation/recovery choices. S03 and later remain outside this authorization.

## Source and scope

Source order: current Owner instruction; R-005, identity and session portions of R-007, R-076 and R-099; C-008; approved architecture and implementation plan. R-099 lists Google, Microsoft and password sign-in as general security options, while the later approved C-008 explicitly chooses passkeys for Owner and employees and email codes for external portals. S02 implements internal passkeys. External email codes and formal client approval passkey step-up belong to S14. No password, social login, portal or business permission flow is required in S02.

S02 covers the IDN account, passkey credential and server-side session boundary. It does not create Branch, Team, Employee, job-role, project membership, permission grant, client or other business tables. An identity account may have a provisional `OWNER` or `STAFF` kind solely to constrain enrollment/recovery; this is not a grant to access application resources. S03 owns organization membership, RBAC, employee lifecycle, permission and forced logout tied to grant changes. S02 must expose a revocation primitive for S03.

## Identity model and lifecycle

- `Account`: stable opaque ID; normalized unique email for account discovery/invitation; kind `OWNER`/`STAFF`; state `PENDING`, `ACTIVE`, `SUSPENDED`; timestamps. Email must not become an authorization scope. No password column. `PENDING` cannot log in.
- `PasskeyCredential`: WebAuthn credential ID unique globally, account ID, public key, signature counter, authenticator transports if returned, device label, created/last-used/revoked timestamps. Never persist private keys. A revoked credential cannot authenticate.
- `WebAuthnChallenge`: random, short-lived, one-use registration or authentication challenge with account/ceremony binding, expiry and attempt consumption. Challenges never enter audit payloads or logs. Registration requires an authenticated existing account or an explicitly authorized bootstrap/recovery flow.
- `Session`: opaque random bearer secret placed only in an HttpOnly cookie; database stores only a SHA-256 digest of the 256-bit random secret, account ID, created/last-used/expiry/revoked timestamps and nonsecret device metadata. Every protected request reloads current account and session state from PostgreSQL. Expiry and revocation deny access immediately; cleanup may delete expired rows later without being the security boundary. Rotate/create a fresh session after login and recovery; never promote a pre-authentication cookie into an authenticated session.
- `Recovery`: Owner maintains at least two active passkeys and one offline one-use recovery code stored only as a hash. An authorized Owner recovery use invalidates the code and issues a replacement setup flow. Lost staff credential replacement needs a separate Owner-verified authorization record and revokes specified lost credentials and existing sessions.

## Workflows

1. Bootstrap/enrollment: deployment provides the initial Owner email and a high-entropy one-time bootstrap secret through untracked environment configuration. A one-use setup exchange binds that email to a short-lived registration ceremony; deployment removes the secret from active configuration after first use; persisted Owner state prevents reuse. Verify the first passkey registration server-side. Require a second distinct credential and offline recovery-kit acknowledgment before Owner enrollment is considered complete. The bootstrap secret is never logged or returned.
2. Login: enter email, obtain a bounded WebAuthn authentication challenge, invoke browser passkey UI, verify origin/RP ID/challenge/user verification/signature/credential ownership/counter under an established WebAuthn library, consume challenge, create fresh session, set cookie. Unknown account and invalid credentials receive indistinguishable public responses. Rate limit by IP and normalized account identifier; apply generic retry messaging.
3. Restore: frontend calls `GET /api/v1/auth/session` with credentials on load. A valid session yields minimal account identity and a CSRF token or equivalent same-origin protection. Missing, expired, revoked or suspended sessions yield 401 and clear stale cookie. The authenticated page is an identity-only shell.
4. Logout: `POST /api/v1/auth/logout` revokes the presented session in the database and clears the cookie; subsequent use of the old cookie is rejected. Session/device list shows only the current account's sessions; current session is identifiable. Revocation of another session is authenticated, CSRF protected and immediate. Identity-only Owner staff-session revocation is in S02; grant-driven force logout is S03 authorization work.
5. Invitation/recovery: an authenticated Owner may create an identity-only staff invitation with normalized email, single-use expiring enrollment secret and no application grants. Its acceptance registers a passkey and activates only the identity account. A lost staff passkey never self-recovers by email alone. An authenticated Owner verifies the person out of band and records authorization with a reason; old credentials and sessions are revoked immediately. The replacement ceremony is single-use and expiring. Owner recovery uses the offline code with strict throttling and invalidates existing sessions. These are identity operations; S03 must still establish employee records and resource access.

## API contract

Versioned JSON endpoints under `/api/v1/auth`: `POST /bootstrap/options`, `POST /bootstrap/verify`, `POST /passkey/login/options`, `POST /passkey/login/verify`, `POST /passkey/register/options`, `POST /passkey/register/verify`, `GET /session`, `POST /logout`, `GET /sessions`, `DELETE /sessions/:id`, `POST /staff/invitations`, `POST /staff/invitations/options`, `POST /staff/invitations/verify`, `POST /staff/:id/recovery`, and narrow Owner offline recovery endpoints. Validate body shapes and maximum sizes. Never return challenge state beyond the public WebAuthn options, secret hashes, credential public-key internals, recovery hashes or raw session IDs. Return 400 for malformed input, generic 401 for invalid authentication, 403 for authenticated but disallowed identity operations, 429 for throttling, and 503 for dependency failure. No protected endpoint can rely on frontend state.

## Security review before implementation

- Password storage: none for C-008 internal sign-in. Never add a temporary plaintext password or password fallback.
- Credential leakage: WebAuthn public credentials only; registration/recovery challenges and session secrets are never logged. Cookie has `HttpOnly`, `Secure` in HTTPS environments, `SameSite=Lax` or stricter, restricted path and appropriate host-only domain. No token in URL or browser storage.
- Fixation/theft: fresh opaque session after verified assertion, server-side revocation, reasonable idle and absolute expiries, session enumeration and targeted revoke. Do not accept session identifiers from request bodies/headers.
- CSRF: mutating cookie-authenticated routes require same-origin `Origin` verification and a session-bound CSRF token or equivalent robust framework protection. CORS is restricted to configured web origin with credentials.
- Abuse/enumeration: bounded request bodies, IP/account throttles for challenge and verify/recovery, generic external errors and comparable unknown-account paths. Limits are defense in depth; DB uniqueness and one-use challenges prevent replay.
- Authentication bypass: global guard or explicit deny-by-default route classification; only health and designated auth ceremony routes are public. Verify `ACTIVE` account and nonexpired/nonrevoked session on every protected API request. Direct API tests are mandatory.
- Secret handling: environment values validated at startup, never in source, API responses or logs. RP ID/origin configuration must match deployed origin. Use a maintained WebAuthn server library and platform crypto; no custom signature verification or password cryptography.
- Audit now: persist minimal security event records for login success/failure, credential added/revoked, session revoked, recovery authorized/used and account state change, with actor/subject/time/result and no secret content. S04 owns the general append-only audit/outbox foundation; S02 must keep security evidence that S04 can later migrate or integrate.

## Database and migration plan

Create only S02 account, credential, challenge, session, recovery and security event tables with foreign keys, uniqueness and expiry indexes. Review generated SQL before application. Verify a fresh database and an S01-baseline database using dedicated test instances; never reset production-like data. Challenge/session expiry is enforced in queries regardless of cleanup. Verify duplicate email/credential denial, one-use recovery uniqueness and cascade behavior before adopting a migration.

## Frontend states

Login idle/loading, browser passkey unavailable/cancelled, generic invalid authentication, throttled, network/server error, authenticated identity shell, restoring session on refresh, expired/revoked session, and logout pending/done/error. No fake organization or project content. Desktop and mobile layouts must be usable. Do not show account existence or sensitive server details in errors.

## Acceptance and tests

- Unit: challenge/session expiry and replay, credential/account state checks, throttling and generic error mapping.
- API integration against PostgreSQL: successful registration/login, wrong assertion/unknown account, malformed input, unauthenticated protected request, authenticated session reuse, logout/revocation/expiry/suspension, CSRF, secret omission, concurrent/replayed challenge denial and database uniqueness.
- E2E: desktop/mobile passkey path with a deterministic virtual authenticator or equivalent browser support; refresh restoration, logout and expired/revoked state.
- Gates: reviewed migration on fresh and S01-baseline databases; `pnpm verify` exits 0 with typecheck, lint, unit/API tests, build and desktop/mobile E2E; security/adversarial review and S01 regressions; no committed secret; traceability/status/context updated. The documented Windows Playwright managed-server lifecycle caveat remains, so an already valid Vite server may be prestarted for this runner.

S02 can be marked COMPLETE only after all applicable gates run and pass. S03 requires a separate Owner authorization.

## Owner-approved decisions and current implementation record (2026-09-26)

Owner decisions defining this slice: first Owner bootstrap uses an initial Owner email plus high-entropy one-time secret supplied by deployment configuration; staff identity starts only through an Owner-created invitation; staff credential replacement requires Owner verification out of band and a recorded reason (email alone is insufficient); Owner recovery uses a one-use offline code. Owner setup requires two active passkeys and acknowledgment that the recovery code was stored offline. These decisions authorize identity enrollment/recovery only and do not grant application permissions. C-008 selects internal passkeys; external portal email codes and client approval passkey step-up are deferred to S14.

Implemented in the current working tree: identity-only Prisma schema and S02 migration; WebAuthn registration/authentication verification against configured origin/RP ID; Owner bootstrap, staff invitation, Owner-authorized staff recovery and Owner offline-code recovery; hashed session/recovery/enrollment secrets; 12-hour absolute and 30-minute idle session validity; HttpOnly SameSite=Lax cookie (Secure on HTTPS), server reload of account/session state, CSRF token and Origin checks on mutations; session list/revoke API; Owner staff lookup and session revocation API; identity-only login/setup/recovery shell; security-event records for login, credential, session and recovery actions. UI includes bootstrap, login, Owner setup, invitation acceptance, recovery, staff recovery and logout flows.

Acceptance is COMPLETE for development/local staging; exact checks are in S02_COMPLETION_REPORT.md. The bootstrap secret remains in runtime configuration until the deployment operator removes it, while persisted Owner state prevents reuse. Throttling is process-local memory state, so multi-instance deployment needs a shared limiter. Session list/revoke has API and responsive UI support. Owner administrative identity operations require two active passkeys and an acknowledged recovery code; the initial Owner session may exist while setup is incomplete. Invitation and recovery tokens are shown only to the authenticated Owner for manual delivery. S01 production gates and the Windows Playwright lifecycle caveat remain separate. S03 membership, organization, employee records, RBAC and grant-driven account exit/forced logout remain unauthorized.

### Requirement sub-ID trace for S02

- R-005.a internal Owner identity and R-005.b staff identity: account kinds, passkeys and enrollment only; no external portal accounts (R-005.c) or public visitor identity (R-005.d).
- R-007.a Owner authentication identity and R-007.c identity-security/recovery duties: bootstrap, second passkey, offline recovery code and recovery; Owner organization-wide business authority, employee/branch management and permission grants are S03.
- R-099.a internal authentication; R-099.b server-side session, cookie, CSRF and same-origin checks; R-099.c Owner/staff recovery; R-099.d throttling and generic authentication failure behavior are the S02 subset. R-099.e resource authorization belongs to S03; R-099.f general append-only audit framework belongs to S04, with S02 security events as transitional evidence.
- C-008.a–b internal staff passkeys and account enrollment/recovery are S02. C-008.c client approval passkey step-up and external email-code login are S14; C-008.d–e email/notification delivery belong to S04/S14.
- R-076.a portal email-code authentication and R-076.b client approval passkey step-up are explicitly deferred to S14; no portal auth is included in S02.
