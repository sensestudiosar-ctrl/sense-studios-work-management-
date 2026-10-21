# MW-I02 environment stabilization checkpoint

10 October 2026. Read-only diagnosis only. MW-I02 remains IN PROGRESS. No PostgreSQL startup, database creation, application launch, browser launch, source change, or MW-I03 work was performed. Existing frontend changes and accepted evidence remain preserved.

## Established causes and remaining hypotheses

### Execution context and pnpm

- Default Codex commands run as the Windows user DESKTOP-7U1I620\hi under Low Mandatory Level with the DESKTOP-7U1I620\CodexSandboxUsers group. This is a restricted Windows host process, not WSL or a Linux container.
- In that context, Node 24.19.0 fs.realpathSync.native() returns EPERM for the repo root, node_modules, and pinned pnpm script. Node TCP connect to 127.0.0.1:57434 returns EACCES even while the endpoint is stopped. CIM, SCM, and Windows event access are denied.
- An explicitly host-context command (require_escalated) runs as the same user at Medium Mandatory Level. Repository realpath succeeds there, and the same TCP probe returns ECONNREFUSED while the server is stopped. Host TCP/service/process/event diagnostics are available.
- Therefore pnpm’s prior EPERM occurred before TypeScript ran because the restricted process could not resolve the repo path. It is not an NTFS ACL or Node/pnpm version defect. The test runner in the default restricted context cannot reach host loopback; keep PostgreSQL, app children, Playwright and the test runner in one host-context command tree.
- Node 24.19.0 is present at C:\Program Files\nodejs\node.exe and C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe. Pinned pnpm 11.19.0 is C:\Users\HI\AppData\Local\node\corepack\v1\pnpm\11.19.0\bin\pnpm.cjs. pnpm.cmd points to the Codex fallback shim; use the explicit pinned script with the pinned Node.
- @playwright/test 1.63.0 and Chromium 1243’s executable are present. No browser was launched.
- Repository and cluster NTFS ACLs grant Modify; medium-context realpath succeeds. The discrepancy is the restricted sandbox boundary.
- The latest hidden startup attempt used Start-Process -ArgumentList with unquoted path elements containing spaces. ArgumentList is joined into a command-line string, so this likely explains its exit code 1 and absent log. The failure is consistent with malformed invocation, not evidence of cluster corruption. Future calls should invoke pg_ctl directly in host-context PowerShell with quoted path arguments.

### PostgreSQL bind and cluster evidence

- The 18:49:43 IST PostgreSQL log records Windows failing to bind 127.0.0.1:57434 with WSAEADDRINUSE. The log does not identify the owner.
- Current IPv4/IPv6 excluded ranges do not contain 57434, and no current listener uses that port. These are current readings, not historical readings from 18:49.
- The Windows dynamic TCP client-port range is 49152–65535; fixed port 57434 is inside it. A transient client ephemeral socket can compete with this listener. System event Tcpip 4231 at 15:06:07 IST reports failure to allocate an ephemeral port because the global TCP port space was exhausted. This confirms host TCP pressure and is a plausible contributor, but does not prove the exact 18:49 socket owner.
- Current automatic PostgreSQL Windows services are postgresql-x64-18 (data directory C:\Program Files\PostgreSQL\18\data, listener PID 9356 on 5432) and PostgreSQL16-FirmBooksTest (C:\Program Files\PostgreSQL\16\data, listener PID 9296 on 54329). Neither currently listens on 57434, 59442, 59443 or 59223. These services are separate from the retained MW-I02 cluster and must not be stopped or repurposed. More-specific process-account ownership was inaccessible.
- The retained MW-I02 data path .env.checkpoint-tools/pg-demo-20261006-a7c9 reports system identifier 7693570241708228348, matching expectation. pg_ctl status reports no server running. pg_control’s “in production” state and 19:00:53 IST modification time reflect its persisted prior state, not a live process. The prior retry log records ordinary WAL recovery completing and PostgreSQL reporting ready at 19:00:53.

### Classification

- pnpm EPERM: restricted Codex filesystem boundary.
- Browser/API/DB EACCES: restricted Codex loopback boundary, before an application response; not an MW-I02 API authorization defect.
- Intermittent EADDRINUSE: Windows rejected the bind. Port pressure is confirmed; the historical port owner is unresolved. The fixed port is inside the current dynamic client range.
- Latest hidden attempt exit 1: likely malformed Start-Process quoting.
- Harness: the existing MW-I02 guarded harness pins Node, checks server identity/data path/system ID/migrations, snapshots the catalog, binds cleanup to a run manifest/OID/marker, and starts API/web on loopback. Reuse it from host-context execution.

## Exact diagnostic evidence

| Check | Default restricted command | Host-context command |
|---|---|---|
| Mandatory integrity | Low | Medium |
| Repository realpath | EPERM | succeeds |
| Node TCP probe to stopped 57434 | EACCES | ECONNREFUSED |
| TCP/service/process visibility | CIM/SCM denied | available; no target listener |
| Excluded ports | unavailable | 57434 absent in IPv4/IPv6 ranges |
| Dynamic TCP range | unavailable | 49152–65535 |
| Other PostgreSQL | unavailable | service listeners on 5432 and 54329 |
| Tcpip event | unavailable | event 4231, 15:06:07 IST, ephemeral exhaustion |
| Cluster identity/status | ID 7693570241708228348; pg_ctl stopped | same |
| Runtime/browser | Node 24.19.0; pnpm 11.19.0; Playwright 1.63; Chromium file present | same |

Preserved logs: initial bind failure at ../../../../../.env.checkpoint-tools/mw-i02-postgres-start-postrefine-20261010.log; successful readiness/recovery retry at ../../../../../.env.checkpoint-tools/mw-i02-postgres-start-postrefine-retry1-20261010.log; prior PostgreSQL log at ../../../../../.env.checkpoint-tools/mw-i02-postgres-start-20261010.log.

System event evidence was available from the Windows System log. Application-log PostgreSQL startup events exist, but none identifies a 57434 owner.

## Minimal recovery plan

1. Run all repository, DB, app and browser processes from a single Windows host-context command invocation (medium integrity). Start by confirming the token and successful Node realpath. Do not mix a restricted low-integrity browser runner with a host PostgreSQL process.
2. Use the exact pinned Node and pnpm paths above.
3. Reuse the retained PostgreSQL 18 cluster and existing MW-I02 setup/cleanup harness. Do not touch either automatic Windows service.
4. For the least code change, keep 57434 only if a new approved preflight confirms no listener, no active port use, no excluded reservation and the exact cluster identity. However, this port lies within Windows’ dynamic range, so that does not guarantee stability.
5. Recommended durable infrastructure-only change: move the harness DB endpoint to a verified-free port below 49152 (proposed 45434). Update the five guard scripts together: setup.mjs, check-absence.mjs, run-task-integration.mjs, run-tests.mjs, cleanup.mjs. Do not modify old run manifests or application code. This needs separate Owner approval because it changes the previously approved harness endpoint. No Docker, new cluster, firewall change or system-wide install is proposed.
6. After approved startup and exact read-only identity/absence checks, run the standard setup harness; run the task integration, authenticated Playwright states/screenshots, and review integration; then run exact-manifest cleanup and verify target absence/catalog preservation. Run affected frontend tests, pinned typecheck/lint/build in the same host context. Compare new captures with the hash-approved prototype at matching viewport and state.
7. Stop only the retained dedicated cluster after exact cleanup and confirmation that no unowned connections remain. Never stop the two Windows services.

## Exact proposed commands (not run)

Host-context, read-only preflight:

    $Repo = 'D:\app\sensestudios work management app'
    $Data = Join-Path $Repo '.env.checkpoint-tools\pg-demo-20261006-a7c9'
    $PgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
    $PgControlData = 'C:\Program Files\PostgreSQL\18\bin\pg_controldata.exe'
    $Node = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    $Pnpm = 'C:\Users\HI\AppData\Local\node\corepack\v1\pnpm\11.19.0\bin\pnpm.cjs'
    Set-Location -LiteralPath $Repo
    whoami /all
    & $Node -e "console.log(require('node:fs').realpathSync.native(process.cwd()))"
    & $Node $Pnpm --version
    & "$env:WINDIR\System32\netsh.exe" interface ipv4 show excludedportrange protocol=tcp
    & "$env:WINDIR\System32\netsh.exe" interface ipv6 show excludedportrange protocol=tcp
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -in 57434,45434,59442,59443
    & $PgControlData $Data | Select-String 'Database system identifier|Database cluster state'
    & $PgCtl status -D $Data

State-changing work requires new explicit Owner approval. If the approved port remains 57434:

    $StartupLog = Join-Path $Repo '.env.checkpoint-tools\mw-i02-postgres-host-20261010.log'
    & $PgCtl -D $Data -l $StartupLog -o '-h 127.0.0.1 -p 57434' -w start
    # After startup, pass the read-only identity/absence guard, then:
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\setup.mjs')
    # Set $Manifest to the exact manifest path printed by setup:
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\run-task-integration.mjs') $Manifest --stage tasks
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\run-tests.mjs') $Manifest
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\run-task-integration.mjs') $Manifest --stage review
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\cleanup.mjs') $Manifest
    & $Node (Join-Path $Repo '.env.checkpoint-tools\mw-i02-acceptance\check-absence.mjs')

If 45434 is separately approved, first change the five harness source scripts as one reviewed set and update all port assertions/URLs. Then use -p 45434 above and reverify the live identity before setup. No partial port change is safe.

Pinned frontend gates after approval:

    & $Node $Pnpm typecheck
    & $Node $Pnpm lint
    & $Node $Pnpm --filter @sense/web test:unit
    & $Node $Pnpm build

## Risks and approvals

- Ordinary startup writes cluster/WAL/checkpoint state; the last session was interrupted, though its retry completed automatic recovery. This is not authorized during this checkpoint.
- Setup creates one exact-named disposable database, applies 116 reviewed migrations and synthetic test data. Exact-manifest cleanup removes only that target after checking identity, OID, marker and unchanged other-database catalog.
- Returning the cluster to stopped state requires confirming no unowned connections and stopping only this data path.
- Moving to 45434 is test infrastructure only, but requires separate Owner approval. Previous startup/setup approval is exhausted; this checkpoint explicitly forbids starting or creating anything. New approval is required for host-context startup and authenticated validation, disposable DB use, and whether the harness port changes.
- No reset, repair, cluster edits, service stop, permission change, firewall change, system-wide installation, Docker or new cluster.

## Reusable MW-I03–MW-I09 plan

- Retain one documented host-context runner pinned to Node 24.19.0/pnpm 11.19.0 and installed Playwright/Chromium. All spawned DB/API/web/browser/test processes must share that context.
- Reuse the retained PG18 test cluster with one active slice run at a time. Each run gets a manifest-bound disposable DB, synthetic fixtures only, exact server identity/data-directory checks, pre/post catalog snapshots, and OID/marker-bound cleanup.
- Use an Owner-approved static loopback DB port outside Windows’ dynamic range; check listener and exclusion status each run. Do not use production/demo service clusters.
- Store current-source fingerprint, commands/results, screenshot viewport/state manifest, prototype hash, and cleanup evidence per slice. Compare actual captures with the approved prototype at equivalent state before acceptance.
- Stop and escalate any identity, port, catalog, runner-context or cleanup mismatch. Never bypass OS isolation to make localhost work.

**Functional Reliability:** BLOCKED for post-refinement acceptance.  
**Prototype Visual Fidelity:** BLOCKED pending new authenticated captures and matching prototype comparisons.  
MW-I02 remains IN PROGRESS. MW-I03 has not started.

