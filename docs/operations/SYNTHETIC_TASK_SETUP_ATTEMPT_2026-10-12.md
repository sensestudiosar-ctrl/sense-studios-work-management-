# Synthetic task setup attempt — 12 October 2026

**STOPPED before preservation backup or application writes. Task creation remains pending.**

Owner approved SYNTHETIC_TASK_SETUP_PLAN_2026-10-12.md. Its stop-on-unexpected-result/no-automatic-retry condition was respected. No PostgreSQL startup/restart, database creation, migration, credential/account/organization/task change, backup, restore or authenticated acceptance run occurred.

## Read-only host evidence

- Windows Medium Mandatory Level (`S-1-16-8192`), Node24.19.0 and pnpm11.19.0.
- `pg_ctl status` reported the existing retained PostgreSQL18 server running at PID26252 with the approved directory and `-h 127.0.0.1 -p 45434`. Process executable was installed PostgreSQL18 postgres.exe; owner was the existing Windows user.
- PostgreSQL listener127.0.0.1:45434 belonged to PID26252; postmaster.pid matched PID/directory/address/port/ready.
- API PID16860 and web PID3260 matched retained manifests, pinned Node executable and expected commands. Web listener127.0.0.1:59223 and existing API listener0.0.0.0:59224 belonged to those PIDs. No binding changed.
- Unrelated PostgreSQL service processes had unavailable command/executable metadata; they were not modified or assumed to be the dedicated cluster.

These observations do not substitute for the complete successful preflight and backup required before writes.

## Failure and source correction

The new local preservation helper queried `accounts` with `WHERE lower(email)=$1`. PostgreSQL returned SQLSTATE42703, `column "email" does not exist`, at task-setup-preservation.mjs line52. Account schema uses `normalizedEmail`. This was my operator-side query error, not a demonstrated application/schema defect. The read-only transaction connection closed; no setup mutation followed.

Corrected expression:

```sql
SELECT COUNT(*)::int AS count FROM accounts WHERE "normalizedEmail"=$1
```

The helper now also writes exclusive `backup-attempt.json` before pg_dump. A failed backup cannot be retried in that directory even if no archive was produced. No marker was created by this stopped attempt.

Pinned Node `--check` passes. Independent GPT-6.1 Sol source review confirmed all application table/column references against schema.prisma and the exclusive backup marker. Credential hashes exclude normal mutable authentication counters/last-use timestamps; recovery configuration remains hashed. These are source/syntax checks only: corrected preflight, PostgreSQL metadata availability and backup have **not** been rerun live.

## Continuation boundary

A new bounded continuation decision is required to repeat the complete exact-target/process/empty-baseline/Owner/invitation checks. Require a verified private preservation archive before any write. Continue the same named record set with genuine human passkey enrollment. Stop on any unexpected result and report partial commitments; no automatic retry, target substitution, restore or deletion.

No frontend/backend/schema/permission changes. Prior frontend tests and accepted MW-I02 functional evidence remain preserved. MW-I02 IN PROGRESS; MW-I03 excluded. GPT-6.1 Sol provided read-only context/source review.
