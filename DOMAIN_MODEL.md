# Conceptual domain model — no schema implemented

Source: requirements/APPROVED_REQUIREMENTS.md, especially R-004–R-098. C-001 approves Organization → Branch → Team → Employee, with no separate Brand or Department level; each project has one branch, and employees may work across branches only through explicit assignment. These are conceptual records, not a demand to create every table in the first release. Permissions are detailed in PERMISSIONS.md; critical mutations and state changes are audited under AUD.

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
| ProjectMembership | Explicit participation and branch-crossing access. | Unique project/person/role; membership does not imply every file is visible. |

## Customer and delivery

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Lead / LeadActivity | CRM pipeline and interactions; may convert on Won. | New → Contacted → Meeting/Discussion → Proposal → Negotiation → Won/Lost; Lost needs reason. |
| Client / ClientUser | One organization-wide customer identity may link to branch-owned leads/projects; portal identities are scoped. | Primary approver designated per project; delegates approve specified items only and cannot hold final overall authority. |
| Project | Delivery container, type Design/Turnkey, one current owning Branch, one accountable lead when Active. | Formal Owner-approved Branch transfer retains history; On Hold is optional and reversible; hold/cancel reason and gate override audited. |
| ProjectScope / ScopeChange | Baseline service scopes and formal later additions. | Original baseline retained; approved change creates new effective scope version. |
| ProjectTemplate / TemplateVersion | Reusable stages, tasks, folders, reviews, gates, SOP links and automation defaults. | Versioned; creating a project records applied template version. |
| Stage / Milestone | Project delivery plan and deadlines. | Stage completion and gate decisions audited; actual versus baseline preserved. |

## Work and design control

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Task | Unit of work, optional project/stage/milestone, one primary owner. | Type/priority/status/target/committed date; one primary owner always; status transitions authorized. |
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
| ExternalCADShare | Owner-issued native MinisCloud link record for one CAD file/revision and assigned vendor/consultant. | Seven-day expiry, extraction code required, issue/recipient/expiry/cancellation audited; active link cancelled when project access ends. Link secret/code stored protected, never in audit payload. |
| GalleryEntry / PublicationGrant | Private client gallery item or approved public portfolio item. | Public content requires explicit publication approval; internal files never publish automatically. |

## Workforce, site and learning

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Timer / TimeEntry / TimeChange | Start/pause/resume/stop or manual time against work or non-project activity. | Lock after manager approval/export; corrections retain versions, reason and editor; accounting re-export is idempotent. |
| WorkSchedule / Override / Holiday | Expected days/hours and temporary availability. | Effective-dated; capacity accounts for leave and existing allocations. |
| LeaveRequest / LeaveBalance | Configurable leave type, allocation, used and carry-forward; Work from Home is a separate attendance/schedule request. | WFH does not consume leave. January–December year, upfront Owner-configured Branch allowance, calendar-day new-hire/transfer proration, five-day carry-forward cap expiring next year; approved leave triggers impact analysis. Policy versions are retained. |
| AttendanceRecord / Evidence | Check-in/out, site location/QR/selfie where relevant. | Missing evidence/connectivity creates provisional check-in with reason and manager review; site selfie expires after 90 days under C-003; check legal/contract holds before purge. |
| Skill / RatingChange | Employee skill profile and official controlled level. | Training may recommend; only authorized approval changes official rating. |
| CapacityAllocation | Per-person task effort against schedule and availability. | Daily/weekly/monthly workload categories from configurable thresholds. |
| SiteWorkPackage / ManpowerEntry / Progress | Turnkey site plan, people, planned/actual quantity or percentage. | Site responsible person validates reported progress. |
| DailySiteReport / Snag | Confirmed site daily evidence and defect resolution. | Report retains source/photos; snag can reopen after failed verification. |
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

## Unsettled lifecycle details

WORKFLOWS.md marks transitions specified versus proposed. REQUIREMENT_QUESTIONS.md holds OD-01 and any later material product decisions that affect state, ownership, retention, scoring or approval authority. No unsupplied policy should be treated as implemented.
