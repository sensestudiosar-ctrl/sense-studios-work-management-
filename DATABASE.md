# Conceptual database architecture — no schema or migrations yet

Proposed PostgreSQL relational model. Approved source: R-004–R-098 and critical invariants R-092. Approved clarification C-001: Organization → Branch → Team → Employee, no separate Brand or Department tier; each project has one owning branch. No database exists, and names below are conceptual, not a migration contract.

## Ownership and constraints

- Every business row carries organization_id where relevant. A Branch belongs to one Organization; a Team belongs to one Branch. Branch-owned records carry branch_id. Each Employee has exactly one current home Branch and one current home Team within that Branch, with dated membership history. A project has one owning branch_id; only a formal Owner-approved transfer may change it, preserving the prior owner and recalculating access. Project lead is required at activation and exactly one is current. Cross-branch staff may contribute only through explicit project assignment and applicable permission grants issued by the Owner. No Brand or Department foreign key or scope is planned.
- Use stable opaque IDs, foreign keys, unique indexes and check constraints. Composite references including organization/branch where practical prevent linking a task, document or approval to a foreign project accidentally. Scope-sensitive queries must be authorized before reads/writes; consider RLS as defense in depth after testing its interaction with the access model.
- A task row has one non-null primary_owner_id. Collaborators and per-person effort allocation live in separate association rows, unique by task/person. Dependency edges prohibit self-dependency/cycles; unfinished predecessors warn rather than block.
- Lead stage, project/task/document/review/leave/snag states are constrained to valid values and changed through domain services. Transactional transition checks use row version/locking where concurrent updates matter.
- Revision identity is immutable: unique project/document/series/number, with file checksum and storage key immutable after finalization. Approval references exact item and revision. At most one current approved/issued revision per document (reviewed partial unique constraint or equivalent). Old revisions and transmittals remain addressable.
- Approved client evidence, issued transmittals, audit events and historical report snapshots are append-only. Corrective entries supersede or reference originals. Operational deletion is archive/soft-hide plus audit, not destruction of protected evidence.
- Deadline and time-log changes create dedicated history with old/new value, reason, actor and time. Personnel exit deactivates access but retains stable employee references and display snapshots in history.
- Use unique idempotency keys for offline commands, integrations, notification deliveries and outbox consumers. Store created_at/updated_at in UTC and use explicit project/employee time zones for dates and schedules.

## Conceptual domains

Identity/organization: Organization, Branch, Team, Employee, Account, Session, JobRole, TeamMembership/manager reference, PermissionGrant/Override. No Brand or Department table.

CRM/project: Lead, LeadActivity, organization-wide Client, ClientUser, Project with one current Branch, ProjectBranchTransferHistory, ProjectScope, ScopeChange, ProjectMembership, ProjectTemplate/Version, Stage, Milestone.

Work/design: Task, TaskParticipant, TaskDependency, TaskDateChange, ExtensionRequest, RecurrenceRule, ReviewRound, Submission, Correction, ClientRevisionClassification, ApprovalRequest/Decision.

Files: Folder, Document, DocumentRevision, FileBlobMetadata, Transmittal, Acknowledgement, GalleryEntry, PublicationGrant.

Workforce/site: TimeEntry/Change, Timer, WorkSchedule/Override, Holiday, LeaveRequest/Balance, AttendanceRecord/Evidence, Skill/RatingChange, CapacityAllocation, SiteWorkPackage, ManpowerEntry, SiteProgress, DailySiteReport, Snag.

Intelligence/platform: Notification/Delivery, AuditEvent, DomainEvent/Outbox, DecisionQueue projection, PerformanceEvidence/ScoreVersion, ProjectHealthSnapshot, DelayAttribution, ReportSnapshot, SOP/Version, KnowledgeEntry, TrainingAssignment/Assessment, AutomationRule/Run, IntegrationDelivery.

These are conceptual records needed by source requirements, not a mandate to create all tables at once. Detailed attributes and cardinalities are in DOMAIN_MODEL.md.

## Transactions and migration rules

One owning service performs each business transition transactionally: state change + reason/evidence + audit + outbox. Examples: client approval of exact revision; document issue/supersession; deadline extension decision; leave approval/capacity effects; permission revocation. NAS/remote calls occur after commit through idempotent jobs with reconciliation. Never hold a DB transaction open while streaming a large file or calling an external service.

Use reviewed, versioned migrations with rollback/forward recovery notes and data preservation. Test on a restored copy before production changes. Avoid schema resets. Back up database and file metadata, verify restores and report migration status. No migration is created in Phase 2.

## Remaining design decisions

C-002 settles employee home membership, Owner-only cross-branch grants, formal project transfer, item-only client delegation and time-log locking. Retention periods, leave accrual/carry-forward values, scoring formulas and vendor CAD sharing controls remain open in REQUIREMENT_QUESTIONS.md. Constraints await those details and final architecture approval.
