# Authorized defect rectification — 2026-10-07

Status: IN PROGRESS. The Owner explicitly requested rectification of the CRM setup transaction-expiry observation and S22 unintended local `postgres` migration incident. This is bounded maintenance of accepted S06/S01/S22 behavior, not S18 integration or S27 implementation. Production and actual R-104/R-105 gates remain unverified.

## Requirements and boundaries

- R-010.a–d/S06: retain the existing five distinct branch lead capabilities and current source visibility.
- R-006 and R-099.e: retain current account/employee/grant state, DENY precedence, expiration and organization/Branch scope; mutations retain their transactional authorization checks.
- R-099.f: no secrets in errors/logs/evidence; preserve accepted work and unknown incident data.
- R-100/R-101/R-102: reproduce/trace the defect, add meaningful regression coverage, run applicable verification and report actual evidence. These maintenance clauses do not introduce a new business workflow.

CRM setup launches branch×five parallel full authorization-graph reads. The retained S26 log records P2028 inside `AuthorizationService.assertPermission` → `CrmService.setup` at the default 5000ms transaction limit. Proposed fix evaluates the same existing pure permission policy from one current graph per batch call. No cross-request cache, title-based authority, Owner shortcut, timeout increase, schema or response change is allowed.

The S22 helper accidentally applied 97 migrations to a local provisioning `postgres` database. Its prior schema state is unavailable. First inspect the exact incident cluster (historically port56433), all unknown objects/data and active clients. Prepare a verified custom backup and restore comparison. A reviewed reversible quarantine may rename the entire polluted database to a unique absent archive name, retaining its OID and contents, and create a clean administrative database from template0. Never drop unknown objects, terminate unknown clients, reset retained sources or claim restoration of an unknown prior state. Preserve the original archive's settings/ACL; review safe administrative settings rather than copying polluted search paths blindly.

Add a durable Prisma datasource guard rejecting `postgres`, `template0` and `template1`, including encoded spellings, before migration/configuration connection. Preserve privileged migration URL precedence and ordinary named production databases; permit empty configuration for client generation. Administrative provisioning remains separate and may connect to `postgres` to create named databases.

## Dependencies, acceptance and test plan

### Confirmed verification-tooling correction

The first full verification attempt found 24 lint errors confined to `docs/ui/UX_VALIDATION_CHECK_2026-10-07.cjs`: intentional CommonJS imports and browser-realm prototype globals referenced in Playwright callbacks. Under R-100/R-101/R-102, correct only that file's ESLint configuration: explicit CommonJS source type, the five source-confirmed globals (`go`, `features`, `allowed`, `flows` readonly; `project` writable), and an import allow-list limited to Node built-ins and `@playwright/test`. Preserve `no-undef`, all other lint rules, and checker/HTML/PNG/runtime behavior. Capture baseline copies/hashes, run targeted ESLint and repository lint, then rerun full applicable gates. This adds no product scope.

Use pinned Node24.19.0/pnpm11.19.0, current migration109 and dedicated fresh test targets. Preserve accepted source106/source109, original snapshot data and unrelated working changes.

1. Record an old-code many-branch pressure attempt and query/load counts; report whether natural P2028 reproduced, without manufacturing a timeout claim. A deterministic regression must fail old fan-out behavior and pass bounded graph loading while proving unchanged capability results.
2. Test Owner/staff, separate grants, DENY/expired/revoked permissions, foreign organization/Branch, inactive identity, and subsequent requests observing changed authority. Run focused CRM/authorization PostgreSQL/API tests and desktop/mobile CRM journeys; run full applicable repository gates for the application change.
3. Test safe/unsafe migration URLs, precedence, absent configuration and credential-free failures; prove real Prisma reserved-target refusal before connection and allowed named-target status/generation.
4. Review incident identity, backup/restore checks and quarantine plan before any database rename/create. Verify archived OID/objects/rows unchanged, new administrative database clean, and accepted sources unchanged. Any unmet safety precondition leaves environmental remediation pending; do not substitute a destructive cleanup.
5. Exact GPT-6.1 Sol owns context, security/design and final acceptance; GPT-6 Luna implements bounded CRM/tests/tooling after settled handoffs. Record actual checks, attempts and unresolved limits in a rectification report.
