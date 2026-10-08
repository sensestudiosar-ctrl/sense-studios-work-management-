# Defect rectification report — 2026-10-07

**Status: COMPLETE for development/local staging.** The Owner-authorized CRM setup authorization-read reduction and unintended S22 local administrative migration are rectified and verified. This does not claim production readiness or actual operational project use. S18 integration and bounded S27 implementation are separately authorized and IN PROGRESS; S27's real-project checkpoint is waived for implementation only and remains operationally unverified.

## Authorized scope

The maintenance slice preserves the accepted S06 CRM capabilities and source visibility under R-010.a–d. It preserves current account, employee, grant, DENY, expiration, organization and branch decisions under R-006 and R-099.e, including transactional authorization for mutations. R-099.f requires credentials to remain out of errors, logs and evidence and requires accepted work and unknown incident data to remain preserved. R-100/R-101/R-102 require reproduction, regression coverage, applicable verification and accurate reporting. This work adds no business workflow.

The CRM change replaces the setup endpoint's branch-by-five fan-out of full authorization graph reads with one current graph evaluation for the whole capability batch. It uses the existing permission policy and the current actor/grant data for each request. It adds no cross-request cache, title-based authority, Owner-specific shortcut, timeout increase, schema change or response change.

The migration datasource guard rejects `postgres`, `template0`, `template1` and encoded reserved-target spellings before Prisma connects, while retaining privileged migration URL precedence, named database targets and generation with empty configuration. Administrative database provisioning remains a separate operation.

## CRM implementation and focused verification

`AuthorizationService.evaluatePermissions` reads the account and authorization graph once, then evaluates each supplied permission/scope pair using the existing pure policy. `assertPermission` delegates to that evaluator and keeps the existing forbidden behavior. `CrmService.setup` builds the ordered branch × five-capability checks and sends one batch, then maps the results back to the existing response shape. Mutating commands continue to use their transactional authorization path.

The captured old CRM and authorization services were tested in an isolated compatibility copy. The old-code focused run had 12 tests: three intended failures demonstrated the missing batch interface/fan-out path, and nine passed. The current focused invocation, `pnpm --filter @sense/api test:unit --runInBand src/authorization.unit.spec.ts src/crm.service.unit.spec.ts`, passed 13 tests in two suites, covering the 24-branch/120-check batch, scoped and denied permissions, expired/revoked grants, missing or inactive identities, transaction-client routing, fresh reads on later requests, and database failure propagation. The migration target policy unit file has 20 passing tests. Sol also verified Prisma generation with empty configuration, refusal of an encoded unsafe reserved target during configuration loading before connection, and allowed migration status on a named target at 109.

The focused guard command was `pnpm --filter @sense/api test:unit --runInBand src/migration-target-policy.unit.spec.ts` (20 passed). Actual Prisma configuration checks passed generation with empty configuration, rejected an encoded reserved target before connection, and passed named demo-target status at 109. Actual outcomes are recorded in [DEFECT_RECTIFICATION_LOG.md](DEFECT_RECTIFICATION_LOG.md). The policy also rejects decoded slash/NUL paths and database query overrides, with credential-free diagnostics.

## Natural setup pressure measurement

The old and current implementations were run sequentially against one fresh, uniquely named test database at migration 109. The fixture contained one organization, 80 active branches, an Owner, an active staff employee with a home branch/team, and five explicit home-branch ALLOW grants. Each actor received three sequential setup calls per implementation. No artificial timeout, transaction limit, delay, retry, or service lifecycle action was used.

All 12 measured setup calls fulfilled. Old and current branch-capability/source projections matched exactly; the Owner saw all 80 branches with all five capabilities, and staff saw only the granted home branch with all five. Revoking the five grants was reflected on the next request, which returned no staff-visible branches. The report recorded zero acceptance errors. Natural P2028 **was not reproduced**.

| Actor | Old setup calls (ms) | Current setup calls (ms) | `account.findUnique` calls, old → current |
| --- | --- | --- | ---: |
| Owner | 2029.17, 1543.91, 1540.97 | 13.91, 10.05, 9.26 | 1206 → 9 |
| Staff | 1706.25, 1610.07, 1568.29 | 8.99, 7.78, 8.05 | 1206 → 9 |

The delegate counter includes CRM identity reads as well as authorization reads. From the inspected old/new call paths, the graph-read portion is 1203 → 6 for each actor's three-call set; the remaining three account lookups are CRM actor/org checks. This is a measured natural pressure attempt, not evidence that P2028 occurs on every setup run or a substitute for focused regression/browser gates.

Evidence:

- Captured old implementation hashes and source copies: `.env.defect-tools/baseline-sol-20261007/`.
- Successful pressure report: `.env.defect-tools/runs/crm-setup-pressure-1791356244441_c8cbee21/result-1791356244441_c8cbee21.json`.
- Fresh target migration manifest/log: `.env.defect-tools/runs/crm-pressure-provision-1791356232852_879f7e81/`.
- The first pressure target, `sense_defect_crm_pressure_1791356026725_b47d0806_test`, was retained with additive synthetic rows after the first loader attempt failed to resolve its package imports. No reset or cleanup was performed. The corrected run used a second fresh target; the initial harness failure is tooling evidence only and does not count as a timeout result.

## S22 incident identity and preservation evidence

The S22 helper applied 97 migrations to a local administrative `postgres` database. The prior state of that database is unknown. The historically noted port 56433 did not identify the incident cluster: its listener was unavailable during one probe, and the ready cluster on that port lacked the expected historical role. Those probes made no database changes.

The retained PostgreSQL 18 cluster on port 57433 completed ordinary recovery. A read-only audit matched the retained accepted source (133 business tables) and the incident database (134 business tables, 97 migrations and one business row). The read-only identity/audit evidence is in `.env.defect-tools/incident-identity-1791355803542/audit.json`. This identifies the incident target but does not establish its unknown former administrative state.

A custom-format backup and restore comparison was prepared in `.env.defect-tools/incident-backup-1791356012049/`. Other full snapshot categories match exactly. For 34 CHECK constraints and one partial index, PostgreSQL 18 deparsed equivalent expressions differently as text. A rollback-only reparse in the dedicated restore database produced matching canonical expressions for all 35 items; catalog and row fingerprints remained unchanged after rollback. Evidence includes `verified-backup.json`, `expression-comparison.json`, and `parser-equivalence-identity-recheck.json`. This supports semantic schema equivalence for those definitions, not byte-identical source text and not reconstruction of unknown prior admin settings or ACLs.

**Incident remediation: COMPLETE for this local environment.** After root's exact-helper review, Sol executed the guarded quarantine once; exit 0, stage `verified`. The original database is retained as `sense_incident_postgres_quarantine_1791356475534`, with original OID **5** and an exactly unchanged full schema/row/sequence/ownership/ACL snapshot. A new `postgres` created from `template0` has OID **2852388**, zero application objects, no Prisma migration table, and matching owner, encoding, locale and default access metadata. Original database settings were empty and verified before proceeding. The helper required no active incident clients; no DROP, reset or forced termination occurred.

The retained S21 source (95 migrations) and accepted S26 source (109 migrations) full snapshots matched before and after. Actual evidence is `.env.defect-tools/sense_incident_postgres_quarantine_1791356475534-result.json`; reviewed helpers are `.env.defect-tools/quarantine-incident.mjs` and `.env.defect-tools/incident-snapshot.mjs`. The custom backup, both rehearsal databases and quarantine remain retained. This creates a clean administrative database while preserving all unknown incident data; it does **not** reconstruct or claim restoration of the unknown preincident state. The durable migration guard prevents application deployment to reserved administrative targets.

## Remaining acceptance and limits

### Confirmed prototype-checker lint correction

The first full verification attempt passed typecheck and stopped at lint with 24 errors confined to the existing prototype checker: five CommonJS import errors and 19 browser-global references. Sol confirmed the five variables/functions in the prototype's classic script; the `let`/`const` bindings cannot safely be replaced with `window` properties. Luna added one file-specific ESLint entry declaring the actual CommonJS/browser realms and allowing only Node built-in and `@playwright/test` require specifiers. `no-undef` and all other rules remain enabled. No checker, prototype HTML, PNG or application runtime changed. Sol reviewed the exact diff against R-100/R-101/R-102.

Baseline copies/hashes are retained in `.env.defect-tools/lint-baseline-1791357084801_a885/`. Targeted ESLint and full `pnpm lint` exited 0. The failed first full log is `.env.s26-tools/verify-s26-1791356879383.log`; the subsequent pinned run completed successfully in `.env.s26-tools/verify-s26-1791357158641.log`.

- **Full verification:** pinned `pnpm verify` exited 0 on the reviewed 19-target topology with unique per-run migration environment files and NAS root; typecheck, lint, API250/39 suites, web197/29 files, PostgreSQL330/57 suites, production builds and desktop/mobile49/49 passed with no skips/retries. Browser/API guarded-port preflight and source/clone preservation checks passed; all150 original populated tables were preserved.
- **Quarantine:** verified local remediation; all original contents remain preserved in the retained database and backup. Unknown preincident state remains unverified.
- **Final acceptance:** complete for this defect rectification's local scope after Sol reviewed CRM authorization equivalence, guard behavior, preservation-first incident remediation and full verification evidence. See [DEFECT_RECTIFICATION_LOG.md](DEFECT_RECTIFICATION_LOG.md).
- **Operational scope:** production deployment, production database and actual R-104/R-105 checkpoint remain unverified. The bounded S27 implementation waiver does not establish operational checkpoint evidence. S18/S27 acceptance is tracked in their own reports.

## Model routing

GPT-6.1 Sol (`s27_intake`) handled the context/design/security handoff and owns final acceptance. GPT-6 Luna (`crm_fix` and `defect_tools`) handled the bounded CRM implementation and tooling. These are the models used for the respective delegated work; this does not imply a measured allocation percentage.
