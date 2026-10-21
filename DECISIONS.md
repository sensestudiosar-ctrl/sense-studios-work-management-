# Decisions and proposals

## Owner decision — Agent1 final reviewer model, 2026-10-16

After all Agent1 implementation/checks/source review/approved-target shutdown and the concrete `docs/development/V1_AGENT1_ACCEPTANCE_REVIEW_2026-10-16.md` were complete, the Owner explicitly answered “Approve Codex final acceptance” to the bounded reviewer-model exception. The question identified AGENTS.md:52's Opus final-review requirement and unavailable Opus runner. This authorizes the current Codex same-agent review as final Agent1 D/G/E/owned H local development acceptance only. No independent/Opus/Sonnet review is claimed. No required check, authority, schema or retained/production database/deployment boundary is waived. Final source8cab4afa39fb8350004f1d43f38576fb9f57267be3bf10bc9938d1ae9c7c6abf/610files/119migrations; exact checks and limits are in the acceptance review. Agent1 is COMPLETE4/4; whole-V1 staff-pilot/other-agent/production gates remain separate.

## Agent1 isolated source119 acceptance — Owner approved 2026-10-16

Owner selected “Approve isolated database tests” after reviewing the concrete operator/target in `docs/development/V1_AGENT1_LOCAL_ACCEPTANCE_2026-10-16.md`. Authorization covers a fresh PostgreSQL18.6 cluster inside `.artifacts/v1/20261016-agent1-local/postgres/data`, only127.0.0.1:59749, database `sense_v1_agent1_20261016_test`, migrations1–119, committed Task/receipt/race and transactional Task checks, and stopping only that verified cluster while preserving evidence. It excludes retained previews, production, stopped MW-I02 and existing S27 targets/guards. Read-only preflight found the path absent and port available;15target-shape unit checks/API typecheck/scoped lint passed before approval. The new source pin requires review on drift; repin cannot change applied migrations. Execution/real persistence acceptance remains IN PROGRESS until actual results are recorded.

## V1 task creation receipts — Owner approved 2026-10-15

Owner explicitly selected “Approve the bounded receipt design” for `docs/development/V1_TASK_CREATE_RECEIPT_PROPOSAL_2026-10-15.md`. TSK owns one additive immutable receipt table and optional ordinary/subtask create retry keys, with normalized command identity and current-resource replay authorization. One transaction owns task/history/events/child links and receipt; recovery returns the existing canonical ID without repeating side effects. Other domains/receipt stores are not reused. Approval covers source, one reviewed migration preparation and tests, excluding retained/production migration application or database lifecycle. Implementation/real persistence/concurrency acceptance remains IN PROGRESS; no production/pilot claim.

## S24 approved report/schedule authority and composition — 2026-10-05

The Owner authorized starting and finishing S24 and approved Owner-only organization schedule configuration and frozen-report finalization/corrections, creator-only personal reminders, explicit unavailable S18 sources and explicit critical/mandatory/escalation policy without seeded defaults. Other current readers may preview/export and read authorized frozen evidence through existing owning-domain permissions. S18 and S25–S27 remain excluded. Dashboards and the management action center grant no new approval authority.

S24 composes owning public read ports in the caller transaction. Frozen report rows and manifests, rule versions, personal reminders, generation receipts and command receipts persist in six additive tables with immutable/evidence guards. Applied migrations 100–104 remain unchanged; fixes to persisted event catalogue/trigger shapes and stable scheduling slots were forward additive migrations. Source snapshot hashes use PostgreSQL canonical JSONB. History rechecks every source/protected field and fails closed on lost access. Corrections append linked same-category/period evidence.

Schedule configuration has explicit timezone/local time, audience and kind-specific offsets/calendar/event filters. Stable slot identity excludes configuration version; editing invalidates pending old-version notices while preserving one committed recipient/day/task or event slot. Slot/command advisory locks precede identity/session checks; current scope locks and notification in-app reauthorization remain in the transaction through the delivery write. Notices use generic text; authenticated dashboard/history carries the source evidence. Existing external-provider delivery limits remain unchanged. No independent productivity, repeat-mistake or overtime calculation is introduced without accepted policy/source evidence.

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


## S19 Owner authorization and operational release design — 2026-10-03

The Owner instructed S19 to start and complete using exact GPT-6.1 Sol context/design/security/final review and GPT-6 Luna bounded implementation. This authorizes S19 in this checkout; it does not authorize unrelated S16–S18 or S20+ work. S19 depends on completed S05/S07/S11–S14.

The Owner settled cost/procurement decisions: Owner or explicitly authorized assigned Team Leader, with requester different from approver. Clients view only explicitly shared approved costs and do not approve. Released design/BOQ inputs remain fixed; explicit change request and full reapproval are required before replacement.

Sol design uses a Turnkey-owned release aggregate, separate immutable price storage and exact DOC-approved revision/checksum validation. S05 handles named typed requests/decisions and queue cards. Permission-defined Team Leader qualification requires current assignment, project.manage and employee.manage plus explicit cost/approval grants; role names cannot confer authority. Operational serializers omit prices and cost-decision details. Exact scaled integers compute BOQ extension sums without rounding or financial-system processing. Owner cost shares use current S14 client grant/session checks and deny Cancelled-project cost reads. Database canonical-evidence/version/immutability guards and atomic approved replacements preserve prior inputs/history. See S19_SPEC.md; acceptance remains separate.

## S20 Owner decisions implemented — 2026-10-03

The settled decisions now have a backend implementation: assigned Project Lead/authorized management appoints the single responsible person; only that person confirms reports; authorized management decides a separate site handover after completed packages, passed quality and closed snags. Client acceptance/project completion remain separate. C-020 independent named verification and C-021 separate management closure retain their approved authority. S20 is COMPLETE for development/local staging; implementation detail and evidence are in S20_SPEC.md, S20_API_CONTRACT.md and S20_COMPLETION_REPORT.md.

## S20 persistence and evidence decisions — implemented 2026-10-04

S20 uses four additive persistence models: one project `SiteWorkspace` carrying the serialized aggregate version and current responsible account; typed `SiteRecord` heads; append-only `SiteHistory`; and immutable `SiteVerificationAttempt`. All commands lock the project/workspace and validate the expected aggregate version. History and attempt identities are tied to canonical event/audit/outbox evidence by deferred PostgreSQL guards; canonical snapshots bind by exact JSON or SHA-256 plus scoped project/version identity. Confirmed reports, handovers, and closed snag decisions remain immutable. Factual progress edits after explicit package completion update current operational facts while preserving the separate completion decision. The workspace does not add command replay receipts or duplicate Workforce attendance data. See DATABASE.md, DOMAIN_MODEL.md, S20_SPEC.md and S20_API_CONTRACT.md. Aggregate development/local-staging acceptance passed; actual-project R-105 and production gates remain separate.

## S21 Owner decisions — 2026-10-04

Owner authorized S21 and settled ordinary external invitation/grant/revocation authority as Owner, currently assigned Project Lead, or explicitly authorized Team Leader, with exact scope, reason and audit. Job title alone grants nothing. Owner alone issues and manually cancels native CAD shares. Consultant reviews/comments and vendor/factory production updates are retained advisory submissions; existing staff/internal/client acceptance and operational validation authorities remain responsible for formal decisions.

The additive identity design uses a distinct EXTERNAL account kind, separate OTP/code and cookie/session store, and exact project grants with CONSULTANT or VENDOR_FACTORY persona plus explicit revision/release/package arrays. It does not reuse CLIENT identity or staff sessions. Existing module permissions still apply: `external.manage` alone does not imply DOC `document.view`; TURNKEY/SITE checks also remain. Access loss denies application retrieval and requires a mandatory Owner native-cancellation notice. Cancellation stays pending until every active native share has confirmed manual revocation. A separate finite C-016 grant names an approved closeout task and exact permitted scope and never restores delivery authority. S21_SPEC.md and S21_API_CONTRACT.md record the settled boundary. S21 is COMPLETE for development/local staging; S21_COMPLETION_REPORT.md records implementation and final acceptance evidence. S18 remains excluded/unresolved, S22–S27 unauthorized, and MinisCloud/Brevo/NAS plus actual-project R-105 remain unverified.

## S23 Owner authorization and performance evidence decisions — 2026-10-05

The Owner instructed S23 to start and complete, superseding earlier unauthorized S23 wording. The Owner explicitly approved configuring and approving role groups, metric formulas, weights and thresholds before any score; missing required evidence produces insufficient evidence. Delay exclusions require an Owner-reviewed cause, duration and real source record. Team Leaders use current team/project scope, and only the Owner finalizes review cycles. S18-dependent metrics remain unavailable, with no S18 integration. These decisions are recorded in S23_SPEC.md; S24–S27 remain unauthorized.

The implemented calculation boundary uses explicit bounded linear normalization and approved weights, caps and thresholds without seeded numeric defaults. Employee quality must outweigh speed; missing optional inputs cannot renormalize into a violation of that rule or approved attendance/efficiency caps. Separate employee, leader, Design and Turnkey policies retain immutable source snapshots. Prospective policy/group changes require separate periods when an effective change falls inside a requested period, preserving previously published results.

Existing read-only REV/DOC, APR and WFM ports supply exact Confidential revision access, typed approval scope and schedule-derived capacity. Historical responses recheck current source access; revocation redacts the response without editing retained evidence. Task deadline and owner reconstruction use immutable history at the source/completion version, including the first later change's original value when necessary. Employee lateness uses the approved revised deadline before external equivalent-day deductions, avoiding a second deduction for the same extension and preserving residual lateness. Project delay shows full explicit source allocations rather than inferred calendar-day proration.

S23 adds reasoned version history, canonical event/audit/outbox evidence and stable command receipts. Owner policy approval, group assignment, attribution and review finalization are enforced by backend authority and additive SQL guards; acknowledgements remain append-only and employee-owned. Applied migration 98 remains unchanged, with migration 99 adding policy/family/score/canonical-event guards. S23_API_CONTRACT.md describes implemented interfaces; development/local-staging completion passed actual full gates and final Sol acceptance in S23_ACCEPTANCE_REVIEW.md. S23_COMPLETION_REPORT.md records exact evidence and remaining limits.

## S25 approved adapter boundary — 2026-10-05

Owner approved calendar one-way minimal export and then the remaining signed-enquiry/map-link bundle. INT owns encrypted connector configuration, version history, transport dedupe/delivery evidence and calendar projections. CRM owns lead creation via createLeadInTransaction with identical existing guards/history/audit; WFM owns configured SITE reads; PRJ supplies current assignment/branch fences. No direct INT business-table writes or external general CRUD/outbound event exposure. Applied105/106 are forward immutable migrations. This implements the approved architecture rather than granting new organizational tiers or cross-branch authority.

## S26 bounded automation and saved reports — Owner decision, 2026-10-06

The Owner expressly approved bounded S26 before the actual-project checkpoint: saved report definitions on existing S24 source/column reads, scalar filters and retained-row count charts; automatic internal notifications/report generation; high-impact recommendations finalized by an authorized human through the existing domain workflow. AUT never executes a high-impact business command. S05 recommendation review is nonbinding and can be reviewed by its named current authorized human, including its configuration author; this creates no owning-domain approval fact and does not change any ordinary self-approval rule. Current original report manifests remain attached to generated results and are reauthorized before read/export. Four additive AUT tables, immutable versions/runs/receipts, prospective version cutoffs and rule/version/event deduplication implement this boundary. See S26_SPEC.md and S26_API_CONTRACT.md. S18/S27 and production gates remain excluded.

## Application completion — Owner decisions, 2026-10-13

The Owner requested completion of the application and explicitly selected the bounded actionable-work and subtask recommendations during this completion task. My Work may present separately typed actionable tasks, assigned review rounds and decidable approvals with honest separate counts. Collaborator or blocked work is included only when a concrete existing authorized next action belongs to that actor. Task due/overdue attention uses Target and the organization calendar; existing review/approval deadlines retain their domain meaning. This does not invent risk/severity thresholds, sum overlapping sources as tasks, broaden access or authorize automatic decisions.

The Owner approved one-level same-project subtasks using ordinary explicit assignment and access. Each child has its own Target and task workflow. The parent cannot complete until every child is completed. Existing review, cancellation and archive restrictions remain. Relationship implementation must preserve branch/project/employee isolation, versions, audit and concurrent completion guards; checklist/dependency/correction relationships remain distinct. Source implementation is authorized within these settled rules; no database lifecycle operation, migration deployment, production change or external transmission follows implicitly.

Create-task role-profile work remains at the Owner-selected backend-plan-first stage. The optional JobRole presentation classification and conflict fallback in MY_WORK_CREATE_ROLE_PROFILE_PLAN_2026-10-13.md are proposals, not additional approved schema/configuration decisions.

## Creation presentation — Owner decision, 2026-10-13

During application completion the Owner explicitly approved the optional Owner-configured job-role presentation setting, with generic Employee fallback when the classification is missing or conflicting. The setting affects presentation only; existing permission checks remain unchanged. The role-profile plan's optional nullable JobRole hint, canonical Owner account precedence and no automatic role-name mapping/backfill define the bounded implementation. Canonical current active role assignments determine staff hints. This settles the earlier backend-plan-first decision gate for source implementation; database lifecycle and migration deployment still require their applicable dedicated-target authorization.

## Subtask relationship implementation choice — 2026-10-13

Sol selected an immutable TaskSubtaskLink table rather than a Task.parentTaskId scalar. Existing endpoints return raw canonical Task scalars; a nullable parent column would disclose inaccessible parent identifiers through those existing serializers. The separate relation allows explicit independently authorized parent/child projections and a batched isSubtask marker without expanding access or rewriting every task mutation response. It implements the Owner's one-level same-project relationship, with unique child/organization, scoped parent/child/project foreign keys, immutable link evidence, ordinary parent edit/management authority, explicit child assignment and parent version/audit changes.

Parent completion is gated in ordinary, internal-review and client-review service paths and the new SQL guard. Explicit dependency edges and implicit parent-needs-child completion edges share one graph evaluator and the existing project advisory lock, rejecting direct/indirect completion cycles while allowing valid sibling ordering. New source migration20261008020000_task_subtasks is prepared after role hint migration20261008010000; neither is claimed deployed here. No accepted existing migration is edited. Runtime persistence/concurrency/preservation acceptance remains pending.

## My Work consolidated parity plan — Owner review decisions, 2026-10-13

During the explicitly requested CEO/engineering/Refero planning review, Owner selected HOLD SCOPE (D1), one globally ordered server-paged attention queue with separate Tasks/Reviews/Decisions counts and preserved permissions (D2), and visible Tasks source selection for task-only filters with Clear restoring mixed work (D3). Domain task/round/request identities remain distinct; personal task totals are not an aggregate of these independent obligations. Unsupported risk/follow-up/responsibility policies are not invented.

Owner selected exact demo status fills with dark labels on Not started, In progress and Completed badges (D4). The reference pairs fall below normal-text contrast; use #0b100d for those labels and minimally strengthen secondary text/focus where required. Layout, canonical lifecycle and the rest of the locked demo colour language remain authoritative; rendered verification is pending.

Owner selected one composer-owned RepeatableRead response snapshot with transaction-aware domain ports and a shared readAt/organization-calendar context (E1). Evaluate the complete authorized filtered candidates, derive separate counts, sort globally and apply bounded paging once. Source public endpoints retain their own transaction wrappers; the composer does not call independently transacting wrappers. Each later page reauthorizes current data. Commands remain in owning modules and recheck authorization under their existing locks.

These are planning decisions. They do not independently authorize a host run, database setup, migration deployment, retained-preview reseed or authenticated acceptance, and do not begin MW-I03. Existing bounded source authorizations remain intact. The reviewed plan, test checklist, reference ledger and execution gates are in docs/design/my-work-integration-audit/MY_WORK_DEMO_PARITY_CONSOLIDATED_PLAN_2026-10-13.md. MW-I02 remains IN PROGRESS pending actual current-source functional/visual evidence and Owner acceptance.

## Integration adapter boundary — recorded 2026-10-14

G09 in the 14 October API/product gap register was a documentation-only finding: the register listed "aspirational integration adapters" as a gap. This records what the source actually implements so the absence is not later mistaken for a defect or an oversight.

The integration module implements exactly two external adapters, both injected `@Optional()` in `apps/api/src/integration.service.ts:22-23` and both resolving internal Sense services rather than third-party providers: `CrmService` (`crm.service.ts`) and `WorkforceService` (`workforce.service.ts`). `configuredActor` at `integration.service.ts:115` throws `ConflictException("CRM adapter unavailable")` when the CRM adapter is absent, which is the deliberate degradation path for an unconfigured optional adapter.

No Slack, Microsoft Teams, QuickBooks, Zoho or other third-party adapter exists, and none is planned or implied by the approved requirements. The only inbound external path is the signed website-enquiry webhook (`integration-webhook.ts`, signature verification and idempotent advisory locking), which is a connector ingestion path, not a provider adapter. Outbound integration is the internal calendar projection with token-scoped subscription feeds.

This is a boundary statement, not an authorization to build third-party adapters. Adding one would be new scope requiring an explicit Owner decision, its own requirement IDs, and review of the credential custody and external-transmission consequences. It would also conflict with the retrieval-grounded, no-external-transmission boundary recorded for the AI assistance module on 13 October, so the two must be reconciled before any provider integration is proposed.

## G04 dashboard drain — narrowed, no change made, 2026-10-14

G04 in the 14 October API/product gap register claimed `allDecisions` "drains to completion rather than honoring a page bound." Source review on 14 October confirms the drain is real but shows the register overstated its severity, and shows the mitigation it proposed already exists. No code change was made, because the defect as described does not exist.

Confirmed real: `dashboard.service.ts:85` `allDecisions` loops `approvals.attention(actor.accountId, 100, cursor)` until `nextCursor` is exhausted, and `dashboard.service.ts:81` `allTasks` does the same across the `mine` and `assigned` scopes until `offset >= page.total`. Both materialize the full set before the caller filters.

Not a defect, contrary to the register: the composer at `dashboard.service.ts:272` gates both behind `include(source)`, and `dashboardSource(actor, source)` at `:268` already routes to `dashboardRead` with a single `selectedSource`. So a caller fetching `dashboard/sources/decisions` does not pay for the task walk at all, and vice versa. The register proposed building per-source fetching as the closure; `dashboardSource` is that closure and it predates the register.

The residual issue is therefore narrow and low severity under S27 scope: the *full* `GET dashboard` (no `selectedSource`) still materializes every decision and every task to render five attention sections that filter but never slice. That is a full-shell read for a single actor, bounded by what that actor can actually see, so it is not an authorization or branch-isolation concern — it is a payload-size concern that grows with an actor's own backlog.

Recommended treatment, if the Owner wants it closed: bound the attention sections at a fixed page size (for example the existing 100 used elsewhere) and expose the true total separately, rather than introducing a new pagination surface. That is a report-contract change affecting the web dashboard and its tests, so it needs its own slice and acceptance run. It is not worth doing unasked, and nothing here blocks MW-I02.

No application code, test, schema or database change was made for G04. No gate was run; this VM cannot execute `pnpm verify` (Node 22.23.2 against a pinned 24.19.0, no pnpm, and the `.pnpm` symlink store is unreadable through this mount).

## G01 per-typeKey approval counts — deferred as unsafe to add now, 2026-10-14

G01 in the 14 October API/product gap register proposed a per-`typeKey` approval breakdown so a client could show "3 skill approvals, 2 leave approvals". Source review on 14 October found the count is not a simple `groupBy`, and that adding it now would conflict with the settled D2 parity design. No code change was made.

Why it is not a `groupBy`: `ApprovalRequest` (`apps/api/prisma/schema.prisma:1823`) carries only `organizationId` — there is no branch, team or employee scoping column. Visibility is decided per (actor, request) by each handler's `canView`, which is why `ApprovalService.attention` (`approval.service.ts:191`) scans candidate rows and filters through `canView` inside a per-request transaction rather than aggregating in SQL. A `groupBy` on `typeKey` would therefore count rows the calling actor is not authorized to see, leaking other branches' pending approval counts. Any correct implementation must reuse the same scan-and-authorize path, which makes it a scan over the eligible set rather than a cheap aggregate.

Why now is the wrong time: the settled D2 decision ("one globally ordered server-paged attention queue with separate Tasks/Reviews/Decisions counts and preserved permissions") is implemented, and the web composes its source counts client-side in `apps/web/src/my-work-attention.tsx` (`sourceCount` at `:209`, `actionCounts` at `:237`) from independently fetched sources. Introducing a server-side per-type breakdown as well would create a second, competing count source — the same class of double-counting defect the 14 October register was written to correct in the first place.

Recommended treatment, if the Owner wants it: add the breakdown inside the existing `attention` scan so it is authorized by construction, expose it as an additive optional field on the attention response (never replacing the client-composed D2 counts), and gate it behind its own slice with acceptance evidence. Until then it is a missing feature, not a defect, and nothing here blocks MW-I02.

No application code, test, schema or database change was made for G01. No gate was run; this VM cannot execute `pnpm verify` (Node 22.23.2 against a pinned 24.19.0, no pnpm, and the `.pnpm` symlink store is unreadable through this mount).

## G08 follow-up audit — one further instance of the same class found, 2026-10-14

The G08 addendum's suggested next session asked whether any other place in the API returns 403 where 409 would be the honest status. This records the audit and its one finding. Source review only; **no application code, test, schema or database change was made** and **no gate was run**.

Scope of the audit: every `ForbiddenException` throw in `apps/api/src/*.ts` (462 in total) is far too broad to triage by eye, so the audit targeted the actual G08 pattern rather than all 403s. G08 was a 403 thrown inside an approval handler callback, on a path where the requester's or decider's authority had already been validated earlier in the same flow, and where the real condition was that workflow state had changed. That pattern can only arise in handler callbacks, so all six `ApprovalHandler` callbacks across every registered handler were extracted by brace-matching and their bodies scanned.

Result: of the six callbacks, exactly one contains a `ForbiddenException` other than the two already fixed in G08 — `onDecision` in `apps/api/src/skills.service.ts:236`, `"Current skill approver scope required"`.

Why it is the same defect, and on the more important path: `decisionPolicy` (`approval.service.ts:140-151`) runs `handler.canDecide` at `:147`, and the skills handler's `canDecide` (`skills.service.ts:234`) already evaluates `currentEligibleWithoutSession`. The engine then invokes `onDecision`, which re-checks `managerWithoutSession` independently at `:236`. Both checks run in the same transaction, but they are separate evaluations, so a `skills.manage` scope revocation landing between them makes the decider receive 403 "Current skill approver scope required" — telling them they are not permitted to decide, when in fact they were permitted moments earlier and the workflow state moved underneath them. The honest status is 409, for the same reason G08's was: authority was valid at decision time, the state changed, refresh and retry.

This instance is arguably more consequential than G08's, because `onDecision` is the mutating path — G08's `resolveApprover` only constructs the request. A 403 here can strand a legitimate approver mid-decision.

Recommended treatment, if the Owner wants it closed: mirror G08 in `onDecision`, throwing `ConflictException` with a stable code such as `SKILL_APPROVER_SCOPE_CHANGED`. Note the deliberate asymmetry with `canDecide`: the 403 at `approval.service.ts:147` should stay 403, because there the decider genuinely was not authorized and no state change is implied — the two checks answer different questions and only the later one is racy.

This is a behavior change on an approval path and is not applied here. It needs its own slice, an Owner decision, a concurrency regression test that revokes scope between the two checks, and an acceptance run. No client currently depends on the 403 string, but the status change matters to any caller treating 403 as permanent.

The remaining 461 `ForbiddenException` throws are ordinary authorization denials — actor/employee/session validity, branch and project access, ownership checks — where 403 is correct. They are not the G08 class and are not listed here.

## G08 test pre-flight — traced, not executed, 2026-10-14

The two G08 unit tests in `apps/api/src/skills.service.unit.spec.ts` have never been executed, because this environment cannot run them. This records a static trace of both cases so the host run is not wasted on a stub defect. **No tests were run and no code was changed.**

What was verified by reading source and the installed `@nestjs/common` implementation:

1. **Construction is safe.** `SkillsService`'s constructor (`skills.service.ts:20-22`) calls `approvals.registerHandler(this.approvalHandler())`. Both new tests pass a real `new ApprovalService({ prisma: { $transaction: jest.fn() } })`, and `registerHandler` (`approval.service.ts:56`) only writes to a `Map`. `ApprovalService`'s constructor takes only `DatabaseService`, matching the argument. No DB call happens during construction.

2. **`approvalHandler()` is pure.** It returns an object literal (`skills.service.ts:219-224`) with no database access, so the helper's `(service as unknown as { approvalHandler(): ApprovalHandler }).approvalHandler()` cast is safe to invoke on a bare instance.

3. **`this` binding reaches the instance stub.** The handler's callbacks are arrow functions inside `approvalHandler()`, so `this` is captured lexically from the `SkillsService` instance. Test 2's `(service as unknown as { managerWithoutSession: () => Promise<boolean> }).managerWithoutSession = async () => false` therefore *is* reached when line 230 calls `this.managerWithoutSession(...)`. This was the main risk — a non-arrow callback would have bound `this` to the handler object and the stub would have been silently ignored, making the test pass or fail for the wrong reason.

4. **Assertion shape is correct for NestJS.** Read `node_modules/.pnpm/@nestjs+common@12.1.0_.../exceptions/http.exception.js`: `HttpException` assigns `this.response = response` verbatim, and `ConflictException({ message, code })` therefore sets `response` to that whole object. So `toMatchObject({ status: 409, response: { code: "..." } })` matches, because `error.status === 409` and `error.response.code` is the code. This also means the HTTP response body carries `{ message, code }`, which is the shape the web's generic 409 handling already expects.

5. **Both traces reach the intended branch.** Test 1: employee found, account `null` → line 229, `SKILL_APPROVER_UNAVAILABLE`. Test 2: employee found, STAFF approver with valid employee, `kind !== OWNER` so the second branch is entered and the stubbed `false` → line 230, `SKILL_APPROVER_SCOPE_REVOKED`.

Conclusion: both tests are expected to pass on a correct dependency graph. This is a static trace only and is **not** a substitute for the host run — it rules out stub and assertion defects, not a broken environment or a type error under the pinned TypeScript config.

The host run still required to close G08: `pnpm --filter @sense/api test -- skills.service.unit.spec.ts` and `skills.database.api.spec.ts` on Node 24.19.0 / pnpm 11.19.0, plus `typecheck`. The pre-existing `skills.database.api.spec.ts:108` case exercises the untouched `request()` 403 path and should still pass.

## G08-class fix APPLIED to skills onDecision — UNVERIFIED, 2026-10-14

The Owner authorized the recommended action on 14 October 2026. This applies the 403→409 correction recorded earlier for `apps/api/src/skills.service.ts` `onDecision`. **The change is applied to source but is UNVERIFIED — no test, typecheck, lint or build was executed.**

### Change applied

`apps/api/src/skills.service.ts:239`, inside the `onDecision` callback of the `skill.change` approval handler. One line replaced:

- Before: `if (!await this.managerWithoutSession(tx, deciderId, kind, row.organizationId, row.employeeId, "skills.manage")) throw new ForbiddenException("Current skill approver scope required");`
- After: `... throw new ConflictException({ message: "Current skill approver scope was revoked during this decision", code: "SKILL_APPROVER_SCOPE_CHANGED" });`

`ConflictException` was already imported at `skills.service.ts:1`, so no import change was needed. This is the only line changed in the file.

### Why this is the right status

`decisionPolicy` (`approval.service.ts:140-151`) runs `handler.canDecide` at `:147`, and the skills handler's `canDecide` (`skills.service.ts:234`) already evaluates `currentEligibleWithoutSession`. The engine then calls `onDecision`, which re-checked `managerWithoutSession` independently. A `skills.manage` revocation landing between the two checks produced 403 "Current skill approver scope required", telling a legitimate approver they were never authorized, when in fact they were authorized moments earlier and the workflow state moved. 409 with a stable code states the true condition: refresh and retry.

### Deliberate asymmetry — the engine 403 stays 403

`approval.service.ts:147` `throw new ForbiddenException("Approval decision is not allowed")` is **unchanged and correct**. That check answers a different question — "was this actor authorized to decide at all" — with no implication that state changed. Only the later, racy re-check in `onDecision` is a state question. Both checks are required; conflating them would make a genuine authorization denial look retryable.

### Regression test added

`apps/api/src/skills.service.unit.spec.ts` gained one case in the existing `describe("SkillsService skill.change approval handler", ...)` block, plus a small `onDecision` helper mirroring the existing `resolveApprover` helper. The case stubs `skillChangeRequest.findFirst` to return a row, `account.findUniqueOrThrow` to return `{ kind: STAFF }`, and `managerWithoutSession` to `false`, then asserts `rejects.toMatchObject({ status: 409, response: { code: "SKILL_APPROVER_SCOPE_CHANGED" } })`.

Verified statically, not executed: the scope check at `:239` runs before the `decision.outcome !== "APPROVED"` early return, before `$executeRaw`, and before any rating or catalogue logic, so the stub is reached and nothing else can throw first. Assertion shape was confirmed against the installed `@nestjs/common` `HttpException`, which assigns the constructor argument verbatim to `this.response`.

### What was NOT changed and why

The two G08 cases and both G08 codes are untouched — diff against the pre-change file shows **zero deleted lines** in the spec and one changed line in the service. No existing test referenced the old message (verified by search across `apps/`, `tests/`, `packages/`), so nothing depended on it.

### Client impact

No web code parses a skill-specific approval code; the generic 409 handling is established in `crm.tsx:14`, `external-portal.tsx:62,139`, `gallery.tsx:15`, `learning-training.tsx:107,203`, `document.tsx` and `task.tsx`, all mapping 409 to a refresh-and-retry message and 403 to a permanent-access message. The new code will therefore surface as retryable without client changes.

### Required before this can be called complete

On Node 24.19.0 / pnpm 11.19.0:

1. `pnpm --filter @sense/api test -- skills.service.unit.spec.ts` — all five cases should pass, including the two G08 cases and the new one.
2. `pnpm --filter @sense/api test -- skills.database.api.spec.ts` — the pre-existing `request()` 403 path at `:108` is on an independent code path and should still pass.
3. `pnpm --filter @sense/api typecheck`.
4. Full `pnpm verify`, and an E2E pass on the skill-approval decision path confirming a mid-decision revocation now renders as retryable rather than as lost access.
5. A real concurrency test that revokes `skills.manage` between `canDecide` and `onDecision` — the unit test simulates the revocation by stub, which proves the branch but not the race.

Until 1-4 run, this change is **UNVERIFIED** and must not be described as passing.

## G08 EXECUTED — tests pass on host, 2026-10-14

**This is a real execution, recorded after the fact, not a static trace.** On 2026-10-14 the Owner ran G08's unit tests on the Windows host. Environment confirmed correct first: Node **v24.19.0** and pnpm **11.19.0**, matching `engines` and `.nvmrc` exactly. `pnpm install --frozen-lockfile` returned `Already up to date` in 509ms, confirming the tree recovered on 2026-10-14 is healthy and the lockfile matches.

### Command and result

```
pnpm --filter @sense/api test:unit -- skills.service.unit.spec.ts
```

```
 PASS  src/skills.service.unit.spec.ts
  SkillsService authorization
    √ requires a supplied live session even for service-level reads (3 ms)
    √ rechecks catalogue authority before returning an actor-scoped replay receipt (1 ms)
  SkillsService skill.change approval handler
    √ returns 409 SKILL_APPROVER_UNAVAILABLE when the named approver account is missing (2 ms)
    √ returns 409 SKILL_APPROVER_SCOPE_REVOKED when the named approver's session-bound scope is gone (1 ms)
    √ returns 409 SKILL_APPROVER_SCOPE_CHANGED when the decider's skill scope is revoked mid-decision (1 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

### What this establishes

The two G08 cases pass: `SKILL_APPROVER_UNAVAILABLE` and `SKILL_APPROVER_SCOPE_REVOKED` both return 409 with their stable codes on a real dependency graph. The original G08 change is behaviorally correct, not merely syntactically correct.

The two pre-existing authorization cases still pass, so G08's change did not disturb the surrounding authorization logic in `setup` or `createCatalogue`.

The `SKILL_APPROVER_SCOPE_CHANGED` case added this session passes, confirming the `onDecision` fix at `skills.service.ts:239` reaches its branch under the pinned TypeScript config on a real `node_modules`. The static trace's one real residual risk — that a stub-based test might not reach the stubbed method — is cleared.

### What this does NOT establish — read before calling G08 closed

1. **Only this one file ran.** The remainder of the API unit suite, `typecheck`, `lint`, `build`, and `test:integration` have not run in this session. The earlier MW-I02 preparation reported API 359/57 suites and frontend 453/45 files on frozen source `752761cb`, but that predates the `onDecision` change and the new test.

2. **The `request()` 403 path is unverified by this run.** `skills.database.api.spec.ts` (integration) was not executed. The unit run confirms nothing about it, because it exercises `resolveApprover`, not `request`.

3. **The new test proves the branch, not the race.** `managerWithoutSession` is stubbed to `false`. It demonstrates that when the second scope check fails, a 409 with the right code is thrown. It does not demonstrate that a real `skills.manage` revocation between `canDecide` and `onDecision` produces that path. The concurrency claim in this decision record still rests on code reading, not on evidence.

### Required to fully close

```
pnpm --filter @sense/api test:integration -- skills.database.api.spec.ts
pnpm --filter @sense/api typecheck
pnpm verify
```

Plus a genuine concurrency test that revokes `skills.manage` between the `canDecide` and `onDecision` evaluations, and an E2E pass on the skill-approval decision path confirming a mid-decision revocation renders as retryable rather than as lost access.

### Status

**G08: unit tests PASS (executed 2026-10-14).** The register's core finding — the 403→409 change with both stable codes — is verified behaviorally. The `onDecision` follow-up fix is applied and its unit case passes. Both remain open pending integration, typecheck, `pnpm verify`, and a real concurrency test.

## Integration suite cannot run outside GitHub CI — verified by source, 2026-10-14

The `skills.database.api.spec.ts` integration path was attempted on the host and cannot complete there. This is the project's intended design, not a defect and not a G08 regression. Recorded so no one mistakes these failures for a code problem later.

### Observed

`pnpm --filter @sense/api test:integration` produced **22 suites passed, 4 failed, 38 skipped** and **141 tests passed, 30 failed, 230 skipped**.

Every failure was one of two environment messages, never an assertion:

- `"S18 requires a dedicated local test target or the explicitly enabled exact S27 suite target"` — thrown by the port/name guard at `apps/api/src/s18-test-fixture.ts:20` (port **57433**) and at `apps/api/src/skills.database.api.spec.ts:21` (port **56433**).
- `"Can't reach database server at 127.0.0.1:56433"` — `PrismaClientKnownRequestError` from `$queryRaw` in the skills suite's `beforeAll`, because no disposable Postgres was listening on that port.

### Why these guards exist

`apps/api/scripts/../ci/run-api-web-tests.mjs` opens with a hard gate:

```js
if (process.env.GITHUB_ACTIONS !== "true" || process.env.NODE_ENV !== "test" || process.env.S27_E2E_ENABLED !== "1") {
  throw new Error("Full fixture tests require the guarded GitHub CI environment.");
}
```

It also calls `assertNoSkipped`, so a skip is a failure by design. The fixed-port guards in the specs enforce the same thing at the suite level: each guarded suite demands its own dedicated disposable PostgreSQL on a specific loopback port with a `*_test` name. This is deliberate isolation, and it is why `library.database.api.spec.ts` refused to run when `S18_DATABASE_URL` pointed at the wrong port rather than silently testing against the wrong data.

### How CI satisfies it

`.github/workflows/s01-quality.yml` does four things in order: starts one `postgres:17.10-alpine3.24` service on port 56433; runs `pnpm db:migrate:deploy`; runs `scripts/ci/prepare-disposable-postgres.mjs` (284 lines, spawns `docker` and `pnpm` subprocesses to provision per-suite fixtures); then runs `scripts/ci/run-api-web-tests.mjs` instead of invoking Jest directly. The last two steps are what a developer host does not replicate, and the prepare script is written for Linux CI — it is not a supported Windows workflow.

### Consequence for G08

The `request()` 403 path in `skills.service.ts` is exercised only by this integration suite, which has **not** executed. It remains unverified. Note that G08 did not change `request()`, and 22 integration suites plus 5 unit tests passed in these runs, so there is no evidence of a regression — only an absence of coverage.

### Correct route to this evidence

Push the branch and let CI run `s01-quality.yml`. That is where this suite is designed to run, and it is the only route that does not require rebuilding the CI fixture pipeline by hand. Local provisioning via Docker plus `prepare-disposable-postgres.mjs` is possible but unsupported on Windows and should not be attempted casually.

### Interim state

G08 unit tests pass (recorded above). `pnpm verify` — typecheck, lint, unit, build, E2E — is the host-runnable gate that covers everything G08's change could plausibly have affected without a disposable PostgreSQL, and is the next step on the host.
## Owner-approved Agent 1 isolated real-browser acceptance — 2026-10-16

Owner selected **“Approve isolated browser tests”** for `docs/development/V1_AGENT1_BROWSER_ACCEPTANCE_2026-10-16.md`: a NEW PostgreSQL18.6 cluster under `.artifacts/v1/20261016-agent1-browser`, loopback59751, database`sense_v1_agent1_browser_20261016_test`, migrations1–119, real AppModule API59752/current frontend59753, synthetic fixture users/sessions/files, four-width task/receipt/My Work/Project browser checks and bounded fixes/rechecks while that exact stack remains running, then stopping only owned processes/cluster with all data preserved. No retained/old59749/MW-I02/production restart/migration, reset/drop/delete, live provider/external transmission or deployment. This is separate from the earlier source-only receipt and59749 database-test approvals. Server-validated fixture sessions do not claim passkey/onboarding or pilot acceptance. The custom execution switch remains a guard, not independent authorization.
# NAS deployment implementation model exception — 16 October 2026

Owner explicitly authorized implementing the NAS/phone deployment proposal and selected “Use current Codex for this deployment work” after being informed that AGENTS.md requires unavailable Opus/Sonnet routing. This exception covers current-agent implementation and review of NAS-01–04, not independent/model-specific acceptance claims. Owner has an existing website domain and agreed an app subdomain; the exact domain was not supplied. Production activation still needs verified NAS/storage/offsite inputs and concrete release evidence. No business policy, permission, schema, retention or actual-project acceptance rule is changed.

The implemented package uses a separate production Compose, the existing PostgreSQL17 baseline (no major upgrade), private one-hop Cloudflare/proxy contract, required dedicated NAS mounts, explicit migrations and immutable release labels. Phone delivery reuses the approved PWA and S22 authority with deferred, sole-window, queue-preserving activation. Operational restoration is a new isolated stopped rehearsal target, not automatic production failover. Current Codex completed source review and bounded verification; full-root lint and real container/NAS/phone/offsite/pilot acceptance remain open as recorded in the NAS progress report.

