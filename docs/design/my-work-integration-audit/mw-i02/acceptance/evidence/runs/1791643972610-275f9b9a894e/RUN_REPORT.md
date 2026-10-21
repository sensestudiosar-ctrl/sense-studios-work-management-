# MW-I02 authenticated acceptance result — 10 October 2026

Run **1791643972610-275f9b9a894e** used the Owner-approved single full monolithic journey. **MW-I02 remains IN PROGRESS.** No MW-I03 work began. This report supersedes older environment-blocked or visual-PASS statements for current-source acceptance; it preserves their files and evidence.

- **Functional Reliability: PASS for the bounded MW-I02 authenticated journeys and affected frontend tests.** No newly failing task/API regression was found. The repository-wide frontend suite still FAILS on the separately tracked 19 baseline failures; this is not a clean whole-repository reliability claim.
- **Prototype Visual Fidelity: FAIL.** Fresh screenshots expose material MW-I02 hierarchy, density and mobile label/control overlap differences. Passing interactions do not establish visual acceptance. Owner acceptance remains pending.

## Environment and cleanup

Preflight in Windows Medium Mandatory Level at 2026-10-10T14:52:42.831Z (20:22:42 IST) verified PostgreSQL18 already running PID35672, listener127.0.0.1:45434 owned by that process, live system identifier7693570241708228348, exact data directory D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9, and absence of sense_mw_i02_validation_20261009_test. Pinned Node24.19.0/pnpm11.19.0 versions were checked. No PostgreSQL startup/restart/stop occurred.

Guarded setup created only the approved disposable database, OID93548, with116 migrations and reviewed synthetic fixtures. Vite served apps/web from the current source tree. Cleanup at2026-10-10T14:54:34.001Z revoked8 run-owned sessions (0active remaining), stopped manifest-owned API PID5216 and web PID5160, passed database/OID/marker/connection guards and dropped only this database. Before/after other-database catalog hashes match. Independent post-cleanup live identity/absence check returned exists:false; pg_ctl still reports PID35672 running. See [structured evidence](RUN_EVIDENCE.json) and the exact ignored manifest .env.checkpoint-tools/mw-i02-acceptance/runs/1791643972610-275f9b9a894e/manifest.json. No production data, permissions, backend contract, unrelated service or recovery copy was changed.

## Executed verification

| Check | Actual result | Evidence |
|---|---|---|
| Task/recurrence PostgreSQL integration |26/26 tests,2suites, exit0 | Observed run-task-integration.mjs --stage tasks output; RUN_EVIDENCE.json |
| Full authenticated Playwright |1/1 monolithic journey,37.0s test /37.8s runner, no retries, exit0 | Manifest authenticatedBrowserAcceptance passed at14:53:59.330Z; fresh artifacts |
| Review PostgreSQL integration |3/3 tests,1suite, exit0 | Observed run-task-integration.mjs --stage review output; RUN_EVIDENCE.json |
| Focused task + attention frontend tests |39/39,2files, exit0 |[log](checks/web-unit-focused-final.log)|
| Complete web frontend suite |232passed/19failed of251,34files;2known uncaught DashboardWorkspace errors; exit1 |[log](checks/web-unit-full-final.log)|
| Root typecheck |exit0 |[log](checks/typecheck-final.log)|
| Root ESLint |exit0 |[log](checks/lint-final.log)|
| Production build |exit0; existing chunk-size and ineffective dynamic-import warnings |[log](checks/build-final.log)|
| Harness static TypeScript/syntax |exit0 after test-only type corrections |HARNESS_REVIEW_2026-10-10.md in acceptance root|

The19 full-web failures are18 identity/authentication-shell tests in app.test.tsx and1 workspace-navigation accessible-name test. The exact failing-test names match the earlier baseline:0added and0removed. [Failure comparison](WEB_BASELINE_COMPARISON.json). They remain reliability debt. Initial frontend command-invocation mistakes are retained in checks/; the final logs above are authoritative. No tests were weakened.

## Authenticated behavior verified

Owner, Team Leader, Designer and Site Employee used real enrolled identities and virtual passkeys against the disposable database. The journey exercised List, Cards, Kanban and Timeline; create/required-field validation, start/wait/resume/edit/complete; search, filters, pagination, browser history and keyboard opening. It also checked outsider task read/write403, assignment-only manager state-change403, malformed ID400 and stale-version409.

Five genuine exit obligations were generated through the supported Owner employee-exit API from the two existing run-local Site Employee tasks and three approved additional records. Owner attention returned exactly5 records, the disclosure opened without a test click, all5 links opened their matching tasks, and the unauthorized Designer attention result contained0records and no matching IDs. Owner's personal total remained0 with no active employee identity; independent management information precedes the empty personal section. No synthetic task count was hardcoded into the application. Designer total5 includes the default active queue4, a Waiting match1, and independently sourced phase counts; Site Employee's populated capture had2tasks before its synthetic exit. These are fixture results, not production totals.

At390px and320px, the real touch sequence passed: focus/type/submit search, tap the summary if closed, assert disclosure open, select WAITING, tap Apply, await the actual HTTP200 filtered queue response and matching URL, open the matching Waiting task, fill its Resume reason without submitting, then check the entire Resume button is in the viewport, clears fixed bottom navigation and the document has no horizontal overflow. The passing interaction does not negate the label/control overlaps visible in the initial captures.

Owner setup denied403 and unavailable503 responses do not infer employee-less layout in the passing focused frontend tests. This browser journey did not capture a real Owner pending/denied setup state; those unit and controlled Designer source-state checks are not substitutes for authenticated Owner screenshots. This coverage limitation remains explicit.

## Fresh screenshots and remaining visual work

[Comparison board](COMPARISON.html) · [16-pair discrepancy matrix](VISUAL_DISCREPANCY_MATRIX.md) · [capture metadata](artifacts/acceptance-MW-I02-authenti-25c64-mmands-and-responsive-shell-mw-i02-chromium/actual-my-work-capture-summary.json). The board links original actual/reference images for Owner, Designer initial, Designer Waiting and Site Employee at1440/1024/390/320. Actual captures were taken14:53:46–14:53:58Z (20:23:46–20:23:58 IST), after the final frontend source refinements. Twenty-eight state/viewport records include Team Leader, true zero-match search and explicitly labeled controlled Designer error supplements. Existing screenshots remain untouched because this run writes its own directory.

The exact approved prototype HTML was rehashed to F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8. Desktop/tablet pairs were inspected by GPT-6.1 Sol and mobile pairs in the parent session. GPT-6.1 Sol also confirmed the mobile defects and reviewed the final acceptance classification.

**MW-I02 corrections still required:** the source strip and controls push the actionable queue substantially below the reference; tablet task rows have excess vertical cost; at390px the collapsed Management label collides with its count; at320px Filters & sort text is overlapped by Apply filters. The390 Waiting capture also shows dark styling on an unselected Completed tile: hover/focus contrast needs inspection, not a claim of a second backend selection. Owner's expanded list is truthful and intentionally prioritized, but repeated exit copy, additional framing and zero tiles increase its height. The1440 Owner capture omits the lower empty explanation; runtime assertions and the existing1024px/mobile images establish its presence. The image alone does not establish production clipping or its cause.

**Reserved shell work:** header/sidebar/account-heading, tablet sidebar width and global navigation proportions belong to bounded shell remediation/MW-I09. **Future functionality:** grouped/pinned/due-date sections, saved views/customization, specialized next actions and Site quick actions remain in their approved MW-I03–MW-I08 boundaries. **Necessary backend differences:** truthful employee-less Owner0personal tasks, separate management/review/correction sources and canonical phase/date/state rules must remain; prototype sample counts and organization totals must not be fabricated. Owner's sample prototype does not contain an equivalent five-exit-hold state, so the matrix explicitly marks that limitation.

## Changes and acceptance boundary

This turn changed only ignored validation files acceptance.spec.ts, playwright.config.ts and run-tests.mjs plus evidence/review documents. Locator-based touch actions, explicit disclosure state, response/URL synchronization, bounded waits and type declarations were corrected; retries remain0 and existing assertions are retained. The evidence output is isolated by validated manifest run ID. No application presentation change was made after these captures.

Actual delegated models: GPT-6.1 Sol for context and desktop/tablet visual review; GPT-6 Luna for documentation and routine frontend checks. Owner review is the next acceptance decision. No automatic rerun, COMPLETE declaration or MW-I03 start is authorized.
