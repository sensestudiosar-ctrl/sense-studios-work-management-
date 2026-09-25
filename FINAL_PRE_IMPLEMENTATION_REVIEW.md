# FINAL PRE-IMPLEMENTATION REVIEW

Date: 2026-09-25. Status: planning review complete; final architecture and S01 await explicit Owner approval. No application code, framework, dependency, migration or application initialization has been created.

## 1. Decisions made

The immutable 115-section owner source is qualified by approved clarifications C-001–C-024. Q1–Q15 and OD-01–OD-15 are answered. The final OD-15 answer is A: an Active project whose Project Lead exits goes On Hold immediately; the Owner appoints an eligible replacement before Active work resumes. C-023 separately puts the departing employee's unfinished tasks in Waiting for individual manager reassignment. Other consequential choices include Branch-only organization and Owner-only cross-branch grants; Owner-only project cancellation with stopped delivery tasks; narrowly approved closeout work; retained, per-client-expiring issued-record portal access; Owner-controlled native CAD links; and same-level approval to cancel approved leave. DECISIONS.md and requirements/CLARIFICATIONS.md contain exact authority and history.

## 2. Requirements changed or clarified

The original source remains verbatim. C-001 replaces organizational Brand/Department partitioning with Organization → Branch → Team → Employee, one owning Branch per project and explicit cross-branch work. No separate Brand model, table, grant or architectural scope is planned. C-002 fixes the original interview; C-003–C-024 clarify retention, leave, scoring, identity, backup, notifications, external files, cancellation, CRM stage exceptions, snag checks, leave reversal and exit handover. A word such as brand used for marketing identity in the old source is not silently converted into a new organizational entity. Technical execution detail added in this review covers immutable correction revisions, offline conflict handling, notification routing and slice activation gates; it grants no new business authority.

## 3. Final architecture proposal

Use a single repository and modular monolith: responsive web/PWA → versioned REST API → server-side authentication and authorization → owning domain service → PostgreSQL transaction. A transactional outbox drives notifications, reminders, reconciliation and integrations. External portals use the same API with narrower policies. NAS file operations use staging and reconciliation because they cannot share a PostgreSQL transaction. No UI, background worker or future AI path bypasses domain checks. The Owner approved this architecture at checkpoint 2e46805; S01 Runtime and Verification is in progress.

## 4. Final technology stack proposal

TypeScript on supported Node LTS with pnpm; React and Vite for the responsive PWA; NestJS REST/OpenAPI for the API and worker; PostgreSQL with Prisma plus reviewed SQL migrations; Jest, Vitest/Testing Library and Playwright for verification; Docker Compose for constrained NAS deployment if tested feasible. Pin supported versions during S01. No dependency is installed yet. Local AI is excluded from the 8 GB baseline.

## 5. Final domain model

Core records: Organization, Branch, Team, Employee, Account, Session, Passkey, PermissionGrant; Lead, Client, Project and ProjectLeadHistory; Task, Participant and AssignmentHistory; Document, immutable Revision, ReviewRound, Approval, Transmittal and FileBlob; TimeEntry, LeaveRequest/Ledger, Attendance and Capacity; BOQ/procurement, SiteWorkPackage, Snag and verification attempts; Notification/Delivery, AuditEvent/Outbox, ReportSnapshot and later integration/automation/AI records. Each project has one owning Branch. Active projects have one current lead; a lead-exit On Hold project may temporarily have none, while history remains. Each task has one Primary Owner, including a departed owner held in Waiting until explicit reassignment.

## 6. Final permission model

Default deny on every API/file request. Job role, reporting line and explicit permission grant remain separate. Scope combines organization, home branch/team, project assignment, item and current workflow state. Only the Owner grants cross-branch access, cancels projects, replaces an exited lead for resumption and issues native CAD links. Assigned Project Leads or explicitly granted Team Leaders may approve ordinary post-cancellation closeout tasks and narrow expiring vendor/consultant access. Primary Client retains final overall approval; delegation is item-specific. Clients receive PDFs/images only; vendors/consultants can receive a file-specific CAD link only under C-006. Current grants, session status and per-client expiry are checked again when content is viewed or downloaded.

## 7. Final workflow and state-machine summary

Lead: forward skip or backward nonterminal move requires scoped grant, reason and preserved history; Lost stays terminal and a returning enquiry creates a linked new lead. Project: Draft → Active → Completed → Archived, with optional Active ↔ On Hold, Owner-only terminal Cancelled and controlled direct Active → Completed. C-024 exit holds an Active project; new delivery decisions pause until Owner replacement and checked resumption. Task: configured work/review path; Waiting retains previous state/reason, C-023 exit makes unfinished tasks wait, and C-011 cancellation stops unfinished delivery tasks terminally. Document: each correction creates a new immutable R internal or CR client revision and review round; approval and formal issue bind exact revision; prior issued evidence remains. Client decisions support item-level partial approval and Primary Client final approval; cancellation withdraws pending decisions. Leave reversal is a separate same-level-approved request and compensating ledger action. Snag failure returns the same record to In Progress; a named independent verifier passes it, then authorized management separately closes it. Unsupported transitions are denied and tested per slice.

## 8. Final database strategy

One PostgreSQL database with foreign keys, unique/partial constraints and transaction boundaries around protected decisions, audit and outbox. Indexed organization/branch/project scopes support server authorization. Immutable revisions, approval evidence, audit entries and historical snapshots are append-only within the approved retention period. Changes to deadlines, time entries, lead stages, project ownership and access have dated history. Offline commands carry stable IDs, base record versions and idempotency keys; stale same-record writes require human compare/keep/amend. Migrations are reviewed, reversible where practical and rehearsed on backups; production schema push is excluded.

## 9. Final file and NAS strategy

The existing NAS stores file bodies; PostgreSQL stores opaque keys, checksum, revision, issue, classification and access metadata. Stage/chunk/validate/finalize uploads, then reconcile missing/orphaned blobs. Download through freshly authorized app streams. Previously approved/issued files are never overwritten. Clients see only authorized PDF/image issues. Owner-issued native MinisCloud CAD links cover one assigned vendor/consultant, one file/revision, a seven-day expiry and extraction code; cancellation or access loss requires confirmed native revocation. Cancelled client portal access is read-only for previously issued files and own approval history until each Owner-set expiry. Lead-exit On Hold blocks new issue while preserving authorized reads of already issued records.

## 10. Final deployment strategy

First validate the reported 8 GB MINISFORUM NAS, MinisCloud OS container capability, memory/storage headroom, concurrent load, restore and native share controls. If suitable, run constrained web/API, PostgreSQL and worker containers there, with least-privilege NAS access; otherwise use a small local server for app/database and keep NAS file storage. Use the Owner's existing domain through the selected Cloudflare Tunnel for public HTTPS, without exposing NAS administration, SMB/NFS or PostgreSQL. Use the approved Brevo free email path plus in-app notifications, subject to delivery/quota tests. Nightly encrypted, consistent database-and-file copies go to the Owner's physically separate reachable computer/NAS; rehearse restoration against the accepted one-day loss target.

## 11. Final testing strategy

Per slice: unit rules and calculations; isolated PostgreSQL constraint/transaction tests; real API allow/deny, guessed-ID, branch, portal and immediate-revocation tests; NAS interruption/checksum/reconciliation tests; desktop/mobile browser journeys; offline conflict/replay; migration and recovery drills. Critical Design and Turnkey E2E checkpoints include exact revision approval, cancellation effects, client/vendor isolation, exit handover and site snag separation. Run type check, lint, build and proportional regression checks once tooling exists. All application checks are currently NOT RUN because no application exists.

## 12. Final 27-slice implementation sequence

1. S01 Runtime and verification
2. S02 Identity and sessions
3. S03 Branch, employees and RBAC
4. S04 Audit, outbox and core notifications
5. S05 Shared approvals and decision queue
6. S06 Lead and client records
7. S07 Project ownership and scope
8. S08 Templates, stages and milestones
9. S09 Tasks, participants and state
10. S10 Dates, waiting, dependency and recurrence
11. S11 NAS document base
12. S12 Revisions and formal issue
13. S13 Internal review and correction
14. S14 Client portal and exact approval
15. S15 Galleries and publication
16. S16 Time and accounting-ready export
17. S17 Schedule, leave, attendance and capacity
18. S18 Skills, SOP, knowledge and training
19. S19 Turnkey BOQ, procurement and factory
20. S20 Site progress, reports and snags
21. S21 Consultant and vendor/factory portals
22. S22 Offline site capture
23. S23 Performance, project health and delay
24. S24 Dashboards, summaries and reports
25. S25 Calendar, website, maps and API integrations
26. S26 Guarded automation and custom reports
27. S27 Provider-independent AI and recommendations

Effective employee exit waits for S07 project holds and S09 task waits; immediate account suspension is available from S03. Formal issue waits for S13 internal approval, and client-approval-required issue waits for S14. Effective project cancellation waits for S09 task stopping and, when later external links exist, confirmed C-012 revocation. Each slice must complete its own exact transition/permission matrix before release.

## 13. Requirement traceability status

Automated planning check found 115 numbered source sections, 115 matching R rows, 24 C rows and 27 planned slice rows. Every R/C row names at least one slice, and every slice row cites an R requirement. The source SHA-256 remains C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3. This is section-to-slice coverage, not proof that every clause is implemented or tested. Before each slice, expand its applicable section into clause IDs, API/UI acceptance, permission checks and evidence. No application feature is implemented.

## 14. Remaining risks

The exact NAS model, container support and usable headroom are unverified. Native MinisCloud link issuance/revocation and large-file delivery need real-device checks. Tunnel/provider limits, email quotas and delivery, offsite target availability, recovery keys and joint database/file restore need validation. Retention/deletion clocks need legal and contract review before production. Offline device loss/conflicts and public portal access require security tests. The 27-slice breadth requires the two real Design/Turnkey checkpoints and release gates to prevent a shallow rollout. These are verification/release risks, not unresolved architecture authority choices.

## 15. Remaining unresolved decisions

None that block final architecture approval. The Owner must still enter Branch leave allowances before S17 and approve numeric performance/health weights and thresholds before S23; those are versioned setup data under already approved policy. Notification schedules/critical thresholds require Owner configuration before their features run. The real NAS model and external service capabilities are engineering verification gates. Any newly discovered business contradiction during a slice returns to the one-at-a-time owner decision process.

## 16. Proposed S01 scope

After explicit final architecture approval only: initialize the chosen workspace and pinned toolchain; create a static responsive PWA shell, API health endpoint and PostgreSQL connection; establish reviewed migration workflow, CI and type/lint/test/build commands; stage constrained containers locally; document configuration/secrets; rehearse a local database-plus-file backup/restore and the path to nightly encrypted offsite backup. S01 creates no business users, live portals, production data or business modules.

## 17. Exact S01 Definition of Done

S01 is COMPLETE only when: (1) stack versions are pinned and the workspace builds reproducibly from a clean checkout; (2) web shell serves and shows loading/error/empty foundations on desktop and mobile; (3) API health accurately reports application/database readiness; (4) PostgreSQL schema baseline and a reviewed migration run on a fresh database and a migration rehearsal succeeds on a backed-up test database; (5) local/staging containers start with least-privilege configuration and secrets outside source control; (6) CI runs actual type check, lint, unit/smoke tests and production build with recorded commands/results; (7) a local database-plus-file backup restores to a consistent test point and a test-file checksum is verified; (8) offsite backup setup steps, key custody and production restore gate are documented; (9) S01 requirement clauses, decisions, status and test evidence are recorded; and (10) no unverified business capability is marked complete. Production offsite connection and NAS-specific deployment remain later release gates.

READY FOR ARCHITECTURE APPROVAL
