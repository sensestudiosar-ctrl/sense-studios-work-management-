# Approved requirement traceability

Source of truth: requirements/APPROVED_REQUIREMENTS.md, exact copy of the owner attachment (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). Each R-### ID maps to the source section of the same number. Approved addendum C-001 in requirements/CLARIFICATIONS.md supersedes the source only for the organizational hierarchy: Organization → Branch → Team → Employee, no separate Brand model or Department tier, one owning branch per project, and explicit cross-branch assignment. C-002 records the Owner answers to Q1–Q15. C-003–C-024 record later approved retention, leave, scoring, CAD sharing, backup, identity, notification and cancellation-task decisions. No owner question is currently open; the section-level consistency review is complete in FINAL_PRE_IMPLEMENTATION_REVIEW.md, while explicit architecture approval remains pending. See REQUIREMENT_QUESTIONS.md and DECISIONS.md.

This is a coverage index, not an implementation claim. Each section can contain several clauses. Before implementing a slice, expand its clauses into stable sub-IDs (for example R-024.a), API/backend and UI acceptance criteria, permissions, tests and evidence in that slice's issue/plan. Cross-cutting source sections stay linked to every relevant slice. No source section is dropped.

| Requirement ID | Source section | Planned module | Planned slice(s) | Status |
| --- | --- | --- | --- | --- |
| C-001 | Approved clarification: Branch-only organization hierarchy; overrides organizational terminology in R-004, R-006, R-007, R-092–R-094, R-103 and R-113 | ORG/ACC/PRJ | S03/S07 | APPROVED DECISION; NOT IMPLEMENTED |
| C-002 | Approved Q1–Q15 answers, further specified by C-003–C-024 | ORG/ACC/PRJ/DOC/PORT/WFM/PER | S01/S03–S07/S09–S10/S12/S14/S16–S17/S19/S21/S23 | APPROVED; NOT IMPLEMENTED |
| C-003 | Q8 category retention durations; C-009 fixes clock and expiry policy; legal/contract validation remains a release gate | ORG/AUD/DOC/WFM/APR | S03–S05/S11/S17 | APPROVED; NOT IMPLEMENTED |
| C-004 | Branch leave-year, credit, proration, carry-forward and expiry | WFM | S17 | APPROVED; NOT IMPLEMENTED |
| C-005 | Role-group employee and Design/Turnkey health formulas; Owner-approved initial weights | PER/HLT | S23 | APPROVED; NOT IMPLEMENTED |
| C-006 | Owner-issued file-specific native CAD links for assigned vendors/consultants | DOC/PORT/ACC | S11/S21 | APPROVED; NOT IMPLEMENTED |
| C-007 | Nightly encrypted database-and-file backup to separate offsite computer/NAS; one-day loss target | FND/DOC | S01/S11 | APPROVED; NOT IMPLEMENTED |
| C-008 | Staff passkeys, external email codes, client approval passkey, Brevo and launch channels | IDN/PORT/NTF | S02/S04/S14 | APPROVED; NOT IMPLEMENTED |
| C-009 | Retention clock anchors, scheduled expiry, notice and holds | AUD/DOC/WFM | S04/S11/S17 | APPROVED; NOT IMPLEMENTED |
| C-010 | Owner-only cancellation from Draft/Active/On Hold with reason and audit | PRJ/ACC/APR | S05/S07/S09 | APPROVED; NOT IMPLEMENTED |
| C-011 | Stop unfinished delivery tasks on project cancellation; preserve history; permit distinct linked closeout tasks | PRJ/TSK/NTF | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-012 | Vendor/consultant access ends at project cancellation; Owner revokes active native CAD links first; closeout access requires separate approval | PRJ/ACC/DOC/PORT | S09/S21 | APPROVED; NOT IMPLEMENTED |
| C-013 | Cancelled-project client portal is read-only for previously issued PDF/images and own approval history; no new review/comment/approval | PRJ/ACC/DOC/PORT/REV | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-014 | Cancelled-project client read-only access expires automatically after an Owner-chosen period; Owner may approve an extension | ACC/DOC/PORT | S14 | APPROVED; NOT IMPLEMENTED |
| C-015 | Owner sets a separate required expiry for each client project-access grant at cancellation; no shared period | PRJ/ACC/PORT | S09/S14 | APPROVED; NOT IMPLEMENTED |
| C-016 | Assigned Project Lead or explicitly authorized Team Leader approves ordinary closeout tasks and scoped time-limited vendor/consultant access; Owner alone issues CAD links | PRJ/TSK/ACC/PORT | S09/S21 | APPROVED; NOT IMPLEMENTED |
| C-017 | Authorized lead handler may jump forward over unused sales stages with required reason and audited skipped-stage evidence | CRM/AUD | S06 | APPROVED; NOT IMPLEMENTED |
| C-018 | Returning Lost enquiry creates a new linked lead; prior Lost outcome and history remain intact | CRM/AUD/ACC | S06 | APPROVED; NOT IMPLEMENTED |
| C-019 | Authorized handler may move a nonterminal lead to an earlier nonterminal stage with reason and preserved history | CRM/AUD/ACC | S06 | APPROVED; NOT IMPLEMENTED |
| C-020 | Project Lead/authorized Team Leader appoints a named snag verifier independent of the fixer; verification attempts retain evidence | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-021 | Assigned Project Lead/explicitly authorized Team Leader makes a separate Closed decision after passed snag verification | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-022 | Approved-leave cancellation requires same-level management decision; reversal retains ledger and capacity history | WFM/APR/AUD/NTF | S17 | APPROVED; NOT IMPLEMENTED |
| C-023 | Employee exit immediately revokes access; unfinished tasks wait for individual authorized reassignment | ORG/ACC/TSK/AUD/NTF | S03/S09 | APPROVED; NOT IMPLEMENTED |
| C-024 | Exiting Project Lead puts Active project On Hold; Owner names replacement before resume | ORG/PRJ/ACC/AUD/NTF | S03/S07 | APPROVED; NOT IMPLEMENTED |
| R-001 | FIRST INSTRUCTION | GOV | S01 | NOT STARTED |
| R-002 | PRODUCT VISION | PRJ | S07 | NOT STARTED |
| R-003 | IMPORTANT PRODUCT BOUNDARY | INT | S16/S25 | NOT STARTED |
| R-004 | ORGANIZATION MODEL | ORG | S03 | NOT STARTED |
| R-005 | USER TYPES | IDN | S02 | NOT STARTED |
| R-006 | PERMISSION MODEL | ACC/ORG | S03 | NOT STARTED |
| R-007 | OWNER | ACC/ORG | S03 | NOT STARTED |
| R-008 | TEAM LEADER | ACC/ORG | S03 | NOT STARTED |
| R-009 | EMPLOYEE | ACC/ORG | S03 | NOT STARTED |
| R-010 | LEAD MANAGEMENT | CRM | S06 | NOT STARTED |
| R-011 | PROJECT DELIVERY TYPES | PRJ | S07 | NOT STARTED |
| R-012 | PROJECT SERVICE SCOPES | PRJ | S07 | NOT STARTED |
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
| R-058 | NOTIFICATIONS | NTF | S04/S24 | NOT STARTED |
| R-059 | REMINDERS & ESCALATION | NTF | S04/S24 | NOT STARTED |
| R-060 | SCHEDULED SUMMARIES | NTF | S04/S24 | NOT STARTED |
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
| R-076 | PORTAL AUTHENTICATION | PORT | S14/S21 | NOT STARTED |
| R-077 | REPORTS | RPT | S24 | NOT STARTED |
| R-078 | CUSTOM REPORT BUILDER | RPT | S26 | NOT STARTED |
| R-079 | AUDIT TRAIL | AUD | S04 | NOT STARTED |
| R-080 | IMMUTABILITY | AUD | S04 | NOT STARTED |
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
| R-092 | CRITICAL DOMAIN INVARIANTS | ACC/AUD/PRJ/TSK/DOC/PER | S03/S09/S12/S14/S23/S26/S27 | NOT STARTED |
| R-093 | ARCHITECTURE PRINCIPLES | GOV | S01 | NOT STARTED |
| R-094 | RECOMMENDED MODULE BOUNDARIES | GOV | S01 | NOT STARTED |
| R-095 | DOMAIN EVENTS | EVT | S04 | NOT STARTED |
| R-096 | SHARED APPROVAL ENGINE | APR | S05 | NOT STARTED |
| R-097 | MANAGEMENT DECISION QUEUE | APR | S05 | NOT STARTED |
| R-098 | OFFLINE SITE DATA | SITE | S22 | NOT STARTED |
| R-099 | SECURITY | IDN/ACC | S02/S03 | NOT STARTED |
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
