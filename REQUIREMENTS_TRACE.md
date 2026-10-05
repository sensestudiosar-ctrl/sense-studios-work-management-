# Approved requirement traceability

Source of truth: requirements/APPROVED_REQUIREMENTS.md, exact copy of the Owner source (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). C-001 approves Organization → Branch → Team → Employee, no Brand model, one owning branch per project and explicit cross-branch assignments. C-002 records Q1–Q15 answers; C-003–C-024 record later Owner decisions. The Owner approved the architecture at checkpoint 2e46805. S01–S13 are COMPLETE for development/local staging; S14 is COMPLETE for development/local staging; S15 is COMPLETE for development/local staging; S16 is COMPLETE for development/local staging; S17 is COMPLETE for development/local staging; S18 remains unresolved/excluded; S21 is COMPLETE for development/local staging; S22 is COMPLETE for development/local staging; S23–S27 remain unauthorized.

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
| C-001 | Approved clarification: Branch-only organization hierarchy; overrides organizational terminology in R-004, R-006, R-007, R-092–R-094, R-103 and R-113 | ORG/ACC/PRJ | S03/S07 | APPROVED; S03 organization hierarchy and S07 project ownership COMPLETE |
| C-002 | Approved Q1–Q15 answers, further specified by C-003–C-024 | ORG/ACC/PRJ/DOC/PORT/WFM/PER | S01/S03–S07/S09–S10/S12/S14/S16–S17/S19/S21/S23 | APPROVED; Q1/Q15 implemented in S03; remaining owner policies belong to later slices |
| C-003 | Q8 category retention durations; C-009 fixes clock and expiry policy; legal/contract validation remains a release gate | ORG/AUD/DOC/WFM/APR | S03–S05/S11/S17 | APPROVED; S04 audit retention controls COMPLETE for development/local staging; legal/contract/backup validation is a production gate; other categories later |
| C-004 | Branch leave-year, credit, proration, carry-forward and expiry | WFM | S17 | APPROVED; implemented and verified in S17 for development/local staging. See S17_COMPLETION_REPORT.md. |
| C-005 | Role-group employee and Design/Turnkey health formulas; Owner-approved initial weights | PER/HLT | S23 | AUTHORIZED / IN PROGRESS; implemented configuration/no-score/prospective version gates, acceptance pending in S23_SPEC.md |
| C-006 | Owner-issued file-specific native CAD links for assigned vendors/consultants | DOC/PORT/ACC | S11/S21 | S21 COMPLETE for development/local staging: Owner-only coded seven-day native links, encrypted details and manual revocation evidence; MinisCloud production validation remains open |
| C-007 | Nightly encrypted database-and-file backup to separate offsite computer/NAS; one-day loss target | FND/DOC | S01/S11 | APPROVED; NOT IMPLEMENTED |
| C-008 | Staff passkeys, external email codes, client approval passkey, Brevo and launch channels | IDN/PORT/NTF | S02/S04/S14 | S02 staff passkeys and S14 CLIENT email-code/passkey flows COMPLETE for development/local staging; Brevo delivery, domain authentication, plan limits and outage fallback remain pre-launch validation gates per S14_SPEC.md |
| C-009 | Retention clock anchors, scheduled expiry, notice and holds | AUD/DOC/WFM | S04/S11/S17 | APPROVED; S04 audit controls COMPLETE for development/local staging; legal/contract and backup validation remain production gates; other categories later |
| C-010 | Owner-only cancellation from Draft/Active/On Hold with reason and audit | PRJ/ACC/APR | S05/S07/S09 | S09 COMPLETE for development/local staging; verified in final S09 acceptance |
| C-011 | Stop unfinished delivery tasks on project cancellation; preserve history; permit distinct linked closeout tasks | PRJ/TSK/NTF | S09/S14 | S09 internal task-stop/history and closeout approval COMPLETE for development/local staging; S14 client portal cancellation consequences COMPLETE; S21 vendor/consultant cancellation and separate closeout integration is implemented; development/local-staging acceptance passed; see S21_COMPLETION_REPORT.md |
| C-012 | Vendor/consultant access ends at project cancellation; Owner revokes active native CAD links first; closeout access requires separate approval | PRJ/ACC/DOC/PORT | S09/S21 | S21 COMPLETE for development/local staging: pending cancellation blocker and ordinary external grant revocation are in scope; final local evidence passed; production native-link behavior remains unverified |
| C-013 | Cancelled-project client portal is read-only for previously issued PDF/images and own approval history; no new review/comment/approval | PRJ/ACC/DOC/PORT/REV | S09/S14 | S14 COMPLETE for development/local staging: pending reviews withdraw atomically; retained clients can access only previously issued scoped PDF/images and their own approval history; new review actions are denied. See S14_COMPLETION_REPORT.md. |
| C-014 | Cancelled-project client read-only access expires automatically after an Owner-chosen period; Owner may approve an extension | ACC/DOC/PORT | S14 | S14 COMPLETE for development/local staging: each retained client grant has an explicit Owner-set future end time; reasoned shortening, extension and revocation are audited. See S14_COMPLETION_REPORT.md. |
| C-015 | Owner sets a separate required expiry for each client project-access grant at cancellation; no shared period | PRJ/ACC/PORT | S09/S14 | S14 client-grant expiry COMPLETE for development/local staging; S21 separate vendor/consultant grant integration is implemented; development/local-staging acceptance passed; see S21_COMPLETION_REPORT.md. See S14_COMPLETION_REPORT.md. |
| C-016 | Assigned Project Lead or explicitly authorized Team Leader approves ordinary closeout tasks and scoped time-limited vendor/consultant access; Owner alone issues CAD links | PRJ/TSK/ACC/PORT | S09/S21 | S09 internal closeout task approval COMPLETE; S21 finite exact external closeout grant is COMPLETE for development/local staging |
| C-017 | Authorized lead handler may jump forward over unused sales stages with required reason and audited skipped-stage evidence | CRM/AUD | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-018 | Returning Lost enquiry creates a new linked lead; prior Lost outcome and history remain intact | CRM/AUD/ACC | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-019 | Authorized handler may move a nonterminal lead to an earlier nonterminal stage with reason and preserved history | CRM/AUD/ACC | S06 | COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| C-020 | Project Lead/authorized Team Leader appoints a named snag verifier independent of the fixer; verification attempts retain evidence | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-021 | Assigned Project Lead/explicitly authorized Team Leader makes a separate Closed decision after passed snag verification | SITE/ACC/AUD | S20 | APPROVED; NOT IMPLEMENTED |
| C-022 | Approved-leave cancellation requires same-level management decision; reversal retains ledger and capacity history | WFM/APR/AUD/NTF | S17 | APPROVED; implemented and verified in S17 for development/local staging. See S17_COMPLETION_REPORT.md. |
| C-023 | Employee exit immediately revokes access; unfinished tasks wait for individual authorized reassignment | ORG/ACC/TSK/AUD/NTF | S03/S09 | S09 atomic exit revocation, task waits and reassignment gate COMPLETE for development/local staging |
| C-024 | Exiting Project Lead puts Active project On Hold; Owner names replacement before resume | ORG/PRJ/ACC/AUD/NTF | S03/S07/S09 | S09 atomic employee-exit project hold and Owner replacement gate COMPLETE for development/local staging |
| R-001 | FIRST INSTRUCTION | GOV | S01 | NOT STARTED |
| R-002 | PRODUCT VISION | PRJ | S07+ | S07 project ownership foundation COMPLETE; later delivery modules remain planned |
| R-003 | IMPORTANT PRODUCT BOUNDARY | INT | S16/S25 | NOT STARTED |
| R-004 | ORGANIZATION MODEL | ORG/PRJ | S03/S07 | S03 hierarchy/membership and S07 explicit project assignment COMPLETE |
| R-005 | USER TYPES: R-005.a Owner identity, R-005.b staff identity, R-005.c external portal identities, R-005.d public visitor | IDN/PORT | S02/S14/S15/S21 | Owner/Staff identity and CLIENT portal identity COMPLETE for their development/local-staging scopes; S15 public visitor access is anonymous and COMPLETE for development/local staging; S21 distinct EXTERNAL Consultant/Vendor/Factory identity is implemented; development/local-staging acceptance passed; see S21_COMPLETION_REPORT.md |
| R-006 | PERMISSION MODEL | ACC/ORG/PRJ | S03/S07 | S03 scoped grants/evaluator and S07 project assignment plus permission checks COMPLETE |
| R-007 | OWNER: R-007.a authentication identity, R-007.b organization authority, R-007.c account recovery/security duties | IDN/ACC/ORG | S02/S03 | Identity portions of R-007.a/c implemented in S02 for development/local staging; organization authority and business permissions implemented in S03 |
| R-008 | TEAM LEADER | ACC/ORG | S03 | S03 COMPLETE: explicit Team-scoped report-tree listing and reporting updates; no title-based authority |
| R-009 | EMPLOYEE | ACC/ORG | S03/S09 | S03 identity-linked home membership and scoped Team UI plus S09 own/assigned task APIs COMPLETE for development/local staging |
| R-010 | LEAD MANAGEMENT | CRM | S06 | R-010.a–d COMPLETE for development/local staging; see S06_COMPLETION_REPORT.md |
| R-011 | PROJECT DELIVERY TYPES | PRJ | S07 | S07 COMPLETE: Design/Turnkey project delivery type separate from service scopes |
| R-012 | PROJECT SERVICE SCOPES | PRJ | S07 | S07 COMPLETE: immutable baseline and S05-backed named approval for additions |
| R-013 | PROJECT ACCOUNTABILITY | PRJ | S07 | S07 COMPLETE: one current eligible Active Project Lead, assignment and lead history |
| R-014 | DESIGN PROJECT DEFAULT WORKFLOW | PRJ/TMP | S08 | S08 supported template/default scope COMPLETE; dependent runtime behavior remains with later slices; see S08_COMPLETION_REPORT.md |
| R-015 | TURNKEY DEFAULT WORKFLOW | PRJ/TMP | S08 | S08 supported template/default scope COMPLETE; dependent runtime behavior remains with later slices; see S08_COMPLETION_REPORT.md |
| R-016 | PROJECT STATUS STATE MACHINE | PRJ/TMP | S07/S08/S09 | S07 lifecycle, S08 template gates and S09 Owner-only effective cancellation COMPLETE for development/local staging |
| R-017 | PROJECT TEMPLATES | PRJ/TMP | S08 | S08 supported template scope COMPLETE; see S08_COMPLETION_REPORT.md |
| R-018 | TASK OWNERSHIP | TSK | S09 | S09 owner/collaborator persistence and scoped assignment COMPLETE for development/local staging |
| R-019 | TASK CREATION | TSK | S09 | S09 self-task and authorized assignment API/UI COMPLETE for development/local staging |
| R-020 | TASK TYPES | TSK | S09/S10 | S09 task types persisted; S10F implements timezone-aware DAILY/WEEKLY/MONTHLY recurrence for existing RECURRING source tasks. Review/site/training execution remains deferred to owning slices. |
| R-021 | TASK FIELDS | TSK | S09/S10 | S09 required/optional task metadata and task views; S10F adds reasoned recurrence rules, pause/resume and generated occurrences. Attachments and later workflow fields remain deferred per owning specs. |
| R-022 | TASK PRIORITIES | TSK | S09 | S09 priorities persisted and visible; Critical escalation deferred to S24; S09 COMPLETE |
| R-023 | TASK DATES | TSK | S09/S10 | R-023.a operational target date in S09; R-023.b controlled committed-date setting/change history in S10B; R-023.c current-primary-owner extension request with employee-selected eligible scoped manager/Owner decision and Owner withdrawal implemented in S10D. S10 whole-slice acceptance passed. |
| R-024 | TASK STATE MACHINE | TSK | S09/S10/S13/S14 | S09/S10 task states and internal S13 review transitions COMPLETE for authorized development/local-staging scope; S14 client-review transitions and correction resume are COMPLETE for development/local staging |
| R-025 | WAITING / BLOCKED WORK | TSK | S10 | S10A ordinary Waiting/resume R-025.a–b; S10C per-Waiting-task dependency-completion notice R-025.d; S10E Owner-configured per-Team ordinary Waiting notices R-025.c with delivery-time state/access rechecks. Forced-exit notices remain separate. |
| R-026 | DEPENDENCIES | TSK | S10 | S10C same-project finish-to-start edges, cycle denial, reasoned edits and explicit early-start warning/evidence. Cross-project links remain deferred by Owner decision; see S10_SPEC.md. |
| R-027 | INTERNAL REVIEWS | REV | S13 | COMPLETE for development/local staging; scoped task submission, independent authorized reviewer, decision, comment/annotation, escalation and exact R revision evidence; see S13_COMPLETION_REPORT.md |
| R-028 | CORRECTION LOOP | REV | S13 | COMPLETE for development/local staging; immutable submission/rounds, separately assigned correction tasks, resubmission and exit recovery; see S13_COMPLETION_REPORT.md |
| R-029 | CORRECTION SEVERITY | REV | S13 | COMPLETE for development/local staging; four severities and Owner-managed categories with retained historical identity; see S13_COMPLETION_REPORT.md |
| R-030 | REVISION NUMBERING | DOC | S12 | S12 COMPLETE for development/local staging: immutable checksum-bound R0/R1/CR1 series and concurrent numbering; see S12_COMPLETION_REPORT.md |
| R-031 | CLIENT REVISION CLASSIFICATION | REV/PORT | S14 | COMPLETE for S14 development/local staging: Owner/explicitly authorized Team Leader records only Preference / New Requirement or Employee Work Error with audited version history. Classification does not itself alter performance scores. Independent CR files require their own internal review; correction assignment is limited to Owner, assigned Project Lead or explicitly authorized Team Leader with reason/audit. |
| R-032 | CLIENT PORTAL REVIEW | REV/PORT | S14 | COMPLETE for S14 development/local staging: Immutable exact-snapshot packages/items, item grants, explicit review start, comments/annotations, private PDF/image references and item decisions implemented. Client approval does not create an issue fact until Primary final batch approval. |
| R-033 | CLIENT APPROVAL AUTHORITY | REV/PORT | S14 | COMPLETE for S14 development/local staging: Owner-only Primary appointment/replacement with reason/audit; Additional approval delegation is item-specific. Final exact-batch approval is Primary-only; an item decision alone creates no S12 fact. |
| R-034 | CLIENT APPROVAL EVIDENCE | REV/PORT | S14 | COMPLETE for S14 development/local staging: Item and Primary final evidence bind exact snapshot/revision, signature consent and passkey credential; exact Primary batch creates canonical client facts for S12. |
| R-035 | FILE MANAGEMENT | DOC | S11 | S11 base COMPLETE for development/local staging; revisions/issue remain S12 |
| R-036 | NAS ARCHITECTURE | DOC | S11 | S11 base COMPLETE for development/local staging; production NAS validation remains a gate |
| R-037 | DOCUMENT STATES | DOC | S12/S13/S14 | S12 exact internal approval consumer and atomic current/superseded states plus S13 exact-R internal approval producer COMPLETE for development/local staging; S14 Primary final exact-batch client producer is COMPLETE for development/local staging |
| R-038 | TRANSMITTALS | DOC | S12 | S12 and S14 internal/CLIENT issue and acknowledgement COMPLETE for their scopes; external exact issue/own-recipient acknowledgement is COMPLETE for S21 development/local staging |
| R-039 | FILE SECURITY | DOC/ACC | S11 | S11 and S14 local scopes COMPLETE; S21 exact external resource/file checks COMPLETE for development/local staging; production NAS validation remains a gate |
| R-040 | PROJECT GALLERIES | DOC | S15 | COMPLETE for development/local staging — R-040.a–c and settled Owner policies implemented; see S15_SPEC.md and S15_COMPLETION_REPORT.md |
| R-041 | TIME TRACKING | TIM | S16 | COMPLETE — development/local staging |
| R-042 | TIME LOG EDITING | TIM | S16 | COMPLETE — development/local staging |
| R-043 | ACCOUNTING INTEGRATION | TIM | S16 | S16 local HTTP time transfer COMPLETE; later procurement/production binding pending |
| R-044 | SKILLS | SKL | S18 | NOT STARTED |
| R-045 | TRAINING AND SKILL CHANGES | SKL | S18 | NOT STARTED |
| R-046 | WORK SCHEDULE & CAPACITY | WFM | S17 | COMPLETE — development/local staging |
| R-047 | TASK EFFORT ALLOCATION | WFM | S17 | COMPLETE — development/local staging |
| R-048 | WORKLOAD | WFM | S17 | COMPLETE — development/local staging |
| R-049 | LEAVE | WFM | S17 | COMPLETE — development/local staging |
| R-050 | LEAVE IMPACT | WFM | S17 | COMPLETE — development/local staging |
| R-051 | ATTENDANCE | WFM | S17 | COMPLETE — development/local staging |
| R-052 | AUTOMATIC ASSIGNMENT / RECOMMENDATIONS | AI/TSK | S27 | NOT STARTED |
| R-053 | ASSIGNMENT OUTPUT | AI/TSK | S27 | NOT STARTED |
| R-054 | ASSIGNMENT SAFETY | AI/TSK | S27 | NOT STARTED |
| R-055 | SOP MANAGEMENT | KNW/TRN | S18 | NOT STARTED |
| R-056 | KNOWLEDGE BASE | KNW/TRN | S18 | NOT STARTED |
| R-057 | TRAINING | KNW/TRN | S18 | NOT STARTED |
| R-058 | NOTIFICATIONS | NTF | S04/S24 | S04 core in-app/email, verified-mailbox, preference, quiet-hours and delivery foundation COMPLETE for development/local staging; S03 events remain notification-neutral pending later event recipient/template definitions; push later |
| R-059 | REMINDERS & ESCALATION | NTF | S04/S24 | S04 shared event/delivery foundation COMPLETE; reminder schedules and escalation behavior remain S24, NOT STARTED |
| R-060 | SCHEDULED SUMMARIES | NTF | S04/S24 | S24 delivery behavior NOT STARTED; S04 establishes shared event/delivery foundation |
| R-061 | EMPLOYEE PERFORMANCE | PER | S23 | IN PROGRESS; available real-source role-group formulas and quality/low-weight safeguards implemented, acceptance pending |
| R-062 | FAIR PERFORMANCE | PER | S23 | IN PROGRESS; historical approved deadline and Owner-reviewed residual external-duration exclusions implemented, acceptance pending |
| R-063 | PERFORMANCE EXPLAINABILITY | PER | S23 | IN PROGRESS; retained exact evidence, changes/trends, goals/actions and scoped own/management views implemented; S18 suggestions explicitly unavailable; acceptance pending |
| R-064 | TEAM LEADER PERFORMANCE | PER | S23 | IN PROGRESS; separate personally controlled leader evidence and current scopes implemented, acceptance pending |
| R-065 | PERFORMANCE REVIEW CYCLES | PER | S23 | IN PROGRESS; weekly/monthly/quarterly/annual cycles, comments/goals/actions, own acknowledgement and Owner finalization implemented, acceptance pending |
| R-066 | PROJECT HEALTH | HLT | S23 | IN PROGRESS; separate Design/Turnkey formulas, status and real-source operational health evidence implemented, acceptance pending |
| R-067 | DELAY ATTRIBUTION | HLT | S23 | IN PROGRESS; explicit Owner-reviewed exact-source cause/duration and retained corrections implemented, acceptance pending |
| R-068 | SITE OPERATIONS | SITE | S20 | NOT STARTED |
| R-069 | DAILY SITE REPORT | SITE | S20 | NOT STARTED |
| R-070 | SITE PROGRESS | SITE | S20 | NOT STARTED |
| R-071 | MOBILE | FND/SITE | S22 | COMPLETE for development/local staging — offline site subclause R-071/S22.a in S22_SPEC.md; existing mobile flows retain their owning slice |
| R-072 | DELIVERY STRATEGY | FND/SITE | S22 | COMPLETE for development/local staging — R-072.a installable responsive PWA; R-072.b native wrapper deferred |
| R-073 | DASHBOARDS | DASH | S24 | NOT STARTED |
| R-074 | MANAGEMENT ACTION CENTER | DASH | S24 | NOT STARTED |
| R-075 | EXTERNAL PORTALS | PORT | S14/S21 | S14 CLIENT portal COMPLETE for development/local staging; consultant/vendor/factory portal subclauses R-075/S21.a–f are COMPLETE for development/local staging |
| R-076 | PORTAL AUTHENTICATION: R-076.a external portal email-code authentication, R-076.b client passkey step-up for formal approval | PORT/IDN | S14/S21 | S14 CLIENT email-code/session and passkey formal approval COMPLETE; separate EXTERNAL OTP/session and device revocation R-076/S21.a–b are COMPLETE for development/local staging |
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
| R-092 | CRITICAL DOMAIN INVARIANTS | ACC/AUD/PRJ/TSK/DOC/PER | S03/S09/S12/S14/S23/S26/S27 | S03 identity/membership/permission, S07–S09 project/task scope, state and audit invariants COMPLETE for development/local staging; document/performance/automation/AI invariants remain with their slices |
| R-093 | ARCHITECTURE PRINCIPLES | GOV | S01 | NOT STARTED |
| R-094 | RECOMMENDED MODULE BOUNDARIES | GOV | S01 | NOT STARTED |
| R-095 | DOMAIN EVENTS | EVT | S04 | COMPLETE for development/local staging — versioned catalogue, safe payload validation, S03 producer/outbox atomicity, retries and concurrent claims verified on PostgreSQL |
| R-096 | SHARED APPROVAL ENGINE | APR | S05 | COMPLETE for development/local staging — typed internal handlers, persisted immutable decisions, audited lifecycle, atomic outbox and PostgreSQL concurrency/rollback evidence; see S05_COMPLETION_REPORT.md |
| R-097 | MANAGEMENT DECISION QUEUE | APR | S05 | COMPLETE for development/local staging — read-only paginated policy-filtered queue, responsive empty/error/loading UI and desktop/mobile browser evidence; no producer handlers until later authorized domain slices; see S05_COMPLETION_REPORT.md |
| R-098 | OFFLINE SITE DATA | SITE | S22 | COMPLETE for development/local staging — R-098.a–f commands/photos/notes/snags/report drafts/manpower/progress with explicit conflict/replay guards; R-098.g time information deferred under phased source allowance; S22_SPEC.md |
| R-099 | SECURITY: R-099.a internal passkey authentication, R-099.b session/CSRF/origin controls, R-099.c recovery, R-099.d throttling/enumeration, R-099.e authorization, R-099.f audit/secrets | IDN/ACC/AUD | S02/S03/S04 | Identity and S03 business-authorization subsets COMPLETE for development/local staging; S04 append-only audit and notification secret controls COMPLETE for development/local staging |
| R-100 | TESTING PHILOSOPHY | GOV | S01 | NOT STARTED |
| R-101 | BUG RULE | GOV | S01 | NOT STARTED |
| R-102 | DEFINITION OF DONE | GOV | S01 | NOT STARTED |
| R-103 | IMPLEMENTATION ORDER | GOV | S01–S27 | NOT STARTED |
| R-104 | FIRST REAL-WORLD PRODUCT CHECKPOINT | GOV/REV | S14 | COMPLETE for S14 development/local staging: local portal/review/approval/issue/handover flows implemented; staff browser/regression and local Design-project checkpoint acceptance passed; production adoption remains a later gate |
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

Owner authorized S06. R-010.a–d and C-017.a–b/C-018.a–b/C-019.a–b are expanded in S06_SPEC.md. Persisted leads and clients, scoped APIs, immutable history, audit/events and responsive UI are implemented and verified. Source management under the Owner-approved separate grant and local-staging acceptance are verified; see S06_COMPLETION_REPORT.md. S07–S13 are COMPLETE for development/local staging; S14 is COMPLETE for development/local staging; S15 is COMPLETE for development/local staging; S16 is COMPLETE for development/local staging; S17 is COMPLETE for development/local staging; S18 onward remain unauthorized.

## S07A initial implementation — 2026-09-27

R-011.a, R-012.a, R-013.a, R-016.a–b and C-002 Q2/Q15 are expanded in S07_SPEC.md. Owner-only persisted Draft creation/read, baseline scopes, Won lead conversion, canonical audit/event/outbox and database safeguards are implemented and verified as the first increment. Project Lead assignment, scoped staff access, scope-change approval, status transitions and cancellation dependencies remain open. See S07_PROGRESS_REPORT.md.

## S07 completion — 2026-09-28

R-011.a, R-012.a–b, R-013.a and the S07 portion of R-016.a–b, C-002 Q2/Q15 and C-024.a are implemented with branch-owned persistence, exact Won conversion, explicit grants, Project Lead and transfer history, named scope approval, reasoned lifecycle, cancellation requests and the lead-exit hold primitive. Effective cancellation and atomic employee exit were completed and verified in S09. S08 template/milestone gates are COMPLETE. See S07_COMPLETION_REPORT.md for historical S07 evidence and precise limits.

## S09 completion — 2026-09-28

The authorized S09 portions of R-018.a–b, R-019.a–c, R-020.a, R-021.a–b, R-022.a–b, R-023.a, R-024.a–b, C-010/C-011.a–b/C-016.a/C-023.a–b/C-024.a are verified for development/local staging. S09 delivers task schema, scoped backend/API, responsive own/assigned UI, reasoned state and assignment history, audit/events/outbox, Owner-only cancellation with atomic unfinished-task stops, internal closeout approval/revocation, and atomic employee exit with account/session/grant revocation, task Waiting/reassignment gate, and Active lead project hold/Owner replacement. Historical S09 boundary: C-012 vendor/consultant access and CAD links, C-013–C-015 client cancellation access/expiry, and C-016.b external closeout grants were absent from the S09 schema. S14 subsequently completed C-013–C-015 client portal behavior; vendor/consultant access, CAD links and external closeout grants remain S21 scope. Committed due dates/dependencies/recurrence remain S10; review execution is COMPLETE for S13/S14 scope; Critical escalation remains S24. S09_SPEC.md identifies the original implemented and deferred sub-clauses.

Historical S09 acceptance snapshot (superseded for current slice status): at S09 acceptance, `pnpm verify` exited 0: 108 API unit, 51 web unit, 91 PostgreSQL/API, and 13 Playwright tests. The final UI increment also passed the 52-test web suite, web typecheck/lint/build, and two task Playwright journeys. Later S10–S17 completion and progress evidence is recorded in their own reports. S14 is COMPLETE for development/local staging; S17 is COMPLETE for development/local staging; S18 onward remain unauthorized. Production gates remain separate.

## S13 completion — 2026-09-30

The Owner-authorized S13 portions of R-024.a, R-027.a–b, R-028.a–b, R-029.a–b and R-037 are COMPLETE for development/local staging. S13 delivers task-bound internal reviews and correction loops, independent reviewer authorization, exact R revision approval evidence, immutable structured annotations/markup references, reasoned escalation/withdrawal, exit-reassignment recovery, and separately authorized reviewer priority/deadline changes. At S13 completion, client review, client approval, portal access and external delivery were planned S14 scope; S14 subsequently completed those approved client workflows for development/local staging. See S13_SPEC.md, S13_COMPLETION_REPORT.md and S14_COMPLETION_REPORT.md.

## S14 completion — 2026-10-01

S14 implements separate CLIENT identity/OTP/session/passkey enrollment and step-up; Owner-only reasoned Primary appointment/replacement; versioned project and explicit item grants; immutable review packages/items; structured annotations/private references; item decisions and Primary final exact-batch approval; classification and reasoned correction assignment; cancellation withdrawal, individual grant expiry and retained scoped reads; and S12 issue/handover integration. Fresh 69-migration deployment and populated S13 upgrade preserved the old-column digest across 86 tables (`99F286FB72C154E6928F95647D2DD7AA5B0D446755A32CDD18D832A7AFC44B31`). Final pnpm verify exited 0: 154 API unit, 82 web unit, 170 integration and 27 serial desktop/mobile cases plus typecheck, lint and builds. Six optional S12 cases were skipped; all S14 acceptance suites ran. The final visual refinement passed lint, web build and four S14 browser cases. The persisted local Design handover checkpoint and Sol security review passed. See S14_COMPLETION_REPORT.md.

## S16 accepted implementation trace — 2026-10-02

R-041.a–d maps to persistent timer transitions and manual/project/task/stage/non-project entry fields; R-042.a–c maps to immutable reasoned versions, scoped management and one-open-timer uniqueness; R-043.a maps to approved immutable delivery snapshots and HTTP receiver/worker replay; R-043.b–c defers procurement and avoids accounting/payroll duplication. C-002 Q9 maps to exact-version approval locking and management correction/reapproval. See S16_SPEC.md for approved scope and S16_COMPLETION_REPORT.md for final verification. S17 is COMPLETE for development/local staging; S18 onward remain unauthorized.


## S17 implementation checkpoint — 2026-10-02

S17 expands R-046.a–b, R-047.a, R-048.a–b, R-049.a–d, R-050.a–b and R-051.a–c in S17_SPEC.md. C-004 maps to persisted January upfront reconciliation, historical policy/calendar proration and exact carry/debit/reversal snapshots; C-022 maps to same-level future-only cancellation; C-003/C-009 map to capture 90-day expiry, advance notice, holds and durable scheduled deletion. Final trace acceptance is COMPLETE for development/local staging; see S17_COMPLETION_REPORT.md.


## S17 final local acceptance — 2026-10-02

S17 is COMPLETE for development/local staging. Final9 pnpm verify exited0:172 API unit,99 web unit,202 real PostgreSQL integration and33 desktop/mobile browser tests; typecheck, lint and builds passed. After the final CSS-only mobile Period correction, affected web gates and both Workforce browser journeys passed; all four refreshed final10 screenshots were independently inspected. All86 migrations are current;112 prior-table and104 legacy snapshots remain unchanged. S16 local completion is confirmed by its original report and the current full regression. See S17_COMPLETION_REPORT.md for exact scope, evidence and limitations. S18 onward remains unauthorized; production NAS/legal/contract/offsite/backup/restore/accounting-provider/hosted CI/deployment gates are not claimed. Actual routing used GPT-6.1 Sol and GPT-6 Luna.

## S19 authorization and clause map — 2026-10-03

Owner authorized S19. R-015.a remains S08 default order; R-015.b operational/accounting boundary and R-015.c–g BOQ, cost/procurement human approval, material selection, operational procurement and factory progress are implemented and COMPLETE for development/local staging. Cross-cutting C-002 Q4, R-006/R-092, R-079/R-080 and R-096/R-097 are enforced. Fixed production inputs require explicit approved replacement; clients view only explicitly shared approved costs and do not approve. S19_SPEC.md and S19_COMPLETION_REPORT.md record exact behavior and acceptance; the complete R-105 site/quality/snags/handover checkpoint remains S20.

## S20 implementation trace — COMPLETE for development/local staging

R-068 dashboard data, R-069 daily reports, R-070 packages/progress/quality/snags and C-020/C-021 repair verification/closure map to the Site API, four additive site tables, responsive site workspace and focused real-PostgreSQL/API tests. R-105.a fixture coverage now reaches S19 operational materials/factory context through site packages, manpower, progress, quality, reports, snags and handover; no actual-project checkpoint is claimed. Cross-cutting R-006/R-092/R-079/R-080/C-001/C-023/C-024 map to internal identity, branch/assignment/permission checks, active-delivery enforcement, scoped evidence and canonical history/audit/event/outbox guards. Final acceptance passed: all 90 migrations deployed on nine fresh databases, retained 108-table upgrade preservation passed, focused API tests and full aggregate verification passed, and Sol accepted final browser screenshots and source/security review. R-105 actual-project checkpoint and production gates remain unverified.

## S21 accepted clause map — COMPLETE for development/local staging (2026-10-04)

Owner authorization covers only S21. R-075/S21.a–f, R-076/S21.a–b, C-006.a–c, C-012.a, C-016/S21.a–b, R-038/S21.a, R-039/S21.a and R-079/R-080/S21.a are mapped in S21_SPEC.md. Scope includes separate EXTERNAL OTP/session identity; exact project/revision/release/package access; retained advisory submissions/uploads; exact external transmittals and own-recipient acknowledgements; Owner-recorded seven-day native CAD links and manual revocation proof; cancellation blockers; mandatory Owner access-loss notices; and finite cancelled-project closeout grants. S21_COMPLETION_REPORT.md records accepted implementation and actual evidence: full pinned pnpm verify exited 0 with 176 API unit, 122 web unit, 237 PostgreSQL integration and 39 browser passes; all 95 migrations current, 125 original-table snapshots preserved and six refreshed captures accepted. S14 client formal approval remains authoritative. S18 is excluded/unresolved, S22 is complete for development/local staging; S23–S27 remain unauthorized. Production MinisCloud/Brevo/NAS and actual-project R-105 remain unverified.
