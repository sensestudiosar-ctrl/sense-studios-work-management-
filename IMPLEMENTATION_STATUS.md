# Implementation status

Architecture approved at checkpoint 2e46805. The Owner approved S01 as COMPLETE for the authorized development/local-staging scope, authorized S02 Identity and Sessions and S03 Branch, Employees and RBAC on 2026-09-26, and authorized S04 Audit, Outbox and Core Notifications on 2026-09-27. S02–S04 are COMPLETE for development/local staging. S05 and later remain unauthorized. No later business-domain slice is marked complete.

## Slice status

| Slice | Status | Evidence or gate |
| --- | --- | --- |
| S01 Runtime and verification | COMPLETE — local gates passed; Owner confirmed hosted GitHub Actions green for the latest pushed commit | Fresh and restored-test DB migration, live API readiness outage/recovery, frozen install, typecheck, lint, unit/API tests, builds and desktop/mobile E2E passed. Compose validation, image builds, service startup, web-proxied API readiness and database/file recovery rehearsal passed on Docker 29.8.0 / Compose 5.5.1. The Prisma OpenSSL warning was fixed in the Node image stages and local pnpm verify passed after the change. Implementation checkpoint 5ea5a8f and documentation checkpoint 570d52f are present on the GitHub s01-runtime-verification branch. The Owner confirmed hosted GitHub Actions is green for the latest pushed commit. See S01_PLAN.md, TESTING.md and S01_COMPLETION_REPORT.md. |
| S02 Identity and sessions | COMPLETE — development/local staging | Reviewed identity-only migration applied on fresh and S01-baseline dedicated PostgreSQL databases. Frozen install and `pnpm verify` passed: typecheck, lint, 15 API unit, 12 web unit, 16 API integration, build and 5 desktop/mobile browser tests including a virtual-authenticator passkey journey. Security review and limits are in S02_COMPLETION_REPORT.md. |
| S03 Branch, employees and RBAC | COMPLETE — development/local staging | Reviewed migration applied on a fresh S01→S02→S03 test database and a pre-existing S02 test database with account and session records; both records remained after S03 migration. Prisma reports current. `pnpm verify` passed with 31 API unit, 14 web unit, 23 API integration and 5 desktop/mobile Playwright checks, plus typecheck, lint and production builds. Project grants and effective exit with live work remain correctly gated on S07/S09. See S03_SPEC.md. |
| S04 Audit, outbox and core notifications | COMPLETE for the original accepted scope; efficiency follow-up pending PostgreSQL verification | Original acceptance applied nine S01–S04 migrations and passed `pnpm verify` (65 API + 20 web unit, 32 API integration and five desktop/mobile browser tests). The follow-up now claims one leased outbox item at a time with token-fenced renewal and uses exact event-key search with a forward index. Schema validation, typecheck, lint, 68 API + 20 web unit tests, builds and diff check pass; the tenth migration, new database regression, and E2E were not rerun because no dedicated test database/Docker daemon was available. See S04_COMPLETION_REPORT.md and S04_SPEC.md. |
| S05–S27 | NOT STARTED / UNAUTHORIZED | Later slices remain outside current authorization. |

## Release status

| Release | Slices | Status | Gate |
| --- | --- | --- | --- |
| Release 0 foundation | S01–S05 | S01–S04 COMPLETE; S05 NOT STARTED | S05 remains unauthorized. |
| Release 1 work core | S06–S10 | NOT STARTED | Depends on earlier slices. |
| Release 2 design control | S11–S15 | NOT STARTED | Depends on earlier slices. |
| Release 3 workforce | S16–S18 | NOT STARTED | Depends on earlier slices. |
| Release 4 Turnkey/site/portals | S19–S22 | NOT STARTED | Depends on earlier slices. |
| Release 5 intelligence | S23–S24 | NOT STARTED | Depends on earlier slices. |
| Release 6 integration/automation | S25–S26 | NOT STARTED | Depends on earlier slices. |
| Later AI | S27 | NOT STARTED | Depends on earlier slices. |

The complete plan is in IMPLEMENTATION_PLAN.md. Slice completion requires applicable acceptance evidence; a successful UI build alone is insufficient.

The Windows Codex runner can hang during cleanup after Playwright reports all cases passed; for S04, stopping the isolated prestarted API after the summary released cleanup and `pnpm verify` exited 0. See S04_COMPLETION_REPORT.md and the earlier lifecycle diagnosis in S01_COMPLETION_REPORT.md section 20. Encrypted offsite backup, key custody, production NAS validation and production restore remain production deployment gates.

## S02 acceptance notes

Owner decisions and implementation limits are recorded in S02_SPEC.md, DECISIONS.md and S02_COMPLETION_REPORT.md. S02 has identity-only schema/migration, WebAuthn enrollment/login/recovery, session enforcement, CSRF/origin checks, Owner identity administration and responsive session/device UI. Dedicated PostgreSQL migration and API checks, browser E2E, `pnpm verify` and security review passed. Deployment must remove the bootstrap secret after first enrollment; its persisted one-use guard blocks reuse. A shared rate limiter is required before multi-instance deployment. S03 and S04 are COMPLETE for development/local staging; see their completion reports. S05+ remain unauthorized. S01 production gates and the Windows Playwright managed-server lifecycle caveat remain documented in S01_COMPLETION_REPORT.md.
