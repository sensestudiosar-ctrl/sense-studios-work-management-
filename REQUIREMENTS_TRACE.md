# Approved requirement traceability

Source of truth: requirements/APPROVED_REQUIREMENTS.md, exact copy of the Owner source (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). C-001 approves Organization → Branch → Team → Employee, no Brand model, one owning branch per project and explicit cross-branch assignments. C-002 records Q1–Q15 answers; C-003–C-024 record later Owner decisions. The Owner approved the architecture at checkpoint 2e46805, approved S01 complete for development/local-staging, authorized S02 Identity and Sessions and S03 Branch, Employees and RBAC on 2026-09-26, and authorized S04, S05, S06 and S07 on 2026-09-27. S01–S06 are COMPLETE for development/local staging; S07 is IN PROGRESS; S08+ remain unauthorized.

This is a coverage index, not an implementation claim. Each section can contain several clauses. Before implementing a slice, expand its clauses into stable sub-IDs (for example R-024.a), API/backend and UI acceptance criteria, permissions, tests and evidence in that slice's issue/plan. Cross-cutting source sections stay linked to every relevant slice. No source section is dropped.

## S01 runtime evidence

| Source | S01 evidence | Status |
| --- | --- | --- |
| R-091 / C-007 | Isolated test PostgreSQL dump and representative file restore; file SHA-256 matched. Offsite encryption, key custody and production restore remain deployment gates. | LOCAL REHEARSAL PASS; PRODUCTION GATES OPEN |
| R-093 / R-094 / R-103 | Approved modular-monolith stack and S01-only execution boundary recorded in DECISIONS.md and S01_PLAN.md. | APPROVED; S01 FOUNDATION COMPLETE |
| R-099 | Validated runtime configuration and ignored local environment files; no committed production credential identified. | LOCAL CHECK PASS |
| R-100 | Unit, API, desktop/mobile browser, typecheck, lint and build commands executed through pnpm verify. | PASS |
| R-101 / R-102 | Failures fixed; local and Compose checks passed, and the Owner confirmed hosted GitHub Actions green for the latest push. | PASS; S01 COMPLETE |
| C-007 | Encrypted offsite target, key custody and production restore are documented as production gates. | DOCUMENTED; NOT DEPLOYED |

The Owner's source remains verbatim. Requirements for business slices remain approved but not implemented; this evidence does not claim business functionality.

| Requirement ID | Source section | Planned module | Planned slice(s) | Status |
| --- | --- | --- | --- | --- |
| C-001 | Approved clarification: Branch-only organization hierarchy; overrides organizational terminology in R-004, R-006, R-007, R-092–R-094, R-103 and R-113 | ORG/ACC/PRJ | S03/S07 | APPROVED; S03 Organization/Branch/Team schema and APIs COMPLETE; project ownership awaits S07 |
| C-002 | Approved Q1–Q15 answers, further specified by C-003–C-024 | ORG/ACC/PRJ/DOC/PORT/WFM/PER | S01/S03–S07/S09–S10/S12/S14/S16–S17/S19/S21/S23 | APPROVED; Q1/Q15 implemented in S03; remaining owner policies belong to later slices |
| C-003 | Q8 category retention durations; C-009 fixes clock and expiry policy; legal/contract validation remains a release gate | ORG/AUD/DOC/WFM/APR | S03–S05/S11/S17 | APPROVED; S04 audit retention controls COMPLETE for development/local staging; legal/contract/backup validation is a production gate; other categories later |
| C-004 | Branch leave-year, credit, proration, carry-forward and expiry | WFM | S17 | APPROVED; NOT IMPLEMENTED |
| C-005 | Role-group employee and Design/Turnkey health formulas; Owner-approved initial weights | PER/HLT | S23 | APPROVED; NOT IMPLEMENTED |
| C-006 | Owner-issued file-specific native CAD links for assigned vendors/consultants | DOC/PORT/ACC | S11/S21 | APPROVED; NOT IMPLEMENTED |
| C-007 | Nightly encrypted database-and-file backup to separate offsite computer/NAS; one-day loss target | FND/DOC | S01/S11 | APPROVED; NOT IMPLEMENTED |
| C-008 | Staff passkeys, external email codes, client approval passkey, Brevo and launch channels | IDN/PORT/NTF | S02/S04/S14 | APPROVED; internal S02 passkey portion COMPLETE for development/local staging; external email codes and client approval passkey deferred to S14 |
| C-009 | Retention clock anchors, scheduled expiry, notice and holds | AUD/DOC/WFM | S04/S11/S17 | APPROVED; S04 audit controls COMPLETE for development/local staging; legal/contract and backup validation remain production gates; other categories later |
| C-010 | Owner-only cancellation from Draft/Active/On Hold with reason and audit | PRJ/ACC/APR | S05/S07/S09 | APPROVED; NOT IMPLEMENTED |
| C-011 | Stop unfinished delivery tasks on project cancellation; preserve history; permit distinct linked closeout tasks | PRJ/TSK/NTF | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-012 | Vendor/consultant access ends at project cancellation; Owner revokes active native CAD links first; closeout access requires separate approval | PRJ/ACC/DOC/PORT | S09/S21 | APPROVED; NOT IMPLEMENTED |
| C-013 | Cancelled-project client portal is read-only for previously issued PDF/images and own approval history; no new review/comment/approval | PRJ/ACC/DOC/PORT/REV | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-014 | Cancelled-project client read-only access expires automatically after an Owner-chosen period; Owner may approve an extension | ACC/DOC/PORT | S14 | APPROVED; NOT IMPLEMENTED |
| C-015 | Owner sets a separate required expiry for each client project-access grant at cancellation; no shared period | PRJ/ACC/PORT | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-016 | Assigned Project Lead or explicitly authorized Team Leader approves ordinary closeout tasks and scoped time-limited vendor/consultant access; Owner alone issues CAD links | PRJ/TSK/ACC/PORT | S09/S21 | APPROVED; NOT IMPLEMENTED |
| C-017 | Authorized lead handler may jump forward over unused sales stages with required reason and audited skipped-stage evidence | CRM/AUD | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-018 | Returning Lost enquiry creates a new linked lead; prior Lost outcome and history remain intact | CRM/AUD/ACC | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-019 | Authorized handler may move a nonterminal lead to an earlier nonterminal stage with reason and preserved history | CRM/AUD/ACC | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-020 | Project Lead/authorized Team Leader appoints a named snag verifier independent of the fixer; verification attempts retain evidence | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-021 | Assigned Project Lead/explicitly authorized Team Leader makes a separate Closed decision after passed snag verification | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-022 | Approved-leave cancellation requires same-level management decision; reversal retains ledger and capacity history | WFM/APR/AUD/NTF | S17 | APPROVED; NOT IMPLEMENTED |
| C-023 | Employee exit immediately revokes access; unfinished tasks wait for individual authorized reassignment | ORG/ACC/TSK/AUD/NTF | S03/S09 | APPROVED; S03 supplies immediate suspension and fail-closed exit refusal; atomic task-wait and reassignment workflow awaits S09 |
| C-024 | Exiting Project Lead puts Active project On Hold; Owner names replacement before resume | ORG/PRJ/ACC/AUD/NTF | S03/S07 | APPROVED; S03 refuses effective exit until the dependency exists; project hold/replacement workflow awaits S07 |
| R-001 | FIRST INSTRUCTION | GOV | S01 | NOT STARTED |
| R-002 | PRODUCT VISION | PRJ | S07 | NOT STARTED |
| R-003 | IMPORTANT PRODUCT BOUNDARY | INT | S16/S25 | NOT STARTED |
| R-004 | ORGANIZATION MODEL | ORG | S03 | S03 COMPLETE: Organization/Branch/Team, Employee home membership/history, and multiple dated configurable JobRole assignments; project membership waits for S07 |
| R-005 | USER TYPES: R-005.a Owner identity, R-005.b staff identity, R-005.c external portal identities, R-005.d public visitor | IDN/PORT | S02/S14/S21 | R-005.a–b identity-only Owner/Staff kinds implemented in S02 for development/local staging; R-005.c–d deferred |
| R-006 | PERMISSION MODEL | ACC/ORG | S03 | S03 COMPLETE: explicit scoped role grants/employee overrides, deny-by-default evaluator, scoped API checks and tests; project scopes await S07 |
| R-007 | OWNER: R-007.a authentication identity, R-007.b organization authority, R-007.c account recovery/security duties | IDN/ACC/ORG | S02/S03 | Identity portions of R-007.a/c implemented in S02 for development/local staging; organization authority and business permissions implemented in S03 |
| R-008 | TEAM LEADER | ACC/ORG | S03 | S03 COMPLETE: explicit Team-scoped report-tree listing and reporting updates; no title-based authority |
| R-009 | EMPLOYEE | ACC/ORG | S03 | S03 COMPLETE for identity-linked home membership and scoped Team UI; own/assigned work APIs await their owning slices |
| R-010 | LEAD MANAGEMENT | CRM | S06 | R-010.a–d COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| R-011 | PROJECT DELIVERY TYPES | PRJ | S07 | S07A: Design/Turnkey Draft creation implemented; full delivery workflows IN PROGRESS |
| R-012 | PROJECT SERVICE SCOPES | PRJ | S07 | S07A: immutable creation baseline implemented; formal change approval IN PROGRESS |
| R-013 | PROJECT ACCOUNTABILITY | PRJ | S07 | NOT STARTED |
| R-014 | DESIGN PROJECT DEFAULT WORKFLOW | PRJ/TMP | S08 | NOT STARTED |
| R-015 | TURNKEY DEFAULT WORKFLOW | PRJ/TMP | S08 | NOT STARTED |
| R-016 | PROJECT STATUS STATE MACHINE | PRJ/TMP | S08 | NOT STARTED |
| R-017 | PROJECT TEMPLATES | PRJ/TMP | S08 | NOT STARTED |
| R-018 | TASK OWNERSHIP | TSK | S09 | NOT STARTED |
| R-019 | TASK CREATION | TSK | S09 | NOT STARTED |
| R-020 | TASK TYPES | TSK | S09 | NOT STARTED |
| R-021 | TASK FIELDS | TSK | S09 | NOT STARTED |
| R-022 | TASK PRIORITIES | TSK | S09 | NOT STARTED |
| R-023 | TASK DATES | TSK | S10 | NOT STARTED |
| R-024 | TASK STATE MACHINE | TSK | S10 | NOT STARTED |
| R-025 | WAITING / BLOCKED WORK | TSK | S10 | NOT STARTED |
| R-026 | DEPENDENCIES | TSK | S10 | NOT STARTED |
| R-027 | INTERNAL REVIEWS | REV | S13 | NOT STARTED |
| R-028 | CORRECTION LOOP | REV | S13 | NOT STARTED |
| R-029 | CORRECTION SEVERITY | REV | S13 | NOT STARTED |
| R-030 | REVISION NUMBERING | DOC | S12 | NOT STARTED |
| R-031 | CLIENT REVISION CLASSIFICATION | REV/PORT | S14 | NOT STARTED |
| R-032 | CLIENT PORTAL REVIEW | REV/PORT | S14 | NOT STARTED |
| R-033 | CLIENT APPROVAL AUTHORITY | REV/PORT | S14 | NOT STARTED |
| R-034 | CLIENT APPROVAL EVIDENCE | REV/PORT | S14 | NOT STARTED |
| R-035 | FILE MANAGEMENT | DOC | S11 | NOT STARTED |
| R-036 | NAS ARCHITECTURE | DOC | S11 | NOT STARTED |
| R-037 | DOCUMENT STATES | DOC | S12 | NOT STARTED |
| R-038 | TRANSMITTALS | DOC | S12 | NOT STARTED |
| R-039 | FILE SECURITY | DOC/ACC | S11 | NOT STARTED |
| R-040 | PROJECT GALLERIES | DOC | S15 | NOT STARTED |
| R-041 | TIME TRACKING | TIM | S16 | NOT STARTED |
| R-042 | TIME LOG EDITING | TIM | S16 | NOT STARTED |
| R-043 | ACCOUNTING INTEGRATION | TIM | S16 | NOT STARTED |
| R-044 | SKILLS | SKL | S18 | NOT STARTED |
| R-045 | TRAINING AND SKILL CHANGES | SKL | S18 | NOT STARTED |
| R-046 | WORK SCHEDULE & CAPACITY | WFM | S17 | NOT STARTED |
| R-047 | TASK EFFORT ALLOCATION | WFM | S17 | NOT STARTED |
| R-048 | WORKLOAD | WFM | S17 | NOT STARTED |
| R-049 | LEAVE | WFM | S17 | NOT STARTED |
| R-050 | LEAVE IMPACT | WFM | S17 | NOT STARTED |
| R-051 | ATTENDANCE | WFM | S17 | NOT STARTED |
| R-052 | AUTOMATIC ASSIGNMENT / RECOMMENDATIONS | AI/TSK | S27 | NOT STARTED |
| R-053 | ASSIGNMENT OUTPUT | AI/TSK | S27 | NOT STARTED |
| R-054 | ASSIGNMENT SAFETY | AI/TSK | S27 | NOT STARTED |
| R-055 | SOP MANAGEMENT | KNW/TRN | S18 | NOT STARTED |
| R-056 | KNOWLEDGE BASE | KNW/TRN | S18 | NOT STARTED |
| R-057 | TRAINING | KNW/TRN | S18 | NOT STARTED |
| R-058 | NOTIFICATIONS | NTF | S04/S24 | S04 core in-app/email, verified-mailbox, preference, quiet-hours and delivery foundation COMPLETE for development/local staging; S03 events remain notification-neutral pending later event recipient/template definitions; push later |
| R-059 | REMINDERS & ESCALATION | NTF | S04/S24 | S04 shared event/delivery foundation COMPLETE; reminder schedules and escalation behavior remain S24, NOT STARTED |
| R-060 | SCHEDULED SUMMARIES | NTF | S04/S24 | S24 delivery behavior NOT STARTED; S04 establishes shared event/delivery foundation |
| R-061 | EMPLOYEE PERFORMANCE | PER | S23 | NOT STARTED |
| R-062 | FAIR PERFORMANCE | PER | S23 | NOT STARTED |
| R-063 | PERFORMANCE EXPLAINABILITY | PER | S23 | NOT STARTED |
| R-064 | TEAM LEADER PERFORMANCE | PER | S23 | NOT STARTED |
| R-065 | PERFORMANCE REVIEW CYCLES | PER | S23 | NOT STARTED |
| R-066 | PROJECT HEALTH | HLT | S23 | NOT STARTED |
| R-067 | DELAY ATTRIBUTION | HLT | S23 | NOT STARTED |
| R-068 | SITE OPERATIONS | SITE | S20 | NOT STARTED |
| R-069 | DAILY SITE REPORT | SITE | S20 | NOT STARTED |
| R-070 | SITE PROGRESS | SITE | S20 | NOT STARTED |
| R-071 | MOBILE | FND/SITE | S22 | NOT STARTED |
| R-072 | DELIVERY STRATEGY | FND/SITE | S22 | NOT STARTED |
| R-073 | DASHBOARDS | DASH | S24 | NOT STARTED |
| R-074 | MANAGEMENT ACTION CENTER | DASH | S24 | NOT STARTED |
| R-075 | EXTERNAL PORTALS | PORT | S14/S21 | NOT STARTED |
| R-076 | PORTAL AUTHENTICATION: R-076.a external portal email-code authentication, R-076.b client passkey step-up for formal approval | PORT/IDN | S14/S21 | DEFERRED; S02 covers internal passkeys only |
| R-077 | REPORTS | RPT | S24 | NOT STARTED |
| R-078 | CUSTOM REPORT BUILDER | RPT | S26 | NOT STARTED |
| R-079 | AUDIT TRAIL | AUD | S04 | COMPLETE for development/local staging — canonical backfill and atomic S03 producer writes verified on PostgreSQL; details in S04_COMPLETION_REPORT.md |
| R-080 | IMMUTABILITY | AUD | S04 | COMPLETE for development/local staging — append-only controls, linked corrections, guarded expiry and tombstones verified on PostgreSQL; production legal/backup gates remain |
| R-081 | DELETION | APR/AUD | S05 | NOT STARTED |
| R-082 | AUTOMATION | AUT | S26 | NOT STARTED |
| R-083 | AUTOMATION SAFETY | AUT | S26 | NOT STARTED |
| R-084 | INTEGRATIONS | INT | S25 | NOT STARTED |
| R-085 | FUTURE WHATSAPP | INT | S25 | NOT STARTED |
| R-086 | FUTURE CAD/BIM | INT | S25 | NOT STARTED |
| R-087 | AI ARCHITECTURE | AI | S27 | NOT STARTED |
| R-088 | AI CAPABILITIES — FUTURE | AI | S27 | NOT STARTED |
| R-089 | AI SAFETY / HUMAN CONTROL | AI | S27 | NOT STARTED |
| R-090 | AI AUDITABILITY | AI | S27 | NOT STARTED |
| R-091 | BACKUP | FND | S01 | NOT STARTED |
| R-092 | CRITICAL DOMAIN INVARIANTS | ACC/AUD/PRJ/TSK/DOC/PER | S03/S09/S12/S14/S23/S26/S27 | S03 identity, membership, permission and branch-scope invariants COMPLETE; task/project/document/performance/automation/AI invariants await their slices |
| R-093 | ARCHITECTURE PRINCIPLES | GOV | S01 | NOT STARTED |
| R-094 | RECOMMENDED MODULE BOUNDARIES | GOV | S01 | NOT STARTED |
| R-095 | DOMAIN EVENTS | EVT | S04 | COMPLETE for development/local staging — versioned catalogue, safe payload validation, S03 producer/outbox atomicity, retries and concurrent claims verified on PostgreSQL |
| R-096 | SHARED APPROVAL ENGINE | APR | S05 | COMPLETE for development/local staging — typed internal handlers, persisted immutable decisions, audited lifecycle, atomic outbox and PostgreSQL concurrency/rollback evidence; see S05_COMPLETION_REPORT.md |
| R-097 | MANAGEMENT DECISION QUEUE | APR | S05 | COMPLETE for development/local staging — read-only paginated policy-filtered queue, responsive empty/error/loading UI and desktop/mobile browser evidence; no producer handlers until later authorized domain slices; see S05_COMPLETION_REPORT.md |
| R-098 | OFFLINE SITE DATA | SITE | S22 | NOT STARTED |
| R-099 | SECURITY: R-099.a internal passkey authentication, R-099.b session/CSRF/origin controls, R-099.c recovery, R-099.d throttling/enumeration, R-099.e authorization, R-099.f audit/secrets | IDN/ACC/AUD | S02/S03/S04 | Identity and S03 business-authorization subsets COMPLETE for development/local staging; S04 append-only audit and notification secret controls COMPLETE for development/local staging |
| R-100 | TESTING PHILOSOPHY | GOV | S01 | NOT STARTED |
| R-101 | BUG RULE | GOV | S01 | NOT STARTED |
| R-102 | DEFINITION OF DONE | GOV | S01 | NOT STARTED |
| R-103 | IMPLEMENTATION ORDER | GOV | S01–S27 | NOT STARTED |
| R-104 | FIRST REAL-WORLD PRODUCT CHECKPOINT | GOV/REV | S14 | NOT STARTED |
| R-105 | SECOND REAL-WORLD PRODUCT CHECKPOINT | GOV/SITE | S20 | NOT STARTED |
| R-106 | CONTEXT EFFICIENCY REQUIREMENTS | GOV | S01–S27 | NOT STARTED |
| R-107 | AI CODING MODEL USAGE | GOV | S01–S27 | NOT STARTED |
| R-108 | CHANGE CONTROL | GOV | S01–S27 | NOT STARTED |
| R-109 | DO NOT OVERENGINEER | GOV | S01–S27 | NOT STARTED |
| R-110 | COST PRINCIPLE | GOV | S01–S27 | NOT STARTED |
| R-111 | CURRENT BACKUP DECISION; superseded by approved offsite policy C-007 where inconsistent | GOV | S01–S27 | NOT STARTED |
| R-112 | THINGS NOT TO BUILD EARLY | GOV | S01–S27 | NOT STARTED |
| R-113 | YOUR FIRST TASK AFTER RECEIVING THIS PROMPT | GOV | S01–S27 | NOT STARTED |
| R-114 | STOP CONDITION FOR THIS FIRST PASS | GOV | S01–S27 | NOT STARTED |
| R-115 | FINAL OPERATING PRINCIPLE | GOV | S01–S27 | NOT STARTED |

## S06 authorization and initial implementation — 2026-09-27

Owner authorized S06. R-010.a–d and C-017.a–b/C-018.a–b/C-019.a–b are expanded in S06_SPEC.md. Persisted leads and clients, scoped APIs, immutable history, audit/events and responsive UI are implemented and verified. Source management under the Owner-approved separate grant and local-staging acceptance are verified; see S06_COMPLETION_REPORT.md. S07 is authorized and IN PROGRESS; S08+ remain unauthorized.

## S07A initial implementation — 2026-09-27

R-011.a, R-012.a, R-013.a, R-016.a–b and C-002 Q2/Q15 are expanded in S07_SPEC.md. Owner-only persisted Draft creation/read, baseline scopes, Won lead conversion, canonical audit/event/outbox and database safeguards are implemented and verified as the first increment. Project Lead assignment, scoped staff access, scope-change approval, status transitions and cancellation dependencies remain open. See S07_PROGRESS_REPORT.md.
