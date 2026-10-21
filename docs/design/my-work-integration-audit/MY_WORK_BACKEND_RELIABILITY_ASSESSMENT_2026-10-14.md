# My Work backend reliability assessment (2026-10-14)

Source-only assessment. No database, server, authenticated session or
`pnpm verify` was run. The sandbox used for this work has Node 22.23.2 and no
`pnpm`, against the pinned Node 24.19.0 / pnpm 11.19.0. Every finding below is
a source-level observation that must be re-confirmed on a real host.

## Verdict

**The My Work backend is correct today and is well-built. It is not yet built
for the data volume a real firm will produce.** There is one dominant scaling
problem and several smaller hardening gaps. Nothing here is a correctness bug
that would corrupt data or leak access — the permission model and the
transactional guarantees are genuinely solid.

---

## R1 — Unbounded in-memory projection and pagination (highest impact)

**Severity: high at scale. Low today.**

`MyWorkService.attention` (`apps/api/src/my-work.service.ts`) calls
`tasks.actionableInTransaction`, `reviews.actionableInTransaction` and
`approvals.actionableInTransaction`, concatenates all rows, deduplicates,
sorts in JavaScript, and only then slices:

```ts
items: unique.slice(query.offset, query.offset + query.limit)
```

The task source (`apps/api/src/task.service.ts` line 354,
`actionableInTransaction`) makes this concrete: it runs

```ts
const candidates = await tx.task.findMany({ where: { organizationId: ...,
  status: { notIn: [COMPLETED, STOPPED_DUE_TO_PROJECT_CANCELLATION] },
  OR: [...owner..., { requiresReassignment: true }] } ... });
```

with **no `take`**. It then, for *every* candidate row, performs a
`taskAccess` call, and for CLOSEOUT tasks an extra `taskCloseoutApproval`
lookup, and for reassignment candidates an `employee.findUnique` plus a
`managedEmployee` authorization check. That is a per-row query fan-out inside a
`RepeatableRead` transaction holding `FOR SHARE` locks.

**What this means concretely:**

- Every page request — including page 1 — loads and authorizes every
  unfinished task in the organization. 50 retained fixture tasks is fine.
  5,000 tasks across two years of projects is not: it is O(n) queries per
  request inside a lock-holding transaction.
- The whole projection runs inside `RepeatableRead` with a 30 s timeout, so the
  failure mode at scale is transaction timeout → `ServiceUnavailableException`
  → the whole My Work page fails, not just a slow page.
- `limit` is capped at 100, so a client asking for 100 rows pays the full
  O(n) cost to return 100 rows.

**Why the obvious fix is not simple:** the sort key is
`deadlineDay(row, timezone)` which, for `decision_expiry` rows, formats in the
*organization's* timezone using `Intl.DateTimeFormat`. That is not directly
expressible as a Prisma `orderBy`. Moving paging into SQL requires deciding how
to compute the organization-timezone day for expiry deadlines
(`AT TIME ZONE` in a raw expression, or a stored generated column), which is a
schema/query design decision. Per AGENTS.md § Model routing, that is Sol-level
work and it needs an Owner decision, not a Luna-sized edit.

**Recommended direction (needs Owner decision, not yet implemented):**

1. Push ordering and paging into SQL for the task source, which is the only
   source with meaningful volume. Keep review and approval sources in memory —
   they are small and bounded by the actor's own obligations.
2. Choose the timezone-day strategy for `decision_expiry` ordering.
3. Add a `take`/`skip` to `actionableInTransaction` so a single page never
   fans out over the whole organization.
4. Keep the existing in-memory path as an explicit small-result fallback, and
   keep the "no partial page" failure envelope unchanged.
5. Add index coverage for the new predicate/order combination.

**This is deliberately not implemented in this session.** It changes query
shape and possibly schema, both of which require Owner approval.

---

## R2 — Counts and rows are computed from different snapshots (medium)

`sourceCounts` is derived from the *same* in-memory `unique` array that the
page is sliced from, so counts are internally consistent — good. But the
counts are therefore also O(n) and also inside the same transaction, so they
inherit R1 entirely. Additionally, the four top cards (Overdue, Reviews,
Waiting) and the four personal-phase counts in
`apps/web/src/my-work-attention.tsx` each fire their **own** `/api/v1/tasks`
request with `limit=1`, so a single My Work page load issues at least eight
separate HTTP requests, each of which re-runs the O(n) projection. That is a
reliability problem independent of R1: any one of them failing produces a
partially-populated card row, which is exactly the "feels unreliable"
symptom.

The existing code handles this honestly — stale/denied/unavailable states per
card, and messaging that says the queue may not match the summary — but honest
degradation is still degradation. The D1 decision in
`MY_WORK_DEMO_PARITY_CONSOLIDATED_PLAN_2026-10-13.md` already settled "one
server-paged attention queue, independent source counts"; the card counts
should come from that composed response rather than eight extra round-trips.

---

## R3 — No idempotency key on mutations (medium)

The `my-work` controller is read-only (`GET attention` only), so this is not a
My Work defect — but it matters for the actions the My Work drawer exposes,
which live in `task.controller.ts`, `review.controller.ts` and
`approvals.controller.ts`. A double-submitted status transition or review
submission on a flaky mobile connection will be applied twice unless those
controllers accept an idempotency key. Worth auditing before field use on
phones, which is exactly where Sense Studios staff will use this.

**Not assessed here** — I did not read those controllers in this session.

---

## R4 — No optimistic concurrency visible on the My Work surface (medium)

`Task.version` exists on the model and the web `Task` type carries it, and the
task detail payload returns it. Whether the mutation endpoints actually
*enforce* it (reject a transition against a stale version) was not verified in
this session. If they do not, two people editing the same task from My Work and
Tasks will silently overwrite each other. This should be confirmed on a real
host with a concurrency test.

---

## R5 — Error envelope is honest but coarse (low)

`MyWorkService.attention` collapses every non-401/403/404 error into
`ServiceUnavailableException("My Work sources are unavailable; no complete page
or count was published")`. That is the right call for data integrity — it never
publishes a partial queue — but it means a single slow review source takes down
the entire page. A per-source status (the same
ready/stale/denied/unavailable pattern the frontend already models) would let
the queue render what it could and say so. That is a design change to the
response contract and needs an Owner decision.

---

## R6 — Query schema gaps (low, worth fixing)

`attentionQuerySchema` in `my-work.controller.ts` is otherwise strict and
well-built. Two observations:

- `limit` allows `1..100` and `offset` allows `0..100_000`. An `offset` of
  100,000 combined with an in-memory slice is the worst case of R1.
- `q` is capped at 160 characters and trimmed, which is good. `projectId`,
  `ownerEmployeeId` and `planItemId` are validated as UUIDs, which is good.
- There is no explicit cap on the *combination* of filters, but each is
  individually validated, so this is acceptable.

---

## What is already strong (do not regress)

- Single `RepeatableRead` transaction with `FOR SHARE` on canonical reads and
  no domain write.
- Actor re-validation inside the transaction; OWNER `ownerReady` gate.
- Strict Zod schema with a `dateFrom <= dateTo` refinement and a `dateBasis`
  requirement.
- Deterministic, timezone-aware ordering.
- Deduplication across sources by `source:sourceId`.
- The "never publish a partial page" failure contract.
- A frontend consumer that validates the page shape and independently derives
  counts before rendering.
- Per-source counts reported as `ready` or `excluded`, never fabricated.

---

## Recommended next actions

1. **Owner decision:** approve R1 as a Sol-level slice (SQL paging for the task
   source + a timezone-day strategy + indexes), scoped separately from UI work.
2. **Owner decision:** approve collapsing the eight per-card count requests
   into the composed response (R2), or accept the current honest-degradation
   behaviour.
3. **Verify on a real host:** idempotency and optimistic-concurrency behaviour
   on the task/review/approval mutation endpoints (R3, R4).
4. **Then** run the prepared fifteen real-PostgreSQL cases and the one browser
   journey recorded in CURRENT_STATE.md, and fresh four-width authenticated
   captures.

Until those run, MW-I02 remains IN PROGRESS and no reliability claim for this
slice should be treated as verified.
