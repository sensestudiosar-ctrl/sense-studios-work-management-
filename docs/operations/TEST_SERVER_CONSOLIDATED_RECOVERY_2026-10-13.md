# Retained test server recovery — 2026-10-13

## Current result

**BLOCKED before mutation.** The single helper-only approval stopped at its read-only preflight because PostgreSQL was not running. No helper replacement, startup, login, task write or database operation occurred.

Read-only evidence: `pg_ctl status` returned no server running; disk system ID is `7693570241708228348`, state `in production`; ports45434/59224/59223 have no listeners; historical PG26252/API16860/web3260/helper35632 processes are absent. Direct and proxied readiness are unreachable. The browser pages were cached. See [diagnostic evidence](evidence/test-switcher-activation-20261012/stack-offline-20261013.json).

The last PG log reports Windows CreateProcess/io_worker error87 at2026-10-12 23:42:54 IST. Why all services exited is **unknown**; this is not evidence of an application defect or proof of OOM/reboot.

The previous approval expressly prohibited PostgreSQL/API/web starts. A combined startup requires new Owner authorization.

## Reference

Owner supplied:
`D:/1.Sensestudios/DR RAJA/01.Designer/03. Renders/AFTERPHOTOSHOP/Sense_Studios_My_Work_Final_Demo.html`.

243,344 bytes; SHA256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. It is byte-identical to the already locked `D:/SCRAP/prototype (2).html`. No reference/application file was changed during this recovery preparation.

## Preparation evidence

-35/35 existing ownership cases
-30/30 manifest cases, including PID reuse, wrong owner/executable/command/parent, partial metadata, real JSON/path round trips and IPv6 conflicts
-41/41 sequence cases: running/stopped branches, every failed stage stops, no unauthorized action, parent retention after a possible child from failed pg_ctl
-41/41 helper/input tests, preserving the earlier28 helper tests
-26/26 PowerShell/JavaScript parser files
-`restore-preview.ps1` without `-Execute`: PREPARED, no inspection/startup
-Read-only real input proof PASS:5 completed encrypted personas,50 unique stored task IDs, original preservation archive hash, exact retained environment/NAS. **No database or authentication access**.
-Source environment fingerprint pinned: `cc5207584fb8f895fd4e187071b4c3c746dec7b6ed39af49dec6f99baba858c5`. The existing local authentication configuration is reused unchanged; no password/security change.
-Independent GPT-6.1 Sol source review: startup-attempt retention finding corrected and covered. No further material finding. Live safety is not established by offline tests.
-Previously accepted130 affected frontend tests/typecheck/lint/build and20 known full-suite baseline failures preserved. No frontend/backend functionality change or new full acceptance claim.

## Infrastructure files

Preserved diagnostic correction:
`activation-result.mjs`, `activation-result.test.mjs`, `controller-page.mjs`, `operator.mjs`.

Recovery preparation under `.env.checkpoint-tools/test-personas/`:
`host-preflight.ps1`, `environment.mjs`, `preview-process-manifest.ps1`, `preview-process-manifest-tests.ps1`, `retained-fixtures.mjs`, `retained-fixtures.test.mjs`, `recovery-sequence.ps1`, `recovery-sequence-tests.ps1`, `restore-preview.ps1`, `verify-offline.ps1`.

Hardcoded API/web PIDs are replaced by an immutable owned-run manifest and live executable/command/owner/PID/creation/parent/listener checks. Historical manifests are not edited. Default helper guards still require the complete running environment; the explicitly labeled PgOnly mode verifies only PG before application startup.

## One proposed authorized sequence

Run ID: `d8571e0d-5bd6-4e35-8e6c-245a8d07e7ad`.
New owned directory:
`D:/app/sensestudios work management app/.env.checkpoint-tools/runs/retained-preview-recovery-d8571e0d-5bd6-4e35-8e6c-245a8d07e7ad`.

1. Windows Medium context, pinned PS7/Node24.19.0/pnpm11.19.0; exact nonreparse source/directory, PG18 disk identity, stored fixture state, prior preservation fingerprints, port listeners/exclusions, historical helper absence. Any mismatch stops.
2. If exact PG is already running, verify it without a second startup. If stopped, repeat complete reviewed stopped ownership/stale-PID/port/cold-copy checks and invoke pg_ctl **once**, permitting ordinary crash recovery. No repair, reset, PID/WAL edits, retry, fallback or unrelated service action.
3. Require pg_isready plus independent PG process proof and READ ONLY SQL system/directory/host/port/preview DB/OID32768/115 migrations, exact50 per-employee task IDs,5 staff, original Owner credential/recovery and other-database catalog proof before API/web startup.
4. Start existing API59224 and current-source Vite web59223 once with the reviewed retained environment and runtime-only45434 binding. No migration, bootstrap, reseed, new database or production config edit. BREVO/bootstrap/migration environment keys are excluded as in the reviewed recovery approach. Finite readiness polling does not respawn a process.
5. Record immutable PID/executable/command/owner/creation/parent identity, validate listeners and atomically publish only the latest pointer. Repeat full host proof.
6. Launch `operator.mjs launch` **once** using the completed DPAPI staff state. Normally authenticate5 staff, verify10 exact existing tasks each and role isolation, exercise Designer1 once through the real test controller. No Owner credential automation/export and no `prepare`/setup path.
7. Repeat read-only preservation/catalog/fixture proof. Return the working web/controller links. Retain the services and existing synthetic records for Owner testing.
8. On failure stop progression. No automatic retry, restore, deletion or service restart. If startup was attempted, retain the supervisor for any possibly live child and report its precise stage; do not claim PG running solely from pg_ctl success/failure.

## Exact proposed command

From the repository root, after new Owner approval, launch the single hidden Medium-context supervisor:

```powershell
$previewPs = 'C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe'
$previewArgs = '-NoLogo -NoProfile -File "D:/app/sensestudios work management app/.env.checkpoint-tools/test-personas/restore-preview.ps1" -Execute -RunId d8571e0d-5bd6-4e35-8e6c-245a8d07e7ad -D "D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9" -h 127.0.0.1 -p 45434'
Start-Process -FilePath $previewPs -ArgumentList $previewArgs -WorkingDirectory 'D:/app/sensestudios work management app' -WindowStyle Hidden -PassThru
```

If safely stopped, the supervisor directly invokes exactly:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9' -l 'D:/app/sensestudios work management app/.env.checkpoint-tools/runs/retained-preview-recovery-d8571e0d-5bd6-4e35-8e6c-245a8d07e7ad/postgres.log' -o '-h 127.0.0.1 -p 45434' -w start
```

The script contains the exact fixed API/web/helper arguments; it never invokes migrations or database creation.

## Risks and boundaries

Normal PG crash recovery changes the retained cluster's WAL/data as part of ordinary startup. Current disk state suggests an unclean stop; recovery success is unverified. The historical cold recovery copy hash `87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007` is checked unchanged and never restored. It predates the50-task setup and is **not** a current fixture backup.

Ordinary server startup/background processing and staff authentication may update normal local runtime/session/passkey-counter/audit records. Expected business identities and the retained50-task set must match before and after. No reset, direct SQL write, reseed, permission change, security bypass, unrelated process termination, production access, acceptance database or full MW-I02 acceptance run is authorized by this preparation.

Stable cross-session lifetime remains a runtime verification item; no global sandbox/job/security changes are proposed. The hidden supervisor keeps verified parents alive without an automatic repair/restart loop.

MW-I02 remains IN PROGRESS. No MW-I03 or automatic completion. Approval requested only for this one combined retained-server recovery.

