# Conceptual domain model — S02 identity schema implemented; business schema not started

Source: requirements/APPROVED_REQUIREMENTS.md, especially R-004–R-098. C-001 approves Organization → Branch → Team → Employee, with no separate Brand or Department level; each project has one branch, and employees may work across branches only through explicit assignment. These are conceptual records, not a demand to create every table in the first release. S02 implements only Account, PasskeyCredential, WebAuthnChallenge, Session, identity enrollment/recovery records and SecurityEvent; no Organization, Branch, Team, Employee or permission-grant tables exist. Permissions are detailed in PERMISSIONS.md; critical mutations and state changes are audited under AUD.

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
| ProjectTemplate / TemplateVersion | Reusable stages, tasks, folders, reviews, gates, SOP links and automation defaults. | Versioned; creating a project records applied template version. |
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
| GalleryEntry / PublicationGrant | Private client gallery item or approved public portfolio item. | Public content requires explicit publication approval; internal files never publish automatically. |

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
