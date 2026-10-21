# Test server recovery result and no-start continuation — 13 October 2026

## Approved run result

**Environment recovery: PARTIAL / BLOCKED.** PostgreSQL started exactly once and completed normal crash recovery. The PowerShell `pg_ctl ... | Out-File` pipeline then remained open through an inherited child handle after the launcher exited. API/web/helper launches and staff logins are all zero. No retry or unsafe cleanup occurred.

Independent live read-only verification at **10:48:57 IST** passed:
-PostgreSQL18 system `7693570241708228348`, exact retained directory, `127.0.0.1:45434`, PG38768/parentCMD11788 and current Windows owner.
-All25 inherited PG identity guards.
-Preview `sense_local_preview_20261008_1791474390772_test`, OID32768,115 migrations.
-5ACTIVE staff, exact10 stored task IDs each,50total;2projects/3roles/7grants/5assignments/0overrides.
-Original Owner credentials/recovery configuration and0employee identities.
-All other database catalog entries and retained preservation fingerprints unchanged.

PostgreSQL and supervisor14192 remain retained as authorized. No app/schema/permission/security/production changes or reseed. MW-I02 remains IN PROGRESS; no MW-I03.

Evidence:
`.env.checkpoint-tools/runs/retained-preview-recovery-d8571e0d-5bd6-4e35-8e6c-245a8d07e7ad/independent-pg-identity.json`,
`independent-retained-fixtures.json`,
`operator-stalled.json`,
`postgres.log`, and `pg-ctl-start.log`.

## Operator correction, independently verified

The finite dummy-process reproduction returns parent exit0 in both modes:
-Existing PowerShell output pipeline:1408ms, waiting for the finite child writer.
-Exact parent-PID `ProcessStartInfo.WaitForExit(timeout)`:171ms, without waiting for child EOF.

The future startup wrapper now uses `ProcessStartInfo.ArgumentList` and bounded exact-process wait. It preserves the attempted/confirmed distinction and retains a possible server child after any failure. **No second PostgreSQL startup was executed.**

The proposed continuation has explicit `-NoStartup`: a stopped/unknown cluster fails before any new run directory or service launch. It skips the startup stage for a verified running cluster.

Real JSON round-trip tests also exposed Int64 deserialization of legitimate process IDs. The validator now accepts only bounded positive Int32/Int64 integers and rejects strings, fractions and out-of-range values. Owner/executable/command/creation/parent/listener checks remain intact; tests use date strings and the actual serialized representation.

Current verification: **157/157 offline cases,28/28 parser files, native-output regression PASS**. Independent GPT-6.1 Sol source review found no new material blocker. Earlier failed/inconclusive operator tests are preserved; none were application or authenticated-test failures.

Infrastructure correction files: `restore-preview.ps1`, `recovery-sequence.ps1`, `recovery-sequence-tests.ps1`, `preview-process-manifest.ps1`, `preview-process-manifest-tests.ps1`; added finite `native-output-fixture.mjs`/`native-output-tests.ps1`. No frontend/backend functionality changed. Prior accepted130 frontend checks and20 known baseline failures remain separate.

## One bounded continuation requiring fresh approval

The previous run stopped on the runner failure. Its no-retry/stop-on-failure condition requires renewed authorization.

New runID `cf12966a-2211-45c0-a63d-a386b5da759e`:
1. Repeat Windows Medium/pinned tool/source-input/ownership/port guards. Require exact PG already running, live system/directory/endpoint and preview/OID32768/115/50-task/Owner/catalog proof; require API59224/web59223 free and prior helper35632 absent. Stop on any mismatch.
2. Use `restore-preview.ps1 -Execute ... -NoStartup`. **No PG startup/restart/stop.** Leave PG38768, its parentCMD11788 and the stalled supervisor14192 unchanged.
3. Start API59224 and current-source web59223 once each using the existing reviewed environment; validate and publish fresh immutable process ownership metadata.
4. Launch existing `operator.mjs launch` once; normally sign in the5retained synthetic STAFF accounts, verify10exact tasks each/role isolation, and exercise Designer1 switching once through the real test controller.
5. Repeat preservation/catalog checks; retain successful services/data and return working links. On any failure stop with no automatic retry, reset, deletion or unrelated process action.

No new database, migration, reseed, production access, app functionality/security changes or full MW-I02 acceptance run. Normal local runtime/session/passkey-counter/audit effects only; existing Owner credentials remain untouched.

### Exact command after approval

```powershell
$continuationPs = 'C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe'
$continuationArgs = '-NoLogo -NoProfile -File "D:/app/sensestudios work management app/.env.checkpoint-tools/test-personas/restore-preview.ps1" -Execute -RunId cf12966a-2211-45c0-a63d-a386b5da759e -D "D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9" -h 127.0.0.1 -p 45434 -NoStartup'
Start-Process -FilePath $continuationPs -ArgumentList $continuationArgs -WorkingDirectory 'D:/app/sensestudios work management app' -WindowStyle Hidden -PassThru
```

Use unique supervisor logs and the fresh owned run directory. Source fingerprints are preserved in `docs/operations/evidence/test-switcher-activation-20261012/continuation-source-hashes-20261013.json`.

