# MW-I02 Harness Review — 2026-10-10

**Status: review record only. MW-I02 remains IN PROGRESS.** This review covers the existing monolithic Playwright harness. There is no separate mobile test. No database writes, database startup, or authenticated runtime tests are authorized yet.

## Reviewed harness changes

Three ignored harness files changed:

- `acceptance.spec.ts` adds real-click desktop disclosure coverage, asserting both open and closed states.
- The mobile flow covers 390px and 320px viewports. It uses the real `summary.tap()` only when the disclosure is closed, then checks the open attribute and that `WAITING` is selected. It waits for the actual filtered tasks GET (`scope=personal`, `status=WAITING`, `q=<waitingTitle>`, `limit=50`), asserts HTTP 200 and URL filters, opens the exact task, and checks its heading and Waiting state. It fills the Resume form without submitting, checks the entire Resume button is in the viewport, and polls bottom-navigation clearance before retaining the original geometry and horizontal-overflow assertions.
- `playwright.config.ts` writes evidence under `evidence/runs/<manifest-run-id>/artifacts` and validates the run ID. `run-tests.mjs` binds settings run ID to the manifest. Supplemental route waiting is bounded with `expect.poll`.

No assertions were removed, interactions forced, or UI, API, permission, or schema code changed.

## Static checks

Using pinned Node 24.19.0, syntax checks passed for the spec and Playwright config with `--experimental-strip-types`; `node --check` passed for the runner. Direct TypeScript checking of the spec and config also passed (`tsc --noEmit --module nodenext --moduleResolution nodenext --target ES2022 --types node --skipLibCheck`). That check first identified existing credential `largeBlob` and style-element type mismatches; the harness now uses the protocol's string type and explicit style-element casts, with no runtime behavior change. Playwright retries are explicitly zero. Static checks do not verify touch behavior.

## Read-only host preflight

At `2026-10-10T14:47:04.431Z` (20:17:04 IST), the host was Medium Mandatory Level. PostgreSQL was already running as PID 35672; listener `127.0.0.1:45434` belonged to that PID. The live system identifier was `7693570241708228348`, with data directory `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`. Exact target `sense_mw_i02_validation_20261009_test` was absent. Prior run `1791643110931-80fac6cd5d12` dropped its disposable database and preserved all other catalog entries. The retained cluster is to remain running; this review authorizes no start, restart, or stop.

## Proposed single runtime run — pending Owner authorization

If authorized, repeat live identity, process, and exact-target absence guards. If the cluster is stopped, an identity differs, the target exists or a safety guard fails, stop without startup, retry or fallback. Use Windows Medium context and pinned Node 24.19.0 / pnpm 11.19.0. Apply existing 116 migrations and reviewed synthetic fixtures only to `sense_mw_i02_validation_20261009_test`; retain the supported workflow creating five genuine exit obligations. Execute the existing full monolithic browser journey once, including all roles, four viewport widths, real mobile controls and current task commands. Capture into the unique run directory so earlier screenshots remain intact. Compare the resulting actual captures with the approved prototype, identifying MW-I02, shared-shell, future-slice and backend-driven differences separately.

From repository root, the proposed commands are below. `<manifest>` means only the exact new manifest path returned by setup:

```powershell
$mwNode = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/check-absence.mjs'
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/setup.mjs'
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs' '<manifest>' --stage tasks
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-tests.mjs' '<manifest>'
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs' '<manifest>' --stage review
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/cleanup.mjs' '<manifest>'
```

The review stage runs only if browser acceptance passes. Any test failure ends testing and proceeds to guarded cleanup; no automatic retry. Cleanup is required on every outcome if identity/ownership guards pass: revoke run-owned sessions, stop only manifest-owned API/web processes, verify target OID/marker/connections and other-database catalog, drop only this run's disposable database, verify other catalog entries unchanged. On cleanup guard failure, report without unsafe deletion. Leave PostgreSQL running. No production data, unrelated database/service, schema contract, permission, port, OS security or recovery-copy changes. Risk is confined to synthetic writes in the exact disposable database, removed by verified cleanup.

Report functional and visual results independently. Do not infer a passing browser flow from syntax checks. MW-I02 remains IN PROGRESS pending runtime evidence and Owner review; MW-I03 is excluded. Context/review used GPT-6.1 Sol; documentation used GPT-6 Luna.
