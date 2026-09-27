# S06 verification — 2026-09-27

Status: COMPLETE for authorized development/local staging. Scope and Owner decisions are in S06_SPEC.md. S07 and later remain unauthorized.

## Implemented and reviewed

Branch-scoped persisted leads; Owner-only shared client/contact edits; staff visible-client selection; separate interaction evidence and immutable stage history; reasoned skips/backward moves/Lost; terminal Won/Lost protection; separate linked returning enquiry; Won candidate provenance without project creation. Commands commit canonical audit/events/outbox atomically and enforce current permissions and concurrency. Source management is implemented and verified under the Owner-approved organization grant.

## Executed checks

- Node 24.19.0, pnpm 11.19.0; frozen dependency install succeeded. Stale pnpm install/typecheck processes were terminated after they repeatedly removed package links. Missing WebAuthn runtime files were restored from npm archives whose SHA-512 matched pnpm-lock.yaml. No application tests were weakened to bypass dependency failures.
- Prisma format, validation and generation passed. Thirteen migrations applied to fresh UTC test databases, including source-identity protection.
- Contracts/API/web TypeScript checks, ESLint and API production compilation passed. Web production build passed after dependency repair.
- API unit suites: 85 passed. Web unit suites: 33 passed.
- Full PostgreSQL integration/API run: 44 tests across 13 suites passed on fresh UTC `sense_s06_gates_test`. Seven additional CRM HTTP tests passed. After source-default concurrency and client-selection authorization fixes, the focused CRM PostgreSQL/HTTP run passed 13 tests (six database and seven HTTP).
- Full Playwright run: seven passed on desktop/mobile with prestarted isolated API/Vite at 4106/5186 against `sense_s06_browser_test`. CRM checks real persistence after refresh, immutable Lost evidence, renewed enquiry linkage, branch denial and horizontal overflow.
- Real simultaneous stage commands: one committed, one returned 409; version advanced to 2 with two history rows and one transition audit. Database role and audit-failure rollback checks passed.
- S06 migration upgrade from S05 retained existing account/session/approval/audit counts (1/0/2/3). Final source migration and source access checks passed.

## Defects resolved and remaining gates

Fixed optimistic stage conflicts, source-default initialization race, optional field clearing, contact ID preservation, hidden prior-lead links, stale branch/detail UI responses, and selecting shared clients without current view authority. An initial integration database inherited Asia/Calcutta; a fresh UTC database passed. Initial browser Source label matching failed; accessible combobox role matching passed.

Final local acceptance passed after source management was implemented and reviewed. No hosted S06 CI, Compose recovery or production NAS deployment has run. Existing S01 production gates remain.

## Final acceptance evidence

All thirteen migrations applied to fresh UTC `sense_s06_acceptance_test`. Full PostgreSQL/API tests passed: 56 tests across 14 suites. All 85 API unit tests and 35 web unit tests passed. Contracts/API/web TypeScript, ESLint, API compilation and web/PWA production build passed. All seven browser tests passed against prestarted isolated API/Vite, including authorized source creation/deactivation, denied ungranted writes, inactive selection exclusion and persisted source audit evidence. The source identity guard and restricted runtime role commands then passed all seven targeted database tests. Upgrade of the prior S05 database preserved account/session/approval/audit counts at 1/0/2/3.

Source names and identities cannot be rewritten/deleted; optimistic timestamps advance monotonically. Manager-only inactive-source visibility, organization grant enforcement, stale requests, safe duplicate errors, atomic audit/domain/outbox evidence, inactive-source rejection and client-selection view authorization are verified. Final review found no remaining blocking requirement mismatch for the authorized slice. Source reactivation is available with the same grant, reason and concurrency token. No project/conversion execution, automatic customer notification or later slice was added.

Verification used direct installed binaries for the constituents of pnpm verify; the aggregate pnpm verify command was not rerun because the earlier wrapper left concurrent dependency operations. Browser servers were started independently due to the documented Windows lifecycle caveat. A logout test's positional fetch assertion was changed to locate the actual logout URL while retaining the CSRF assertion.

## Models

Root used the inherited model with Sol-level reasoning for requirements, schema, permissions and review. Bounded backend, HTTP tests, policy coverage and UI tasks used `gpt-6-luna`. The root model was not switched.

## Independent pre-push recheck — 2026-09-27

A separate `gpt-6-luna` agent reviewed the S06 requirements, CRM service/controller/UI and database/API/browser coverage without editing code or running checks; it found no blocking acceptance mismatch. The stale C-017–C-019 and R-010 summary rows in REQUIREMENTS_TRACE.md were corrected.

Root rechecked with Node 24.19.0 and pnpm 11.19.0. Prisma validation and migration status passed on the existing S06 acceptance database. Thirteen migrations applied to a fresh dedicated PostgreSQL database configured for UTC. On that fresh database, all 56 PostgreSQL/API tests across 14 suites passed. All 85 API unit and 35 web unit tests passed; contracts/API/web type checks, ESLint, API compilation and web/PWA production build passed. `git diff --check` passed. The seven desktop/mobile browser tests are supported by the earlier final acceptance run above; they were not rerun during this pre-push recheck.

The `pnpm typecheck` wrapper stopped before TypeScript because its dependency status check attempted a network metadata fetch and then refused a modules-directory purge without a TTY. The installed binaries ran the corresponding checks successfully. An initial integration recheck against an already populated acceptance database failed singleton fixtures, and a fresh database inherited Asia/Calcutta instead of the test-required UTC setting. Both were test-environment setup issues; the complete suite passed after using a fresh UTC database. The aggregate `pnpm verify` command was not rerun.
