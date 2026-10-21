# Latest test server with saved login/data

Prepared scope, authorization pending. Owner explicitly corrected the historical restoration: both backend and UI must be the latest, while retaining saved accounts/tasks. The historical server remains available at localhost59443 until the replacement passes preparation and is explicitly authorized. Do not migrate the original115 database or present the historical build as the latest app.

Concrete operator prepared: `.env.checkpoint-tools/latest-retained-launch.mjs`. Source-only `--check`, Node syntax and current API AppModule import pass. Invalid stage and unapproved `--execute` reject before any run-directory mutation/database import or process action. Independent GPT-6.1 Sol review identified and resolved clean-template, database-marker and original-environment bindings. Source/build/operator hashes are recorded privately in `.env.checkpoint-tools/latest-retained-readiness.json`; approval must match all three. No copy, migration, old-service stop or latest-server launch has occurred under this proposal.

After explicit approval, record only the actual Owner instruction, scope `copy-saved-preview118-current59443`, approval time and the reviewed source/build/operator hashes in private `.env.checkpoint-tools/latest-retained-approval.json`, then invoke the operator once with `--execute`. It contains the full guarded sequence rather than relying on manual substitutions of target URLs. Explicit template0, exclusive run directory, source snapshot, per-table retained-column hashes, NAS isolation, target OID/owner/server/comment marker and exact old/new process/listener identities are enforced. Every failed stage stops without automatic retry or deletion.

## Exact bounded replacement

- Existing PostgreSQL18.6 loopback127.0.0.1:45434, system7693570241708228348, retained `.env.checkpoint-tools/pg-demo-20261006-a7c9`. No cluster startup/restart/repair or global configuration change.
- Original source: `sense_local_preview_20261008_1791474390772_test`, OID32768,115 migrations; preserve it and its NAS files.
- One absent new target: `sense_latest_retained_20261014_test`. Never reuse/drop/reset an existing target. Fresh empty118 acceptance database remains untouched.
- Local custom-format pg_dump/pg_restore, preserving complete ordinary account/passkey/session/task data and database ACLs. Copy existing NAS into new `.env.checkpoint-tools/latest-retained-20261014/nas`, preserving the old directory. No automatic login, invitation, bootstrap, credential reset, test-user creation or fixture reseed.
- Apply reviewed migration116 S27 privilege repair,117 optional role presentation,118 subtask links only to the new target. Current source/build/operator hashes and118 directory inventory must match immediately before mutation. Global existing role identities must not change; grants on new database objects may be restored/repaired as specified by migrations.
- Latest compiled API `apps/api/dist/main.js` and current `apps/web` source at ports59442/59443. Stop only exact restored API8616 and web33072 after verifying recorded creation/executable/command/owner/listeners; preserve the PostgreSQL process and all other services. Record new process identities/owned loopback listeners.

## Execution requirements and commands

Use pinned Node24.19.0/pnpm11.19.0 and PostgreSQL18 binaries, Windows Medium, sanitized environment, exclusive attempt marker and no retries. Store archive, logs, private environment and manifest beneath the new local run directory. Commands below are the reviewed bounded operations; run only after adapter guards and explicit approval, without shell interpolation of secrets:

```text
pg_dump.exe -h 127.0.0.1 -p 45434 -U sense_demo -w --format=custom --file=<exact new run>/retained.dump --dbname=sense_local_preview_20261008_1791474390772_test
createdb.exe -h 127.0.0.1 -p 45434 -U sense_demo -w sense_latest_retained_20261014_test
pg_restore.exe -h 127.0.0.1 -p 45434 -U sense_demo -w --exit-on-error --single-transaction --dbname=sense_latest_retained_20261014_test <exact new run>/retained.dump
pnpm --filter @sense/api db:migrate:deploy
node --import <new loopback hook> apps/api/dist/main.js
node <new current-source Vite wrapper>
```

Migration environment binds DATABASE_URL/MIGRATION_DATABASE_URL exclusively to the new target after live system/port/database/OID/marker proof. Reuse the reviewed original web origin as localhost59443 and original external-share configuration privately, with NAS pointing only at the new copy. No provider/email credentials or background worker launch. Bootstrap is disabled; saved Owner identity is retained.

## Preservation and availability gates

Stop the two owned historical application processes only after the plan is authorized and ready. Capture a coherent source snapshot, archive and per-table row counts/retained-column hashes; stop on unrelated source clients or unexpected writes. Compare restored snapshot before migration, then original columns after migration, excluding only newly introduced columns/tables. All accounts, passkeys and session rows must be retained unchanged at launch; old signed-in sessions may already have expired and ordinary reauthentication must still be possible. Verify original source remains115 and its fingerprints unchanged, no other catalog entry changes beyond the one new target, and NAS copy matches original file hashes. No source sessions may be terminated to permit cloning.

After migration, verify118 complete/no failed migration rows, current model/table/column availability and original six accounts/seven passkeys/five employees/50 tasks (or exact freshly verified authorized snapshot counts). Check application root, proxied readiness and correct latest asset/source identity at59443. A browser's old service worker may require a normal reload/update; do not clear its login storage or revoke sessions. Report actual latest-source visual and authenticated evidence separately from public availability.

If a restricted stage fails, stop without automatic retry or unsafe cleanup and retain evidence. No old database is ever dropped. A newly created incomplete target is retained with exact OID/marker for later separately reviewed cleanup. Final approval request: authorize one new saved-data copy migrated118 plus replacement of the two exact owned historical processes at59442/59443; all original data/credentials/old database remain preserved.
