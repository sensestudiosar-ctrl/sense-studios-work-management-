# S19 acceptance report — 2026-10-03

Status: **COMPLETE for development/local staging — 2026-10-03.** Owner authorized S19 and settled the decisions in S19_SPEC.md. Exact GPT-6.1 Sol final acceptance found no remaining blocker after successful sequential aggregate verification and final responsive visual review. No production deployment is claimed.

## Implemented scope

R-015.b–g deliver immutable project BOQ and exact approved design/checksum releases, separately protected prices, independent named human cost and procurement decisions through S05, complete material selections, reasoned procurement/factory progress, explicit fully reapproved replacement inputs and Owner-controlled approved client cost snapshots. C-002 Q4/R-006/R-092 guard financial and branch access. R-079/R-080 and R-096/R-097 link retained canonical evidence and the shared decision queue. R-015.a remains S08 default stages. Site/quality/snags/handover (S20/R-105), external factory/vendor portals (S21), inventory and accounting processing remain outside S19.

## Schema and preservation

Migration `20261003010000_s19_turnkey` is additive: four Turnkey tables, composite identity/replacement foreign keys, immutable inputs/prices/history, valid state/progress/version and exact approved input checks, deferred canonical audit/history/prices and approved replacement evidence. Existing domain-event catalogue names are retained.

All 73 migrations deployed successfully on six distinct dedicated local test databases for generic/S12/S13/S14/S15/S19 acceptance, and fresh aggregate rerun databases. Final primary: `sense_s15_s19_sequential_1791044151660_test`. The populated pre-S19 baseline database was also upgraded without a reset: its original columns, row counts and ordered digests across all 104 pre-existing business tables matched, including the final repeated preservation check. `pnpm --filter @sense/api db:migrate:status` reports 73 migrations and the schema up to date. Evidence: untracked `.env.s19-tools/preservation.json`, `check-preservation.mjs`, `migrate-*.log` and `migration-status.log`. Secrets remain in untracked environment files and are not reproduced here.

## Verification evidence

- Required versions confirmed: Node 24.19.0 and pnpm 11.19.0.
- `pnpm db:generate`, `pnpm --filter @sense/api db:validate`, typecheck and production build passed during implementation.
- Focused S19 command with its isolated S19_DATABASE_URL: `pnpm --filter @sense/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config jest.integration.config.cjs --runInBand src/turnkey.database.api.spec.ts` passed one suite/five tests. Coverage includes exact input/BOQ/price persistence, independent approvals/materials/progress/full replacement, structured financial redaction, genuine concurrent decisions/progress, immutable SQL denial/canonical rollback, cross-branch/revoked/held authority, internal session expiry after lock wait, and client explicit cost share/revoke/session expiry/cancelled-project denial.
- Focused client portal unit suite passed eight tests; targeted API typecheck and ESLint passed.
- Temporary actual API smoke returned 401 for anonymous staff reads/writes and anonymous client cost reads. Browser acceptance also verified authenticated missing CSRF and foreign Origin return 403 without creating a release.
- Final sequential `pnpm verify` exited 0: typecheck, repository lint, 160 API unit tests across 27 suites, 94 web unit tests across 13 files, 182 PostgreSQL integration tests across 37 suites, production builds and all 31 desktop/mobile Playwright cases. No cases were skipped. Successful aggregate evidence: untracked `.env.s19-tools/verify-sequential.log` and `verify-sequential.exit` (0).
- Both Turnkey browser journeys persisted exact real S13-approved design/BOQ inputs through distinct named cost/procurement decisions, complete materials and procurement/factory completion, with operational cost redaction. Final focused browser run after navigation spacing and release-version wording passed 2/2 (18.2 seconds). Sol inspected final desktop/mobile images in `.env.s19-tools/screenshots/s19-turnkey-desktop-chromium.png` and `s19-turnkey-mobile-chromium.png`; no responsive blocker remains.
- `git diff --check` passed; CRLF conversion warnings were informational.

Sol final review checked exact input/approval consumption, requester independence, current permission/session/assignment checks after lock waits, branch isolation, financial serialization, immutable evidence, real races and atomic rollback/replacement against the approved acceptance criteria. No remaining implementation blocker was found.

## Defects and limitations

The default Windows sandbox could not create shell/Node processes (`apply deny-read ACLs`); approved escalation was used for scoped repository/test commands. Existing `.env.*` tool directories caused 431 ESLint parse errors and ambiguous parser roots; the verified configuration fix ignores those temporary directories and pins the parser root without weakening source rules. An existing task unit case failed under the early parallel test load, then passed all 17 cases in isolation; no task source/test was changed. New-code fixture/SQL mistakes were corrected before acceptance (canonical role permission column, reviewer document.view fixture grant and exact design choice labels), retaining security assertions.

Earlier aggregate attempts were unsuccessful and are retained in `verify.log`, `verify-final.log` and `verify-complete.log`. Initial fixture database names did not meet existing explicit test guards; isolated correctly named databases and an explicit safe combined S19 test opt-in resolved this without weakening application permissions. One early aggregate also lost its test server during a simultaneous focused run. The later `verify-complete` reached 30 browser passes but failed Turnkey teardown with trace/network ZIP ENOENT because concurrently running Playwright removed its shared output directory. This was an orchestration collision, not an application behavior failure; no successful exit is claimed for those runs. The final aggregate ran alone on a fresh database and exited 0.

Production NAS/runtime, hosted CI, Compose startup/recovery, encrypted offsite backup/key custody and production restore were not rerun for S19. Local temporary DBs/files are retained; test-only server lifecycle caveats remain in S01_COMPLETION_REPORT.md. The slice does not provide a manufacturing quantity ledger, financial-system ledger or external vendor login.

## Models and final review

Exact GPT-6.1 Sol (`gpt-6.1-sol`) performed Owner/requirements intake, scope/design, schema/backend/permission implementation, difficult debugging, security and final acceptance review. Exact GPT-6 Luna (`gpt-6-luna`) implemented bounded staff/client UI, documentation draft, PostgreSQL regression tests and browser acceptance. The 70/30 target is allocation guidance; no measured ratio is claimed. S19 is COMPLETE only for the verified development/local-staging scope and does not authorize S16–S18 or S20–S27.
