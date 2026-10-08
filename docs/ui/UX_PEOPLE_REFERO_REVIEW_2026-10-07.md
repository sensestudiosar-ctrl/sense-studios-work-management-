# People UX low-fidelity review — 2026-10-07

## Scope and requirement mapping

This visual concept changes only `UX_VALIDATION_LOW_FIDELITY_2026-10-07.html`. Time maps to S16 R-041.a–d, R-042.a–c, R-043.a and C002Q9. Workforce, Leave and Attendance map to S17 R-046.a–R-051.c plus C003/C004/C009/C022. No production/backend/API/permission/policy changes are implied.

| Surface | Requirement-led structure | Reference finding and prototype decision |
|---|---|---|
| Time | S16 R-041.a–d: authorized timer lifecycle and exact task or explicit non-project activity; R-042.a–c: dated ledger/correction review; R-043.a: export; C-002 Q9: approval/export locking | [Marathon](https://refero.design/pages/32d53f7b-3188-47dd-85dc-07046179d6f3) (`32d53f7b-3188-47dd-85dc-07046179d6f3`) puts the active timer above dated entries. Give Time a dedicated timer plus dated ledger. Preserve task context only when entered from that exact task; otherwise require a deliberate task selection or non-project activity selection. Manual/correction/review/export stay secondary. |
| Workforce | S17 R-046.a–b schedule/override and explainable availability; R-047.a dated effort; R-048.a–b period view and overload warning | [Wrike](https://refero.design/pages/8bb3f47e-e801-4864-a8e9-280512bbadb4) (`8bb3f47e-e801-4864-a8e9-280512bbadb4`) uses a named-person dated workload grid with selected-task detail. Use a dated person/task allocation grid and selected employee state, including Dashboard-originated `workforceEmployee`. Explain that capacity depends on configured schedule/policy; display unknown where values are absent rather than deriving hours. Keep setup secondary. |
| Leave / WFH | S17 R-049.a–d configured types/balances, proration/carry, staged approval, WFH no debit and same-level cancellation; R-050.a–b emergency impact and cancellation behavior; C022 | [Aboard request form](https://refero.design/pages/9797b9e9-cfd5-4787-bfe2-f0f5436157d7) (`9797b9e9-cfd5-4787-bfe2-f0f5436157d7`, workflow `771`) places a dated request beside daily impact and pending requests beside retained history. Use balance ledger plus dated pending/history, with LV-013/Kabir/13 Oct and task impact. Keep canonical decision data in `currentDecisions`/`decisionRecords`. Separate Leave, WFH and emergency fields. WFH has no leave debit; pending cancellation has no effect; future-date cancellation applies only to future dates. Reject direct Approved status controls that bypass typed decisions. |
| Attendance | S17 R-051.a derived status/punches; R-051.b SITE GPS/QR/selfie and provisional evidence; R-051.c 90-day retention; C003/C009 | [Aboard employee timestamp audit log](https://refero.design) (`fb9ae97c-09b6-4e6b-9131-69bacc8578c5`) exposes an employee timestamp audit log; it is not attendance evidence, and no matching evidence/review flow was found. Keep the prototype's own Today OFFICE/SITE punch evidence and dated punch records, plus provisional review queue; retention is secondary. Omit emergency and allocation fields. | 

## Interaction and preservation decisions

- Keep every catalog action label and its `data-feature-action` / `data-action-label` DOM contract in a collapsed, grouped capability disclosure. Show the few relevant commands beside the relevant page context.
- Preserve labels, role-based sample visibility, canonical context, history, Back, and retained task-list navigation state. Contextual People forms use selected employee, period, request, punch or exact task; they do not inherit the unrelated default Azure project.
- Controls and action steps are sample representations only. A button must not imply server persistence, real authorization, or a completed domain transition. No capacity or policy defaults are invented.
- Snapshot/restore includes People page filters/selections and preserves exact source task time context when navigating Back.

## Validation limits

The parent will render and review the updated UX/source. This child makes no test runs. Reference IDs above identify the reviewed Refero examples. This is a low-fidelity interaction concept only; no production or actual-project gates are claimed.


## Completed revision and findings

| UX issue | Change | Screen | Why | Owner decision needed? |
|---|---|---|---|---|
| Same generic page stack | Four domain-specific working surfaces | All People | Distinguish the record and daily job | Validate comprehension |
| Actual time hidden behind task selector | Timer and dated ledger visible; explicit non-project choice | Time | Both accepted work contexts discoverable | No |
| Planned effort looks like time ledger | Person-by-date allocation matrix; selected cell detail; dated mobile list | Workforce | Compare people/dates and preserve allocation identity | Test Workforce naming |
| Request and impact scattered | Own request form beside scoped pending request and exact decision/task links | Leave/WFH | Explain dates, next actor and affected work | No business-rule choice |
| Generic forms ask irrelevant fields | Distinct Time/Allocation/Leave/Punch forms | All People | Remove emergency fields from Attendance and allocation fields from Leave | No |
| Generic project leaks into People context | Employee/date/entry/request/punch keyed action/history | All People | Keep exact originating context | No |
| Punch identity / today status confused | Actor-specific Today; exact selected historical evidence; OFFICE/SITE fields | Attendance | Separate daily punching from provisional review | No |
| Duplicate daily actions dominate | Daily actions at source; full capability catalog disclosed | All People | Preserve capabilities without repeated command strips | Frequency testing |
| Refresh loses People destination | Four People hash destinations load directly | Navigation | Share/revisit the exact page | No |

### Review evidence

- Live Refero MCP search, full screen metadata, three reference images and [Aboard approval flow 771](https://refero.design/flows/771) inspected. [Evidence ledger](people-review-2026-10-07/refero-evidence.json). No visual styling was borrowed. Attendance reference is an employee audit log, not a matched site-punch evidence flow; R-051 remains authoritative.
- [P01–P04 results](people-review-2026-10-07/results.json): own time records/non-project timer; matrix exact allocation and Back; WFH/date/current requester/exact LV-013; SITE evidence/exact AT-069/own visibility. All passed with no page errors.
- Desktop 1440×900 and mobile 390×844 captures reviewed. All four mobile pages have no document horizontal overflow; the Workforce grid becomes a dated person list. [Owner walkthrough](UX_PEOPLE_OWNER_WALKTHROUGH_2026-10-07.md).
- Existing U01–U08 artifact checks rerun successfully after revision; 37 role/family visits and 375 unique role-visible actions. Catalog retains 33 families / all335 original action labels. One attendance approval is now Meera-only rather than Owner-visible. This is sample visibility, not production permission acceptance. The presence check counts unique labels because contextual shortcuts share commands.
- Production services, tests and permission enforcement were not changed. No production verification, full pinned gate, participant success or operational acceptance is claimed.

### Explicit prototype limitations

Timer state is simulated; elapsed-time accounting and stop-to-persisted-ledger behavior are not implemented. Manual entries, allocation edits, requests, punches, corrections, locking/export and retention operations are contextual representations with sample-memory history; no production persistence or external transmission occurs. Weekly/monthly Workforce shows labelled fixture dates, not a complete scheduling calendar. Capacity, policy thresholds and entitlement values remain unknown. Named employee and branch visibility in this fixture does not substitute for production scoped grants.

### Readiness and next Owner review

**Ready for bounded People UX validation of page purpose, discovery and context retention.** Follow P01–P04 and explain the difference between actual time, planned allocation, absence and attendance without coaching. Full domain state-transition acceptance still requires real persisted evidence and is outside this UX pass.

Owner input: assess whether “Workforce” predicts schedules/capacity/allocations, and whether frequent daily commands are easy to find before secondary policy/export/retention controls. No new business-rule or permission choice is required.

Actual models: GPT-6.1 Sol context/source/final review; GPT-6 Luna bounded prototype draft (interrupted by tool permission failure); root completed fixes, captures and artifact walkthroughs. UX remains provisional. No visual UI phase, production implementation or Gate B began.
