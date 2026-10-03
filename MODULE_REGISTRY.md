# Planned module registry

IDs are stable planning identifiers used by REQUIREMENTS_TRACE.md and IMPLEMENTATION_PLAN.md. FND through S15 are COMPLETE for development/local staging; see the slice completion reports, including S15_COMPLETION_REPORT.md. S19 is COMPLETE for development/local staging. S20 is Owner-authorized but WAITING on S17 before implementation; S16/S17 were Owner-authorized and accepted for development/local staging on the separate codex/s17-workforce branch at 6bfd14e; their accepted source is now merged into this checkout, with combined acceptance pending. S20 waits for combined acceptance before business implementation. S18 authorization conflicts with its separate-branch completion record and remains unresolved; do not start or integrate S18. S21–S27 remain unauthorized. Keep business writes in the owning module; other modules use its public service/events rather than its tables directly.

| ID | Boundary and owned concepts | Direct dependencies |
| --- | --- | --- |
| FND | Configuration, health, tenancy context, migration/deployment conventions | — |
| IDN | Internal accounts, passkey credentials, enrollment/recovery, sessions/devices; S14 adds isolated CLIENT portal OTP/session, passkey enrollment and exact-bound approval step-up | FND |
| ORG | Organization, branch, team, employee membership/reporting and configurable job roles | FND, IDN; S03 COMPLETE |
| ACC | Permission grants/overrides, membership, scoped authorization | IDN, ORG; S03 COMPLETE |
| AUD | Append-only business/security audit and evidence snapshots | IDN, FND; S04 COMPLETE for development/local staging |
| EVT | Domain event catalogue and durable outbox | FND, AUD; S04 COMPLETE for development/local staging |
| APR | Shared approval requests and management decision queue | ACC, AUD, EVT |
| CRM | Leads, clients, client contacts; S06 COMPLETE for development/local staging | ORG, ACC, EVT |
| TMP | Project/task/stage templates and SOP references | ORG, ACC |
| PRJ | S07 COMPLETE: branch-owned projects, baseline and approved scope changes, accountable lead, explicit assignments, transfer, reasoned lifecycle and cancellation requests. S08 stages/milestones COMPLETE. S09 adds effective Owner cancellation and lead-exit hold within the atomic employee-exit operation; acceptance passed; see S09_COMPLETION_REPORT.md. | CRM, ORG, ACC, TMP, APR, EVT |
| TSK | S09 COMPLETE for development/local staging: owner/collaborator persistence, scoped assignment and states, internal closeout approval, cancellation stops, atomic exit waits and audit/outbox. S10 is COMPLETE for development/local staging. Implemented S10A–F includes ordinary Waiting/resume, committed dates/extensions, same-project dependencies, configured Team Waiting notices and recurrence rules/generation; see S10_SPEC.md and S10_PROGRESS_REPORT.md for behavior, evidence and whole-slice acceptance. S13 implements internal review; S14 adds guarded client-review task transitions, exact correction linkage and resume. | PRJ, ORG, ACC, APR, EVT |
| DOC | S11–S12 COMPLETE for development/local staging: private NAS adapter, scoped files and Confidential grants; immutable R/CR register, approved-current supersession, exact issue/transmittal and named acknowledgement, ten-year close clock. S13 supplies the internal approval producer; S14 client approval/portal and S15 galleries/publication are COMPLETE for development/local staging. See S15_COMPLETION_REPORT.md. | PRJ, ACC, AUD, EVT |
| REV | S13 COMPLETE for development/local staging: task-bound internal review submissions/rounds, independent named reviewer, correction task/category/severity, markup evidence, reasoned escalation, interrupted-round recovery, guarded reviewer planning and exact S12 R approval producer. S14 extends exact-file review to independent CR files under their own-review-before-client requirement; client packages/items, decisions, annotations, classifications and corrections are implemented. Primary appointment is Owner-only with reason/audit; correction assignment is Owner, assigned Project Lead or explicitly authorized Team Leader with reason/audit. Acceptance is recorded in S14_COMPLETION_REPORT.md. | TSK, DOC, APR, ACC, EVT |
| TIM | S16 COMPLETE for development/local staging: persistent timers/manual time, immutable correction/approval history and durable Owner accounting delivery. See S16_COMPLETION_REPORT.md. | TSK, ORG, ACC, AUD |
| WFM | Schedules, attendance, leave, capacity, workload | ORG, TSK, TIM, APR, EVT |
| SKL | Skill profiles, controlled ratings, skill change requests | ORG, APR, AUD |
| KNW | SOP versions, knowledge submissions, publication | DOC, ACC, APR |
| TRN | Training assignments, quizzes/practical assessments, effectiveness | KNW, SKL, TSK, APR |
| SITE | S20 authorized / WAITING on S17, with no business implementation. Planned site work packages, manpower, progress, daily reports, snags and separate site handover; Owner decisions and boundaries: S20_SPEC.md. | PRJ, TSK, DOC, WFM (S17 prerequisite), EVT |
| PORT | S14 client portal COMPLETE for development/local staging: isolated CLIENT sessions/cookies, email OTP, passkey enrollment/approval, Owner-managed Primary Client access, project and exact-item grants, review packages/items, annotations/private references, decisions and Primary final batch, cancellation withdrawal and per-client expiry. Consultant/vendor portals remain later scope. | IDN, ACC, PRJ, DOC, REV, SITE |
| NTF | In-app/email delivery, preferences, reminders, summaries, escalation; push later | EVT, IDN, ACC; S04 core foundation COMPLETE for development/local staging; reminder/summaries remain S24 |
| PER | Employee and Team Leader evidence, scoring, review cycles | TSK, REV, TIM, WFM, SKL, TRN |
| HLT | Project health, schedule/delay attribution, risk evidence | PRJ, TSK, REV, SITE, WFM |
| DASH | Role-based dashboards and management action center views | APR, NTF, HLT, PER, TSK |
| RPT | Operational reports, exports, immutable snapshots, later custom builder | Domain read models, ACC, AUD |
| INT | Accounting, calendar, website, maps, future webhooks/CAD/WhatsApp adapters | EVT, ACC, relevant domain owner |
| AUT | Configurable automation with approval boundary | EVT, APR, ACC, AUD |
| AI | Provider-independent, permission-filtered recommendations and summaries | ACC, AUD, approved read models, APR |

Governance (GOV) means source rules for architecture, testing, releases, and agent conduct rather than a runtime module. Cross-cutting concerns belong to FND/ACC/AUD/EVT and must not become one giant business service.

## Current TIM / S16 authorization

S16 is Owner-authorized and COMPLETE for development/local staging; historical S16-unauthorized wording above is superseded for S16 only. TIM owns timer commands/transitions, time entry/correction/approval persistence and accounting-ready durable delivery. Public boundaries are TimeService/TimeController and the lifecycle pause helper consumed transactionally by project/task/organization services. DOC retains evidence-file authorization. Final gates passed on 2026-10-02; see S16_SPEC.md and S16_COMPLETION_REPORT.md. S17 is COMPLETE for development/local staging; S18 onward remain unauthorized.


## S17 implementation checkpoint — 2026-10-02

WFM owns S17 WorkforceRecord/Version/Receipt/Ledger/Selfie persistence and WorkforceService/Controller. TaskService consumes its overload warning helper; the shared approval module owns approval requests/decisions, the notification module owns delivery, and private file storage owns selfie bytes. S17 is COMPLETE for development/local staging; exact scope/contracts and acceptance are in S17_SPEC.md/S17_API_CONTRACT.md/S17_ACCEPTANCE_REVIEW.md. No S18 behavior is authorized.


## S17 final local acceptance — 2026-10-02

S17 is COMPLETE for development/local staging. Final9 pnpm verify exited0:172 API unit,99 web unit,202 real PostgreSQL integration and33 desktop/mobile browser tests; typecheck, lint and builds passed. After the final CSS-only mobile Period correction, affected web gates and both Workforce browser journeys passed; all four refreshed final10 screenshots were independently inspected. All86 migrations are current;112 prior-table and104 legacy snapshots remain unchanged. S16 local completion is confirmed by its original report and the current full regression. See S17_COMPLETION_REPORT.md for exact scope, evidence and limitations. S18 onward remains unauthorized; production NAS/legal/contract/offsite/backup/restore/accounting-provider/hosted CI/deployment gates are not claimed. Actual routing used GPT-6.1 Sol and GPT-6 Luna.

## S19 owning module — 2026-10-03

TURNKEY owns BOQ/design releases, protected immutable prices, material selection, typed cost/procurement approval bindings, procurement/factory progress, retained operational history and explicit approved client cost shares. Dependencies: PRJ/ACC/AUD/EVT/APR/DOC/PORT. Cross-module production eligibility is supplied by RevisionService; approval policy uses S05 handlers and client reads use S14 project/session authority. S19 is Owner-authorized and COMPLETE for development/local staging; site work/external vendor portals remain later slices. Owned implementation: turnkey.service.ts/controller.ts, the four Turnkey Prisma models and additive S19 migration, staff turnkey.tsx and the client portal cost surface. Acceptance: S19_COMPLETION_REPORT.md.
