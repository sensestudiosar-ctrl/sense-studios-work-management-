# MW-I02 consolidated authenticated acceptance plan

Authorization pending. This plan replaces the stale Review-stage sequencing in earlier preparation; historical reports/manifests remain unchanged. No current live PostgreSQL state is assumed. MW-I02 IN PROGRESS; MW-I03 excluded.

## Readiness before restricted operations

Run `.env.checkpoint-tools/mw-i02-acceptance/readiness.mjs` with pinned Node24.19.0 from repository root. It performs source-only harness semantic typing/syntax and hash-bound audit/fixture/control/viewport/guard checks; requires fresh45/45 frontend tests and passing pinned typecheck/lint/build. Setup invokes it again before loading pg. No setup if readiness fails or reviewed versions differ. Static readiness is not authenticated acceptance.

## Exact requested authorization

ONE bounded run in Windows Medium Mandatory Level under existing user HI with pinned Node24.19.0/pnpm11.19.0. Retained PostgreSQL18 system7693570241708228348, directory `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`, endpoint127.0.0.1:45434. Only absent disposable database `sense_mw_i02_validation_20261009_test`; existing116 migrations/reviewed synthetic fixtures. API127.0.0.1:59442/web localhost:59443. No application/backend/schema/permission/production/shared-shell changes.

Immediately before setup run the preserved `preflight.ps1 -Live` in the separately authorized host context. It checks Windows Medium SID S-1-16-8192 via fully qualified whoami; pinned executable locations/versions; source readiness; pg_ctl status; pg_controldata expected system ID; retained postmaster.pid directory/PID reconciliation with PostgreSQL executable/command tree and current-user process ownership via CIM; sole expected listener at45434; API/web ports unused; live address/port/system/data directory and exact target absence through check-absence.mjs. PID text is parsed separately and matched with a script-block predicate. If cluster stopped, identity/owner/port conflict, existing target or any ambiguity: STOP. No PostgreSQL start/restart/stop/repair, alternate port/cluster/database, permission/security change or automatic retry. Existing recovery copy retained. The script defaults to defining pure functions only; `-Live` must never be used during source-only preparation.

## Exact commands after approved read-only preflight

```powershell
$mwNode = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$mwHarness = '.env.checkpoint-tools/mw-i02-acceptance'
& 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File "$mwHarness/preflight.ps1" -Live
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; STOP without setup' }
& $mwNode "$mwHarness/setup.mjs" # ONCE, only if every preflight passed
if ($LASTEXITCODE -ne 0) { throw 'Setup failed; use only its valid exact manifest for guarded cleanup' }
# Use only the exact manifest printed by this setup invocation:
$mwManifest = '<exact newly created manifest path>'
try {
  & $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage tasks
  $mwTaskExit = $LASTEXITCODE
  # Task stage must finish its empty pre-auth fixture verification successfully.
  if ($mwTaskExit -eq 0) {
    & $mwNode "$mwHarness/run-tests.mjs" $mwManifest # ONCE, zero retries
    $mwBrowserExit = $LASTEXITCODE
  }
  # Independent self-prepared Review fixtures; run after browser attempt
  # even on assertion failure, provided manifest/live safety checks pass:
  & $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage review
} finally {
  & $mwNode "$mwHarness/cleanup.mjs" $mwManifest
}
```

Operator retains every exit/result separately; the sketch does not treat PowerShell nonzero exit as success. Safety mismatch interrupts dependent steps. If setup fails after creation, attempt cleanup only using the exact valid newly created manifest and marker; never infer a target. No setup/browser retry.

## One environment, complete coverage

Existing single monolithic journey retained, not rewritten. Four ordinary authenticated roles and accepted task commands/lifecycle/permissions, exact52 queue fixtures for50+2 pagination, search/filters/List/Cards/Kanban/Timeline/URL/back/keyboard/touch. Real personal phase counts and selected statuses use exact API-derived totals. Five Owner exit holds from3additional ordinary tasks +2run-local Site Employee tasks through supported employee exit; each Owner link opens and Designer cannot enumerate holds. Site populated captures occur before employee exit. Review integration creates its own bounded records after browser capture, so it cannot contaminate visual totals.

Fresh unique run directory for Designer initial/Waiting, Site Employee populated, Team Leader and Owner confirmed-empty5holds at1440×900,1024×900,390×844,320×740. Measure main content/account/task-local sections, queue top separately from first-task top/bottom, sticky/fixed navigation, unobstructed height/visible area/minimum scroll and actual native post-scroll action clearance. Normal baseline, search-focused/expanded-filter and Owner disclosure states remain separate; no layout manipulation to improve screenshots.44px critical control targets, no document overflow, focus indicators and navigation action clearance checked.

Real healthy captures precede explicitly labeled controlled request-loading/503-stale/403-denied/initial503 supplements. Healthy totals come from real authenticated endpoints; failure simulations are not server-failure or authorization evidence. Positive Owner holds/uncertain-source visibility remain discoverable. Compare exact prototype SHA256 F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8 at matching widths/heights/states. Classify material MW-I02, backend-driven, shared-shellMW-I09 and futureMW-I03–08 differences; no literal imitation of illustrative counts/grouping.

## Cleanup, risks and reporting

Attempt exact-manifest cleanup after every outcome when safe: session revocation only in this disposable DB; owned process creation/PID/executable/command validation; target system/name/OID/marker/owner and zero-connection checks; other-catalog preservation; drop only this created DB; verify exact absence. Stop without unsafe deletion on guard failure. Leave PostgreSQL running; retain recovery copy and old manifests/captures.

Risk limited to reviewed synthetic records in the disposable database and run-owned sessions/processes. No retained-cluster lifecycle or production write authorized. Independently report task/Review/browser results and Functional Reliability versus Prototype Visual Fidelity, current versus19known baseline failures, actual screenshots/measurements and cleanup. If the single journey still fails, preserve independent results/partial evidence, cleanup and stop; do not automatically retry or declare COMPLETE. Owner final visual/product acceptance required.
