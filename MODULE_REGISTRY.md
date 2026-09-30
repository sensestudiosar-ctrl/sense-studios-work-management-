# Planned module registry

IDs are stable planning identifiers used by REQUIREMENTS_TRACE.md and IMPLEMENTATION_PLAN.md. FND through S12 are COMPLETE for development/local staging; see the slice completion reports, including S12_COMPLETION_REPORT.md. S13 and later remain unauthorized. Keep business writes in the owning module; other modules use its public service/events rather than its tables directly.

| ID | Boundary and owned concepts | Direct dependencies |
| --- | --- | --- |
| FND | Configuration, health, tenancy context, migration/deployment conventions | — |
| IDN | Internal accounts, passkey credentials, enrollment/recovery, sessions/devices; external portal email codes are deferred to S14 | FND |
| ORG | Organization, branch, team, employee membership/reporting and configurable job roles | FND, IDN; S03 COMPLETE |
| ACC | Permission grants/overrides, membership, scoped authorization | IDN, ORG; S03 COMPLETE |
| AUD | Append-only business/security audit and evidence snapshots | IDN, FND; S04 COMPLETE for development/local staging |
| EVT | Domain event catalogue and durable outbox | FND, AUD; S04 COMPLETE for development/local staging |
| APR | Shared approval requests and management decision queue | ACC, AUD, EVT |
| CRM | Leads, clients, client contacts; S06 COMPLETE for development/local staging | ORG, ACC, EVT |
| TMP | Project/task/stage templates and SOP references | ORG, ACC |
| PRJ | S07 COMPLETE: branch-owned projects, baseline and approved scope changes, accountable lead, explicit assignments, transfer, reasoned lifecycle and cancellation requests. S08 stages/milestones COMPLETE. S09 adds effective Owner cancellation and lead-exit hold within the atomic employee-exit operation; acceptance passed; see S09_COMPLETION_REPORT.md. | CRM, ORG, ACC, TMP, APR, EVT |
| TSK | S09 COMPLETE for development/local staging: owner/collaborator persistence, scoped assignment and states, internal closeout approval, cancellation stops, atomic exit waits and audit/outbox. S10 is COMPLETE for development/local staging. Implemented S10A–F includes ordinary Waiting/resume, committed dates/extensions, same-project dependencies, configured Team Waiting notices and recurrence rules/generation; see S10_SPEC.md and S10_PROGRESS_REPORT.md for behavior, evidence and whole-slice acceptance. S13/S14 add review execution. | PRJ, ORG, ACC, APR, EVT |
| DOC | S11–S12 COMPLETE for development/local staging: private NAS adapter, scoped files and Confidential grants; immutable R/CR register, approved-current supersession, exact issue/transmittal and named acknowledgement, ten-year close clock. S13/S14 supply review/client approval producers and portal; galleries remain S15. | PRJ, ACC, AUD, EVT |
| REV | Internal/client reviews, corrections, approval evidence, classification | TSK, DOC, APR, ACC, EVT |
| TIM | Timers, time entries/corrections, accounting-ready time data | TSK, ORG, ACC, AUD |
| WFM | Schedules, attendance, leave, capacity, workload | ORG, TSK, TIM, APR, EVT |
| SKL | Skill profiles, controlled ratings, skill change requests | ORG, APR, AUD |
| KNW | SOP versions, knowledge submissions, publication | DOC, ACC, APR |
| TRN | Training assignments, quizzes/practical assessments, effectiveness | KNW, SKL, TSK, APR |
| SITE | Site work packages, manpower, progress, daily reports, snags | PRJ, TSK, DOC, WFM, EVT |
| PORT | Client/consultant/vendor portals and scoped sharing | IDN, ACC, PRJ, DOC, REV, SITE |
| NTF | In-app/email delivery, preferences, reminders, summaries, escalation; push later | EVT, IDN, ACC; S04 core foundation COMPLETE for development/local staging; reminder/summaries remain S24 |
| PER | Employee and Team Leader evidence, scoring, review cycles | TSK, REV, TIM, WFM, SKL, TRN |
| HLT | Project health, schedule/delay attribution, risk evidence | PRJ, TSK, REV, SITE, WFM |
| DASH | Role-based dashboards and management action center views | APR, NTF, HLT, PER, TSK |
| RPT | Operational reports, exports, immutable snapshots, later custom builder | Domain read models, ACC, AUD |
| INT | Accounting, calendar, website, maps, future webhooks/CAD/WhatsApp adapters | EVT, ACC, relevant domain owner |
| AUT | Configurable automation with approval boundary | EVT, APR, ACC, AUD |
| AI | Provider-independent, permission-filtered recommendations and summaries | ACC, AUD, approved read models, APR |

Governance (GOV) means source rules for architecture, testing, releases, and agent conduct rather than a runtime module. Cross-cutting concerns belong to FND/ACC/AUD/EVT and must not become one giant business service.
