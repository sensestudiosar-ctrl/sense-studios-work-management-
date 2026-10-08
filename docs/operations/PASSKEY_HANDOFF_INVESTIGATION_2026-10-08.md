# Passkey handoff investigation — 2026-10-08

## Scope and requirement mapping

This is a bounded investigation record for the S02 internal identity flow: R-005.a–b, identity portions of R-007.a/c, R-099.a–d/f, and C-008.a–b. S02's accepted implementation uses WebAuthn passkeys for internal Owner/Staff identity. Recovery and session behavior remain governed by S02; organization authority and business permissions remain separate concerns. This record documents current diagnostic evidence and unresolved reproduction details. It does not establish a current root cause, a fix, or production readiness.

## Current local diagnostic evidence

- The verified local host was `localhost:59223`; Vite was available at `localhost:59223` (PID 42444); the API was ready at `localhost:59224` (PID 30684), with a database connection.
- The local configuration was `.env.checkpoint-tools/local-test-latest-server.json`, using `runs/local-preview-1791474390772/server.env.test` and database `sense_local_preview_20261008_1791474390772_test`. The bootstrap identity configured for this diagnostic was `owner@local.test`. No credentials or bootstrap secret are recorded here.
- Read-only SQL inspection found no `OWNER` account rows and no `s05.owner@example.test` rows in that database. No database writes or other database changes were made. Therefore this database does not establish whether an earlier enrollment, second credential, or account handoff exists. Do not infer a second-passkey count from historical or current database state without checking the specific database and account.
- The local login options were RP ID `localhost` and user verification `required`.
- The prior phone diagnostic reported success on a direct HTTPS route using the original relying-party identity. That observation was not a completed account handoff and does not establish success for the current localhost setup.

## Network and QR observations

The existing Tailscale routes include HTTPS port 443 proxying HTTP port 5178 and HTTPS port 8443 proxying HTTP port 58223; the 8443 route is unverified. Port 443 returned HTTP 502 during the prior check. That is a proxy/serving-path failure and is separate from a WebAuthn failure after a usable page is loaded. Port 8443 has not been verified.

The localhost page is not directly reachable from a phone as a routable host. However, that fact alone does not rule out a browser-controlled QR or WebAuthn hybrid handoff: whether a particular browser/device flow can complete depends on the browser, platform, secure context, RP/origin, and the actual ceremony. Chrome's QR path is controlled by the browser. UI hints can express browser preferences, but changing them is not evidence that the underlying post-scan `NotAllowedError` is fixed.

The prior report of `NotAllowedError` occurred before the browser returned a registration credential to the API. The exact browser/OS versions, platform authenticator state, selected credential, exact error text, and request trace were not captured in the evidence available for this record. The old HTTPS `502` is a distinct issue and should not be used to explain that pre-response error.

## Diagnostic boundary and next evidence

There is not yet a current, fully specified reproduction with enough evidence to identify a cause. Before proposing a code change, capture one fresh attempt with:

1. Chrome version and channel on Windows, Windows version/build, and Chrome version plus iOS version on the phone.
2. The exact screen/action sequence, QR scan and phone prompt behavior, whether the user selected an existing credential or started a new registration, and the full browser error text (including whether it is `NotAllowedError`).
3. The page's exact origin, RP ID, HTTPS/secure-context status, and whether the phone and desktop are using the same deployment hostname.
4. Correlated browser console/network details and server request/event evidence, with challenge/credential IDs redacted or safely pseudonymized. Establish whether a request reached the API before failure.
5. The intended human credential flow: which account is being authenticated or enrolled, which device owns each credential, and whether the goal is login, adding a second passkey, or handing an account to another person. These are distinct operations and should not be conflated.

Reproduce on the exact intended route and supported browser/device combination first. Compare direct local desktop, supported HTTPS desktop, and phone handoff only where the route is reachable. Preserve the exact origin/RP relationship in each comparison. Do not claim a fix until a reproduction is captured and the same journey succeeds after the change.

## Required invariants

- Preserve two distinct passkey credentials for Owner setup/recovery policy; do not treat a cross-device login or handoff as creation of a second credential.
- Preserve the five-minute fresh-authentication window and five-minute expiry behavior.
- Keep relying-party ID and origin validation, CSRF protection, user-presence and required user-verification checks, and challenge single-use semantics intact.
- Do not weaken authentication checks or introduce a credential transfer/export flow to accommodate a browser handoff.
- Keep identity recovery and credential replacement within the Owner-authorized, audited S02 recovery process.

## Work performed and status

At the initial inspection stage, this document recorded the provided host/configuration observations and read-only database finding; that inspection changed no source code or database state. Subsequent diagnostic and Owner-reported implementation evidence is recorded below. Context and requirement interpretation were routed for Sol review; the bounded documentation was prepared by Luna. Current implementation and acceptance status are captured in the latest sections below.

## Subsequent diagnostic acceptance and Owner evidence

The Owner reports that QR sign-in works once registration is completed. This supports functioning hybrid authentication (GET); second-credential creation (CREATE) still requires a real-device reproduction. Installed Windows Chrome was read as 154.0.8037.98. At the time of this earlier note, the phone OS/version and native cause detail had not been captured; the subsequent Owner evidence below supersedes that status.

The development registration message now includes the first-level native DOMException cause (allowlisted name, single-line message capped at 200 characters). Production wording is preserved. Unknown objects, stacks, credential data and ceremony state are not serialized or persisted. No backend, authentication policy, registration option, schema or database change was made. Source: apps/web/src/passkey-registration-error.ts and its focused test, with a small integration in app.tsx.

Actual host checks: focused Vitest run passed 7 selected cases across two files (30 other cases deliberately excluded by the name filter); web TypeScript check and scoped ESLint passed; production web build passed with bundle-size and ineffective dynamic-import warnings. The broader initial app suite passed31/32 and failed the Projects heading assertion because two existing headings match. Sandbox attempts had dependency export/temp-file resolution failures; host results are the reliable checks. Initial diagnostic lint/test issues were corrected before the passing rerun. Live Vite59223 serves the helper with cause and message cap present.

GPT-6.1 Sol accepted the diagnostic source and boundaries; GPT-6 Luna implemented the bounded helper/tests. The diagnostic improvement is accepted locally, while physical second-passkey QR creation remains unresolved. Next comparison: first credential CREATE versus second credential CREATE using the same site, phone and provider, with the new browser cause and exact phone failure stage recorded. Any credential enrollment must use the ordinary human workflow and preserve prior identities/credentials.

## Fresh second-passkey attempt — 2026-10-08

Owner supplied the native NotAllowedError detail: operation either timed out or was not allowed, and confirmed this occurred while adding the second credential. Read-only host SQL against the actual localhost59223 database confirmed owner@local.test ACTIVE/OWNER with one active credential. Latest registration challenge was created at2026-10-08T16:28:23.441Z and remained unconsumed; initial registration at16:27:41.861Z was consumed. No credential response reached the registration verifier for that second attempt. Existing credential was not changed.

Installed SimpleWebAuthn13.3.2 uses a60-second browser timeout hint; server challenge validity remains300seconds. The generic error does not prove a timeout. Sol reviewed the distinction between successful QR authentication and failed credential creation. No new code change was justified by this message alone.

## Owner follow-up: provider and failure stage — 2026-10-08

The Owner reports that the first passkey was saved in Google Password Manager. During an attempt to add the second passkey, the phone running iOS 27 displayed “operation cannot proceed.” The browser still exposes only the generic native `NotAllowedError`; there is no confirmed underlying cause and no fix to the second-passkey creation failure. Successful QR login after a credential exists remains a separate, previously observed flow and does not demonstrate successful second-credential creation.

The Owner has since clarified that the error appears before any save-provider choice. Therefore an Apple Passwords retry is not currently available, and provider selection remains an unconfirmed hypothesis rather than an established cause. The recorded pre-chooser stage is the latest evidence. If a future attempt reaches provider selection, record whether Apple Passwords or Google Password Manager is selected and make one explicit Apple Passwords retry only if it is offered. Do not repeat the earlier Google-provider-disable probe; that historical probe did not resolve the problem. This is a diagnostic comparison only, not an established workaround or cause.

Google's current platform guidance says Chrome on iOS/iPadOS stores passkeys in Apple Passwords/iCloud Keychain by default; Google Password Manager is an optional provider enabled in system settings. The same guidance describes Chrome cross-device authentication. Google's Chrome help documents scanning a QR code with a phone to use a passkey on another device. These references support the observed QR login flow and justify checking the selected provider; they do not identify the cause of this CREATE failure or establish that this second-passkey flow should succeed. [Google passkey platform support](https://developers.google.com/identity/passkeys/supported-environments) · [Google Chrome Help: manage and use passkeys across devices](https://support.google.com/chrome/answer/13168025?hl=en).

Still needed for a reproducible diagnosis: exact Chrome/iOS build details for the affected phone, any further exact event trace around the confirmed pre-chooser failure, and elapsed time. Provider choice and the failure cause remain unknown. Keep the existing credential and recovery requirements intact; no repeated provider-disable experiment, credential removal, or weakening of WebAuthn checks is warranted by current evidence.

## Controlled display-name trial — 2026-10-08

The Owner reports that a CREATE attempt on WebAuthn.io succeeded through the same Chrome/iPhone QR path. This was a useful comparison for this RP's failure, but did not alone establish the cause or a general platform fix. A temporary development-only local trial copied the existing `user.name` into `user.displayName` only when the fetched registration option's display name was empty, immediately before calling `startRegistration`. This changed no other request field. The temporary client-side trial was subsequently removed after the same-app retry reported below.

Scope remains S02 R-005.a–b, identity portions of R-007.a/c, R-099.a–d/f and C-008.a–b. The trial compared QR credential creation with a nonempty user label while retaining the established identity, RP/origin, CSRF, user-verification, challenge and recovery requirements. Do not generalize from the WebAuthn.io result alone.

Trial checks: Node 24.19.0 host web TypeScript and scoped app.tsx ESLint exited 0; targeted diff whitespace check exited 0. A read of the live Vite app module at localhost:59223 confirmed the diagnostic comment and assignment were served. No tests were added or run for this temporary trial. GPT-6.1 Sol settled the trial boundary; GPT-6 Luna implemented it. These checks apply to the temporary client-side trial only, not the current API correction.

## Owner retry and permanent source correction — 2026-10-08

At the initial retry checkpoint, the Owner reported that the same-app second-passkey QR CREATE succeeded on the physical Chrome/iPhone flow after the sole label delta: using a nonempty `user.displayName`. This was direct evidence for the controlled comparison; persistence and permanent runtime acceptance were pending at that checkpoint. The retained-credentials section below records the subsequent confirmations.

The temporary development-only client mutation has been removed. The settled permanent source correction sets `userDisplayName: account.normalizedEmail` beside `userName: account.normalizedEmail` in the API's `newRegistrationChallenge` options generation. It affects the registration challenge source consistently and requires no client field mutation, backend authorization change, schema change, or database write. Existing identity, RP/origin, CSRF, user-verification, challenge-expiry, credential and recovery rules remain in force.

At the source handoff, persistence confirmation, current runtime acceptance, and the applicable source checks were pending. No tests were added or run for this change. The following section records the subsequent DB/runtime/check results; full regression acceptance remains unverified.

## Permanent correction and retained credentials — 2026-10-08

Read-only SQL confirmed owner@local.test has two active credentials with two distinct credential IDs, both before and after the API restart. Creation timestamps are 2026-10-08T16:27:57.473Z and 2026-10-08T16:41:45.185Z. The original credential remains present. The same-app Owner retry succeeded after changing only the empty display label; this supports the bounded compatibility correction, without establishing an Apple/Chrome vendor defect or universal QR compatibility.

The shared server registration generator now sets userDisplayName to account.normalizedEmail. The temporary DEV client assignment is removed. API TypeScript build into isolated output, web TypeScript, scoped API/web ESLint and targeted whitespace checks exited 0. No tests were added/run for this correction and no full regression acceptance is claimed.

The isolated compiler-generated identity.service.js differed from the running module by exactly the display-label addition. Only that module and its correctly rebased source map were promoted; the prior module/map and metadata were retained in .env.checkpoint-tools/passkey-fix-20261008. Existing API modules were preserved. API PID30684 was replaced by PID38556 using the same dist/main.js command and server.env.test, database sense_local_preview_20261008_1791474390772_test, API59224 and web59223. Promotion hashes and metadata are in promotion.json. Direct startup health and the proxied API reported ready; live Vite source confirms the temporary override is absent. No migrations, credential edits or account resets occurred.

Physical success was observed during the single-field client trial. After promotion, health and persistence were checked; no additional physical enrollment was performed and no third credential was created. This is a bounded local correction, not acceptance of other concurrent source edits or production readiness. Actual routing: GPT-6.1 Sol interpretation/review and GPT-6 Luna bounded implementation.
