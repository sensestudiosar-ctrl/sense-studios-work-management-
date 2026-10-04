# S21 Consultant and vendor/factory portals — completion report

**Status: COMPLETE for development/local staging (2026-10-04).** The Owner authorized start and completion on 2026-10-04. Backend, additive schema, isolated external APIs, persistence, audit/events, responsive staff and external UI, focused security/concurrency regressions and the final aggregate gates passed. Sol accepted the source/security and six refreshed desktop/mobile captures. Production native-link, mail, NAS and actual-project gates remain unverified.

## Approved scope and behavior

S21_SPEC.md expands R-075/S21.a–f, R-076/S21.a–b, C-006.a–c, C-012.a, C-016/S21.a–b, R-038/S21.a, R-039/S21.a and R-079/R-080/S21.a. S21_API_CONTRACT.md records the implemented API and current-authority rules. S18 remains unresolved/excluded; S22–S27 remain unauthorized.

Distinct EXTERNAL identities use isolated one-use email codes, cookies, sessions and own-device revocation. OWNER/STAFF authentication explicitly excludes EXTERNAL; CLIENT identity and formal approval remain separate. Reads and commands enforce current account/session, exact grant/persona, project/branch/assignment and resource authority; writes use same-origin CSRF and strict bounded schemas. Ordinary grant management belongs to the Owner, current assigned Project Lead or explicitly authorized Team Leader with exact scope, reason and canonical evidence. A title or `external.manage` alone does not confer document or operational-module access.

Consultants and vendors/factories see only explicitly granted revisions, current unreplaced approved release projections and named work packages. Confidential files/ancestors, internal identities/performance, unrelated records, protected costs, raw internal JSON and NAS paths are excluded. Retained advisory records are projected only when their original grant and every named resource remain authorized. Refreshing authority after lock waits removes expired scopes even when an unrelated grant survives; file streams and acknowledgement retries require their exact fresh scope.

Requests, reviews, exact-revision comments, vendor production-status submissions and uploads are retained advisory evidence. They cannot create internal/client approval, replace production inputs, finalize progress, confirm daily reports, verify/close snags, hand over a site or complete a project. Private resumable uploads validate ownership, type/signature/checksum and current finalization authority. Lost chunk/finalization responses reuse the same upload; lost submission responses reuse the same idempotency identity. Finalized bytes and immutable metadata survive reload without becoming approved revisions.

External formal transmittals retain exact approved revision/checksum and issue prerequisites. Only the named recipient acknowledges; original issue, acknowledgement, advisory, grant and native-share evidence is immutable and canonically bound to transactional audit/domain-event/outbox records.

Only the Owner records one granted CAD revision's native MinisCloud share, requiring an extraction code and exactly seven-day expiry. URL/code secrets use authenticated encryption and are absent from safe history, audit, logs and ordinary projections. Credential retrieval rechecks current share, grant, session and delivery/closeout state after locks. Application denial is immediate on authority loss, while native cancellation requires the Owner's explicit identity/proof confirmation. A fresh deduplicated native-revocation event/outbox drives the mandatory safe Owner notice; recipient context is rechecked by the actual notice worker before delivery.

Project cancellation preserves its pending request while any active native share lacks confirmed cancellation. Final cancellation serializes with issuance/grant changes and atomically ends ordinary external grants alongside existing task/client effects. Separate finite C-016 access names an approved closeout task and exact files/package, ends on expiry, task completion, approval revocation or earlier grant revocation, and never restores ordinary delivery authority.

## Schema and retained-data verification

Five additive S21 migrations extend the schema from 90 to 95 migrations: external account kind, external portal persistence, scope/evidence integrity, the forward internal-session/branch guard repair, and native/current-release state guards. Already deployed SQL was not rewritten. The coordinating run verified all 95 applied on ten fresh current test databases and the retained populated S20 upgrade clone, with no pending migrations. Its post-final preservation check matched original columns, row counts and SHA-256 digests across all 125 pre-S21 tables. No prior production-like data was reset.

## Final verification

The final single pinned Node 24.19.0 / pnpm 11.19.0 `pnpm verify` run, after the final readiness/lint cleanup, exited **0**. It includes the final S21 database regression source. Its retained log is `.env.s21-tools/verify-s21-final3.log`:

| Gate | Actual result |
| --- | --- |
| Typecheck and lint | Passed |
| API unit | 30 suites / 176 tests passed |
| Web unit | 17 files / 122 tests passed |
| Real PostgreSQL integration | 44 suites / 237 tests passed |
| API and web production builds | Passed |
| Serial desktop/mobile Playwright | 39 cases passed, without skips or retries |

The separate final focused PostgreSQL run also exited 0: all 13 cases in `external-portal.database.api.spec.ts` passed (`.env.s21-tools/external-db10.log`). It covers identity isolation/current grants; private upload ownership/checksum/retry; exact issue/own acknowledgement/formal non-bypass; retained-record scope removal; least-privilege staff options and session expiry after normalized-email waits; selected/redacted current vendor production context; multi-grant expiry after production and file-metadata waits; Owner-only encrypted CAD/manual cancellation/finite closeout; cancellation versus issuance; scope/version change during issuance; revocation before credential reveal; actual current external issue eligibility; and session/grant expiry using the database clock after waits. Native loss coverage drains original issuance outboxes and exercises the real notice worker/inbox, including safe suppression when revocation wins before delivery.

UI regressions cover stable submission retries, upload chunk/finalization retries and staff evidence body/context. The final desktop/mobile browser journeys exercise real staff grant/request/native-share management; consultant OTP, review/comment, private upload persistence and denied revoked access; vendor named-package advisory status persistence without SITE mutation; and explicit sign-out. Six refreshed captures under `.env.s21-tools/screenshots` were independently inspected: `s21-staff-desktop-chromium.png`, `s21-staff-mobile-chromium.png`, `s21-desktop-chromium.png`, `s21-mobile-chromium.png`, `s21-vendor-desktop-chromium.png`, and `s21-vendor-mobile-chromium.png`. Desktop captures were refreshed at 21:50:31–36 and mobile at 21:51:48–52. Bounded spacing, evidence hierarchy, controls, wrapping and responsive single-column forms passed visual review.

## Findings fixed during acceptance

The earlier internal-session trigger failure was an S21 defect and was repaired through a forward migration. Security review found retained-context projection leakage, a missing fresh exact grant after later waits, stale native-secret preview races, missing post-wait staff checks and lost native-loss notice delivery when reusing an already drained issuance outbox. Each was corrected with focused regression coverage and included in the final full run. Strict COMMENT scope, least-privilege option projection and retry authority were aligned with the settled contract.

Earlier failed verification attempts are not acceptance evidence. S21 fixture failures omitted required staff fields/permissions; concurrency fixtures initially relied on timing instead of a confirmed database barrier; browser capture instrumentation included staff setup requests and a final assertion omitted explicit vendor sign-out. These fixtures were corrected without weakening production permissions or valid assertions. Review also rejected earlier captures when the general external stylesheet was missing; the restored stylesheet and all six new captures are the accepted evidence. Retained PostgreSQL infrastructure was recovered safely after a crash; prior data and migration history were preserved. Build warnings about chunk size/dynamic imports and pg client concurrency deprecation remain informational; the final gates exited 0.

## Limits and routing

Local controlled native URLs validate encrypted application records, authorization, expiry, notices, blockers and explicit confirmation. Installed MinisCloud creation, extraction-code enforcement, native expiry/revocation and real recipient transfer have not been observed. Production Brevo delivery, NAS behavior, hosted CI/deployment, encrypted offsite backup/key custody and production restore remain production gates. The separately identified actual-project R-105 checkpoint remains unverified. No production deployment or production-use acceptance is claimed.

Dispatch metadata records exact `gpt-6.1-sol` for context, schema/permissions, difficult debugging, security and final acceptance; `gpt-6-luna` handled bounded identity/controller/UI/test/documentation work. Separate serving-model telemetry and a measured 70/30 allocation ratio are unavailable. The final reviewer checked actual logs and captures and relies on the coordinating run's recorded fresh/upgrade migration and preservation results.
