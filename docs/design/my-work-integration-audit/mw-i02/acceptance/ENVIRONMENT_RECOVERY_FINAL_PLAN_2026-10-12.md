# MW-I02 consolidated environment recovery and final acceptance — 12 October 2026

Status: preparation only. No live preflight, startup, database setup, application launch or authenticated browser was run for this plan. Prior acceptance and evidence remain preserved. MW-I02 IN PROGRESS; MW-I03 excluded.

## Fixed target and start/return rule

- PostgreSQL18 data directory: `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`
- System identifier: `7693570241708228348`; approved address/port: `127.0.0.1:45434`
- Pinned Node24.19.0 / pnpm11.19.0
- Exact disposable DB: `sense_mw_i02_validation_20261009_test`
- API127.0.0.1:59442; web localhost:59443
- Recovery copy: `.env.checkpoint-tools/mw-i02-pg-recovery-copy-20261010`; expected content-manifest SHA-256 `87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007`.

One continuously supervised Windows Medium context is required. `preflight.ps1 -Live -AllowStartup` distinguishes running/stopped/unknown. It verifies tool/readiness state and live process, data directory, owner, system identifier, endpoint and exact DB absence. Unknown or conflicting evidence stops. For stopped-cluster process ownership, the guard uses a readable process `-D` argument where available; otherwise it may classify a child server only through a complete PID/parent/creation-time chain to a running PostgreSQL Windows service whose service configuration independently names a different exact data directory. `pg_ctl.exe` alone is not treated as a server owner. An executable path alone never excludes a server, since another installed binary could still reference the retained directory. A same/unknown executable without command or verified service-ancestry evidence remains BLOCKED with the PID and reason. Missing process enumeration or service metadata is a separate fail-closed result. No process uncertainty is treated as proof of safety.

If already running, do not start a second server and leave it running afterward. If stopped, the script checks PostgreSQL18/version and disk identity; port occupancy; IPv4/IPv6 excluded ranges; `postmaster.pid` path/port/address/ready fields and parses the PID, requiring the exact recorded PID not to exist as a live process (it never edits the file); that every same/unknown-executable PostgreSQL server process is classifiable by its explicit `-D` argument or verified Windows-service ancestry and none refers to the retained data directory; and rehashes all4,673 recovery-copy files,30 directories, reparse points and system identity against the approved manifest. A stale PID is accepted only when those independent checks agree; malformed, incomplete, live-PID or contradictory state blocks. Only after those checks and absent single-attempt marker/log does it write the marker and invoke this ONE command:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9' -l 'D:/app/sensestudios work management app/.env.checkpoint-tools/mw-i02-postgres-start-45434-20261012-final-acceptance.log' -o '-h 127.0.0.1 -p 45434' -w start
```

No retries, repair, reset, reinitialization, upgrade, WAL/PID manipulation, alternate endpoint/cluster or unrelated service change. After a successful command, require `pg_isready`, `pg_ctl status`, repeat process/listener identity checks, and run `check-absence.mjs`'s READ ONLY SQL transaction for live host/port/data directory/system ID and target absence before setup. A nonzero startup/readiness/identity check stops dependent work; preserve marker/log. The script accepts the exact known direct-postgres parent command; unfamiliar process command shapes fail closed.

## One-run execution after the single Owner authorization below

```powershell
$ErrorActionPreference = 'Stop'
$mwNode = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$mwPwsh = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
$mwHarness = '.env.checkpoint-tools/mw-i02-acceptance'
& $mwPwsh -NoProfile -File "$mwHarness/preflight.ps1" -Live -AllowStartup
if ($LASTEXITCODE -ne 0) { throw 'Preflight/start/readiness failed; stop without setup or retry' }
$mwSetupOutput = @(& $mwNode "$mwHarness/setup.mjs" 2>&1) # one guarded creation; only exact DB, migrations116 and synthetic fixtures
$mwSetupExit = $LASTEXITCODE
# setup.mjs prints a manifest-created JSON record before CREATE DATABASE.
$mwManifest = $null
foreach ($mwLine in $mwSetupOutput) {
  try { $mwRecord = ([string]$mwLine | ConvertFrom-Json -ErrorAction Stop); if ($mwRecord.manifestPath) { $mwManifest = [string]$mwRecord.manifestPath } } catch { }
}
if ($mwSetupExit -ne 0) {
  if ($mwManifest) {
    $mwRunManifest = Get-Content -LiteralPath $mwManifest -Raw | ConvertFrom-Json
    $mwCreatedMarker = Join-Path $mwRunManifest.runDir 'created.marker.json'
    if ($mwRunManifest.databaseName -eq 'sense_mw_i02_validation_20261009_test' -and $mwRunManifest.createdDatabase -eq $true -and (Test-Path -LiteralPath $mwCreatedMarker)) {
      & $mwNode "$mwHarness/cleanup.mjs" $mwManifest # exact identity/marker guards still decide whether deletion is safe
      $mwSetupCleanupExit = $LASTEXITCODE
    }
  }
  throw 'Setup failed; exact marker-bound cleanup attempted only when its manifest proves this run created the target; no retry'
}
if (-not $mwManifest) { throw 'Setup succeeded without a parseable manifest path; stop and do not guess a target' }
$mwTaskExit = 1; $mwBrowserExit = 1; $mwReviewExit = 1
try {
  & $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage tasks
  $mwTaskExit = $LASTEXITCODE
  if ($mwTaskExit -eq 0) {
    & $mwNode "$mwHarness/run-tests.mjs" $mwManifest # one existing full journey; zero retries
    $mwBrowserExit = $LASTEXITCODE
  }
  # Self-fixturing Review stage is independent of browser PASS; run once when exact-manifest/live guards remain safe.
  & $mwNode "$mwHarness/run-task-integration.mjs" $mwManifest --stage review
  $mwReviewExit = $LASTEXITCODE
} finally {
  & $mwNode "$mwHarness/cleanup.mjs" $mwManifest # attempt on test failure whenever manifest guards permit
}
```

The existing setup snapshots the other-DB catalog before creation, creates only this absent target, applies116 reviewed migrations and emits the exact manifest path before CREATE DATABASE. If a later setup failure leaves a valid created=true manifest and matching marker, cleanup is attempted against only that manifest; if no marker or identity binding exists, stop without guessing/deletion and report. Task stage checks exact identity and the unauthenticated fixture boundary. Browser journey is existing and touch-enabled; it covers Owner5 genuine employee-exit holds and isolation, Team Leader, Designer initial/Waiting, Site Employee, task views/commands/roles/search/filter/pagination and 1440×900,1024×900,390×844,320×740 captures. It records queue and first-task positions separately, native scroll/visibility and fixed-navigation clearance. Fresh screenshots are compared with prototype hash F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8 at equal dimensions/states.

Preserve each exit code. Run independent Review after browser assertion failure while identity guards remain valid. If task/setup/safety guard fails, do not force the next dependent step. Keep any created valid manifest for exact guarded cleanup; no guessed target. Cleanup revokes only run-owned sessions, stops only manifest-owned API/web, verifies exact DB name/OID/owner/marker/connections and other catalog snapshot, drops only the DB created by this run and proves catalog preservation. On any cleanup-guard mismatch, stop without unsafe deletion.

If and only if the live-preflight JSON says `startedByRun:true` (and initial state stopped), after DB cleanup and API/web shutdown rerun preflight read-only and `node .env.checkpoint-tools/mw-i02-acceptance/check-no-unowned-connections.mjs`. Require that script exit0/JSON PASS; otherwise leave PostgreSQL running. Then invoke once `& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9' -m fast -w stop`; verify pg_ctl says no server running, port45434 has no listener, and pg_controldata still reports system identifier7693570241708228348. If initially running, leave it running. Do not stop unrelated services or stop after ambiguous identity/connections.

## Source-only preparation results

Read-only current source hashes continue to match the six accepted frontend files. Current-source Playwright journey retains corrected Active/Waiting wording, touch-enabled contexts, 390×844 and320×740 loops, Owner5-exit fixture, authorization isolation, independent Review stage, and per-run artifact binding. Existing readiness covers setup/manifest/security guards and frontend evidence. PowerShell parser and inert operator tests are required again after final script edits. Recovery-copy verification is read-only.

Previously accepted bounded Functional Reliability PASS, affected frontend45/45, typecheck/lint/build and known19 baseline failures are preserved. This procedure does not claim current authenticated visual acceptance or completion.

## One consolidated Owner authorization requested

Authorize ONE continuous run in Windows Medium Mandatory Level using pinned Node24.19.0/pnpm11.19.0, allowing `preflight.ps1 -Live -AllowStartup` to start the exact stopped retained PostgreSQL18 cluster once with the command above only if safe prechecks pass; if already running, no start. Also authorize one setup of only `sense_mw_i02_validation_20261009_test` with116 migrations/reviewed synthetic fixtures, one task integration, one authenticated browser run, one independent Review stage when safe, manifest-bound cleanup and catalog verification. If and only if this run started PostgreSQL, authorize returning it to stopped state after successful exact cleanup and confirmation that no unowned client sessions remain; otherwise leave it in its original state. No retries/fallback/other database or port/production/backend/schema/permission/security/UI changes. Any mismatch stops the run; Owner receives separate Functional Reliability and Prototype Visual Fidelity results. This request authorizes no subsequent MW-I03 work or automatic MW-I02 completion.


