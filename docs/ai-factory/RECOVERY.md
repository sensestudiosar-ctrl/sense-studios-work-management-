# Factory Recovery & Checkpoint Runbook

This local CLI stores durable execution progress. It does not schedule runs,
contact a service, modify the application database, or authorize external actions.
Scheduling and actual provider usage-limit recovery remain unactivated/unverified.

## Durable local records

`docs/ai-factory/checkpoints/<task>.json` contains task state, completed operations,
remaining work, source revision, history and the current worker lease. These live
execution records are local and ignored by Git; preserve them in private backups.
Source code and the record format are versioned. Set `FACTORY_CHECKPOINT_STORE`
only when selecting another local store, such as an isolated test fixture.

Use Node 24.19.0. Give every worker a unique, stable `FACTORY_WORKER_ID` and reuse
it across that worker's separate CLI invocations. `init`, `status` and `list`
need no worker identity. Lease/task mutations require it. Worker IDs identify
cooperating local workers; they are not an authentication or security boundary.

JSON remains the durable format. A per-task local SQLite transaction, using
Node's built-in `node:sqlite`, serializes each complete read/change/write across
processes. The SQLite file contains no application data and its OS lock is
released if a process exits. JSON replacement writes and flushes a temporary
file before renaming it over the previous record, so readers see whole records.
Case/symlink aliases of the store share the same mutex. Normal local filesystem
and OS locking behavior is required; remote/network filesystems are not verified.

## Ownership and state

```
QUEUED → RUNNING → CHECKPOINTED → PAUSED → RECOVERABLE
        → RESUMING → RUNNING → VERIFIED → AWAITING_APPROVAL → COMPLETED
```

`BLOCKED` and `FAILED` release the logical lease. Failed work may be explicitly
re-queued; `COMPLETED` is terminal. Each transition has a timestamp/execution ID.
A matching live lease is required for checkpoint, release, pause and mark.
Unowned queued initialization and failed re-queuing are allowed. `lock` explicitly
acquires unowned work. Same-owner duplicate start/resume of running/checkpointed
work is a no-op; another worker or omitted identity is rejected without a write.
A paused worker keeps its lease until release, expiry or a terminal transition.

Expired leases require `steal --justification "reason"`, even for their previous
owner. Takeover records the previous owner and justification. Live leases cannot
be stolen. Lease renewal retains the stable owner and configured TTL. Invalid
lease metadata fails closed for inspection.

## Recovery procedure

1. Inspect `node scripts/factory/checkpoint.mjs list` and the task's `status`.
2. Skip completed work. Respect a live lease held by another worker.
3. For an expired lease, set a stable worker ID and explicitly steal with a reason.
4. Confirm the checkout/branch/source revision before continuing work.
5. Use `resume` for paused/recoverable work; use `lock` for explicitly released
   work before checkpointing it. Revalidate previous verification evidence.
6. Record completed/remaining operations at each safe boundary. Release the lease
   when handing off work; terminal/blocking transitions release it automatically.

Completed-operation names are trimmed and deduplicated. This local record does
not provide exactly-once external side effects: check the authoritative service
before retrying PRs, comments or issues, and reconcile uncertain outcomes. Never
record an external action as completed before it has actually been confirmed.
Owner authorization and application safety rules still govern every action.

## Verification correction — 2026-10-27

The original 14-assertion self-test did not launch a second trigger, so its earlier
claims of duplicate-worker protection were unsupported. The replacement suite
uses separate subprocesses and isolated stores under ignored `.env.factory-tests`;
it never initializes or removes real execution records.

Run either `node --test scripts/factory/checkpoint.test.mjs` or
`node scripts/factory/checkpoint.mjs self-test`. The suite exercises concurrent
initialization/start winners, concurrent checkpoint preservation, wrong/missing
ownership rejection, same-owner duplicates, explicit expired takeover, legal
recovery and terminal transitions, explicit acquisition after release, and invalid
paths/TTLs. This verifies the bounded local mechanism. Actual scheduling, provider
limit recovery, external side-effect replay and production operation are unverified.
