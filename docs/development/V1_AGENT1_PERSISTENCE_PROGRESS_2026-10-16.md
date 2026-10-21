# Agent 1 — real persistence and committed races

Date:16October2026. **Bounded persistence acceptance PASSED; Agent1/V1 delivery IN PROGRESS.** The previous goal turn made source/test progress. The goal resumed ACTIVE this turn after its usage-limited checkpoint. Current source inspection found only a separate navigation-test change since the final Project snapshot; no retained acceptance was inherited.

## Explicit authorization and exact target

The Owner selected **“Approve isolated database tests”** for the concrete harness in `V1_AGENT1_LOCAL_ACCEPTANCE_2026-10-16.md`. It authorizes one new PostgreSQL18.6 cluster under `.artifacts/v1/20261016-agent1-local/postgres/data`, only127.0.0.1:59749, fresh database `sense_v1_agent1_20261016_test`, source migrations1–119, task/receipt/race tests, and stopping only that cluster while preserving its data. This is separate from the earlier source-only task receipt approval. No retained/production target, stopped MW-I02 or existing S27 operator/guard was reused or changed.

Read-only preflight verified installed18.6 binaries, absent target path and free port.15pure target-guard tests, API typecheck and scoped lint passed before approval. A negative unapproved prepare returned1 and created no target. Docker was unavailable and was not started.

The new operator records source names/checksums, real directory, PostgreSQL address/port/major, cluster system ID, database OID/owner and random marker. It refuses an existing prepare target, path escape/reparse point, wrong/incomplete identity, missing explicit approval, migration/source drift and stopped-target implicit restart. A source-only repin requires an explicitly inspected hash and identical applied migration checksums; prior source/diffs are preserved. The dedicated acceptance spec is excluded from normal unit/API discovery and fails closed without this exact approved manifest. No reset/drop/cleanup operation exists.

## Execution and investigation

The first initdb completed and PostgreSQL started. The initial Node operator then waited on `close` after pg_ctl had exited because a detached Windows child retained a pipe. Verified the same live server PID23000/data directory via read-only pg_ctl status and process inventory; stopped only the stalled Node operator14348. The launcher now waits on pg_ctl's exit for detached start only. Recovery continued the same running cluster, with no restart/reinitialization. PostgreSQL's inet text included `/32`; using SQL `host(inet_server_addr())` corrects representation while retaining exact127.0.0.1 validation. Both narrow operator corrections and old source are preserved; no migration changed.

All119migrations applied successfully to this fresh database and every ordered name/checksum matched the pinned source. System ID**7697121645562786612**, database OID**16388**, owner`agent1_v1_20261016`. Random test credentials remain in ignored private state; logs redact connection URLs/passwords. No application credential or real staff record is used.

First committed run:5passed/4failed. The project fixtures tried raw Project creation without canonical state evidence; SQL correctly rejected them. Replaced fixture writes with ProjectService.create. Next5/4 run correctly refused a lead lacking project.manage; added the existing eligibility grant only to the synthetic lead. All9committed cases then passed. Transactional Task integration initially23passed/3failed for the same missing project.manage prerequisite in its subtask fixture; added that test-only grant. Product permissions/evidence guards and assertions/timeouts were unchanged. Failed-run reports/logs and each source-only repin remain preserved.

## Final real PostgreSQL evidence

On one unchanged final source pin, **9/9committed acceptance cases plus26/26transactional Task integration cases passed**, zero failed/pending/skipped. Operator test exited0 and verified source hash after both suites:

`1af47c7ab6326592f460eae18c2bded95f7b7fa358d59f8353454954e7fdf8b4` —603source files,119migration directories, according to `scripts/acceptance/v1-agent1-source.mjs` (this input set differs from older synthetic-browser fingerprints).

Committed cases prove: simultaneous identical requests produce one task/receipt/collaborator/history/event; a closed-transaction replay returns its canonical ID; concurrent changed payloads have one winner and one409; actor/organization isolation; rollback after receipt insertion removes partial task/evidence/receipt; SQL receipt update/delete denial; one child/link/parent increment across concurrent keyed retries; recovery after parent version advances; revoked project assignment blocks replay; parent completion waits for committed child then refuses unfinished work; project cancellation preserves receipt/identity and rejects new delivery creation.

The transactional suite also exercises real priority/collaborator/description count/page/order and scope isolation, stage-label search across revoke/restore, child/dependency completion/cycle rules, receipt conflict/rollback/immutability and existing task authorization/lifecycle cases. These are owning service calls on PostgreSQL, not browser-memory evidence.

The identity-checked stop exited0, manifest phase is**stopped**, data/logs preserved, and a host loopback probe confirmed**ECONNREFUSED** on59749. No restart is authorized implicitly by this report. Migration119 is now applied on this one new test target; it remains unapplied on retained previews/production.

## Current limits and next gates

Final API typecheck/scoped lint passed after fixture/operator corrections. Full unit suites ran sequentially: **API431passed/62suites**, no failures/pending; **web540passed/8failed**, no pending. The frontend failures are seven `app.test.tsx` authentication-shell cases (authentication request sequence, logout, revoked refresh, Owner bootstrap, invitation/recovery, loading/retry and device revocation) and one `navigation.test.tsx` empty/unavailable notification badge case. Reports/logs and exit codes are in `.artifacts/v1/20261016-agent1-preparation/{api-full,web-full,unit-exit-codes}.*`. A separate read-only current-source shell triage reproduced74passes/6failures in app.test.tsx. Earlier reports attributed these broadly to notification integration; current inspection also shows an independent header session probe plus tests with response queues/exact request indices. Their root cause and intended authentication behavior need the C/shared-shell owner's review; Agent1 did not modify those files or declare a product fix. No messaging authorization was inferred; the evidence is available in `.artifacts/v1/20261016-agent1-preparation/shell-triage.*`.

This is not full pnpm verify, all domain integration, authenticated browser/current-session acceptance, hosted CI, R-104/R-105, staff pilot or production readiness. Real review/correction/client approval/delivery workflow acceptance, remaining Project summary/context work, owned UI/recovery checks and current-candidate full gates remain explicit. No schema/production change beyond the approved isolated migration application, retained-data mutation, stopped acceptance retry, commit/push or deployment. Actual model routing: current Codex only; no independent final acceptance claimed.
