# Conceptual database architecture — no schema or migrations yet

Proposed PostgreSQL relational model. Approved source: R-004–R-098 and critical invariants R-092. Newer owner decision: use branch, not brand; each project has one owning branch. No database exists, and names below are conceptual, not a migration contract.

## Ownership and constraints

- Every business row carries organization_id where relevant. Branch-owned records carry branch_id. A project has one immutable owning branch_id unless a formally approved transfer process is later specified; project lead is required at activation and exactly one is current. The owner confirmed cross-branch staff may contribute only through explicit project assignment.
- Use stable opaque IDs, foreign keys, unique indexes and check constraints. Composite references including organization/branch where practical prevent linking a task, document or approval to a foreign project accidentally. Scope-sensitive queries must be authorized before reads/writes; consider RLS as defense in depth after testing its interaction with the access model.
- A task row has one non-null primary_owner_id. Collaborators and per-person effort allocation live in separate association rows, unique by task/person. Dependency edges prohibit self-dependency/cycles; unfinished predecessors warn rather than block.
- Lead stage, project/task/document/review/leave/snag states are constrained to valid values and changed through domain services. Transactional transition checks use row version/locking where concurrent updates matter.
- Revision identity is immutable: unique project/document/series/number, with file checksum and storage key immutable after finalization. Approval references exact item and revision. At most one current approved/issued revision per document (reviewed partial unique constraint or equivalent). Old revisions and transmittals remain addressable.
- Approved client evidence, issued transmittals, audit events and historical report snapshots are append-only. Corrective entries supersede or reference originals. Operational deletion is archive/soft-hide plus audit, not destruction of protected evidence.
- Deadline and time-log changes create dedicated history with old/new value, reason, actor and time. Personnel exit deactivates access but retains stable employee references and display snapshots in history.
- Use unique idempotency keys for offline commands, integrations, notification deliveries and outbox consumers. Store created_at/updated_at in UTC and use explicit project/employee time zones for dates and schedules.

## Conceptual domains

Identity/organization: Organization, Branch, Department, Team, Employee, Account, Session, JobRole, HierarchyEdge, Membership, PermissionGrant/Override.

CRM/project: Lead, LeadActivity, Client, ClientUser, Project, ProjectScope, ScopeChange, ProjectMembership, ProjectTemplate/Version, Stage, Milestone.

Work/design: Task, TaskParticipant, TaskDependency, TaskDateChange, ExtensionRequest, RecurrenceRule, ReviewRound, Submission, Correction, ClientRevisionClassification, ApprovalRequest/Decision.

Files: Folder, Document, DocumentRevision, FileBlobMetadata, Transmittal, Acknowledgement, GalleryEntry, PublicationGrant.

Workforce/site: TimeEntry/Change, Timer, WorkSchedule/Override, Holiday, LeaveRequest/Balance, AttendanceRecord/Evidence, Skill/RatingChange, CapacityAllocation, SiteWorkPackage, ManpowerEntry, SiteProgress, DailySiteReport, Snag.

Intelligence/platform: Notification/Delivery, AuditEvent, DomainEvent/Outbox, DecisionQueue projection, PerformanceEvidence/ScoreVersion, ProjectHealthSnapshot, DelayAttribution, ReportSnapshot, SOP/Version, KnowledgeEntry, TrainingAssignment/Assessment, AutomationRule/Run, IntegrationDelivery.

These are conceptual records needed by source requirements, not a mandate to create all tables at once. Detailed attributes and cardinalities are in DOMAIN_MODEL.md.

## Transactions and migration rules

One owning service performs each business transition transactionally: state change + reason/evidence + audit + outbox. Examples: client approval of exact revision; document issue/supersession; deadline extension decision; leave approval/capacity effects; permission revocation. NAS/remote calls occur after commit through idempotent jobs with reconciliation. Never hold a DB transaction open while streaming a large file or calling an external service.

Use reviewed, versioned migrations with rollback/forward recovery notes and data preservation. Test on a restored copy before production changes. Avoid schema resets. Back up database and file metadata, verify restores and report migration status. No migration is created in Phase 2.

## Remaining design decisions

Branch membership, cross-branch assignments, project transfer, retention, approval delegation, time-log locking and performance formulas are open in REQUIREMENT_QUESTIONS.md. Database constraints will be finalized only after those owner decisions.
