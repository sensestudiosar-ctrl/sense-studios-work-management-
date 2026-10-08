# Local PostgreSQL recovery and readiness (2026-10-08)

## Verified state

Run database checks from the Windows host, where the PostgreSQL processes are running. The sandbox cannot open the same loopback sockets: its `psql` attempt returned Windows socket error 10013 (permission denied). That is an execution-boundary failure, not evidence that PostgreSQL is stopped. The earlier report that port 57433 was closed was incorrect. Port 56433 is not the accepted S27 configuration.

Host `psql` verified the `sense_s14` role against the main cluster at `127.0.0.1:57433`, database `sense_s27_main_s27_1791432458736_a9c6_test`, with 115 migrations. It also verified the separate S14 database `sense_s14_s27_1791432458736_a9c6_test` on port 56436. The accepted source database remains at 109 migrations. The existing read-only migration status helper checked 23 keys: 22 isolated targets at 115 and the source at 109; its result is `.env.s27-tools/migration-status-1791473521872.json`. The post-upgrade preservation comparison passed for all 154 retained snapshots.

The main PostgreSQL 18.6 cluster is under `C:/Users/HI/AppData/Local/Temp/sense-s14-verify-pg18-20261001-15a34bc7`. The separate S14/S15 cluster on port 56436 is under `C:/Users/HI/AppData/Local/Temp/sense-s14-s15-pg18-20261002-37594e7c0ef54a84a37dd1b5a0dbc796`. Logs contain intermittent Windows child-process shared-memory error 487. Its cause is unproven; no host SQL failure was reproduced. Do not restart a cluster or reset data based on sandbox error 10013 or error 487 alone. No restart, data reset, or migration was performed for this investigation.

## Read-only host preflight

From the repository root in host PowerShell, run the preflight against the accepted environment and preservation snapshot:

```powershell
node --version
.\scripts\check-local-postgres.ps1 `
  -EnvironmentFile .env.s27-tools/s27-fresh-1791432458736_a9c6.test `
  -PreservationSnapshot .env.s27-tools/sense_s27_s26_populated_1791432458736_a9c6_test-preservation.json
```

The wrapper requires Node `v24.19.0`; it invokes the existing migration status and retained-data comparison helpers. Those helpers read the selected `.test` file directly, keep its credentials out of shell output, and issue read-only database transactions. The migration status helper writes a new timestamped JSON result under `.env.s27-tools`. Keep the environment and snapshot files in that directory. A successful preflight establishes local SQL/migration readiness and preservation only.

The wrapper itself passed on the host, recording `.env.s27-tools/migration-status-1791473645663.json` and confirming all 154 snapshots. GPT-6.1 Sol accepted the maintenance scope and evidence. For a subsequent full application verification, the existing pinned runner loads this environment into its child API/browser processes:

```powershell
node .env.s27-tools/run-verify-s27.mjs .env.s27-tools/s27-fresh-1791432458736_a9c6.test
```

That full runner was not rerun for this diagnosis. Invoking `pnpm verify` in a shell without the scoped environment does not reproduce the accepted database configuration.

For a direct connectivity check from host PowerShell, `psql` can be run without putting a password in the command line:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
& $pgBin -X -w -h 127.0.0.1 -p 57433 -U sense_s14 -d sense_s27_main_s27_1791432458736_a9c6_test -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;'
& $pgBin -X -w -h 127.0.0.1 -p 56436 -U sense_s14 -d sense_s14_s27_1791432458736_a9c6_test -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;'
```

These commands are read-only. `-w` prevents an interactive password prompt; host PostgreSQL authentication must already permit the connection. Never print or paste credentials from the accepted environment file. If the host preflight fails, retain the database and snapshot files and investigate the exact host error. Do not treat sandbox socket denial as a reason to restart PostgreSQL.

## Acceptance boundary

This note records the database checks above; it does not establish that the full UI, PostgreSQL integration suite, browser suite, or `pnpm verify` passed for the latest checkout. S18/S27 acceptance remains tied to the accepted 484-entry fingerprint. Later edits to `apps/web/src/review.tsx` and `apps/web/src/review.css` are outside that acceptance and remain unverified. Actual-project R-104/R-105 acceptance and production readiness are also unverified.

Diagnosis and scope review used GPT-6.1 Sol (`gpt-6.1-sol`); bounded documentation used GPT-6 Luna (`gpt-6-luna`).
