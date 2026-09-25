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

The Owner selected OD-10 option A. An authorized handler may move a lead that has not been Won or Lost to an earlier nonterminal sales stage when real work returns there, with a required reason, actor and time. The earlier stage history and activities remain; reporting shows both the previous progress and the current stage. This does not undo a previously issued proposal, change a formal client decision or reopen Won/Lost leads. C-019 in requirements/CLARIFICATIONS.md is authoritative. OD-11 on site snag verification authority is open; final architecture approval and S01 remain pending.

## Proposed, not yet approved

ARCHITECTURE.md recommends a TypeScript/React/NestJS/PostgreSQL modular monolith and NAS-hosted Docker deployment if capacity and security checks pass. The owner selected Cloudflare Tunnel for public app ingress in C-002 Q3; the complete architecture is still a proposal. REQUIREMENT_QUESTIONS.md records remaining material product decisions and deployment verification gates before implementation.
