# MW-I02 recovery evidence — 10 October 2026

The Owner separately approved the complete cold copy and one controlled startup of the original retained PostgreSQL cluster. No cluster initialization, replacement, configuration edit, manual PID removal or WAL manipulation occurred.

## Cold copy

Source: `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`.

Recovery copy: `D:/app/sensestudios work management app/.env.checkpoint-tools/mw-i02-pg-recovery-copy-20261010`. The destination did not exist and was never overwritten. It remains private and Git-ignored; its contents and per-file manifests are not published.

Executed from the repository root with Node24.19.0:

```powershell
node .env.checkpoint-tools/mw-i02-cold-copy-20261010.mjs
```

The reviewed helper exited0 at 15:00:00 IST. Source-before/source-after inventories match exactly. Source and destination have 4,673 matching files, 120,778,450 bytes and 30 matching directories, including WAL, configurations, metadata and the retained PID file. Every file matched by relative path, size and SHA-256. Explicit Windows reparse scans returned0 and the tablespace directory was empty. Source process/port checks passed before, during and after copying. PostgreSQL18.6 and system identifier `7693570241708228348` matched. GPT-6.1 Sol independently rehashed both sets of4,673 files and accepted the evidence before startup. This is preservation evidence, not a tested restore. The copy was never started.

Private evidence: `.env.checkpoint-tools/mw-i02-copy-evidence-20261010-1791624586371/summary.json` and its read-only guards/manifests. Source manifest SHA-256: `c41a5b8cc059b3cc0c42d0eb50394689a2071518be8fecb0db6bdc9f674616c0`. Copy content manifest SHA-256: `87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007`.

## One original startup and live checks

Executed the Sol-reviewed fresh-check/one-attempt wrapper:

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .env.checkpoint-tools/mw-i02-start-original-20261010.ps1
```

Its only startup operation was the previously reviewed command:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9' -l 'D:/app/sensestudios work management app/.env.checkpoint-tools/mw-i02-postgres-start-20261010.log' -o '-h 127.0.0.1 -p 57434' -w start
```

The attempt exited0. The retained stale PID caused pg_ctl's “another server might be running” warning, but fresh stopped/process/listener guards had passed. No PID file was manually removed. The original server log recorded ordinary automatic recovery and readiness at15:03:34 IST. The exclusive private attempt marker prevents a second execution. No copied cluster was started.

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_isready.exe' -h 127.0.0.1 -p 57434 -d postgres -U sense_demo
node .env.checkpoint-tools/mw-i02-acceptance/check-absence.mjs
```

At15:03:47 IST, health reported accepting connections. The READ ONLY preflight verified maintenance database `postgres`, address `127.0.0.1`, port57434, the exact original data directory and system identifier `7693570241708228348`. Target `sense_mw_i02_validation_20261009_test` was absent. It rolled back the read-only transaction.

Only then was the approved disposable target created through `setup.mjs`; reviewed migrations116 and exact target identity/zero initial account, organization and session counts were verified. Isolated application ports are API59442 and web59443. Run manifest: `.env.checkpoint-tools/mw-i02-acceptance/runs/1791624844012-9bf01ed458fe/manifest.json`. The setup pins live data directory and system identifier before creation and rechecks them after creation/migration. Validation and exact-target cleanup are recorded separately; startup itself is not MW-I02 acceptance.
