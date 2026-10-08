# S25 verification log

Record of checks and failures observed during S25 implementation. This log records evidence only; S25 acceptance remains in progress.

## Commands and focused checks

- Pinned Node.js 24.19.0 and pnpm 11.19.0 dependency installation with `pnpm install --frozen-lockfile`: exit 0.
- Calendar serializer unit tests: 5 passed.
- Integration controller API tests: 6 passed.
- API TypeScript check: passed.
- Prisma client generation: passed.
- Calendar UI tests (`pnpm --filter @sense/web exec vitest run src/integrations.test.tsx`): 5 passed.
- Web TypeScript check (`pnpm --filter @sense/web typecheck`): passed after removing the unused `readSession` prop from the sole `ProjectsRoute` call in `apps/web/src/app.tsx`. `ProjectsRoute` has no props and loads its own session. This was an unrelated concurrent UI type error found during S25 checks.
- Focused ESLint on `integrations.tsx`, `integrations.test.tsx`, `workspace-navigation.tsx` and `app.tsx`: passed.
- Web production build (`pnpm --filter @sense/web build`): passed. Vite reported the existing large-chunk warning and ineffective dynamic imports for `gallery.tsx` and `external-portal.tsx`.

## Migration and preservation evidence

- The first provisioning preflight rejected a primary database name longer than PostgreSQL's 63-byte identifier limit. It stopped before creating a database. The name was shortened to the `sense_s25_main_s25_SUFFIX_test` form.
- The next attempt created 15 fresh targets. Its populated-clone create step failed with PostgreSQL SQLSTATE `55006`: the populated source database was still accessed by the provisioner's own preflight control session after `ROLLBACK`, so PostgreSQL rejected `CREATE DATABASE ... WITH TEMPLATE`. The 15 fresh targets were preserved; no database was terminated, dropped or reset.
- After closing that control connection following rollback, the third provisioning attempt completed. Its fresh-target file is `.env.s25-tools/s25-fresh-1791206429978_513d.test`; its source manifest is `.env.s25-tools/s25-source-1791206429978_513d.json`.
- The source is `sense_s24_s23_populated_1791189595141_8003_test`, with 143 business-table snapshots and 104 migrations. The retained clone baseline matched all 143 old-column count/digest snapshots at migration 104.
- The clone's migration log, `.env.s25-tools/migration-s25-sense_s25_s24_populated_1791206429978_513d_test-1791206476653.log`, records exit code 0 and successful application of `20261007010000_s25_calendar` (migration 105). Before/after preservation checks found all 143 old-column counts/digests unchanged; the source remained at migration 104.
- All 15 fresh targets and the one populated clone reached migration 105. Their reviewed logs are `.env.s25-tools/migration-s25-*.log`; database connection strings are intentionally not reproduced here.

## Active and pending checks

- The interim full pinned `pnpm verify` is no longer running: it exited 1 at lint, before later verification phases. Its log is `.env.s25-tools/verify-s25-1791206870632.log`.
- Desktop/mobile Playwright acceptance remains unverified. A separate focused E2E attempt failed because `config.webServer` timed out after 30000ms; see the continuation checkpoint below.
- Sol's core real-PostgreSQL suite passed 4/4 with rollback cleanup. Source review and broader projection, rollback, concurrency and revocation cases remain pending. Coordinate with Sol before changing those assertions.
- Website, maps and extensibility work remains pending the Owner's bundle decision; no verification of those pending capabilities is recorded.

## Model routing

The S25 routing instruction assigns bounded UI implementation and tests to Luna. Independent serving-model telemetry was unavailable for this run.

## Continuation checkpoint — 2026-10-05

The interim pinned full verification exited 1 after typecheck passed, at lint: five unused values in concurrently changed `apps/web/src/task.tsx` (`compact`, `desktop`, `pageRange`, `applyFilters`, `resetFilters`). Sol classified this as unfinished concurrent UI wiring outside S25; no deletion or lint suppression was applied. Exact run log: `.env.s25-tools/verify-s25-1791206870632.log`. Later full gates were not reached.

A subsequent focused `pnpm exec eslint apps/web/src/task.tsx` reproduced the same five unused-value errors at lines 58, 59, 297, 298 and 303. Inspection found the values still declared and no completed filter/density wiring. The concurrent feature was preserved unchanged.

Sol's review of the desktop revoked-subscription capture found the native Starts/Ends date-time inputs overflowing their two-column form cells. The focused CSS correction added `min-width: 0` to form labels and controls. After the change, the calendar UI suite passed 5/5, focused ESLint on the integrations TSX passed, and `pnpm --filter @sense/web build` exited 0 with the existing chunk-size and ineffective dynamic-import warnings. ESLint reported the CSS file ignored because the project configuration has no CSS rule. Refreshed loaded desktop/mobile captures were requested and remain pending.

A separate pinned `pnpm build` exited 0, including API/web builds and PWA generation, with the existing web chunk/dynamic-import warnings. The Sol-approved focused `pnpm exec playwright test tests/e2e/integrations.spec.ts --workers=1` then exited 1 because `config.webServer` timed out after 30000ms. No browser acceptance or visual acceptance is claimed for that attempt.

Both exact GPT-6.1 Sol and GPT-6 Luna agents subsequently returned account usage-limit errors. Required further context/security interpretation and final Sol acceptance remain unavailable until model routing can resume. The Owner's CONTINUE instruction preserves the S25 objective but does not settle the outstanding explicit website/maps/extensibility policy question. S25 remains IN PROGRESS; no completion or production claim is made. Pending work includes the remaining approved-scope decision, broader calendar source/concurrency/rollback/session-revocation acceptance, browser-server diagnosis and responsive visual review, full successful gates and final documentation/acceptance.

## Resumed Sol calendar acceptance — 2026-10-05

Exact GPT-6.1 Sol context/routing resumed successfully. The previous extension command was not executed when automatic approval review hit the account usage limit; no approval bypass occurred. Current checks ran through the approved repository execution route.

Focused real PostgreSQL acceptance now passes 9 tests across two suites (exit 0): `integration.database.api.spec.ts` seven cases and `integration-security.database.api.spec.ts` two cases. Coverage includes actual task deadline change retaining opaque UID/updated sequence and generic metadata, creator/project access, exact/changed replay, SQL history/unaudited-update denial, injected audit-failure rollback, expired session and suspended capability account denial, genuinely committed concurrent command dedupe, and actual advisory-lock-wait session revocation with zero receipt writes. Rollback fixture cases retain no data; security cases retain their isolated committed fixtures. Runs used only the exact generated S25 and S25_SECURITY test targets; the populated preservation clone and retained S24 source were not mutated.

The added tests are not full acceptance: milestone/current reviewer source evidence, broader permission/branch races, desktop/mobile browser/visual review, a successful full repository gate and pending website/maps/API Owner scope remain outstanding. Source project cancellation excludes its calendar rows; manual event cancellation retains its opaque UID and generic STATUS:CANCELLED only while current source access is authorized. The API contract clarifies this distinction.

### Final focused calendar source checks (pre-browser)

After adding lawful applied-template milestone and named current-reviewer source fixtures, focused real PostgreSQL acceptance passed 11/11 across two suites. Milestone date/redaction and review.decide revocation are now covered. Two intermediate milestone fixture attempts failed because the template create response is nested and applied-template project creation requires an idempotency key; correcting the fixture preserved the existing domain guards. Sol source review aligned capability-fetch lock order with subscription rotation (identity fences before subscription row lock), then the same 11/11 suite passed again. Focused integration ESLint passed. Current-build desktop/mobile browser evidence must be refreshed after that service correction. Pending bundle scope and unrelated concurrent task UI lint still prevent whole-slice completion.

### Current calendar scoped checkpoint — browser confirmed

Final current-source focused Playwright calendar command passed desktop/mobile2/2 in16.9s with --no-deps and --workers=1 after explicit refresh completion waits. This verifies the calendar journey only; bypassing dependency execution does not verify the separately failing identity dependency or full repository gates. All four final20:56 initial/revoked desktop/mobile captures were independently inspected and accepted by exact GPT-6.1 Sol. Screenshots contain no subscription tokens; no token traces were retained.

Current scoped results: serializer5, controller6, UI5, real PostgreSQL11 across2 suites, current calendar browser2; API typecheck/client generation and focused lint passed. Migration105 is current on15 fresh targets and one populated clone; all143 original-table snapshots and retained source104 were preserved. Whole S25 remains IN PROGRESS: explicit website/maps/API decision and associated implementation, unrelated concurrent task UI lint/identity dependency classification, successful final full gates and whole-slice acceptance remain unresolved.
`nOwner explicitly approved the remaining S25 bundle on2026-10-05. Exact GPT-6.1 Sol resumed context successfully; previously dispatched exact GPT-6 Luna controller/helper and UI agents sampled successfully after earlier usage-limit failures. Approved forward106 schema/service implementation is in progress; applied105 is untouched. No106 migration or whole-slice acceptance is claimed yet.

### Approved connector persistence/security checkpoint — current106

Exact GPT-6.1 Sol current-source generation/typecheck and focused backend/fixture lint passed. Reviewed forward106 was applied on all16 dedicated targets (15 suite databases plus populated S24 clone); parent verified all143 original-table snapshots and retained source104 unchanged. Current real PostgreSQL17/17 across two suites passed, including13 rollback cases and4 retained committed security cases. Exact proof: .env.s25-tools/s25-connectors-db-final4.log, exit0,13.24s. Coverage includes current minimal calendar sources, Owner-only fixed Website routing, secret encryption/replay omission, forged signatures, exact/changed retry, unknown branch/Manual-source tampering, inactive-source and rotated/disabled denial, safe failed routing then same-payload retry, atomic lead/delivery rollback, immutable connector history, authorized configured maps, actual concurrent signed dedupe and actual lock-wait Website actor revocation with no lead creation. Earlier new fixture failures were ESM jest import and a forbidden second-organization fixture; corrected test setup preserved those existing guards. No final-fresh fixture targets were used for these focused runs.

The original focused browser/calendar evidence predates connector expansion. Current full calendar/connector/map desktop/mobile journeys and independent refreshed visual acceptance are still running; no successful full repository gate or S25 COMPLETE is claimed. Owner approved ancillary bounded Task UI wiring; current concurrent author changes are preserved and freshly inspected before small repairs. Historical unrelated lint/review fixture failures remain in earlier evidence.

## FINAL1 whole-gate checkpoint — 2026-10-05

Pinned Node 24.19.0/pnpm 11.19.0 `pnpm verify`, run via the guarded S25 runner against `.env.s25-tools/s25-fresh-1791215755976_f282.test`, exited 1. Exact output: `.env.s25-tools/verify-s25-1791216308608.log`; runner output: `.env.s25-tools/verify-s25-final1-runner.log`. Typecheck, lint, 217 API unit tests/36 suites, 186 web unit tests/27 files, 318 real PostgreSQL tests/54 suites and production builds passed. All 47 browser cases ran: 19 passed, 28 failed. This is NOT successful full acceptance.

Observed browser failures include legacy fixture database-name guards rejecting the new `sense_s25_main_s25_*_test` target and document storage folders remaining not READY. These observations need further Sol root-cause classification; no guards or permission checks were bypassed. Both S25 viewport cases reached accepted signed enquiries, replay/conflict, rotation and disabled-credential denial, then failed at line293 because the connector-label list-item locator matched the connector and its two delivery rows. Final connector/maps screenshots and Sol visual acceptance remain outstanding.

The exact browser disable-status correction previously authorized by Sol was applied before browser execution (expected201, matching observed Nest POST runtime); focused ESLint passed. No service/schema changes were made during FINAL1. Both routed Sol/Luna agents returned account usage-limit errors before final acceptance. Required further interpretation and final Sol review cannot be substituted silently. S25 remains IN PROGRESS; all Owner scope questions are now settled, including the bounded Task UI wiring. No production claim or COMPLETE status is made.

## Current FINAL1 failure classification and UI checkpoint — 2026-10-05

Sol's current-source review classified the observed browser failures: the fixture database-name guard does not allow the exact S25 target; the document storage folder is missing the configured NAS directory; the PWA server port does not match the configured preview URL; and the integration browser locator at line293 matches the connector list row plus two delivery rows. These are separate environment, fixture, and selector issues; no authorization guard was bypassed. Corrections are in progress and are not accepted yet. Final connector/maps screenshots and Sol visual review remain outstanding.

Current bounded web evidence after the branch-option contract correction: integrations UI tests 10/10, review UI tests 7/7, focused Task filter query/reset test 1/1; web typecheck and focused ESLint pass. The branch option uses the API's `{id,name}` shape. Website connector 409 responses preserve the safe backend configuration message while calendar conflicts keep their fixed calendar-specific message. Responsive Task filter, paging and compact spacing styles are present. These focused results do not supersede FINAL1 or establish whole-slice completion. Full pinned verification and current desktop/mobile browser/visual acceptance remain pending; S25 is IN PROGRESS.

## FINAL2 interruption and acceptance continuation — 2026-10-06

Exact originally dispatched GPT-6.1 Sol resumed the required context reads successfully. FINAL2 runner reported VERIFY_EXIT_CODE=1073807364 (hex40010004). Internal log .env.s25-tools/verify-s25-1791217321952.log ends during PostgreSQL integration warnings without a final database summary or browser stage; no test assertion failure is established by this tail and no later gate is accepted. Runtime interruption is recorded without claiming its unproven cause. FINAL2 targets remain retained, migration106 and143-table/source104 preservation evidence unchanged. Preflight on2026-10-06 found no listeners on guarded58430/58431/58432/58223/58224.

The Owner continues the complete S25 acceptance objective. All scope decisions are settled. The reviewed current-source FINAL1 fixture/runtime fixes preserve strict current permissions: explicit flag plus exact S25 main test name and loopbackport56433 alternatives, real contained test NAS directory/adapter preflight, existing localhost58223 PWA/API58224 ports, scoped connector-list locator and secret-free mobile connector/map captures. Fresh unique FINAL3 suite targets are required rather than resetting/reusing singleton fixtures. Current source remains held pending that run and current independent visual acceptance; S25 remains IN PROGRESS.

## FINAL3 retained-runtime recovery and fresh acceptance setup — 2026-10-06

The retained dedicated PostgreSQL clusters could not bind their historical ports because Windows reserved56335–56434. No exclusion settings, production service, cluster initialization, PID deletion, database reset or old-target cleanup was performed. Exact prior cluster identities were established from recorded postmaster options/PIDs and accepted logs. The same retained clusters completed recovery on verified free loopback ports: main57433 and S14 secondary56436. Source read-only preflight still confirmed the exact accepted populated source at104 migrations and143 business tables.

Fresh FINAL3 environment: .env.s25-tools/final3-1791266027701_dab6.test; source manifest: .env.s25-tools/s25-source-1791266027701_dab6.json. Provisioning now includes a separate fresh S24 committed-security target:16 fresh suite databases plus one populated clone. Clone migration106 exited0; all143 original snapshots/source104 were preserved, stdout proof .env.s25-tools/final3-preservation-1791266027701_dab6.log. The durable hidden acceptance worker persists its run ID/status/exit/log independently of the attached command session. Reviewed runner preflights exact target identities/ports, pinned runtime and contained real NAS storage; it uses existing PWA localhost58223/API58224 and records owned process logs.

Strict fixture guard alternatives admit remapped ports only with explicit S25 acceptance enablement, exact new per-suite names and loopback addresses; historical predicates and domain assertions remain. Sol reviewed these alternatives. Focused ESLint on22 affected API/E2E files passed, API typecheck passed and Playwright list parsed25 cases across13 files. FINAL3 full verification and current independent visual acceptance are still pending; S25 remains IN PROGRESS.

## FINAL3 web date-fixture failure and bounded retry — 2026-10-06

Durable run final3-20261006-112824-bd9a195f exited1. Exact internal log: .env.s25-tools/verify-s25-1791266308848.log. Typecheck, lint and API217/36 passed; web units recorded186 passing and1 failing (187 total across27 files). The Dashboard report-preview test expected the fixed2026-10-05 range without entering it, while the unchanged production UI correctly initialized today2026-10-06. PostgreSQL integration, build and browser stages were not reached; no acceptance is claimed for those stages.

Luna applied only explicit From/To2026-10-05 input changes before Preview in the existing test. Exact payload, CSRF and staff freeze assertions remain. Dashboard6/6 and focused ESLint passed; Sol independently reviewed the correction and accepted the bounded deterministic fixture repair. The same final3-1791266027701_dab6.test17 targets may be used for a new durable run ID because this attempt never reached persistent integration/browser fixtures. No database reset, source/schema change or prior evidence removal is authorized or needed. Full gates and current expanded desktop/mobile visual acceptance remain pending; S25 is IN PROGRESS.

## FINAL3 retry PostgreSQL deadline failure — 2026-10-06

Durable retry final3-20261006-113357-38da4d38, internal log .env.s25-tools/verify-s25-1791266642015.log, exited1. Typecheck, lint, API217/36 and web187/27 passed. PostgreSQL acceptance recorded317 passing and1 failing across54 suites (233.898s): the S16 pause/resume/stop case exceeded its default5000ms deadline. No logical assertion failure is established; follow-on torn-environment errors are not separate accepted diagnoses. Build/browser were not reached.

Sol read the failing case: three intentional1100ms waits consume3300ms before fixture, concurrent start/replay, state-command transactions and immutable-evidence assertions. A focused unchanged-deadline reproduction on a new isolated S16 target, followed only if necessary by a diagnostic CLI deadline, is required before changing the test budget. The full retry targets have now run persistence fixtures; the next full gate needs fresh unique targets rather than reuse or reset. Source is held pending diagnostic evidence; S25 remains IN PROGRESS.

## Isolated S16 deadline diagnostic — 2026-10-06

The reviewed CREATE-only helper provisioned exact isolated sense_s16_s25_1791267325272_b125_test on loopback57433; migration106 is current. Parent ran the unchanged named timer case at its original default deadline:1/1 passed,5 other cases filtered out, suite5.568s, exit0. Exact log: .env.s25-tools/time-diagnostic-default-1791267325272_b125.log. This confirms no logical timer assertion defect was reproduced; filtered execution is diagnostic evidence only. No tracked timeout or service behavior changed.

New fresh17 acceptance targets suffix1791267078703_66d4 are migrated106, with retained source104 and clone143-table preservation confirmed by parent. Sol approved a full unchanged-source rerun on these fresh targets. Current full acceptance and refreshed expanded visual review remain pending.

## Current full-run browser classification — 2026-10-06

Run final3-20261006-114626-70b3d412, internal .env.s25-tools/verify-s25-1791267390432.log, exited1. Typecheck, lint, API217/36, web187/27, PostgreSQL318/54 and production builds passed. The unchanged timer case passed in the full suite. All47 browser cases ran:42 passed,5 failed in9.3m (S20 site2, S25 integrations2, performance desktop1). This is not full acceptance.

S20 site failures are a missed historical56433-only fixture guard; the bounded correction preserves it and adds explicit S25 enablement plus exact main-test name and loopback57433 only. Integration snapshots show the active connector and its rotation controls; the failed nested has locator was rooted in the workspace and evaluated relative to each candidate section. Luna replaced that section locator with its existing accessible region name, preserving connector-first-list scope and every rotation/delivery/disable assertion; focused lint/list passed. Performance post-reload Employee selection remains under trace-based classification. Current connector/map captures were not reached; independent whole-slice visual acceptance remains outstanding. Next full acceptance requires fresh unique targets because persistence/browser fixtures ran.

## Browser root-cause review and next fresh acceptance — 2026-10-06

Current performance desktop trace.zip (mtime11:54:53, matching the11:46 full run) records net::ERR_NO_BUFFER_SPACE immediately after the reload. The application remains an unmounted shell throughout the subsequent10s Employee-selection wait; no post-reload auth/context requests occur. Existing initial Employee tab and accessible select are correct in source. Sol classifies this as an observed runtime resource/transport failure, with no proven product-selector defect and no inferred failed module. No Performance assertion, timeout or source behavior was changed.

The bounded S20 exact-target port alternative and S25 accessible Website enquiries region locator are statically verified while preserving domain assertions. Sol approved the next full run against fresh17 targets suffix1791268444532_9c35 (all106, clone143 snapshots/source104 preserved), after a bounded owned-process/listener preflight. No user browser termination, OS setting change, old-target reset or broad retry policy is authorized. Current full gates and expanded visual acceptance remain pending.

## Built-preview run and bounded project-loader repair — 2026-10-06

Built-preview full run final3-20261006-123826-eed67543, exact .env.s25-tools/verify-s25-1791270510555.log, exited1: typecheck/lint/build, API217/36, web187/27 and PostgreSQL318/54 passed; browsers46/47 passed. Only mobile Gallery failed. Both SITE cases and both S25 expanded journeys passed. Sol independently inspected all nine refreshed built-preview S25 captures (desktop12:46/mobile12:53), accepting readable calendar/connector/delivery/map states, wrapping and secret absence. Whole full-gate acceptance remains pending.

Gallery trace shows current OWNER session/setup200 and27 authorized branches, then54 project page requests within38ms;53 succeeded and one failed with net::ERR_NO_BUFFER_SPACE. The selected project exists in successful returned data. Current ClientReviewWorkspace used unbounded Promise.all branch fanout and correctly rejected the whole list on one failed branch. Sol approved a bounded four-worker loader retaining all authorized branches, stable branch/page order, existing50-item/100000-offset pagination, active-project filtering, fail-closed errors and stale-effect commit guards. Old effects stop scheduling new branch/pages; already in-flight rows cannot commit after cleanup.

Luna implemented the narrow loader and meaningful gated regressions. Current focused loader3 plus existing client-review8 passed11/11 across2 files in2.09s (loader-focused-final.log); web typecheck and focused lint exited0 (loader-typecheck-final.log, loader-lint-final.log). Sol reviewed code and accepted the result. No backend permission, schema, timeout, assertion weakening, partial-success UI or retry policy changed. Fresh17 targets suffix1791271471580_bb31 are current106, clone143 snapshots/source104 preserved; Sol approved the next full built-preview gate after guarded free-port preflight. No COMPLETE claim yet.

## Final S25 acceptance — 2026-10-06

Full pinned pnpm verify exited0 in durable final3-20261006-130931-8caeb858: typecheck/lint/build, API217/36, web190/28, real PostgreSQL318/54 and all47 dependency-enabled desktop/mobile browsers passed (7.4m), no skips/retries. Exact log .env.s25-tools/verify-s25-1791272375254.log. Post-run migration/preservation proofs confirm all17 targets106, all143 originals unchanged and retained source104 untouched. Exact dispatched GPT-6.1 Sol independently accepted all nine final built-app captures at13:18/13:22 and the complete approved source/security scope. S25 is COMPLETE for development/local staging; see S25_COMPLETION_REPORT.md. Earlier failed/interrupted checkpoints remain historical evidence, not unresolved current failures. Production/actual-project limits and S18/S26/S27 exclusions remain.
