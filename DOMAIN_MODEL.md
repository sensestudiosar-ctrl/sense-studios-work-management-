# Conceptual domain model — no schema implemented

Source: requirements/APPROVED_REQUIREMENTS.md, especially R-004–R-098. The owner's newer decision replaces brand with branch: each project has one branch; employees may work across branches only through explicit assignment. These are conceptual records, not a demand to create every table in the first release. Permissions are detailed in PERMISSIONS.md; critical mutations and state changes are audited under AUD.

## Organization and identity

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Organization | Firm boundary; owns branches, accounts, policy. | Stable ID; no cross-organization reads. |
| Branch | Operational branch within organization; owns one or more projects. | Each project has exactly one branch; branch transfer policy unresolved. |
| Department / Team | Reporting and workload grouping; employees may have team membership. | Membership dates retained so historical reporting is stable. |
| Employee | Internal person/profile, schedule and skill subject; linked to account. | Active/exited access state; exit revokes access but never removes project/audit history. |
| Account / Session | Login identity, OIDC/password/OTP methods and revocable devices. | Session revocation blocks future access; secret material never enters audit. |
| JobRole / HierarchyEdge | Describes work and reporting line separately from authorization. | Configurable roles and dated hierarchy changes; do not hard-code job titles as permissions. |
| PermissionGrant / Override | Action/resource/scope/condition decision for a principal. | Effective grants versioned/audited; revocation immediate; deny by default. |
| ProjectMembership | Explicit participation and branch-crossing access. | Unique project/person/role; membership does not imply every file is visible. |

## Customer and delivery

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Lead / LeadActivity | CRM pipeline and interactions; may convert on Won. | New → Contacted → Meeting/Discussion → Proposal → Negotiation → Won/Lost; Lost needs reason. |
| Client / ClientUser | Customer organization/person and portal identities. | Primary approver designated per project; delegates carry explicit scope and expiry. |
| Project | Delivery container, type Design/Turnkey, single branch, one accountable lead when Active. | Draft/Active/On Hold/Completed/Archived/Cancelled; hold/cancel reason; gate override audited. |
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
| DocumentRevision / FileBlobMetadata | Exact immutable file version, checksum, storage key, R/CR series and current flag. | R0 initial internal issue; later numbered revisions need reason; one current version; approved history retained. |
| ClientApprovalEvidence | Client identity/signature, exact item/revision, time, comments, device/IP where appropriate. | Append-only; partial item approval supported; delegation recorded. |
| Transmittal / Acknowledgement | Formal issue to recipient with exact document/revision and purpose. | Issued evidence preserved; critical acknowledgement tracked. |
| GalleryEntry / PublicationGrant | Private client gallery item or approved public portfolio item. | Public content requires explicit publication approval; internal files never publish automatically. |

## Workforce, site and learning

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Timer / TimeEntry / TimeChange | Start/pause/resume/stop or manual time against work or non-project activity. | Detect concurrent timers; changes retain original/new/reason/editor/time; export state for accounting. |
| WorkSchedule / Override / Holiday | Expected days/hours and temporary availability. | Effective-dated; capacity accounts for leave and existing allocations. |
| LeaveRequest / LeaveBalance | Configurable leave type, allocation, used and carry-forward. | Team Lead/Owner/multilevel approval; approved leave triggers impact analysis. |
| AttendanceRecord / Evidence | Check-in/out, site location/QR/selfie where relevant. | Missing/changed punches traceable; no continuous off-duty tracking. |
| Skill / RatingChange | Employee skill profile and official controlled level. | Training may recommend; only authorized approval changes official rating. |
| CapacityAllocation | Per-person task effort against schedule and availability. | Daily/weekly/monthly workload categories from configurable thresholds. |
| SiteWorkPackage / ManpowerEntry / Progress | Turnkey site plan, people, planned/actual quantity or percentage. | Site responsible person validates reported progress. |
| DailySiteReport / Snag | Confirmed site daily evidence and defect resolution. | Report retains source/photos; snag can reopen after failed verification. |
| SOPVersion / KnowledgeEntry | Versioned instructions, standards and submitted lessons. | Publication approved; old versions and acknowledgements retained. |
| TrainingAssignment / Assessment | Video/SOP/quiz/practical/reviewer learning and outcomes. | Completion is not official skill upgrade; recommendation needs approval. |

## Platform, intelligence and integration

| Entity | Purpose, ownership and relationships | Lifecycle, invariant and evidence |
| --- | --- | --- |
| Notification / Delivery | In-app/push record, preference and delivery attempt. | Event-linked and deduplicated; quiet hours/critical bypass documented. |
| AuditEvent / DomainEvent / Outbox | Append-only evidence and durable work dispatch. | Stable actor/entity IDs plus display snapshot, causal event ID, idempotent consumption. |
| PerformanceEvidence / ScoreVersion | Traceable employee and Team Leader score inputs, weight version and explanation. | External delay excluded as approved; no black-box overwrite of historical scores. |
| ProjectHealthSnapshot / DelayAttribution | Health status, variance, cause/time split and source evidence. | Design/Turnkey weights may differ; corrections/version history preserved. |
| ReportSnapshot | Frozen weekly/monthly report values and filters. | Append-only once finalized; later corrections create new version. |
| AutomationRule / Run | Event-condition-action rule and execution/approval result. | High-impact action cannot execute without human approval. |
| IntegrationDelivery | Accounting/calendar/website/maps/webhook transport state. | Retry-safe with external IDs, dedupe and failure visibility. |
| AIRecommendation | Future structured evidence/recommendation and human decision. | Permission-filtered context; no autonomous high-impact action; no hidden chain-of-thought storage. |

## Unsettled lifecycle details

WORKFLOWS.md marks transitions specified versus proposed. REQUIREMENT_QUESTIONS.md holds product decisions that affect state, ownership, retention, scoring or approval authority. No unsupplied policy should be treated as implemented.
