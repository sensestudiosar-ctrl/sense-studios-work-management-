# MW-I02: preserve preview, use separate acceptance ports

14 October 2026. **Preparation only; execution requires fresh Owner approval.**

The Owner chose to keep the preview. The proposed acceptance pair is API `127.0.0.1:59542` and web `localhost:59543`. The existing preview at 59442/59443, every retained database and its accounts, tasks, passkeys and processes are excluded from changes.

## Read-only preparation evidence

At 05:30 UTC, Windows reported zero listeners on 59542/59543, and neither port was in IPv4 or IPv6 excluded ranges. PostgreSQL 45434 and preview 59442/59443 had listeners. This is timestamped preparation evidence, not a live safety clearance. Evidence: `.env.checkpoint-tools/mw-findings-separate-ports-readonly-20261014.json`.

Active setup, native preflight, browser config, browser runner, manifest binding, API disposable-target guard and parity integration configuration now consistently require 59542/59543. Historical run manifests/scripts retain their original values. Explicit negative tests reject the retained ports and URLs; occupied API or web ports stop native preflight. The common preflight rechecks all three required ports against IPv4/IPv6 exclusions before either server-state branch.

Passing source results and the exact candidate fingerprint are recorded in `mw-i02/acceptance/evidence/findings-resolution-20261013/candidate-source.json` and `source-readiness.json`. Do not execute against a stale or failed candidate. Raw source and migration inputs recorded before checks must still match at freeze, and component evidence must match current bytes.

## One combined authorization

Use the existing Windows user at Medium Mandatory Level, pinned Node 24.19.0/pnpm 11.19.0, PostgreSQL 18 at `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`, expected system `7693570241708228348`, endpoint `127.0.0.1:45434`.

1. Repeat source, runtime, process/service ancestry, PID, directory, disk/live identity, listener/exclusion and exact-target absence guards. Stop on unavailable, contradictory or ambiguous evidence. Acceptance ports must be free; never replace preview processes or choose fallback ports.
2. If the exact cluster is running, verify it and leave it running. If safely stopped, allow **one** ordinary `pg_ctl` startup only after no-owner/stale-PID safety and recovery-copy hash `87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007` pass. No retry, repair, reset, WAL/PID manipulation or unrelated-service action. Independently verify readiness and live identity before setup.
3. Create only absent `sense_mw_i02_validation_20261009_test`, once, with 118 checksum-bound migrations and reviewed synthetic fixtures. Bind the actual fresh approval text, time, source hash and generated run ID to the manifest. Launch only this run's API59542/web59543.
4. Run task integration, then the existing full authenticated Playwright journey once after task prerequisites pass. Capture Owner, Team Leader, Designer initial/Waiting/attention and Site Employee at 1440×900, 1024×900, 390×844 and 320×740. Verify five genuine exit reassignments, isolation, commands/views, mobile controls and actual queue/task/navigation geometry.
5. Run independent Review integration whenever identity and environment remain safe, including after browser failure. Run the 15 prepared parity persistence cases when their run-owned prerequisites exist. Additional bounds: 15 projects/branches/teams, 60 staff, 225 scoped overrides, 200 tasks, two presentation roles, one synthetic client/session/credential and one PDF in the guarded run NAS tree. Client cryptographic transport substitution stays explicitly labeled; no real client authentication claim.
6. Compare fresh actual captures with the exact approved demo hash `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. Separate MW-I02 defects, backend differences, shared-shell work and future slices. Synthetic component captures are supplementary only.
7. Attempt exact-manifest cleanup on every outcome when guards pass: revoke run sessions, stop only run-owned API/web, verify OID/marker/server/connections/catalog, remove the run NAS artifacts and drop only this run's database. Confirm all other catalog entries are preserved. Stop without unsafe deletion if any guard fails.
8. Restore PostgreSQL to stopped only if this run started it, cleanup/identity pass and no unowned connections remain. Otherwise leave it running and report any blocked restoration. Never stop the cluster supporting an already-running preview.

The exact pinned commands and guarded ordering remain in [the detailed candidate plan](MY_WORK_PARITY_CANDIDATE_ACCEPTANCE_PLAN_2026-10-13.md); its PowerShell blocks are parser-checked. This document changes the port decision, not the accepted database harness or application workflows.

## Boundaries and risks

No automatic retry, alternative target, production access, preview migration/reseed, credential automation for the real Owner, application change during acceptance, persistent elevation or security-policy change. Risk is limited to ordinary dedicated-cluster recovery if required, disposable synthetic writes and owned acceptance processes. Concurrent source changes stop readiness; unrelated catalog changes stop cleanup. Do not claim offline tests establish live cluster safety.

Report Functional Reliability and Prototype Visual Fidelity independently. Preserve prior accepted functional evidence and all failed preparation logs. MW-I02 remains IN PROGRESS; stop for Owner acceptance and do not begin MW-I03.
