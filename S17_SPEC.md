# S17 — Schedule, leave, attendance and capacity

Status: COMPLETE for development/local staging, verified 2026-10-02; see S17_COMPLETION_REPORT.md. The current Owner instruction authorizes starting and finishing S17. Earlier S17-unauthorized wording is historical. S18 onward remain unauthorized.

## Approved source and slice boundary

The verbatim approved sections 46–51 (R-046–R-051), C-002 Q10/Q11, C-003, C-004, C-009 and C-022 govern this slice. Dependencies S05, S09 and S16 are COMPLETE for development/local staging. WFM owns effective schedules, leave policies/ledgers/requests, attendance evidence and task capacity allocations; ORG owns membership history, TSK owns task assignments/state, TIM owns actual time, APR owns shared decisions, AUD/EVT own canonical evidence/delivery, and private storage keeps evidence bytes out of API metadata.

| Requirement | In-scope acceptance |
| --- | --- |
| R-046.a | Effective employee schedules record working days, start/end, breaks, daily capacity and weekly offs, supporting full-time/part-time employees and temporary overrides. |
| R-046.b | Availability accounts for effective schedules, holidays, approved leave and existing allocations, with explainable daily inputs. |
| R-047.a | Explicit estimated task hours consume per-person capacity. Collaborative allocation is entered separately for each participant; no automatic equal division. |
| R-048.a | Daily, weekly and monthly workload uses configurable Under-utilized/Healthy/Near Capacity/Overloaded thresholds. |
| R-048.b | Management receives an overload warning before allocating/assigning work; a warning does not silently change assignment. |
| R-049.a | Owner-configured leave types support casual/sick/paid/unpaid/half-day/hourly/comp-off and excess/unpaid outcomes, exposing allocated/used/remaining/carry-forward evidence. |
| R-049.b | C-004 January–December upfront Branch allowance, calendar-day new-hire and Branch-transfer proration, maximum five-day carry-forward and end-of-next-year expiry retain policy/calculation versions. Actual allowances require Owner setup; no invented allowance is active. |
| R-049.c | Leave requests follow configured Team Leader, Owner or multilevel authority, backend enforced with separate immutable decisions. WFH is an attendance/schedule request without leave debit. |
| R-049.d | C-022 employee cancellation requests change nothing while pending/denied. Same-original-management-level approval records a separate unused-portion reversal; taken leave, original decisions and handovers remain. |
| R-050.a | Approved leave reduces future capacity, identifies affected tasks/critical work and alerts authorized managers/task owners with reassignment suggestions. Emergency leave triggers analysis immediately. |
| R-050.b | Approved unused cancellation recalculates capacity and alerts affected managers/owners to review prior handovers, without automatic reassignment. |
| R-051.a | Office/site check-in/out persist working hours and derived late/early/missing-punch status. |
| R-051.b | Site check-in validates location, QR and selfie. Missing evidence/connectivity permits provisional check-in with reason and authorized manager review; there is no continuous off-duty tracking. |
| R-051.c | Selfie retention is ninety days from capture, with advance Owner notice, documented holds, controlled expiry and deletion evidence; attendance history survives selfie expiry under applicable employee-record policy. Production legal/contract/backup lifecycle validation remains a gate. |

Out of scope: S18 skills/training, S19/S20 site delivery operations, S23 scoring, S24 broad reminders, S25 external map-provider integration, S27 AI assignment, payroll/accounting duplication, broad UI redesign, production deployment and legal certification. Suggestions do not assign/reassign employees or expand cross-branch access.

## Policy setup and unresolved design

Approved sources deliberately leave numeric Branch allowances and workload thresholds as Owner setup. Approval routing and site-validation settings must be configured explicitly rather than inferred from job titles. Missing setup fails closed for the dependent action and is visible in the UI. The implementation must settle and record calculation units/rounding, day-to-hour conversion for entitlement and partial leave, comp-off treatment, overnight schedule handling, site QR/location provisioning, and dated allocation behavior before those business calculations become active. Unspecified material choices require Owner direction or explicit prospective Owner-approved configuration; authorization to implement does not invent their values.

Owner calculation decision on 2026-10-02: capacity and leave use schedule-derived minutes; a full day consumes that day's capacity, a half-day consumes half, and hourly leave uses explicitly entered minutes. Allocations are explicitly dated for each person. Overnight shifts are attributed to their start date. Numeric/routing/site configuration remains pending Owner confirmation. Annual entitlement remains expressed in approved policy days with explainable schedule-relative conversion; no arbitrary eight-hour day is assumed.

Owner additionally approved consuming expiring carry-forward before the current annual allowance on 2026-10-02. Entitlement eligibility uses exact rational numerator/denominator evidence; nine-decimal ledger amounts are presentation summaries rather than eligibility decisions. Carry source year/expiry and reversals remain explainable.

Owner cancellation clarification on 2026-10-02: only future calendar-date portions may be requested/approved for cancellation. Current-day and past portions remain recorded, including hourly leave; this slice does not infer unused same-day hours without explicit timed portions. Pending/denied cancellation leaves capacity/balance unchanged. Explicit per-person dated allocation is required to place estimated effort in capacity; unallocated estimates must be visible as requiring planning rather than equally or automatically divided.

## Persistence, access and acceptance plan

Sol owns schema, permissions, calculations and state-machine design/review. Luna receives bounded settled UI/tooling/test briefs. All mutations authenticate current internal sessions, enforce CSRF/current scoped authority and active employee membership, and append atomic business/audit/event evidence. Employees see/submit their own records; management requires explicit scoped grants/reporting relations; project assignments do not grant cross-branch employee-private data. CLIENT identities are denied. Concurrent decisions, cancellations, attendance punches and allocations use optimistic versions/idempotency and transaction serialization where needed. Evidence and old policy/ledger versions are immutable.

Acceptance requires reviewed additive migrations on fresh and populated S16 clones with prior-column hashes preserved; schema generation/validation/status; calculation unit tests for leap years, hire/transfer, carry-forward/expiry and partial used cancellations; real PostgreSQL permission/ID/branch/session-expiry/concurrency/rollback/tamper coverage; provisional evidence and retention/hold/storage checks; desktop/mobile persisted setup/schedule/allocation/leave/cancellation/WFH/attendance/workload journeys and inspected screenshots; pinned Node24.19.0/pnpm11.19.0 frozen install and full pnpm verify with isolated databases and serial browser fixtures. Every executed check and remaining limitation is recorded before COMPLETE is claimed.

Actual context-intake model: GPT-6.1 Sol. S16 acceptance is documented in S16_COMPLETION_REPORT.md; this specification alone does not reverify S16 or complete S17.
