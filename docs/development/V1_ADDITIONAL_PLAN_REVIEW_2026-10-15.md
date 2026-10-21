# Review of the additional “Working Version 1” plan

Date: 15 October 2026. Target: the Owner's pasted plan headed “Plan — Working Version 1”, supplied in `Pasted text.txt`. This is a source-grounded comparison with the approved requirements, recorded Owner decisions and the current V1 delivery work. It is not independent model acceptance or a completed application security audit.

**Recommendation: retain the useful checklist, but revise it before using it as an implementation contract.** It overlaps the active delivery plan, contains stale implementation/environment statements, and treats several new product choices as settled. Continue through [the main V1 delivery plan](V1_INTERNAL_PILOT_PLAN_2026-10-15.md), using this review to incorporate compatible refinements. Do not restart already implemented work or introduce a second People/task/permission system.

## What to retain

- Backend authorization remains authoritative; navigation is a presentation of current access.
- Reuse owning services, real persistence, reasoned/versioned writes and canonical workflows.
- Preserve unrelated work, retained data and the exact-source acceptance boundary.
- Improve search, explicit filters, bounded project rows, notification discovery and Settings navigation.
- Verify pagination/count agreement, responsive layouts and honest loading/error/denied states.
- Keep production deployment separate and preserve the stopped MW-I02 run boundary.

These are compatible with the existing V1 plan. A plan's “settled here” wording does not itself approve a new schema, access grant or workflow.

## Corrections required

| Priority | Plan location / finding | Evidence and required revision |
| --- | --- | --- |
| P0 | A: Staff directory and Roles tabs assume access to existing organization inventory. | `organization.controller.ts` protects `/org/employees`, `/org/branches`, `/org/teams` and `/org/roles` with its Owner guard. Staff currently has the additive session-bound `/org/self` and the independently authorized `/org/team/employees` reporting read. Preserve Owner directory + Staff self/permitted team. A broader Staff directory or role-permission inventory requires a separately bounded read/privacy decision; do not loosen the Owner endpoints. |
| P0 | C/D: presentation profiles are being used as authorization roles. | OWNER/STAFF are internal account kinds; EMPLOYEE/LEADER/SITE are server-resolved presentation variants. Actual assignment comes from current grants, reporting scope, project membership and resource state. A presentation hint must neither grant assignment nor erase a valid explicit grant. Reuse current resource capabilities and `GET /tasks/creation-options`; use form variants for layout/defaults. The session response does not currently issue the full job-role permission set described by `useCapabilities()`. |
| P0 | D3/F: backend saved views are declared settled while every slice forbids schema changes. | Current My Work already has account-scoped browser-local saved views, explicitly retained by the October 13 reviewed plan. No dedicated task saved-view persistence model/API was found in current source. Cross-device persistence is a new proposal requiring a reviewed storage contract/migration or an expressly suitable approved store. Preserve existing My Work views; do not move them exclusively to `/tasks` or pretend the new CRUD is schema-free. |
| P0 | Out of scope G11: real subtasks are described as absent/checklist-only. | Owner-approved one-level same-project subtasks already have source schema, migration, endpoints and completion guards. Current source has 118 migration directories, including `20261008020000_task_subtasks`. Keep and verify this work: independent child ownership/Target/workflow, ordinary access, and parent-completion races through ordinary/internal/client paths. Checklists remain a separate feature. Source presence is not final persistence acceptance. |
| P0 | Pilot completion is reduced to UI slices plus synthetic captures. | The selected outcome is an internal pilot with real staff. Retain the main plan's candidate, real persistence/security/concurrency, authenticated browser, onboarding, pilot host/file storage, backup/restore, recovery and actual staff gates. Production remains separate. Synthetic captures cannot establish authenticated access or R-104/R-105 operational acceptance. |
| P1 | D: client-supplied `creationVariant` is proposed as trusted audit context. | The current strict create body has no such property and rejects it. If audit provenance is useful, derive it on the server from current configuration; do not trust a client assertion or require a new stored Task field without a reviewed contract. It is not necessary to send this field to make the existing composer work. |
| P1 | D: capacity “after adding the estimate” is assumed to be an existing calculation. | `WorkforceService.assignmentWarning` checks existing dated allocations for overload; estimates do not automatically become dated allocations. Task create currently requires explicit overload acknowledgement when warned. Preserve that transaction check. Any numeric projected-capacity pre-check needs authorized inputs, dates, units, allocation/distribution rules and revalidation; do not invent a formula or replace acknowledgement with dismissing a UI warning. |
| P1 | D: active-site defaults and restricted type lists are declared without a source contract. | A SITE presentation variant does not identify one active site/project or authorize new task-type restrictions. Preselect an explicitly selected, currently accessible project/site context. For multiple/missing contexts, use honest selection/unavailable states. Retain supported task types and approved workflows. |
| P1 | E/D5: one predicate for every summary can blur Tasks, Reviews and Decisions. | Preserve the settled source-qualified mixed queue and separate counts. Task-only filters visibly select Tasks; Clear restores mixed work. A reviewer round is an obligation with its own identity, not merely an extra task filter. Share authorization/filter/clock/snapshot logic within each applicable source, then compose/order/page once; never sum source counts into “tasks”. Add a stable ID tie-breaker to any new priority/date sort. |
| P1 | B: Owner-only Integrations/Automation panels can accidentally remove legitimate Staff access. | Integration setup supports active internal Staff, while configuration is Owner-only. Automation supports scoped Staff `report.manage` and project `automation.manage`. Owner-only configuration summaries are fine, but preserve authorized Staff entry points and label view versus manage access. Do not hide all integrations/reports merely because the account is STAFF. |
| P1 | G: Projects polish omits the central working project journey. | Add canonical embedded Project Tasks/composer with fixed project context and a People section for lead/contributors. Preserve list/filter/page/Back context without task/project query collisions. Current lead/contributor writes remain Owner-only. Include setup → activation → work/review/correction → delivery gates, and Hold/cancellation/archive restrictions. Read projection alone does not make Projects complete. The current list API has branch/query/stage/sort/direction, not all the status/type/lead filters implied by the draft. |
| P1 | H: proposed “CSS only” work includes behavior changes and removes discovery paths. | Replacing actions with an overflow menu and adding expand/tap disclosure require accessible interaction code, focus/keyboard/touch tests and retained next-action access. Stacking cards may increase the very scroll distance the plan wants to reduce. Verify actual first-action geometry against the approved demo at four widths before choosing a layout. Do not promise zero scroll for every content length. |
| P1 | Current-state/environment and gate commands are stale for this host. | Current branch matches `codex/s20-site-integration`, but this host has Node24.19.0/pnpm11.19.0 and current source has118 migrations. People, focused Settings, permission metadata and shared ordinary/subtask fields already have source changes and dated evidence. The pasted184-change/115-migration/VM limitations are historical observations, not the current candidate. Package scripts are `test:unit` and `test:integration`; `pnpm --filter @sense/api test -- …` and the analogous web command are not defined. Re-establish target identity before any runtime/database action. |

References: [People/Settings source progress](V1_PEOPLE_SETTINGS_PROGRESS_2026-10-15.md), [shared composer source progress](V1_TASK_COMPOSER_PROGRESS_2026-10-15.md), [backend/demo contract](../v1-demo/BACKEND_CONTRACT.md), and [settled My Work parity plan](../design/my-work-integration-audit/MY_WORK_DEMO_PARITY_CONSOLIDATED_PLAN_2026-10-13.md). G01–G12 in the pasted plan also need an explicit originating document and approved requirement mapping; those short gap IDs are reused in repository reports.

## Treatment of the eight proposed slices

| Proposed slice | Incorporation into active V1 work |
| --- | --- |
| A People | V1-03 source already exists; finish current scope and its acceptance. Keep broader directory, exited-history and effective-access explanations explicit remaining work. Reuse the existing person editor rather than a second privileged editor. |
| B Settings summaries | Useful V1-04 refinement. Separate personal/scoped services from Owner configuration; reuse authorized projections and retain standalone deep links. Required settings recovery/Save/Cancel/recent-sign-in behavior remains ahead of cosmetic summaries. |
| C Access | Essential V1-01 audit and verification. Inventory current guards first, then fix reproduced gaps with negative tests. Navigation capability reads need loading/unavailable/revocation semantics and resource scope; adding checks blindly can break valid workflows. |
| D Task creation | Continue V1-05 using the shared composer and context choices now in source. Project embedding, ambiguous-response recovery/durable idempotency and real acceptance remain; retain existing review/Target/Committed/capacity rules. |
| E Filters/search | Bounded V1-06 improvements after approved query contracts. Define any/all semantics, option visibility, source behavior, stable ordering and count/page/drill-down consistency. Avoid making unsupported controls visible. |
| F Notifications/views | Exact delivered unread count is a useful bounded read proposal: bind recipient to session, no-store, hidden zero, unavailable distinct from zero, clear on actor change. Keep existing local saved views; cross-device storage remains a proposal. Register static task routes before `:id` if a future view API is approved. |
| G Projects | Continue V1-07, prioritizing canonical Tasks/People and working lifecycle before list polish. Bounded rows should avoid N+1 detail fetches and expose no inaccessible lead, milestone or participant data. |
| H Responsive UI | Apply throughout each vertical slice against the approved visual reference; final four-width verification remains required. Include keyboard/focus, long text, dirty forms and denied/stale/conflict states. |

## Revised execution and evidence

1. Keep the current V1-00 candidate/runtime/preservation boundary explicit. Complete source evidence without treating it as permission to repeat a stopped authenticated run.
2. Finish current People/Settings/shared-composer recovery gaps, then embed canonical Tasks and People in Projects. Run access review alongside each affected read/write; navigation gates follow authoritative capabilities.
3. Add compatible query/notification/Settings refinements in bounded contracts. Keep unapproved profile/storage/workflow expansions out of dependent code.
4. Integrate the Owner's returned shell/dashboard and tab demos against the backend contract. Do not replace the approved visual system with a new one during this review.
5. Validate the unchanged candidate through the supported disposable/dedicated database harness, authenticated four-width journeys and actual staff pilot gates. Preserve the separate operational R-104/R-105 and production results.

Test flow:

```text
actor/session + current grants + project/reporting context
   -> authorized option/list/detail read
   -> shared form with explicit context and preserved draft
   -> ordinary owning command reauthorizes under current state/locks
   -> task ID + history/event + actual persisted result
   -> same task in eligible My Work and Project views
   -> review/correction/child-completion rules

negative paths: wrong ID/branch, portal/inactive account, expired/revoked grant,
stale parent/version, changed project, overload acknowledgement, duplicate submit,
uncertain response, actor switch, concurrent child creation/parent completion
```

Use pinned package scripts for focused source tests, then the applicable full `pnpm verify` on the accepted harness. `pnpm verify` includes database integration and Playwright, and was **not** run as part of this additional-plan review. Existing unit/mock-browser checks do not satisfy those database/authenticated gates.

## Current evidence boundary

The running shared-composer checks finished while this review was prepared: API unit392/59suites and web505/51files passed, with zero failed/pending tests in their JSON reports; final source checks also completed typecheck/lint/build. Source helper585files/hash `23b2d95ef89b5548acf6dca93f1bad9afb7232256c2bd884ffd5c453018900d9`,118 migration directories, matched before/after those checks. The [composer report](V1_TASK_COMPOSER_PROGRESS_2026-10-15.md) records limits and earlier harness/intermittent failures. These results support that source batch, not whole-application, real PostgreSQL, hosted CI, authenticated visual or staff-pilot completion.

This review made documentation changes only. It introduces no schema, grant, business-rule, retained-data, runtime or deployment changes. The V1 goal remains active.
