# Agent 1 — isolated Windows persistence acceptance

Status: **OWNER APPROVED FOR THE EXACT ISOLATED TARGET; ACCEPTANCE IN PROGRESS.** On16October the Owner selected “Approve isolated database tests” for the explicitly named cluster/path/port/database, migrations1–119, task/receipt/race tests and stopping only this cluster while retaining its data. This bounded decision supersedes the earlier lifecycle-pending state for this target only. It does not renew stopped MW-I02 or authorize migration119 on retained previews/production. The earlier task receipt decision covered source preparation; this is the separate database-lifecycle authorization.

## Exact proposed target

- PostgreSQL18.6 installed binaries at `C:/Program Files/PostgreSQL/18/bin` (version read in this session). Docker's engine is unavailable; no Docker service was started.
- New cluster only: `D:/app/sensestudios work management app/.artifacts/v1/20261016-agent1-local/postgres/data`.
- Listen only on127.0.0.1:59749. No existing listener/cluster is stopped, restarted, attached, copied or modified.
- Fresh database `sense_v1_agent1_20261016_test` and cluster-local bootstrap role `agent1_v1_20261016`, with a generated random test password in the ignored private state. Never reuse application credentials. This role is local to this cluster; no production role policy is claimed.
- Apply the current119 reviewed source migrations to that fresh database only, pinning names/checksums before execution and verifying every applied checksum afterward. Migrations118 and earlier source/retained databases are preserved.
- Record system identifier, real data path, address/port, PostgreSQL major, database OID/owner and a random database comment marker. Tests recheck the exact identity and source pin before opening domain fixtures. Fail on unexpected pre-existing paths/targets, missing approval, path escape/symlink, source drift or identity mismatch.

## Commands and safeguards

The new acceptance operator exposes inspect (read-only), prepare (new target only), test (owning services on the exact target), and stop (only its identity-verified cluster). There is no drop/reset/remove command. Failed setup preserves logs/artifacts for investigation. A repeated prepare must refuse an existing cluster, rather than reinitializing it. A stopped target may only be inspected; no implicit restart.

After bounded source/test corrections, repin requires the explicit inspected current hash, the unchanged applied119migration checksums and the same live target identity. It records the prior source and exact changed/removed paths before updating the source manifest; it performs no database writes. This is not automatic source-drift acceptance and cannot repin a changed migration. The stopped MW-I02 policy remains separate and unchanged.

Preparing/running requires an explicit Owner approval for this target and its generated operator manifest. A custom approval switch/manifest is an execution guard, not a substitute for that human authorization. No `GITHUB_ACTIONS` or S27 flag is fabricated. Existing CI, S27, stopped MW-I02 and exact118 operators/guards remain unchanged.

The dedicated `.acceptance.spec.ts` suite is excluded from the ordinary unit/integration discovery and is invoked explicitly by this operator. It commits synthetic records and preserves append-only evidence on this disposable target. Existing transactional Task integration cases may be invoked separately against the same exact target after identity verification. No fixture identities or data are imported into the application preview/pilot.

## Required evidence

First prove the preflight/operator safety guards without database writes. After approval, verify migration119 constraints/triggers and normal task receipt, child link/history/event persistence. Use independent committed transactions for concurrent identical keys, different payloads, a child replay after parent version changes, child creation versus parent completion/cancellation and permission revocation. Verify rejected operations leave no receipts/partial evidence; current unauthorized callers cannot recover private results. Query counts/pages/order/search must reflect the same real authorized records. Keep ordinary templates/project lifecycle commands and source-qualified review/approval identities intact.

Record exact source pin, versions, commands, results and limitations. A focused database pass is not full pnpm verify, authenticated browser, hosted CI, R-104/R-105, staff-pilot host/backup/restore or production acceptance. Retained previews remain migration118 until separately approved deployment work.
