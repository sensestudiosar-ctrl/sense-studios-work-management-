# S26 acceptance review

Status: ACCEPTED — COMPLETE for development/local staging, 2026-10-06. Final source/security, schema/preservation, responsive views and pinned whole-gate acceptance passed.

Actual review model: GPT-6.1 Sol (`gpt-6.1-sol`). Bounded implementation agents actually dispatched as GPT-6 Luna (`gpt-6-luna`) owned UI/navigation/browser fixtures and report transformation/controllers/tests. No measured token allocation or independent serving-model telemetry is claimed.

## Settled scope

The Owner explicitly selected bounded S26 now and authorized the saved report builder before the actual-project checkpoint. R-078.a–f uses current S24 sources and existing columns, scalar filters, count grouping/charts and saved immutable definitions. R-082.a–d supports restricted task/project event rules, internal notice/report generation and nonbinding S05 recommendations. R-083.a–c excludes every automatic high-impact command. S18/S27, arbitrary joins/formulas/expressions, external communication and production gates remain excluded. See S26_SPEC.md and S26_API_CONTRACT.md.

## Source and security findings

- AUT source uses current account/session/permission fences and the owning transaction-aware Task/Project/Dashboard read ports. Staff configuration needs current explicit project management plus automation.manage; staff report management needs report.manage and creator scope. Frontend visibility grants no authority.
- Saved previews refresh currently authorized facts. Generated report runs retain the full original source/field manifest and reject reads/exports after loss of any required access. Recipient delivery rechecks the same current source scope in the notification transaction.
- Rule versions have a prospective creation cutoff. Worker execution holds a current head lock, checks version/enablement again after waiting, excludes AUT/report/dashboard/APR events and deduplicates each rule/version/source event using a transaction advisory lock plus database uniqueness. Command receipts conflict on changed key reuse. All source pages are considered rather than repeatedly restricting execution to the first100 events.
- Shared S05 recommendation approval records human review only. Its callback invokes no domain command and creates no task/document/client/procurement approval fact. The named human must hold current ordinary management/source access, and every final business action retains its owning workflow and original independent/self-approval policy.
- Append-only version/run/receipt guards, immutable head identity and version increments, canonical audit/domain/outbox checks, data hashes and linked S05/source identities protect retained evidence. Already-applied107/108 were not rewritten;109 preserves the full prior event allowlist and adds only the two S26 producer events.

Sol found and corrected strict HTTP save parsing that wrongly rejected command fields, mismatched UI table column shapes, worker page starvation, stale head/lock-order exposure and recipient discovery limited to the first project. Focused PostgreSQL acceptance then traced the invalid uppercase S05 type key and missing persisted event-catalogue additions; forward108/109 correct those defects without weakening valid boundaries. Earlier failed runs remain recorded in S26_VERIFICATION_LOG.md.

## Verification and final review

Focused S26 API integration passed11 tests/3 suites after corrections. The real PostgreSQL cases cover persistent saved versions/current rows, explicit grants, command retries/conflicts, both recommendation decisions leaving source task state/version/date/priority unchanged, immutable evidence, concurrent exactly-once run generation, branch/organization tampering and current report/notification source revocation. All19 isolated targets reached109; the S25 source remains106 and all150 original populated-table snapshots were preserved.

The initial full gate finished with its nonbrowser stages passing and browser failures recorded in S26_VERIFICATION_LOG.md. Fresh exact GPT-6.1 Sol restored current context and reviewed all13 additive browser aliases: every new target requires S26_E2E_ENABLED=1, an exact sense_s26_main_s26_*_test pattern, loopback hostname and port57433; existing targets and business assertions remain intact.

Final source review required an explicit enabled control so managers can stop/re-enable rules, presentation of existing source-unavailability messages, correct saved-preview chart selection, a visible single-group pie chart and proportional generated count bars. Luna implemented these bounded fixes, a prospective disable/re-enable PostgreSQL regression and a desktop/mobile recommendation decision journey that compares retained source fields. Sol reviewed the corrections, including bounded SVG labels/legends, current saved-chart selection, readable HTML mobile bar rows and fresh-client scoped fixtures. Focused web automation tests passed5/5; the final whole gate and current captures subsequently passed as recorded below.

## Final visual review — 2026-10-06

Sol independently inspected all ten regenerated FINAL3 captures: report, rule, activity, recommendation and countchart for desktop and mobile in `.env.s26-tools/screenshots`. Desktop captures refreshed at19:44 and mobile captures at19:48 local time. Saved-report empty/unavailable evidence and export controls are readable; mobile controls wrap within the panel; configured versions, enablement and edit controls remain clear. Activity and the scoped APPROVED recommendation retain the explicit ordinary-workflow warning. Full preview panels show retained-row counts and proportional bars; HTML bar labels remain readable on mobile. All ten final views are accepted.

FINAL3 pinned `pnpm verify` exited0 (`verify-s26-1791295716442.log`): typecheck/lint/build,226 API unit/38 suites,197 web unit/29 files,330 PostgreSQL/API tests/57 suites and49 desktop/mobile browsers passed without skips/retries. Post-run migration status (`migration-status-1791296648698.json`) confirms19 isolated targets109 and accepted source106; all150 original-table snapshots remain unchanged. This satisfies bounded S26 local acceptance. Separate CRM setup P2028 transaction-expiry messages in the green log remain an unresolved non-S26 observation; acceptance does not claim an error-free runtime or production validation. Earlier failed runs and corrections remain recorded in S26_VERIFICATION_LOG.md.
