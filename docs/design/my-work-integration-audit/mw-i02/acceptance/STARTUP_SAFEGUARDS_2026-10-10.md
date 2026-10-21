# MW-I02 controlled PostgreSQL startup safeguards — 10 October 2026

## Decision and current state

The proposed source is the normal PostgreSQL 18.6 cluster at:

`D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`

Its system identifier is `7693570241708228348`. Read-only inspection found retained PID `27316` has no live process, `pg_ctl status` reports no server, port `57434` has no listener, and no new server log was created. Observed PostgreSQL processes belong to separate Windows services rooted at `C:/Program Files/PostgreSQL/16/data` and `C:/Program Files/PostgreSQL/18/data`; their service ancestry does not identify them as this source cluster. The source has an ordinary `pg_wal` directory and empty `pg_tblspc`; inventory recorded 4,673 files / 120,778,450 bytes and zero reparse points. Free space on D: was 404,347,809,792 bytes. These facts do not constitute a backup.

No suitable existing physical cluster backup matching the source identity was found. Single-database dumps, migration fixtures, and the S01 rehearsal do not preserve this whole cluster. The proposed destination below was absent at inspection time:

`D:/app/sensestudios work management app/.env.checkpoint-tools/mw-i02-pg-recovery-copy-20261010`

The Owner's earlier conditional one-start allowance is not currently usable: its required backup prerequisite is unmet. A separate explicit Owner approval is required before creating the recovery copy. Until that approval is recorded, perform no startup, database connection, copy, restore, database creation, or source mutation. The one-start attempt remains unused.

## Conditions for a separately approved copy

If the Owner approves, create a complete cold filesystem recovery copy of the exact source while PostgreSQL is stopped. The destination must be the absolute path above, must not exist before the operation, and must never be overwritten. Include all cluster files, including WAL, global metadata, roles, configuration, and any referenced storage. Do not alter or remove the source PID file. Do not start the copied cluster, restore it, create a database in it, or claim restore testing.

Before copying, recheck that the exact source has no owning PostgreSQL process, no listener on the intended port, and the expected system identifier. Record source file hashes, sizes, and modification times. During and after copying, recheck ownership and file metadata; stop if any source file changes, or if any identity, metadata, or copy verification differs. Produce a manifest with relative paths, file sizes, and SHA-256 hashes, plus file and byte totals. Verify full source/copy identity, PostgreSQL version, system identifier, reparse-point absence, and that WAL and tablespace paths are contained in the copied tree. Stop and report any missing, extra, changing, unreadable, or externally referenced files. Keep the copy local and ignored because it contains private database contents; never publish its data or logs.

After Owner-approved copy creation, successful Sol verification, and fresh prerequisite checks, the Owner's existing conditional authorization permits one startup of the original cluster; no additional startup approval is required. Keep the recovery copy untouched. Before startup, repeat the source ownership/listener/system-identifier preflight and use only the existing reviewed startup and harness/authentication flow. After startup, independently verify the live data directory, system identifier, loopback address and port, then confirm the exact MW-I02 disposable database is absent before provisioning. Do not use the recovery copy for testing. Any mismatch, failed copy verification, unexpected existing target or failed startup stops work; do not retry startup without Owner direction.

## Risk and acceptance boundary

An ordinary PostgreSQL startup can replay WAL and change physical cluster files. Without a verified cold copy, no rollback or recovery point for the retained cluster is established. A successful copy is preservation evidence, not a restore rehearsal, and does not close production backup, offsite, key-custody, or restore gates.

No implementation source, tests, prototype, MW-I01 baseline, or the 28 accepted MW-I02 prototype captures were changed by this documentation update. Functional Reliability and Prototype Visual Fidelity remain BLOCKED; MW-I03 remains excluded.
