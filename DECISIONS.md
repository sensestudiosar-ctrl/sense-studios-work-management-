# Decisions and proposals

## S16 Owner policies and accounting boundary — 2026-10-01

The Owner authorized S16 and approved continuation after the proposed authority and interruption policies were presented. Owner or explicitly granted `time.manage` staff may manage time within current project management/reporting-team scope; title alone grants no authority. Own edits are permitted before lock. Manager approval locks the entry; management correction thereafter preserves the original version and appends a new unapproved version requiring reapproval. Accounting export is Owner-only and preserves a stable record ID across revisions. Effective project hold/cancellation or employee exit pauses running timers atomically while preserving elapsed work; stop records that elapsed work and resume requires current eligibility.

The approved development receiver is an HTTP JSON contract using PUT `/time-records/{recordId}`, immutable positive revisions and stable delivery UUID idempotency keys. Durable database snapshots, lease ownership and append-only attempts recover retries and remote-success/local-failure without duplicate records. Network calls occur outside transactions. Production accounting-provider binding remains pending and is not a local acceptance claim. S17 onward remain unauthorized.

## S15 Owner policies and publication boundary — 2026-10-01

The Owner authorized R-040.a–c and settled private curation as existing exact S14 PDF/image items under current grants only. Gallery records introduce no new sharing authority. Confidential source documents and every Confidential ancestor folder are prohibited for preparation/publication. Independent explicitly published derivatives persist project cancellation until reasoned Owner withdrawal.

Only the Owner prepares, publishes or withdraws; explicit publication is the approval. Supplied single-frame PNG/JPEG/WebP input is reconstructed from decoded pixels into a distinct PNG, bounded to 8 MiB input/output and 40 million pixels. Immutable publication content and DRAFT → PUBLISHED → WITHDRAWN expected-version transitions retain append-only reasoned grants and canonical audit/domain/outbox evidence. Anonymous reads expose only approved presentation metadata and derivative bytes, verify stored size/checksum and recheck grant/state/source eligibility after byte loading. Already delivered images cannot be recalled. These policies are implemented; completion depends on separately recorded acceptance in S15_COMPLETION_REPORT.md.

## 2026-09-29 — S11 authorization and document boundary

The Owner requested S11 completion using Sol/Luna routing. This instruction supersedes earlier unauthorized S11 snapshots. Owner decisions: Owner and assigned staff with document grants may create folders/upload; Confidential reads require Owner or explicit item grants; only Owner classifies Confidential content. S12 and later remain unauthorized.

DOC uses a private existing NAS mount configured by absolute `NAS_ROOT`, opaque UUID keys, 8 MiB binary chunks, SHA-256 manifests and a configurable 20 GiB default ceiling. Restricted service-account/ACL setup is a deployment prerequisite. Database metadata and physical blob finalization are coordinated with idempotent retry and orphan inventory; physical storage cannot share a PostgreSQL transaction. Existing finalized blobs are retained and never overwritten. Finalized orphan blobs are reported for investigation rather than automatically purged. S11 stores view-only and retention association metadata; formal revisions/issues, protected client viewing and controlled expiry remain later slices. Local fixture acceptance does not establish production NAS, offsite backup or legal retention fitness.

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

## 2026-09-29 — S10 dependency scope (Owner decision)

For the initial S10 finish-to-start dependency workflow, a task may depend only on another task in the same project. Cross-project links are deferred. Task B's current primary owner or a scoped manager may add or remove its dependency only with current access to both tasks; a manager's title alone confers no authority. Links may be added or removed while B remains open, with reason, actor, time and audit evidence. An early-start warning applies to unfinished predecessors linked when B starts; a later-added link cannot retroactively warn that start. These choices limit link selection and completion notices without granting access to another project. The Owner confirmed these boundaries during S10 implementation; R-026 remains the approved dependency behavior within them.

## 2026-09-29 — S10 extension routing and recurrence policy (Owner decisions)

Only the task's current primary owner may request a committed-deadline extension; collaborators cannot submit one. That employee chooses an eligible, currently scoped manager or the Owner as approver. The request proposes a new date and gives a reason; management's separate approve/reject decision remains required before any commitment changes. Eligibility and current authority must be checked at request and decision time, and self-approval is not implied.

S10 recurrence uses daily, weekly or monthly schedules in the organization's configured timezone, with at most one generated occurrence per scheduled date. The Owner selected Asia/Kolkata as the initial organization timezone and an Owner setting may change it later. Dates missed while the scheduler is unavailable are skipped rather than backfilled. Generation pauses when the assigned owner has exited or the linked project is inactive. These rules do not authorize reactivating inactive work or generating duplicate tasks after retries. The Owner's choice for a monthly 29th, 30th or 31st that a short month lacks remains pending.

For ordinary task Waiting alerts, the Owner selected a per-Team opt-in setting. Enabled alerts may reach only recipients with current authority; job title alone grants no task or notification access. Dependency-completion notices to a Waiting task's owner are a separate S10C path and do not depend on this opt-in.

On 2026-09-29 the Owner additionally chose Owner-only control of the Team Waiting-alert opt-in; monthly recurring dates on the 29th–31st use the month's last day in shorter months; and recurrence may be configured on a Recurring task by its current primary owner or scoped manager. The first future occurrence date is explicit. Generated tasks copy the task title, description, priority, current owner, collaborators, estimates, tags, checklist and review requirement; commitments and dependencies remain separate. The Owner instructed that S10 be pushed to NAS only after S10 is complete and verified.

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


## 2026-09-28 — S08 authorization and stage/milestone authority (Owner decision)

The Owner instructed S08 to start once S07 was complete. S07 completion is recorded at commit `09b5d95`, so S08 is authorized and IN PROGRESS. The Owner approved stage/milestone completion by the assigned Project Lead or explicitly granted staff. Required milestones block project completion unless the Owner or an explicitly granted Team Leader records a reasoned audited override. Current project access and assignment remain prerequisites; job titles confer no implicit permission. See S08_SPEC.md for scope, dependencies and pending verification. S09 and later remain unauthorized.

## 2026-09-28 — S08 organization template authority (Owner decision)

The Owner authorized staff with an explicit organization template-management grant to create reusable templates and new immutable versions. Existing projects retain the version originally applied. Owner project-creation authority remains unchanged. Implementation uses template.manage at organization scope; template.view is separate read authority, and template management confers no project access. Completion authority uses permission-defined Team Leader grants under S03's no-title-inheritance rule.

## 2026-09-28 — S09 authorized; task and handover implementation

The Owner confirmed the S08-to-S09 continuation and requested completion using the established Sol/Luna routing. This current instruction authorizes S09 despite older authorization snapshots. S10 and later remain unauthorized.

TaskService owns scoped task commands and state policy in the approved modular monolith. OrganizationService joins session/grant revocation, task exit waits, ProjectWorkflowService lead holds, audit/outbox and mandatory alerts in one PostgreSQL transaction. Owner cancellation similarly joins the project outcome with per-task terminal stops. Row locks and optimistic versions protect competing commands; a deadlock or serialization conflict returns a refresh/retry conflict, with no partial outcome. Immutable per-task records preserve granular evidence; exit/cancellation summary audits store counts to keep payloads bounded.

C-016 ordinary internal closeout approval is recorded directly by the assigned Project Lead or expressly granted assigned staff with current project access. It is not an Owner approval or external access grant. The immutable approval binds scope, task owner and target date; Owner revocation preserves that evidence and prevents later work. The S05 engine is available for later workflows but supplies no implicit closeout authority. Required task review configuration is immutable and completion fails closed until S13/S14 handlers exist. Recurring, correction, site and training labels supply no execution authority. These implementation choices preserve the approved source and introduce no new product policy.

## 2026-09-29 — S09 confirmation and S10 authorization

The Owner requested confirmation of S09 completion and instructed S10 to start using the established Sol/Luna routing. S09_COMPLETION_REPORT.md records development/local-staging completion and its production limits. S10 is authorized; S11 and later remain unauthorized. S10_SPEC.md maps the first ordinary Waiting/resume increment to R-025.a–b and C-002 Q6, with C-023 exit waiting retaining its separate reassignment gate. gpt-6-sol owns schema/security/backend design and review; gpt-6-luna implements bounded UI and documentation. Extension approver routing and recurrence execution rules were submitted for Owner decisions and remain unresolved until answered. No S10 whole-slice completion or production deployment is approved or claimed.

## S12 document control — 2026-09-29

Current Owner authorization covers S12 only. A logical drawing record groups distinct immutable S11 uploaded document/blob records; no upload is renamed/overwritten or silently converted. Automatic R0/R1 and CR1/CR2 numbering is drawing/series-specific; a monotonically increasing ordinal orders approved current selections across both series. New Working drafts leave the prior approved current revision unchanged. Drawing locks serialize append, management selection, approval consumption and issue. Approval of an older revision cannot supersede a newer approved current revision; an unapproved newer draft does not block approval of an older valid draft.

S12 consumes canonical persisted downstream exact organization/project/drawing/revision/blob/checksum evidence through internal module ports. No HTTP approve/state/fact endpoint exists. S13 owns actual reviewer workflow and internal approval production, while S14 owns client decision/classification/identity production. Exact downstream evidence fixtures test S12 machinery but do not implement or authorize S13/S14. Formal issue requires Active project, document.issue, exact current internally approved revision, and any required client fact. Transmittal items snapshot both exact checksum and the client gate at issue; historical issue evidence remains unchanged after later management selection or supersession. Named internal recipients alone acknowledge, with fresh access checks and immutable acknowledgement evidence.

The Owner clarified that only required drawings are sent for client review by Team Leader or Owner. Drawings begin unselected; only Owner or assigned staff with explicit scoped document.client_review_select may add an immutable reasoned management selection. Job title alone confers no authority. Selection is one-way in S12 to prevent stripping a pending client gate; withdrawal/unselection policy is not settled here and belongs to S14. CR revisions require exact client approval regardless. Actual client sending remains gated on S14.

The Owner clarified that C-003/C-009 ten-year drawing/transmittal retention starts at the first effective Completed or Cancelled transition, and later archive or closeout cannot reset it. The derived association uses the first immutable canonical project status history timestamp. Holds/notices/backup-expiry/deletion-proof remain metadata; no purge or production legal/backup certification is claimed.

The Owner separately clarified current-version promotion: "After internal approval; wait for client approval only before formal issue". Internal approval therefore atomically selects the newer current revision and marks the previous current revision Superseded — Do Not Use, even when the replacement awaits required client approval. Required client approval gates formal issue only. The selected current revision must receive its own client approval, never a reused decision from an earlier revision.

## S14 authorization and identity boundary — 2026-10-01

The Owner authorized S14 in the current session on 2026-09-30 and requested Sol 6.1/Luna 6 routing. Only the Owner may appoint or replace a project's Primary Client, with a reason and immutable audit history. At that initial authorization checkpoint, CR/internal-file relationship and correction authority awaited Owner answers. The subsequent decisions below settle both.

Client accounts use AccountKind.CLIENT and separate portal sessions/cookies, one-time-code records and passkey ceremonies. Internal session authentication, project actor construction and PostgreSQL session guards deny CLIENT access to staff APIs. Portal session access checks current account state and at least one live client grant; later item/document requests must independently check exact project/item authority and cancellation state. A passkey step-up is bound to an exact consumer-supplied immutable decision payload, account and portal session. There is no public generic approval endpoint. Failed step-up consumption must commit before returning rejection; a later business consumer must catch verification failure inside its transaction callback and reject outside after commit.

Owner Primary Client appointment, demotion, expiry and revocation serialize on the project, retain optimistic grant versions and canonical immutable change/audit/event/outbox evidence. A cancelled project cannot retain a client grant without its own finite end time. This foundation does not yet implement complete cancellation withdrawal, client-file delivery, client corrections, final overall approval or the Design handover checkpoint.

DatabaseService now sets `timezone=UTC` on every PostgreSQL adapter connection. Real expiry tests against a PostgreSQL 18.6 server configured to Asia/Calcutta reproduced a 5.5-hour difference between stored instants and adapter-returned DateTime values. Inspection of installed @prisma/adapter-pg 7.10.0 found offset-free UTC parameter serialization and returned timestamptz offset normalization; requiring UTC connection sessions fixes exact evidence and expiry calculations without changing the organization's calendar timezone. The corrected tests passed on that same non-UTC server. No historical production data was rewritten.

## S14 independent CR content — Owner decision

The Owner selected independent CR files after their own internal review. Extend the existing exact internal review producer and its canonical submission database guard to both R and CR, preserving independent reviewer authorization, same-drawing newer revisions, immutable blob/checksum identity, audit/outbox and current approval state. A CR must obtain its own exact INTERNAL fact before a separate exact CLIENT fact can satisfy issue. Existing applied migrations remain unchanged. Correction-assignment authority is still awaiting the Owner decision.

## S14 correction authority and immutable client approval batches — 2026-10-01

The Owner settled client-correction assignment: Owner, the current assigned Project Lead or an explicitly authorized Team Leader may assign the correction, subject to current project access and ordinary task eligibility. Classification remains Owner or expressly granted Team Leader authority; the Project Lead role alone does not grant classification. Permissions are `client.review_manage`, `client.revision_classify` and `client.correction_assign`; no job title implies a grant.

Client review packages contain immutable exact task/revision items. Each item has one retained final decision; an explicitly delegated Additional Client may approve its item using passkey step-up. This does not produce an S12 CLIENT revision fact. The Primary Client's separate final overall passkey approval freezes the sorted item/decision/exact-file batch and produces the canonical exact CLIENT facts used by formal issue. All items must be approved and each drawing revision must still be current and internally approved. Each CR review item requires an audited Preference / New Requirement or Employee Work Error classification before final approval; no scoring calculation is introduced.

Correction submissions create a new exact item/package rather than mutating the original decision or content. The manager resumes a client-revision-required task only after its separately linked correction task is Completed; the later internal review must use new exact revision content where applicable. Pending client items/packages withdraw atomically on cancellation, while decisions, history and per-client own approval evidence remain retained. Final batch evidence anchors its ten-year retention to the earliest Completed/Cancelled project transition independently of portal grant expiry. S14_REVIEW_CONTRACT.md records implemented interfaces; S14_COMPLETION_REPORT.md separately records whole-slice development/local-staging acceptance.

The final batch SQL boundary retains sorted exact drawing/revision/task tuples and checks every frozen task field against its currently Client Approved task. Live grant expiry is sampled after lock waits and again before the final write. Canonical review delivery also requires the actual transition actor's current item or management authority; an audit/event/outbox tuple cannot confer a missing capability. A client correction can resume only its latest published item, ordered by immutable submitted task version, so completed historical corrections cannot satisfy a later client request. Existing applied migration definitions remain unchanged; these protections are additive migrations 20261001150000, 20261001170000, 20261001180000 and 20261001190000.

Formal issue may name an Active CLIENT recipient only when its current project grant and Primary or exact-item view scope covers every issued PDF/image revision. The portal keeps the S12 named-recipient, immutable exact issue and own-recipient canonical acknowledgement evidence; it does not expose the internal document/project APIs. Client acknowledgement requires an Active project and current access. Cancellation retains scoped earlier issued files and own approval history while rejecting new acknowledgements. Migration 20261001160000 adds this CLIENT-only database boundary without weakening existing internal recipient guards.
# S17 calculation decision — 2026-10-02

The Owner subsequently approved consuming expiring carry-forward before the current year's annual allowance. Exact rational snapshots decide eligibility; decimal summaries do not introduce business rounding. Prior carry expires at the end of its credited year and is never carried a second year.

The Owner approved restricting S17 cancellation to future calendar dates. Current-day/past leave remains consumed/recorded; hourly same-day cancellation without timed portions is excluded. This applies independently of pending cancellation and retains original approval/handovers.

The Owner approved schedule-derived minute calculations: full-day leave consumes that day's capacity, half-day consumes half, hourly leave uses entered minutes; task effort is explicitly allocated per person/date; overnight shifts belong to their start date. C-004 entitlement remains policy days, with schedule-relative consumption and explainable historical policy/calendar-day proration. No arbitrary eight-hour day or equal collaborative split is assumed. Versioned Owner configuration gates numeric allowances, routing, workload thresholds and site validation. S17_SPEC.md records remaining setup/design and acceptance.

## S18 private library ownership — 2026-10-03

Owner-approved C-025 selects explicit organization/Branch/Team audiences and private library-owned NAS files with authorization on every request. S18 implements a distinct KNW LibraryRecord/Version/File boundary and isolated `.sense-library` storage using existing checked NasStorage primitives. Project document grants and SOP task/template references do not grant library access. Exact content versions/publication/acknowledgement/reference evidence stays immutable; a sidecar reference never rewrites an applied template. The owning service checks live internal identity, selected audience, explicit scoped authority and exact readable file/version relationships before streams. This architecture decision implements the approved audience/storage choice; it does not approve unresolved training completion or publication independence policies. S18 remains IN PROGRESS; source business requirements are preserved.

The Owner subsequently approved C-026 named reviewer pass against authored criteria with dated effectiveness observations and C-027 different authorized publisher for employee/Team Leader submissions, with reasoned Owner direct publication. Shared library.publish binds immutable exact SOP/knowledge version and current named independent publisher. Training state/evidence binds exact module version, named independent reviewer and authored criteria; completion never mutates official skills. Explicit organization library grants permit only shared library authority, not other-Team employees/projects/files. Forward migration90 adds approval independence and named training-transition guards without changing applied87–89.
