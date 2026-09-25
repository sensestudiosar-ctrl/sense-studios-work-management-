# Proposed dependency-based implementation plan

No implementation is authorized yet. The approved source is requirements/APPROVED_REQUIREMENTS.md plus C-001–C-014 in requirements/CLARIFICATIONS.md; IDs R-001–R-115 are indexed in REQUIREMENTS_TRACE.md. Every slice below is NOT STARTED. Each row names database/backend (DB/API), frontend (UI), authorization, and tests/acceptance. Exact schema and endpoints follow owner decisions and architecture approval. Routing describes approximate reasoning risk, not a tool invocation.

## Dependency hierarchy

FND + IDN + ORG + ACC + AUD + EVT → APR/NTF → CRM + TMP + PRJ → TSK → DOC + REV + PORT → TIM/WFM/SKL/KNW/TRN + SITE → PER/HLT/DASH/RPT → INT/AUT → AI.

Document metadata/access must precede exact-revision approvals; reliable task/review evidence must precede performance scoring; approved design must precede Turnkey operations. Core notification infrastructure is early, while broad summaries and advanced rules come later.

## Release 0 — Foundation

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S01 Runtime and verification [SOL DESIGN → LUNA IMPLEMENT] | Approved stack/hosting | Establish workspace, static PWA shell, API health, PostgreSQL connection, reviewed migration path, CI/type/lint/test/build, container staging, and a local database-and-file backup/restore rehearsal. Document and test the path to nightly encrypted offsite backup; the remote destination is a production gate, not a prerequisite for starting development. | No business access yet. Health and migration tests pass; reproducible local/staging build and restored DB work. R-091, R-093, R-099–R-102. |
| S02 Identity and sessions [SOL DESIGN → LUNA IMPLEMENT] | S01 | Account/session/passkey schema; Owner and employee passkey enrollment, Owner second credential/offline recovery kit, Owner-verified staff recovery, revocation/device list; login/logout UI and error states. Add external portal email codes and formal-approval passkey in S14. | Session guards, rate limit, CSRF, forced logout and passkey challenge/recovery rules; stolen/revoked session denied. R-005, R-007, R-076, R-099. |
| S03 Branch, employees and RBAC [SOL] | S02 | Organization/branch/team/employee/job role/membership/grant schema under C-001/C-002, with one home branch/team and Owner-only cross-branch grants; scoped API and Owner management screens. No Brand/Department tables. | Exactly one project branch; explicit cross-branch assignment rule. API ID-tampering, job-role/reporting/permission separation, immediate grant revocation and denied access tests pass. R-004–R-009, R-092. |
| S04 Audit, outbox and core notifications [SOL DESIGN → LUNA IMPLEMENT] | S02–S03 | Append-only audit and event/outbox tables, worker, in-app inbox, Brevo email adapter, preference/quiet-hours basics; C-003/C-009 ten-year event-based audit retention, advance expiry notice and hold design. Push is later. | Recipient reauthorization, dedupe/retry, no secret logging; mutation/audit/outbox atomic and notification appears once. R-058–R-060, R-079–R-080, R-095. |
| S05 Shared approvals and decision queue [SOL DESIGN → LUNA IMPLEMENT] | S03–S04 | Approval request/decision evidence model, typed workflows, Owner/Team Lead decision view. | Type-specific approvers, no self/bypass where policy forbids, immutable decision and audit; pending item appears once and resolves once. R-096–R-097. |

## Release 1 — Work-management core

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S06 Lead and client records [LUNA → SOL REVIEW] | S03–S04 | Lead/activity/client tables, pipeline API, list/form; source and Lost reason, Won conversion candidate. | Granted CRM scope; invalid transitions and cross-branch access denied; Won lead retains provenance. R-010. |
| S07 Project ownership and scope [SOL DESIGN → LUNA IMPLEMENT] | S05–S06 | Project/scope/change/lead schema and lifecycle API; project create/detail, optional hold/resume, formal Owner-approved branch transfer and history; Owner-only cancellation request, authorization and transition contract under C-010; keep effective cancellation unavailable until S09 can atomically stop unfinished delivery tasks under C-011. C-012 requires cancellation to revoke vendor/consultant access and confirm active native-link revocation; C-013 requires client issued-record read-only scope and withdrawal of pending client decisions at cancellation; C-014 requires an expiry clock from effective cancellation and Owner-approved extension; exact period awaits OD-06. | One branch and one Active lead; scope change approval/audit; invalid/cross-branch transitions denied. R-011–R-016. |
| S08 Templates, stages, milestones [LUNA → SOL REVIEW] | S07 | Versioned templates, stages/milestones/folder intent; project-from-template API and UI. | Template management grant; atomic structure creation/retry; applied template version visible. R-014–R-017. |
| S09 Tasks, participants and state [SOL DESIGN → LUNA IMPLEMENT] | S07–S08 | Task/participant/effort schema, CRUD and transition API; own/assigned task mobile-responsive views and forms. | Exactly one owner, self-task rule, manager assignment only, C-011 stopped-delivery state and linked closeout behavior; enable Owner cancellation only with atomic task stop, reason/audit, completed-task preservation and vendor/consultant app-access revocation. Before S14 introduces client portals, no client grants can be active; S14 adds C-013 read-only issued-record behavior. Before S21 introduces native links, none can be active; S21 adds the confirmed-link-revocation precondition. Required field/priority/type checks, persisted refresh and denied tests pass. R-018–R-024. |
| S10 Dates, waiting, dependency, recurrence [SOL DESIGN → LUNA IMPLEMENT] | S05, S09 | Committed-date history, extension request, waiting reason, dependency edge and recurrence schema; warning/decision UI. | Manager date authority and reason; employee extension; dependency warns but permits start with event; cycles and duplicate recurrence denied. R-023, R-025–R-026. |

## Release 2 — Design control and first real-project checkpoint

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S11 NAS document base [SOL] | S07, S03–S04 | NAS adapter, folder/document/blob metadata, staged/chunked upload and authorized stream; file register/upload/view UI with C-003/C-009 ten-year-from-project-close retention metadata for issued drawings and approval evidence. | Project/folder/file policy, traversal/checksum/orphan tests; no raw NAS credential/path; large file survives retry. R-035–R-036, R-039. |
| S12 Revisions and formal issue [SOL] | S11 | Immutable revision register with R internal-review and CR client-review series, current/superseded flags, transmittal/acknowledgement; drawing register/issue UI. | Only authorized issue; exact revision, reason, checksum, no overwrite; concurrent current-version test and historical retrieval pass. R-030, R-037–R-038. |
| S13 Internal review and correction [SOL DESIGN → LUNA IMPLEMENT] | S09, S11–S12 | Submission/review-round/correction schema and API; reviewer markup/comment/correction UI. | Assigned reviewer and gate policy; every round preserved; approval/correction/invalid transition tests pass. R-027–R-029. |
| S14 Client portal and exact approval [SOL] | S05, S12–S13 | Scoped portal identities/invitations controlled by Primary Client, emailed one-time-code sign-in, passkey step-up for formal item/final approval, item review, partial approval/signature evidence, Team Lead/Owner classification of requested revisions and handover views. | Primary final authority with item-only delegation, PDF/image client access, item/revision binding, portal isolation/revocation; cancelled project exposes only previously issued PDF/images and own approval history, with no new review/comment/approval (C-013); C-014 adds automatic expiry, request-time denial and audited Owner extension, with the exact period awaiting OD-06; real Design project E2E passes from task through handover. R-031–R-034, R-075–R-076, R-104. |
| S15 Galleries and publication [LUNA → SOL REVIEW] | S11, S14 | Private gallery and explicit public derivative/publication records; gallery UI. | Publish grant and audit; internal file never appears publicly without approval. R-040. |

## Release 3 — Workforce operations

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S16 Time and accounting-ready export [SOL DESIGN → LUNA IMPLEMENT] | S09, S04 | Timer/time-entry/change/export schema; mobile timer/manual entry/history UI and idempotent accounting adapter. | Own logs, manager correction reason, simultaneous timer and export replay tests; external app receives one valid record. R-041–R-043. |
| S17 Schedule, leave, attendance, capacity [SOL DESIGN → LUNA IMPLEMENT] | S05, S09, S16 | Effective schedule/holiday/Branch leave-policy version/entitlement ledger/attendance/allocation schema and impact calculations; January–December upfront grant, calendar-day new-hire/transfer proration, five-day carry-forward cap/next-year expiry; request/check-in/workload UI with ninety-day-from-capture selfie expiry. | Authorized leave approval, provisional site-evidence review, WFH without leave debit, capacity update and affected-task alerts; balance and cross-branch tests pass. R-046–R-051. |
| S18 Skills, SOP, knowledge and training [LUNA → SOL REVIEW] | S05, S09, S11, S17 | Skill ratings, SOP versions, knowledge publication, training/assessment records; profile, SOP and training UI. | Rating/publication/upgrade approval; training completion alone never upgrades skill; old SOP and acknowledgements retained. R-044–R-045, R-055–R-057. |

## Release 4 — Turnkey, site and external collaboration

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S19 Turnkey BOQ/procurement/factory [SOL DESIGN → LUNA IMPLEMENT] | S07, S11–S14, S05 | Operational BOQ/material/procurement/factory status and approvals; Turnkey stage/decision screens. | Separate prices from normal staff, human cost/procurement approval; approved design flows into production without accounting duplication. R-015. |
| S20 Site progress, reports and snags [LUNA → SOL REVIEW] | S09, S11, S17, S19 | Work package/manpower/progress/daily report/snag schema; mobile site dashboard and confirmation. | Assigned site roles, verification/reopen tests; one real Turnkey E2E through site quality/snags/handover. R-068–R-070, R-105. |
| S21 Consultant and vendor/factory portals [SOL DESIGN → LUNA IMPLEMENT] | S12, S19–S20, S14 | Scoped request/upload/transmittal/production views and portal APIs; Owner-issued native MinisCloud CAD links for assigned vendors/consultants, one file/revision each, seven-day expiry, extraction code, app record and immediate cancellation on access loss. | Explicit project/item grants, no internal performance or unrelated files, active native-share cancellation and expiry tests pass; cancellation stays pending if active native links lack confirmed revocation, and later closeout access requires separate approval (C-012). R-075–R-076. |
| S22 Offline site capture [SOL] | S20 | IndexedDB commands/photos/notes/snags with stable IDs, server idempotency/version checks and conflict UI. | Online reauthorization; replay produces no duplicates, conflict never silently overwrites, mobile offline E2E passes. R-071–R-072, R-098. |

## Release 5 — Management intelligence

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S23 Performance, project health and delay [SOL] | S13, S16–S20 | Evidence/weight-version/score/health/attribution snapshots with separate role-group employee formulas and Design/Turnkey project-health formulas; explanation and management views. | No score before Owner-entered and approved initial weights/thresholds; approved versioned formulas, external delay exclusion, quality weight, named ranking restrictions and evidence tests pass. R-061–R-067. |
| S24 Dashboards, summaries and reports [LUNA → SOL REVIEW] | S04–S05, S23 | Role read models, reminders/summaries, report/export and frozen snapshot schema; dashboards and decision center. | Per-role field filters; PDF/Excel/CSV/print, historical snapshot unchanged after later edits; critical E2E passes. R-058–R-060, R-073–R-074, R-077. |

## Release 6 and later — Integration, automation and AI

| Slice / route | Dependencies | DB/API and UI | Permission, tests and acceptance |
| --- | --- | --- | --- |
| S25 Calendar/website/maps/API integrations [SOL DESIGN → LUNA IMPLEMENT] | S06–S10, S04 | Adapter configuration, delivery/outbox records, webhook auth/dedupe and status UI. | Scoped data, replay safety and failure visibility; website lead/calendar item created once. R-084–R-086. |
| S26 Guarded automation and custom reports [SOL] | S05, S23–S25 | Versioned rule/run model, low-risk actions and approval requests; management builder/report UI. | High-impact action never executes without approval; recursion/idempotency tests pass. R-078, R-082–R-083. |
| S27 Provider-independent AI and recommendations [SOL] | Trustworthy S23–S26 evidence | Permission-filtered retrieval, provider adapter, structured recommendation/evidence/decision records; role-specific assistant UI. | No cross-scope context, no autonomous high-impact action, no hidden chain-of-thought storage; adversarial access tests pass. R-052–R-054, R-087–R-090. |

Later optional native wrapper, WhatsApp, deep CAD/BIM, advanced forecasting and custom builders remain separately scoped after the two real-world checkpoints (R-085–R-086, R-103, R-112).

## Release gates and first step

No slice is complete until its applicable schema, backend, API, permissions, frontend, audit/events, error/loading/empty states, responsive behavior, persisted refresh, targeted tests, type/lint/build, and documentation pass. The first implementation slice after explicit approval is S01; production deployment later depends on NAS verification, the approved Cloudflare Tunnel, offsite-backup connection, email delivery and restore validation. S02–S03 are the first user-facing authorization vertical slices. Architecture and owner decisions must be approved before any of these start.
