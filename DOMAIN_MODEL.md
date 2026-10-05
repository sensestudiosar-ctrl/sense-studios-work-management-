# Domain model — S01–S13 complete for development/local staging

## S23 implemented entities — acceptance pending

PerformanceRecord owns typed POLICY/ASSIGNMENT/SCORE/HEALTH/DELAY/CYCLE data, organization/subject scope and current version. PerformanceVersion freezes each state/payload/reason/actor with its canonical domain event; PerformanceReceipt retains the original actor/command/fingerprint/result for replay after current authorization. Approved policy, dated group mapping, scores/health and attributions are immutable; changed definitions/mappings/attributions append new evidence. Cycle history retains manager comments/goals/actions, Owner-only finalization and employee-owned append-only acknowledgements. Score snapshots retain raw metric values, explicit normalization/weights, exact policy/source IDs/versions, exclusions, explanation/change/trend evidence and truthful insufficient-evidence states. Training/skills/SOP inputs remain unavailable under the Owner's explicit S18 exclusion. Historical formulas/scores are never silently rewritten; periods crossing approved policy/group changes require separate snapshots. See S23_SPEC.md for pending acceptance.

## S22 offline entities — COMPLETE for development/local staging

SiteCommandReceipt binds one organization/project/actor/local command identity and immutable fingerprint to one canonical SITE mutation result/version/event. Exact replay returns the original result after current authorization. Independent NOTE SiteRecords retain notes and exact photo references without replacing package/report/snag evidence. The browser stores account-bound OfflineCommand/OfflineContext with stable command/local/photo IDs and package base versions; local pending/uploading/syncing/conflict/error states are presentation evidence, never server approvals. Existing DocumentUpload owns image staging and immutable finalized blobs. S22_SPEC.md and S22_API_CONTRACT.md define the phased scope.

S11 adds DocumentFolder, Document, FileBlobMetadata, DocumentUpload/DocumentUploadChunk, DocumentAccessGrant and FileRetentionRecord. These are organization/project-bound; file identity is separate from its private immutable storage key. Confidential policy is exact folder/file grants plus project assignment and scoped permissions. Upload lifecycle is STAGING → FINALIZED or ABORTED; physical folder lifecycle is PENDING → READY/FAILED with retry. S12 adds immutable revisions, approved-current supersession and internal formal-issue records. S13 adds task-bound internal review and exact R-revision approval production. S14 adds isolated CLIENT identities, project/item grants, immutable review packages/items, exact decisions, Primary final-batch approval, client annotations/private references, classification/correction records and cancellation-scoped read access. S14 is COMPLETE for development/local staging; see S14_COMPLETION_REPORT.md.

Source: requirements/APPROVED_REQUIREMENTS.md, especially R-004–R-098. C-001 approves Organization → Branch → Team → Employee, with no separate Brand or Department level; each project has one branch, and employees may work across branches only through explicit assignment. S02 implements Account, PasskeyCredential, WebAuthnChallenge, Session, identity enrollment/recovery records and SecurityEvent. S03 implements Organization, Branch, Team, JobRole, Employee, EmployeeMembershipHistory, multiple dated EmployeeJobRoleAssignment rows, role permission bundles, employee permission overrides and append-only OrganizationEvent evidence. S04 implements canonical AuditEvent, versioned DomainEvent, per-consumer OutboxDelivery, recipient-scoped Notification, mailbox verification challenges, user preferences/quiet hours, and guarded retention and linked correction records. All nine migrations and PostgreSQL acceptance passed; see S04_COMPLETION_REPORT.md.

## Organization and identity

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Organization | Firm boundary; owns branches, accounts, policy. | Stable ID; no cross-organization reads. |
| Branch | Child of Organization; owns teams and projects. | Each project has one current owning branch; formal Owner-approved transfer preserves history and recalculates access. |
| Team | Child of one Branch; groups employees, reporting and workload. | Each employee has one current home Team within one home Branch; dated history is retained. |
| Employee | Internal person/profile under the approved Branch/Team structure; linked to account, schedule and skills. | Active/exited access state; exit revokes access but never removes project/audit history. |
| Account / Session | Login identity, passkey authenticators, external email-code challenges, recovery records and revocable devices. | Session revocation blocks future access; Owner-verified employee recovery revokes lost passkeys; the Owner has a second passkey and offline recovery code. Secret material never enters audit. |
| JobRole / manager reference | Describes work and reporting within Branch/Team, separately from authorization; no extra organization tier. | Configurable roles and dated reporting changes; do not hard-code job titles as permissions. |
| PermissionGrant / Override | Action/resource/scope/condition decision for a principal. | Effective grants versioned/audited; revocation immediate; deny by default. |
| ProjectMembership | Explicit participation and branch-crossing access. | Unique project/person/role; membership does not imply every file is visible. C-016 closeout access for vendors/consultants is a separate, narrow, expiring grant after cancellation. |

## Customer and delivery

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Lead / LeadActivity | CRM pipeline and interactions; may convert on Won. | New → Contacted → Meeting/Discussion → Proposal → Negotiation → Won/Lost; Lost needs reason. C-017 permits scoped, reasoned forward jumps and records skipped stages as skipped, not completed. C-018 keeps Lost terminal and links any returning opportunity as a new Lead with its own history. C-019 permits reasoned backward moves while a lead remains nonterminal; stage history is never overwritten. |
| Client / ClientUser | One organization-wide customer identity may link to branch-owned leads/projects; portal identities are scoped. | Primary approver designated per project; delegates approve specified items only and cannot hold final overall authority. On cancellation, existing client grants become read-only for previously issued PDF/image items and own approval history under C-013; C-014/C-015 require a distinct Owner-set expiry for each client project-access grant, with audited extension and no shared period. |
| Project | Delivery container, type Design/Turnkey, one current owning Branch, one accountable lead when Active; C-024 permits no current lead only while On Hold for lead exit, with the previous lead retained in dated history and Owner-appointed replacement required before resuming. | Formal Owner-approved Branch transfer retains history; On Hold is optional and reversible; only the Owner cancels Draft/Active/On Hold with reason and audit. Cancelled is terminal; C-011 stops unfinished delivery tasks while allowing distinct linked closeout tasks under C-016 delegated approval without reopening delivery. C-012 ends vendor/consultant project access at cancellation after active native CAD links are revoked and recorded. C-013 preserves only read-only client access to already issued records and own approval history, subject to C-014/C-015 per-client automatic expiry. |
| ProjectScope / ScopeChange | Baseline service scopes and formal later additions. | Original baseline retained; approved change creates new effective scope version. |
| ProjectTemplate / ProjectTemplateVersion | Organization-shared reusable configuration for delivery type, initial scopes, ordered stages/milestones, folder intent and file naming convention. | Numbered immutable versions; edits create a new version. No implicit project access or task/review/approval/automation behavior. |
| Stage / Milestone | Project delivery plan and deadlines. | Stage completion and gate decisions audited; actual versus baseline preserved. |

## Work and design control

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Task | Unit of work, optional project/stage/milestone, one primary owner. | Type/priority/status/target/committed date; one primary owner always; status transitions authorized. Unfinished delivery work on a Cancelled project enters terminal Stopped due to project cancellation, retaining time/review history and leaving active workload. A separately identified closeout task may link to the Cancelled project only after an assigned Project Lead or explicitly authorized Team Leader approves its scope, owner and due date under C-016. Under C-023, an exiting owner's unfinished tasks enter Waiting for individually authorized reassignment while preserving old owner and all review history. |
| TaskParticipant / EffortAllocation | Collaborator/reviewer and per-person estimated effort. | Unique task/person role; effort is explicit, never split equally by default. |
| TaskDependency | Finish-to-start link to predecessor. | No self-link/cycle; unfinished predecessor warns and records override/start event. |
| RecurrenceRule | Future task generation, linked to template/source. | Generated instances have stable IDs and idempotent scheduling. |
| ExtensionRequest / TaskDateChange | Proposed/approved committed-date changes. | Old/new date, reason, approver, time and audit retained. |
| Submission / ReviewRound | Immutable submitted revision and each internal/client review round. | Each correction creates a new round; reviewer/decision/comments/markup/severity preserved. |
| Correction | Actionable rework tied to originating review and responsible task. | Minor/Moderate/Major/Critical plus configurable category; never erases original work. |
| RevisionClassification | Team Lead/Owner classification of client change as preference/new requirement or work error. | Classification and changes audited; preference does not penalize employee score. |
| ApprovalRequest / Decision | Shared human decision concept for leave, scope, deletion, deadline, client approval, etc. | Type-specific authorization and evidence; decision cannot be silently rewritten. |

## Documents and file control

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Folder / Document | App metadata and access container for NAS content; document number and project. | Confidential/file-level restrictions; no raw NAS path in browser. |
| DocumentRevision / FileBlobMetadata | Exact immutable file version, checksum, storage key, distinct R internal-review and CR client-review series, and current flag. | R0 starts internal review; client review uses CR; one approved current version is designated; history retained. |
| ClientApprovalEvidence | Client identity/signature, passkey-backed formal approval, exact item/revision, time, comments, device/IP where appropriate. | Append-only; partial item approval supported; delegation recorded. |
| Transmittal / Acknowledgement | Formal issue to recipient with exact document/revision and purpose. | Issued evidence preserved; critical acknowledgement tracked. |
| ExternalCADShare | Owner-issued native MinisCloud link record for one CAD file/revision and assigned vendor/consultant. | Seven-day expiry, extraction code required, issue/recipient/expiry/cancellation audited; active link cancelled when project access ends; project cancellation cannot finalize while an active link lacks confirmed revocation. Link secret/code stored protected, never in audit payload. |
| ProjectGalleryEntry | Immutable project-scoped curation of an existing exact S14 PDF/image review item. | Current client project/item grants, exact snapshot and cancellation/expiry guards remain required; entries confer no access. |
| PortfolioPublication / PublicationGrant | Independent sanitized PNG metadata and append-only Owner publication/withdrawal evidence. | Immutable content; DRAFT → PUBLISHED → WITHDRAWN with expected versions, reason and canonical audit/event/outbox. Confidential sources/ancestors are denied; explicit publication survives cancellation until Owner withdrawal. |

## Workforce, site and learning

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Timer / TimeEntry / TimeChange | Start/pause/resume/stop or manual time against work or non-project activity. | Lock after manager approval/export; corrections retain versions, reason and editor; accounting re-export is idempotent. |
| WorkSchedule / Override / Holiday | Expected days/hours and temporary availability. | Effective-dated; capacity accounts for leave and existing allocations. |
| LeaveRequest / LeaveBalance | Configurable leave type, allocation, used and carry-forward; Work from Home is a separate attendance/schedule request. | WFH does not consume leave. January–December year, upfront Owner-configured Branch allowance, calendar-day new-hire/transfer proration, five-day carry-forward cap expiring next year; approved leave triggers impact analysis. C-022 cancellation of approved leave requires the same management approval level, with separate request/decision and compensating unused-leave ledger entries; existing handovers are reviewed. Policy versions are retained. |
| AttendanceRecord / Evidence | Check-in/out, site location/QR/selfie where relevant. | Missing evidence/connectivity creates provisional check-in with reason and manager review; site selfie expires after 90 days under C-003; check legal/contract holds before purge. |
| Skill / RatingChange | Employee skill profile and official controlled level. | Training may recommend; only authorized approval changes official rating. |
| CapacityAllocation | Per-person task effort against schedule and availability. | Daily/weekly/monthly workload categories from configurable thresholds. |
| SiteWorkPackage / ManpowerEntry / Progress | Turnkey site plan, people, planned/actual quantity or percentage. | Site responsible person validates reported progress. |
| DailySiteReport / Snag | Confirmed site daily evidence and defect resolution. | Report retains source/photos; C-020 gives each snag a named verifier appointed by the assigned Project Lead/authorized Team Leader, different from its fixer. Verification attempts and failed checks remain historical evidence; C-021 reserves the separate Closed decision to the assigned Project Lead or explicitly authorized Team Leader after a passed verification. |
| SOPVersion / KnowledgeEntry | Versioned instructions, standards and submitted lessons. | Publication approved; old versions and acknowledgements retained. |
| TrainingAssignment / Assessment | Video/SOP/quiz/practical/reviewer learning and outcomes. | Completion is not official skill upgrade; recommendation needs approval. |

## Platform, intelligence and integration

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Notification / Delivery | In-app/push record, preference and delivery attempt. | Event-linked and deduplicated; launch delivery is in-app plus Brevo email, with quota/failure monitoring. Quiet hours/critical bypass documented; SMS/WhatsApp and push are later. |
| AuditEvent / DomainEvent / Outbox | Append-only evidence and durable work dispatch. | Stable actor/entity IDs plus display snapshot, causal event ID, idempotent consumption. |
| PerformanceEvidence / ScoreVersion | Traceable employee and Team Leader score inputs, Owner-approved weight version and explanation. | External delay excluded; separate Owner-approved role-group formulas, prospectively versioned weights/thresholds and no score before initial Owner approval. Historical scores are not silently overwritten. |
| ProjectHealthSnapshot / DelayAttribution | Health status, variance, cause/time split and source evidence. | Design and Turnkey use separate Owner-approved formulas; corrections/version history preserved. |
| ReportSnapshot | Frozen weekly/monthly report values and filters. | Append-only once finalized; later corrections create new version. |
| AutomationRule / Run | Event-condition-action rule and execution/approval result. | High-impact action cannot execute without human approval. |
| IntegrationDelivery | Accounting/calendar/website/maps/webhook transport state. | Retry-safe with external IDs, dedupe and failure visibility. |
| AIRecommendation | Future structured evidence/recommendation and human decision. | Permission-filtered context; no autonomous high-impact action; no hidden chain-of-thought storage. |

## Transition ownership

WORKFLOWS.md records approved paths and implementation guards. Each slice must finish its exact transition matrix and denied-transition tests before release. REQUIREMENT_QUESTIONS.md records the resolved owner decisions; no additional business permission may be inferred from a technical default.
## S06 implemented domain boundary

Lead owns branch, contact snapshot, immutable source/client/prior-Lost references and current stage/version. LeadStageChange retains from/to, direction, skipped stages, actor/time/reason and lead version. LeadActivity records interactions independently. Client and ClientContact are shared organization identities managed by Owner. CrmSource is a shared organization identity managed through `crm_source.manage`; inactive sources remain historical. Won produces a candidate with exact winning history provenance; project creation remains S07.
S07 now persists a Project with one current owning Branch, Design/Turnkey delivery type, immutable initial scope baseline, optional exact Won stage evidence, status/version and an eligible current Project Lead while Active. ProjectAssignment, ProjectLeadChange and ProjectBranchTransfer retain grant, replacement and ownership history. ProjectScopeChange links to an S05 approval; approved additions append separate ProjectScope rows without altering the baseline. ProjectScopePolicyChange tracks the Owner-named approver, and ProjectCancellationRequest retains a reasoned request without changing the project status. S08 adds immutable organization-scoped template versions and project-owned plan snapshots/items, reasoned completion history and required-milestone gate overrides. Folder configuration is intent only; S09 owns effective cancellation and full employee exit.

## S08 project template plan

A ProjectTemplate has immutable numbered ProjectTemplateVersions. Each ProjectPlan references the exact applied version and retains a validated definition snapshot; ordered ProjectPlanItems represent stages and milestones. Existing projects do not change when a newer template version is added. ProjectCreationReceipt makes template creation retry-safe by actor, organization, key and payload. ProjectPlanCompletion and ProjectGateOverride retain actor, reason, time/version and affected milestone evidence. Owner or explicitly granted organization-scoped template.manage staff may create templates and versions; template.view grants read access. These grants do not grant project visibility. Project access requires S07 assignment plus scoped permission, or Owner authority.

## S09 implemented task domain

Task is organization-bound and has exactly one primary owner. Collaborators are distinct participants with optional per-person estimated effort; effort is explicit and never divided automatically. Tasks may link to a project and, when project-bound, to an item in that project's applied plan. Tags and checklist entries are task metadata, not workflow engines. Target date is required; start date and estimated hours are optional. ReviewRequirement is persisted; internal-review requirements are enforced by S13, while other required review types remain gated. Ordinary completion is denied until required review gates pass. The S09 ordinary state path is NOT_STARTED → IN_PROGRESS → COMPLETED. Waiting with `requiresReassignment` is reserved for atomic employee exit, and a stopped cancellation task is terminal.

TaskOwnerChange and TaskStatusChange retain versioned actor/reason/time evidence. A cancelled project's unfinished non-closeout tasks become STOPPED_DUE_TO_PROJECT_CANCELLATION in the same transaction as project cancellation, linked to its ProjectStatusChange; completed tasks remain completed. A distinct CLOSEOUT task may be created only for a Cancelled project after approval by its assigned Project Lead or a staff member with current access and branch-scoped `project.closeout_approve`. Its approval captures approver, reason, scope and time; only the Owner may append the one-way revocation. S09 does not implement external closeout grants.

## S10A waiting evidence

Task adds nullable waitingDelayCause and waitingResponsibleParty alongside the existing waitingReason and waitingPreviousStatus. These current fields exist only while ordinary Waiting, whose saved state is IN_PROGRESS. TaskStatusChange adds nullable delayCause/responsibleParty and preserves waiting evidence after explicit resume, reassignment, exit or cancellation. Responsible party is descriptive text and grants no identity, assignment or access. Exit Waiting retains its separate requiresReassignment flag and historical owner.

## S10B/C task dates and graph

Task has a separately controlled committedDueDate, distinct from the operational targetDate. TaskCommittedDateChange retains immutable old/new date, actor, reason, version and time evidence. TaskDependency is an append-only edge history from dependent B to predecessor A within one Active project; one active edge per pair and no directed cycles are allowed. A removal records actor, reason, version and time without deleting the edge. TaskStatusChange records earlyStartAcknowledged and the exact unfinished predecessor IDs when B is started despite an incomplete link. A later link does not alter that historical start. Completing A creates a notification event for each linked ordinary Waiting B; B's current owner and project access are rechecked at delivery.

## S10D–F extensions, notices and recurrence

ExtensionRequest is task-scoped and retains requester, selected approver, old/proposed commitment, reason, state and decision evidence. Only the current primary owner may request a later date; one request may be pending per task. An eligible scoped manager or Owner decides with a reason; approval atomically changes the commitment and its date history, rejection leaves it unchanged, and the Owner may withdraw a pending request with a reason. Resolved evidence remains visible to authorized task viewers.

Team waiting-alert opt-in is disabled by default and is changed only by the Owner with a reason and settings version. The source task owner's current home Team selects the setting. Ordinary Waiting remains distinct from forced exit Waiting and dependency-completion notices. At delivery, current task state/version, owner/team, setting and recipient authority are rechecked.

RecurrenceRule belongs to an existing RECURRING source task and stores DAILY, WEEKLY or MONTHLY frequency, original anchor, effective first date, manual pause state and version. Rule history is append-only with before/after values, actor and reason. A generated occurrence is unique per rule and scheduled local date and points to one generated task; generated tasks do not themselves carry a recurrence rule or inherit committed dates/dependencies. Dates are evaluated in the organization timezone; missed dates are skipped, and monthly anchors on days 29–31 clamp to the short month's last day without changing the anchor. Generation suspends for an exited/inactive owner or non-Active project.

## S12 revision and issue domain — COMPLETE for development/local staging

`DrawingRecord` identifies a project drawing by a project-unique normalized document number, title and optimistic version. Its client-review requirement starts false. A one-way `DrawingClientReviewSelection` records actor, reason, drawing version and time when the Owner or permission-authorized Team Leader selects it; S12 has no unselection command.

`DocumentRevision` binds one existing S11 file/blob and SHA-256 to the drawing. The blob is unique across revisions. R and CR have separate consecutive numbers (R0 is the initial file; CR1 is the first client-review-series revision) and a shared ordinal orders the drawing history. Each append requires a reason and expected drawing version. New entries start WORKING and not current. Immutable `RevisionStateChange` records lifecycle transitions. `RevisionApprovalFact` binds INTERNAL or CLIENT approval to one revision and its canonical audit event; S12 exposes no generic state or approval write. S13 produces internal approval facts through the private integration boundary.

`DrawingTransmittal` retains sender, purpose, issue time and project-closure retention metadata. Immutable `TransmittalItem` rows bind the exact revision, checksum and client-review gate snapshot; `TransmittalRecipient` rows retain each named internal recipient and acknowledgement state. Acknowledgement is recorded by that same recipient with time, note and canonical event. Formal issue is available only for an exact current approved/issued revision with required exact approval facts; missing S14 client evidence for selected/CR drawings still blocks issue. S14 now supplies portal decisions and client handover access; consultant/vendor delivery remains S21.

## S13 internal review and correction — COMPLETE for development/local staging

`ReviewAssignment` names the current task reviewer and `ReviewAssignmentChange` retains each reasoned assignment change. `ReviewSubmission` snapshots the submitted task version and scope, and may bind one exact R-series `DocumentRevision`; `ReviewRound` records the named reviewer, lifecycle, decision, severity/category snapshot and any correction task. `ReviewComment` stores the comment, structured page/normalized-coordinate/text annotations and optional markup file. Categories have reasoned change history; escalation, withdrawal and correction assignment retain separate evidence. Every drawing review is linked to a project task.

Only the named, active reviewer with current project/file access and `review.decide` may review; submitters and current task owners cannot review their own live work. Corrections create a separately owned CORRECTION task and resubmission creates a new immutable round. Exit-reassigned open rounds require reasoned withdrawal before replacement submission; approved snapshots may complete after reassignment only while approved task scope remains unchanged. Internal approval binds canonical evidence to the exact R revision and can promote it through S12; selected drawings and CR revisions still require S14 client evidence for issue. S13 is COMPLETE for development/local staging; see S13_COMPLETION_REPORT.md for acceptance evidence and limits.

## S14 client review, approval and portal model — COMPLETE for development/local staging

The S14 schema adds `AccountKind.CLIENT`, one-use HMAC-backed `ClientPortalCode`, isolated `ClientPortalSession`, `ClientPortalCeremony`, versioned `ClientPortalGrant` and append-only `ClientPortalGrantChange`, plus `ClientItemGrant` capabilities. `ClientReviewPackage` and immutable `ClientReviewItem` snapshots bind task or exact revision content; comments preserve structured annotations and may reference private PDF/image blobs whose storage keys stay server-side. Item decisions require explicit review start (`IN_REVIEW`) and bind exact item/snapshot/signature/passkey evidence. They do not create revision approval facts. The Owner-appointed Primary Client alone may approve the complete package; a passkey-backed exact batch creates immutable final evidence and the per-revision S12 facts. Owner/authorized Team Leader classification records only the two approved causes, while reasoned correction assignment is limited to Owner, assigned Project Lead or explicitly authorized Team Leader. Cancellation withdraws pending items/packages, requires a separate Owner-set future expiry per grant, and retains read-only access only to previously issued scoped PDF/images and each client's own approval history until expiry/revocation. Independent CR files use their own internal review. Local acceptance passed; see S14_COMPLETION_REPORT.md.

## S16 implemented time entities — COMPLETE for development/local staging

TimeTimer holds current state/version, initial start and accrued milliseconds; immutable TimeTransition records each start/pause/resume/stop including lifecycle interruption. TimeEntry retains employee identity, optional timer identity, current work references, version and sticky approval lock. TimeEntryVersion retains exact work/time/evidence data, reason, editor, time and canonical event. TimeApproval identifies the exact approved version; correction appends a new unapproved version. TimeCommandReceipt binds actor/key/payload to the committed result. TimeAccountingDelivery retains exact approved immutable revision payload and stable delivery key, lease/state/retry count and receipt; TimeAccountingAttempt records completed lease outcomes. Accounting record identity is the TimeEntry ID across revisions. Local acceptance is recorded in S16_COMPLETION_REPORT.md.


## S17 implementation checkpoint — 2026-10-02

S17 uses scoped WorkforceRecord kinds POLICY/SCHEDULE/OVERRIDE/HOLIDAY/ALLOCATION/LEAVE/SITE/ATTENDANCE with immutable WorkforceVersion history. WorkforceLedger retains grant/adjustment/carry/debit/reversal exact fractions and source evidence. WorkforceReceipt binds retries to canonical results with current authority checks. WorkforceSelfie retains private capture/checksum/expiry/notice/hold/purge intent/completion metadata; attendance survives byte deletion. WFH is approved schedule/attendance data with no balance debit.


## S17 final local acceptance — 2026-10-02

S17 is COMPLETE for development/local staging. Final9 pnpm verify exited0:172 API unit,99 web unit,202 real PostgreSQL integration and33 desktop/mobile browser tests; typecheck, lint and builds passed. After the final CSS-only mobile Period correction, affected web gates and both Workforce browser journeys passed; all four refreshed final10 screenshots were independently inspected. All86 migrations are current;112 prior-table and104 legacy snapshots remain unchanged. S16 local completion is confirmed by its original report and the current full regression. See S17_COMPLETION_REPORT.md for exact scope, evidence and limitations. S18 onward remains unauthorized; production NAS/legal/contract/offsite/backup/restore/accounting-provider/hosted CI/deployment gates are not claimed. Actual routing used GPT-6.1 Sol and GPT-6 Luna.

## S19 operational Turnkey model — COMPLETE for development/local staging

`TurnkeyRelease` binds one Turnkey project to immutable exact approved revision/checksum and BOQ snapshots, selected materials, typed cost/procurement approval IDs, linear operational progress and explicit prior/replacement links. `TurnkeyPrice` separately retains immutable unit prices; exact scaled-integer arithmetic computes BOQ totals. `TurnkeyHistory` preserves each version's canonical actor/reason/event evidence. `TurnkeyCostShare` records Owner-controlled, revocable client access to an approved cost snapshot; current S14 portal/session/project authority remains required. A replacement proposal requires a change reason and full fresh approvals; it preserves earlier inputs/history and prevents further progress on replaced inputs. These records do not create inventory or accounting ledgers. See S19_SPEC.md and S19_COMPLETION_REPORT.md for lifecycle, authorization and verified limits.

## S20 persisted site records — COMPLETE for development/local staging

`SiteWorkspace` is the project-scoped aggregate version and current responsible-person pointer. Versioned `SiteRecord` heads represent PACKAGE, MANPOWER, REPORT, SNAG and HANDOVER, with canonical append-only `SiteHistory`; `SiteVerificationAttempt` preserves each immutable repair-generation outcome and exact fixer/verifier. Report confirmation snapshots package progress; handover snapshots packages, quality and closure references. Four additive tables preserve organization/project identity. Full browser and aggregate acceptance remain pending.

## S21 external portal entities — COMPLETE for development/local staging

S21 defines EXTERNAL account identity, separate code/session/device records, exact persona grants, retained advisory submissions and private upload metadata, native CAD-share records, and scoped extension of recipient transmittal/acknowledgement evidence. Grants carry explicit revision/release/package UUID allowlists, expected versions, reason, expiry/revocation and optional separate closeout-task linkage. Native URL/code secrets require authenticated encryption; safe identity and confirmation proof remain separately queryable. Canonical transactional audit/domain-event/outbox evidence binds grant changes, submissions, transmittals, CAD issuance/revocation and cancellation/closeout. S21 development/local-staging acceptance passed; see S21_COMPLETION_REPORT.md.
