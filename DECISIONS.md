# Decisions and proposals

## 2026-09-25 — Initialize an empty repository and context baseline

The supplied workspace was empty and had no Git metadata. Git was initialized for controlled checkpoints and project context files were added. No technology or product behavior was selected.

## 2026-09-25 — Approved source received

The owner supplied the 115-section Sense Studios Work Management Platform requirements. An exact copy is stored at requirements/APPROVED_REQUIREMENTS.md (SHA-256 C46124A2642199014CDF8697EFCB46ABB8C4408A97C83F8D09A1E07F2E0DE1D3). Architecture and implementation remain unapproved.

## 2026-09-25 — C-001: Branch-only organizational architecture (approved owner decision)

The approved hierarchy is Organization → Branch → Team → Employee. One organization may contain multiple branches; each project has exactly one owning branch. There is no separate Brand model, entity, table, permission scope or architectural layer. Brand and multi-brand wording in the verbatim source is superseded only where it describes organizational partitioning or isolation. Branch isolation is the required invariant. Employees may work on projects in other branches only through explicit assignment and applicable permissions; assignment does not confer access to the entire branch.

The source also lists Departments as an organizational layer. C-001 removes that tier. Reporting-manager relationships and configurable job roles remain distinct concepts within the approved hierarchy; C-002 resolves employee home-membership cardinality and cross-branch grant authority. The original source remains unchanged, and the precise addendum and affected source sections are recorded in requirements/CLARIFICATIONS.md.

## 2026-09-25 — C-002: Owner answers to Q1–Q15 (approved, with open details)

The owner answered all numbered interview questions. Approved selections and custom wording are recorded verbatim in substance in requirements/CLARIFICATIONS.md: Q1 A, Q2 B, Q3 A, Q4 A, Q5 A, Q6 A, Q7 A with R = internal review and CR = client review, Q8 B with exact periods pending, Q9 A, Q10 A with accrual/carry-forward rules pending, Q11 A, Q12 A with formula values pending, Q13 custom client PDF/image and possible vendor CAD download through NAS sharing, Q14 A, Q15 A (Owner-only cross-branch grants). Q13's precise transfer/authorization workflow remained open at C-002 and was later resolved by C-006. The later C-003–C-009 addenda resolve the other noted details. Final architecture is not yet approved.

## 2026-09-25 — C-003: Fixed Q8 retention durations (approved owner decision)

The owner approved follow-up Schedule A: 10 years for client approvals, issued drawings and audit records; 7 years after exit for exited-employee records; 90 days for site attendance selfies. C-003 in requirements/CLARIFICATIONS.md preserves the precise answer and separates approved durations from proposed clock anchors and purge mechanics. Applicable law and contracts must be checked before production. Final architecture remains unapproved.
## 2026-09-25 — C-004 through C-009: Later owner decisions (approved)

C-004 fixes a January–December leave year, full-year upfront credit, Owner-configured Branch allowances, calendar-day proration, five-day carry-forward cap and next-year expiry. C-005 fixes role-group employee formulas, Design/Turnkey health formulas and Owner approval of initial weights before scores appear. C-006 fixes Owner-only, file-specific seven-day coded MinisCloud CAD links for assigned vendors/consultants and immediate cancellation when access ends. C-007 fixes nightly encrypted backups to a reachable offsite computer/NAS with a one-day data-loss target. C-008 fixes staff passkeys, restricted external email-code sign-in, client passkey for formal approval, Brevo free email and in-app/email launch alerts. C-009 fixes retention clock anchors and scheduled deletion with notice and documented holds. The full approved wording is in requirements/CLARIFICATIONS.md. These decisions do not approve the final architecture or S01.

## 2026-09-25 — C-010: Owner-only project cancellation (approved)

Only the Owner may cancel a Draft, Active or On Hold project. The Project Lead or Team Leader may request cancellation, but cannot decide it. Cancelled is terminal, with reason, actor/time, audit and prior evidence retained. C-010 in requirements/CLARIFICATIONS.md is authoritative; unfinished-task behavior is resolved by C-011. Final architecture and S01 remain unapproved.

## 2026-09-25 — C-011: Stop unfinished delivery tasks on cancellation (approved)

The Owner selected OD-02 option A. Owner cancellation moves unfinished project delivery tasks to terminal Stopped due to project cancellation, retains work/time/review and audit history, and leaves completed tasks completed. Separately identified closeout tasks may remain linked to the Cancelled project without reopening delivery. Active work, overdue reminders and capacity exclude stopped delivery tasks. C-011 in requirements/CLARIFICATIONS.md is authoritative. Vendor/consultant external access is resolved by C-012; client portal scope is resolved by C-013; per-client expiry dates are resolved by C-015. Final architecture and S01 remain unapproved.

## 2026-09-25 — C-012: End vendor and consultant access on project cancellation (approved)

The Owner selected OD-03 option A. Vendor and consultant project/portal access ends when Owner cancellation takes effect. Active native MinisCloud CAD links must be cancelled by the Owner and cancellation recorded before project cancellation is finalized; the app does not assume an unverified NAS automation interface. Legitimate later return or cleanup work needs a separately approved, scoped closeout arrangement. C-012 in requirements/CLARIFICATIONS.md is authoritative. Client portal scope is resolved by C-013; per-client expiry dates are resolved by C-015. Final architecture and S01 remain unapproved.

## 2026-09-25 — C-013: Read-only client record access after cancellation (approved)

The Owner selected OD-04 option A. After project cancellation, currently authorized client portal users may read and download only PDF/image items already formally issued to their client scope and view their own approval history. Drafts, working/internal files and other clients' evidence remain hidden. New reviews, comments and approvals stop; pending client decisions are withdrawn with history retained. The Owner may still revoke a user's access under the existing permission model. C-013 in requirements/CLARIFICATIONS.md is authoritative; the per-client expiry dates are resolved by C-015. Final architecture and S01 remain unapproved.

## 2026-09-25 — C-014: Automatic expiry of cancelled-project client access (approved)

The Owner selected OD-05 option B. Limited read-only access to already issued client PDFs/images and own approval history ends automatically after a fixed period starting when cancellation takes effect; the Owner may approve a documented extension. Portal access expiry does not delete retained documents or audit evidence. The per-client setting is subsequently clarified by C-015. C-014 in requirements/CLARIFICATIONS.md is authoritative; final architecture and S01 remain unapproved.

## 2026-09-25 — C-015: Owner-set access end date for each client (approved clarification)

The Owner rejected the shared 90-day/12-month/3-year choices in OD-06. For each cancelled project, the Owner sets a separate end date for each client portal project-access grant when cancellation is finalized; no global access period is imposed. Primary and Additional Client users can receive distinct dates, subject to their existing item scopes. An end date is required for every retained read-only grant. The Owner may change or extend a grant with reason, actor and time recorded; expiry is enforced on every request. C-015 in requirements/CLARIFICATIONS.md clarifies C-014 without changing record retention. Closeout authorization is resolved by C-016; final architecture and S01 remain unapproved.

## 2026-09-25 — C-016: Delegated closeout authority after cancellation (approved)

The Owner selected OD-07 option B. The assigned Project Lead or a Team Leader with an explicit project closeout approval grant may authorize ordinary closeout tasks and narrow, time-limited vendor/consultant portal access after cancellation, with reason, scope, approver, end time and audit recorded. This does not reopen the Cancelled project or stopped delivery tasks. The Owner alone issues native CAD links under C-006, grants cross-branch employee access under C-002, and retains other Owner-only approvals. Closing or expiring closeout access revokes it; the Owner may revoke sooner. C-016 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-017: Lead stages may be skipped forward (approved)

The Owner selected OD-08 option A. A staff member with the appropriate lead-stage-change grant and access to that lead may move it directly to a later sales stage when earlier stages did not occur. The change requires a reason and records the from/to stages, skipped stages, actor and time. Skipped stages are not reported as completed activities; no meeting or proposal is fabricated. Existing Lost-reason and Won-conversion rules still apply, and the approval does not decide whether a Lost lead may reopen. C-017 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-018: Returning Lost enquiry creates a linked new lead (approved)

The Owner selected OD-09 option B. A Lost lead stays Lost with its reason, outcome date, activity and audit history preserved. When the person returns with a renewed enquiry, staff create a separate lead linked to the prior Lost lead; the new lead has its own stage history and reporting period. Linking and viewing the earlier record require applicable permissions, and prior discussions may be referenced without copying prior decisions as new approvals. C-018 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-019: Reasoned backward moves for active leads (approved)

The Owner selected OD-10 option A. An authorized handler may move a lead that has not been Won or Lost to an earlier nonterminal sales stage when real work returns there, with a required reason, actor and time. The earlier stage history and activities remain; reporting shows both the previous progress and the current stage. This does not undo a previously issued proposal, change a formal client decision or reopen Won/Lost leads. C-019 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-020: Named independent verifier for each site snag (approved)

The Owner selected OD-11 option A. The assigned Project Lead or a Team Leader with explicit project/site authority appoints a verifier for each snag. The verifier must have access to that snag and must differ from the person who repaired it. Assignment and any later reassignment are recorded. The named verifier records a passed or failed check with supporting evidence; a failed check returns the same snag to In Progress without losing history. Verification itself does not settle who may make the separate Closed transition. C-020 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-021: Management closes verified site snags (approved)

The Owner selected OD-12 option B. A snag may move from Verified to Closed only after the assigned Project Lead or an explicitly authorized Team Leader reviews a current passed check and makes a separate recorded closure decision. The record retains the verifier, inspection result, closer and times; the named verifier does not gain closure authority merely by being assigned. A manager who is also the named verifier may close only through a distinct authorized closure action. C-021 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-022: Approved leave cancellation requires management approval (approved)

The Owner selected OD-13 option B. An employee may request cancellation of approved leave, but the same level of manager required for the original leave approval must approve the cancellation, including before the leave starts. A pending cancellation does not restore balance or capacity. Approval creates a separate recorded reversal for the unused portion, preserves the original leave approval and ledger history, recalculates affected availability and alerts managers and affected task owners. Existing work handovers are reviewed rather than silently undone. C-022 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-023: Unfinished tasks wait for individual reassignment at employee exit (approved)

The Owner selected OD-14 option A. Departing employee access ends immediately; each unfinished task moves to Waiting with needs-reassignment reason, retaining its departed current owner until an authorized manager explicitly chooses a replacement. The old assignment, previous task state, reviews, approvals, time and deadlines remain historical evidence. The task cannot advance until reassignment and a valid resume; completed or terminal work is unchanged. Managers receive a visible queue and deadline alerts. C-023 in requirements/CLARIFICATIONS.md is authoritative. Final consistency review continues; final architecture approval and S01 remain pending.

## 2026-09-25 — C-024: Project Lead exit holds Active projects (approved)

The Owner selected OD-15 option A. If an employee exits while serving as the current lead of an Active project, the project moves to On Hold with a lead-exit reason as that person's access is revoked. The former lead remains in history and cannot make new decisions; pending work and reviews are retained, while new delivery decisions pause. The Owner appoints an eligible replacement Project Lead before the project can return to Active, with permissions, reason, time and audit checked. C-023 separately puts the leaver's unfinished tasks in Waiting for individual reassignment. C-024 in requirements/CLARIFICATIONS.md is authoritative. No further owner question is currently recorded; final consistency review, final architecture approval and S01 remain pending.

## Proposed, not yet approved

ARCHITECTURE.md recommends a TypeScript/React/NestJS/PostgreSQL modular monolith and NAS-hosted Docker deployment if capacity and security checks pass. The owner selected Cloudflare Tunnel for public app ingress in C-002 Q3; the complete architecture is still a proposal. REQUIREMENT_QUESTIONS.md records remaining material product decisions and deployment verification gates before implementation.
## 2026-09-25 — Final architecture approved; S01 authorized

The Owner approved FINAL_PRE_IMPLEMENTATION_REVIEW.md at checkpoint 2e46805 as the architecture baseline and authorized S01 Runtime and Verification. The approved stack is TypeScript, supported Node LTS, pnpm, React/Vite PWA, NestJS REST/OpenAPI, PostgreSQL, Prisma with reviewed SQL migrations, appropriate Jest/Vitest/Playwright tests and planned Docker Compose. Stable versions were pinned during S01. S01 is COMPLETE for development/local-staging scope; S02 Identity and Sessions is separately authorized and COMPLETE for development/local staging. S03 onward remains unauthorized. A material change to the architecture requires an intentional recorded decision. S01_PLAN.md maps the implementation work and evidence.
## 2026-09-25 — S01 execution evidence and remaining gate

The Owner-approved S01 scope is COMPLETE for development/local-staging. Fresh and restored-test database migration checks, API database outage/recovery behavior, frozen install, typecheck, lint, unit/API tests, production builds and desktop/mobile browser checks passed. Compose validation, image builds, service startup, API health and database/file recovery rehearsal passed with Docker Desktop 29.8.0 and Compose 5.5.1. OpenSSL installation resolved Prisma engine auto-detection; local pnpm verify passed afterward. The Owner confirmed hosted GitHub Actions green for the latest pushed commit 570d52f. Encrypted offsite backup, key custody, production NAS validation and production restore remain production gates. S02 was separately authorized on 2026-09-26 and is COMPLETE for development/local staging; see its decision below.
## 2026-09-26 — S02 Identity and Sessions authorization and Owner decisions

The Owner authorized S02 after S01 was accepted COMPLETE for development/local-staging scope. S02 covers internal Owner/Staff identity, passkeys, sessions, and identity-only enrollment/recovery. First Owner bootstrap uses deployment-configured Owner email and a high-entropy one-time setup secret. Staff enter only through an Owner-created invitation. Staff credential replacement requires Owner out-of-band verification and a recorded reason; email alone is insufficient. Owner account recovery uses a one-use offline recovery code. Owner setup requires two active passkeys and acknowledgment of offline recovery-code storage. These identity kinds do not confer resource grants. C-008's external portal email codes and client approval passkey step-up remain deferred to S14. S03 membership, organization/employee models, RBAC, grants and grant-driven forced logout remain unauthorized.

S02 implementation and acceptance evidence is recorded in S02_SPEC.md and S02_COMPLETION_REPORT.md. The configured bootstrap secret is blocked from reuse by persisted Owner state and must be removed operationally after enrollment; throttling is process-local and needs a shared limiter before multi-instance deployment. Session/device listing and revocation have API and UI support. S02 is COMPLETE for development/local staging after migration, automated/browser, type/lint/build and security review. S03 remains unauthorized. The S01 Windows Playwright lifecycle caveat and production backup/NAS/restore gates remain as documented in S01_COMPLETION_REPORT.md.

## 2026-09-27 — S04 Audit, Outbox and Core Notifications authorization and email eligibility

The Owner authorized S04 after S03 was accepted. For internal email delivery, the Owner selected mailbox verification in S04. A signed-in account's current email is eligible only after completing the persisted one-time challenge; active status and passkey enrollment alone are not proof of mailbox ownership. Challenge codes are never stored in raw form and delivery is unavailable unless Brevo and the verification secret are configured. S03 organization events remain notification-neutral until an authorized event-specific recipient/template is defined; the S04 worker fails closed when current recipient authorization is absent. S04 implementation, evidence and production limits are recorded in S04_SPEC.md and S04_COMPLETION_REPORT.md.

## S06 shared client authority — Owner decision 2026-09-27

Owner explicitly selected Owner-only shared client/contact edits. Granted staff may select clients visible through currently authorized lead scope and create leads; a shared organization-wide customer identity does not grant access to unrelated branch leads/history. S06_SPEC.md records the implementation contract. Source-configuration authority remains pending. S07+ are unauthorized.
## S06 source configuration — Owner clarification, 2026-09-27

Owner authorized staff with a separate source-management grant to add or deactivate enquiry sources. The implementation uses organization-scoped `crm_source.manage`, because sources are shared across the organization. Source edits require a reason and optimistic concurrency token with canonical audit/events. Source identity is retained; deactivation affects new lead selection and preserves historical leads. No source rename or deletion is exposed.
## 2026-09-27 — S07 project conversion and scope approval (Owner decision)

The Owner authorized S07. A project may be created directly or from a Won lead; each Won lead may produce at most one project. A direct project has no invented lead provenance. Each project has an Owner-configured named approver for formal scope changes, and that person cannot approve a change they requested. If no approver is configured, the scope change cannot take effect. S07_SPEC.md records the implementation boundary and evidence. Effective project cancellation remains gated on S09 and later dependent access workflows.

## 2026-09-28 — S07 transfer, completion and scope recovery (Owner decision)

On an Owner transfer of the owning Branch, every contributor whose home Branch differs from the new owning Branch loses project access. The Owner may explicitly grant it again. Before S08 supplies stage and milestone templates, only the Owner may mark an Active project Completed, with a required reason confirming delivery. If the named scope approver is unavailable while a request is pending, the Owner withdraws that request with a reason, then names a replacement; the requester may submit a new request. Withdrawal preserves the original request and approval history.
