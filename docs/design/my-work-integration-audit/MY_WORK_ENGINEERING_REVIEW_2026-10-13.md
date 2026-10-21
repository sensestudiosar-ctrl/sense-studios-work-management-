# My Work engineering review — consistency decision

Date: 13 October 2026
Target: MY_WORK_DEMO_PARITY_CONSOLIDATED_PLAN_2026-10-13.md, revision1.2.
Status: PLAN REVIEW COMPLETE. Owner selected E1A; architecture, code quality, tests and performance sections evaluated. No unresolved decision for this bounded plan. This does not accept concurrent application source.
Model: GPT-6.1 Sol source intake/review. No application edits, tests, DB or host operations.

## Scope

Review the exact consolidated plan named by this conversation. Owner selected HOLD SCOPE and approved D2 mixed queue, D3 source-scoped task filters and D4 contrast exception. Do not reduce those choices or reopen three previously approved bounded source scopes.

The overall work is large because it composes several existing domains. T1–T8 stage it; the plan avoids a replacement Task model, persistent WorkItem store, extra permission engine and a new pagination secret/token service.

## Architecture — E1

[P1 planning gap] confidence9/10.

Motivating source:
- approval.service.ts:153: return this.database.prisma.$transaction(async tx => {
- approval.service.ts:158: const readAt = new Date();
- approval.service.ts:182: RepeatableRead transaction options.
- review.service.ts:158: return this.db.$transaction(async tx => {
- review.service.ts:159: const account = await this.account(tx, actor), readAt = new Date();
- review.service.ts:186: RepeatableRead transaction options.

Each current public read is individually consistent; they do not establish a common snapshot for a composed response. A task can change between source reads, causing counts and the ordered union to describe different moments. This is a missing plan boundary, not a demonstrated runtime application defect.

### E1A — Composer-owned snapshot (selected by Owner)

```text
validated active actor/query
          |
  one RepeatableRead transaction + readAt/calendar
          |
  tx-aware TSK / REV / APR policy reads
          |
  same eligible set -> source counts -> order -> page
```

Reuse domain evaluators; public source endpoints retain thin own-transaction wrappers. The composer does not gain write/permission authority. Unexpected DB failure ends that response; visible mixed unavailable/stale recovery and independent known source information follow the settled plan.

EffortM: refactor existing read methods into transaction-aware ports and add concurrent-change tests. Risk: long-running eligibility under one transaction; measure query/pool/memory cost.

### E1B — Independent reads with verified consistency

Read through independent ports, validate a reliable complete source-version boundary before publication and refuse the mixed result when it cannot be established. A timestamp alone is insufficient. Needs real watermark/version semantics over every record/policy involved; no unbounded retry.

EffortM–L: additional consistency contracts and race cases. Risk: validation gaps or frequent unavailable results.

Both satisfy truthful count/page requirements if implemented correctly. These alternatives differ in method, not product coverage. Owner selected E1A in this chat; E1B is retained as rejected alternative reasoning. All clock-sensitive eligibility uses the supplied readAt rather than separately captured source clocks.

## Recalibrated observations

1. **No new cursor-security finding.** Owner required server paging, not a cursor. Initial bounded offset/limit fits existing ports. Cursor manipulation with full reauthorization was not demonstrated as an access vulnerability. The candidate now avoids unnecessary signing secrets/server token storage.
2. **No missing child-reopen guard claim.** The current migration already checks OLD.status=COMPLETED and NEW.status<>COMPLETED, locks parent rows and rejects leaving completion when a parent is complete (migration lines95–101). Required regression/concurrency proof remains pending.
3. **One subtask representation.** TaskSubtaskLink preserves old rows/serializers and audit context. Reconcile documentation, do not add a duplicate nullable parent field. Existing source is unverified; this is not schema acceptance.
4. **No exhausted scan reported as exact.** Counts need the complete authorized set. Offset does not limit eligibility cost. Explicit unavailable/incomplete is required instead of cap-as-zero.

## Code-quality review

Evaluated; no unresolved finding. Domain-owned evaluator -> typed source summary -> shared query normalization -> one order/paging function -> compatible UI adapter. Keep action descriptors/source-qualified keys, exact round/request IDs, singular canonical Create handling and query/session-generation guards. No copied permission/count logic or catch-all empty results. This is a reviewed plan requirement, not a claim current source passes it.

## Test review and coverage map

```text
actor/query/page validation [unit/API]
    -> source eligibility/authority [unit + real PG]
    -> response consistency E1 [real PG concurrent edit]
    -> task dedup/source counts/order/page [unit + PG multipage]
    -> D3 filter/source state [Vitest + Playwright]
    -> exact destination/action [authenticated regression]

profile fallback/configuration -> canonical Create/capacity [unit/API/browser]
child link/access/audit -> all completion paths/SQL [PG]
                        -> insert/complete/reopen/cycle races [PG]
```

Evaluated; no unresolved test-scope decision. Tester-facing artifact: MY_WORK_PARITY_TEST_PLAN_2026-10-13.md. Planned coverage is not measured passing coverage. It explicitly includes one shared response transaction/readAt, strict offset/limit, all completion paths, raw SQL, completed-child reopening, session races and original-task-bound capacity rescue requiring manual resubmission.

## Performance and rollout review

Evaluated; no unresolved performance architecture decision. Measure complete approval policy scans, review evidence checks and global evaluation/counting. Verify query count, memory, transaction duration and pool occupancy. No frontend full-result fetch, per-row detail query, cross-user protected cache or speculative infrastructure. No latency/load result is claimed.

Freeze source hashes and actual migration list before checks. Source snapshot118 versus retained preview115 is not deployment. Approved dedicated migration/persistence run, all-path concurrency/security and authenticated geometry are separate gates. Rollback keeps child links/triggers/data and compatible blocker reporting.

## GSTACK REVIEW REPORT

| Section | Status |
| --- | --- |
| Scope | Owner HOLD SCOPE retained |
| Architecture | E1 shared snapshot selected; complete candidate/count/order/page boundary planned |
| Code quality | Evaluated; one domain evaluator/creation handler/child representation |
| Tests | Coverage diagram/checklist evaluated; execution remains pending |
| Performance | Complete-evaluation measurement/failure plan evaluated; no measurements |
| Application acceptance | Not performed |

VERDICT: engineering PLAN PASS after E1 selection and technical clarifications. No runtime or implementation acceptance. CEO/Refero and the engineering test plan are linked in the consolidated plan. Remaining migration, persistence, concurrency, current-source test/build and authenticated visual gates are execution requirements, not unanswered review choices.

NO UNRESOLVED DECISIONS

