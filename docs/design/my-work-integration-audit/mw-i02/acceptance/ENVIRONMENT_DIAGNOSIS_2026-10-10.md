# MW-I02 local environment diagnosis — 2026-10-10

## Finding

The exact authorized PostgreSQL endpoint `127.0.0.1:57434` had no listener during the approved root-host checks. The dedicated PostgreSQL 18 cluster files remain under `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`. The directory contains `PG_VERSION` 18 and is a normal directory, not a link. Its retained `postmaster.opts` names `C:/Program Files/PostgreSQL/18/bin/postgres.exe`, that data directory, host `127.0.0.1`, and port `57434`. The recorded PostgreSQL binaries report product version 18.6.

The recorded PID `27316` was absent. Read-only `pg_ctl status` reported no server running. Read-only `pg_controldata` returned system identifier `7693570241708228348`, matching the historical MW-I01 manifest, and cluster state `in production` with checkpoint `2026-10-09 23:42:58 IST`. The latest retained PostgreSQL log entry is `2026-10-10 03:11:09 IST`, reporting Windows shared-memory error 487 for a child. This timestamp is correlated with the unavailable service; it does not prove the error terminated PostgreSQL.

Root-host listener inspection also found no listener on `57434`, `59442`, `59443`, or the previously mentioned preview port `59223`. PostgreSQL services on ports `5432` (PostgreSQL 16) and `54329` (PostgreSQL 18) are unrelated and were not connected to. Docker was unavailable: the daemon was absent and `docker ps` could not inventory containers because the service was stopped. No database connection, HTTP request, browser inspection, or alternate-target check was made for this diagnosis. The application HTTP runtime was not checked.

The MW-I02 API port `59442` and web port `59443` are therefore unavailable locally. The prior preview on `59223` is also unavailable locally. The reviewed harness has not started either MW-I02 application process. The earlier MW-I02 report remains accurate that authenticated functional and visual acceptance are blocked; no database was created and no cleanup was needed.

## Retained cluster and proposed recovery command

The Owner-authorized test database name remains `sense_mw_i02_validation_20261009_test`. Its absence and the live cluster identity have not yet been reverified because PostgreSQL is stopped. Approval to use that database did not authorize starting the retained PostgreSQL cluster. Startup changes cluster process state and may perform physical WAL recovery across the retained cluster, which also contains other databases. Explicit Owner approval for starting this exact cluster and allowing ordinary recovery is required before the command below can be executed.

The exact proposed standalone PowerShell command is recorded here for review; it was **not executed**:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D 'D:\app\sensestudios work management app\.env.checkpoint-tools\pg-demo-20261006-a7c9' -l 'D:\app\sensestudios work management app\.env.checkpoint-tools\mw-i02-postgres-start-20261010.log' -o '-h 127.0.0.1 -p 57434' -w start
```

The proposed log path did not exist when checked; recheck it immediately before any approved execution and choose a unique dated suffix if it exists. Immediately before startup, repeat root-host listener, PID, data-directory, and system-identifier checks. If the observed cluster identity differs, or an unexpected listener occupies the port, stop. After any approved startup, before provisioning, independently verify the live server's data directory and system identifier (`7693570241708228348`), as well as loopback address `127.0.0.1` and port `57434`; all must match the retained disk evidence and historical MW-I01 identity. The existing `check-absence.mjs` checks endpoint address/port and target absence but does **not** pin the expected data directory or system identifier, so it is insufficient by itself to authorize provisioning. Do not execute any database command or provision unless those identity values are independently verified. If any value differs, or the named target unexpectedly exists, stop for Owner approval. Do not run provisioning, migration, fixture, cleanup, recovery-bypass, reset, configuration-edit, or PID-removal helpers as part of diagnosis.

## Evidence boundary

No production source, database contents, cluster files, configuration, credentials, authentication state, or prototype captures were changed. The 28 approved prototype reference captures remain reference evidence only. The 19 known full-web baseline failures and existing Dashboard errors remain as previously reported. Both MW-I02 acceptance gates remain BLOCKED pending exact-target availability, authenticated application acceptance, actual-versus-prototype comparison, and Owner review. MW-I03 remains excluded.

Read-only evidence reviewed: root-host listener/PID/service inventory, `pg_ctl status`, `pg_controldata`, the retained postmaster options and PostgreSQL log, and the historical MW-I01 manifest identity. Context interpretation and diagnosis used GPT-6.1 Sol; bounded evidence review used GPT-6 Luna. No database or application service was started.
