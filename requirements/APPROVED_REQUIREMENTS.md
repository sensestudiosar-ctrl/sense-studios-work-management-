# MASTER REQUIREMENTS PROMPT
## Sense Studios Work Management Platform

You are the senior software architect, product engineer, database architect, QA architect, and technical lead responsible for building this application.

This prompt is the **authoritative product requirement source**.

Use maximum reasoning for:

- Architecture
- Data modeling
- Security
- Permissions
- State machines
- Business rules
- Workflow design
- Auditability
- Multi-brand isolation
- Offline synchronization
- Performance calculations
- Project-health calculations
- Automation safety
- Integration boundaries
- Anything that would be expensive to refactor later

Do not rush into UI implementation.

Do not optimize for producing the largest amount of code quickly.

Optimize for:

**correct architecture + low future refactoring + strong tests + maintainability + security + high development velocity over the entire project.**

---

# 1. FIRST INSTRUCTION

Before implementing application features:

1. Inspect the entire repository.
2. Read all existing context files such as:
   - `AGENTS.md`
   - `PRODUCT.md`
   - `ARCHITECTURE.md`
   - `PROJECT_MAP.md`
   - README
   - existing database/schema documentation
   - testing documentation
   - any prior implementation plans
3. Understand what already exists.
4. Never rebuild something that already exists correctly.
5. Never assume something is missing merely because it is not obvious from one file.
6. Identify conflicts between existing implementation and this specification.
7. Treat this requirements document as the desired product behavior unless an explicitly newer approved decision exists in repository documentation.

Before major implementation, maintain/update concise canonical context files so future agents do not need to scan the whole repository.

The project documentation should clearly explain:

- Product purpose
- Architecture
- Module ownership
- Database domains
- Important state machines
- Permission rules
- Business invariants
- Integration boundaries
- Current implementation status
- Test commands
- Known risks
- Current milestone
- Next implementation step

Do not allow documentation to become stale.

---

# 2. PRODUCT VISION

Build an internal operating platform for an architecture and interior-design firm that manages the complete workflow:

**Lead  
→ Project  
→ Design  
→ Tasks  
→ Internal Review  
→ Client Review  
→ Revisions  
→ Working Drawings  
→ Turnkey Execution  
→ Site Management  
→ Handover**

The system should eventually let management immediately understand:

- What needs attention
- Which projects are at risk
- What decisions are pending
- Who is overloaded
- Why something is delayed
- Which drawing revision is current
- What clients must approve
- Which employees repeatedly make certain mistakes
- Which employees need training
- How employees are performing
- How Team Leaders are performing
- What happened at each site today
- What needs to happen tomorrow

Employees should immediately understand:

- What should I work on now?
- What is due next?
- What is blocking me?
- What corrections do I need to make?
- Which reviews are pending?
- How am I performing?
- Why did my performance score change?
- How can I improve?

---

# 3. IMPORTANT PRODUCT BOUNDARY

This is a **work-management application**, not the primary accounting system.

A separate accounting application already exists.

Do NOT recreate:

- General ledger
- Full accounting
- Payroll accounting
- Salary reporting
- Full financial statements
- Project profitability accounting

This application may integrate operational information with the accounting system, particularly:

- Time logs
- Project references
- Approved procurement requirements

Financial metrics should not be exposed to normal employees through this work-management application.

---

# 4. ORGANIZATION MODEL

The application must support:

**Organization  
→ Multiple Brands  
→ Departments  
→ Teams  
→ Hierarchy  
→ Employees  
→ Projects**

Do not hard-code job roles.

The organization must be able to create roles dynamically.

Examples:

- Principal Architect
- Architect
- Junior Architect
- Interior Designer
- Senior Interior Designer
- Team Leader
- Site Engineer
- Site Coordinator
- 3D Visualizer
- Procurement Manager
- Intern

Three concepts must remain separate:

### Role
What someone does.

### Hierarchy
Where they sit in the reporting structure.

### Permission
What they are allowed to access or perform.

An employee may perform multiple responsibilities.

The current business is small, but architecture must comfortably support approximately 10–15 employees and further growth.

---

# 5. USER TYPES

## Internal

- Owner
- Team Leader
- Employee
- Site Employee
- Reviewer
- Part-time employee
- Intern

## External

- Primary Client
- Additional Client User
- Consultant
- Vendor
- Factory/Production User

External users should use restricted portals.

They must never receive unrestricted internal application access.

---

# 6. PERMISSION MODEL

Design permissions around:

**Organization + Brand + Role + Hierarchy + Team + Project Membership + Explicit Permission Overrides**

Support granular permissions including:

- View
- Create
- Edit
- Assign
- Reassign
- Review
- Approve
- Request deletion
- Download
- Export
- Publish
- Manage employees
- Manage roles
- Manage permissions
- Manage templates
- Manage projects
- View performance
- View audit history
- Manage automation

Backend/API authorization is mandatory.

Never rely only on hiding UI elements.

---

# 7. OWNER

Owner has full organizational authority.

Owner can:

- Configure brands
- Configure teams
- Configure hierarchy
- Create roles
- Configure permissions
- Manage employees
- Access all projects
- Override workflow gates
- Approve deletion requests
- View management rankings
- View security audit logs
- Configure automation
- View user sessions
- Force logout users

---

# 8. TEAM LEADER

Team Leader manages the employees underneath them and assigned projects.

Can:

- Add/manage team members where permitted
- Assign tasks
- Reassign tasks
- Manage projects
- Monitor employee tasks
- Monitor pending actions
- Monitor workload
- Review work
- Change authorized deadlines
- Approve certain leave requests
- View team performance
- Manage employee skill ratings
- Approve skill changes
- Manage permitted project automation

Team Leaders should not automatically receive detailed access to other teams.

They may see permitted high-level team ratings/comparisons where configured.

---

# 9. EMPLOYEE

A normal employee may see:

- Projects assigned to them
- Tasks assigned to them
- Tasks where they are collaborator
- Tasks where they are reviewer
- Permitted project files
- Relevant project milestones
- Own time logs
- Own attendance
- Own performance
- Team-level comparative information where permitted
- Assigned training

Employees can create self-tasks.

Employees cannot assign tasks to another employee unless they have separate management permission.

---

# 10. LEAD MANAGEMENT

Basic CRM is part of MVP.

Lead pipeline:

**New  
→ Contacted  
→ Meeting / Discussion  
→ Proposal  
→ Negotiation  
→ Won / Lost**

Lost requires reason.

Won can convert into a Project.

Initial lead sources:

- Referral
- Website
- Manual
- Configurable other source

Advertising-platform lead integration can come later.

---

# 11. PROJECT DELIVERY TYPES

There are two primary delivery models:

## Design

Design and documentation process.

## Turnkey

Design through execution and site completion.

Delivery model and service scope must remain separate concepts.

---

# 12. PROJECT SERVICE SCOPES

Possible service scopes include:

- Architecture
- Interior Design
- Architecture + Interior Design
- Total Construction
- Renovation
- Commercial Architecture
- Commercial Interiors

A single project may contain multiple scopes.

If additional scope is awarded later, add it to the same project through a formal:

**Project Scope Change**

Do not silently alter the original project baseline.

---

# 13. PROJECT ACCOUNTABILITY

Every active project must have exactly one accountable:

**Project Lead / Team Leader**

Many employees may contribute, but one person must be accountable for overall project delivery.

Project Lead management performance must eventually be measurable.

---

# 14. DESIGN PROJECT DEFAULT WORKFLOW

Default:

**Site Measurement  
→ Requirement Collection  
→ Planning  
→ Internal Review  
→ Client Review  
→ Corrections  
→ 3D Design  
→ Client Approval  
→ Working Drawings  
→ Final Drawings  
→ Handover**

Workflow must be configurable through templates.

Architecture projects may involve third-party structural consultants.

Interior design is generally managed internally.

---

# 15. TURNKEY DEFAULT WORKFLOW

After design approval:

**Design Approval  
→ BOQ  
→ Cost Approval  
→ Material Selection  
→ Procurement  
→ Factory Production  
→ Site Execution  
→ Quality Checks  
→ Snag List  
→ Final Handover**

Operational procurement status belongs in this application.

Financial processing may be sent to the accounting application.

---

# 16. PROJECT STATUS STATE MACHINE

Default:

**Draft  
→ Active  
→ On Hold  
→ Completed  
→ Archived**

Alternative terminal state:

**Cancelled**

On Hold and Cancelled require a reason.

Owner/Team Leader may override configured workflow gates.

Every override requires:

- Actor
- Reason
- Timestamp
- Audit entry

---

# 17. PROJECT TEMPLATES

Project templates may define:

- Delivery type
- Scopes
- Stages
- Milestones
- Standard tasks
- Task estimates
- Dependencies
- Review requirements
- Client approval gates
- SOP links
- Folder structure
- File naming conventions
- Notifications
- Default reports
- Automation rules

Creating a project from a template should create this structure automatically.

---

# 18. TASK OWNERSHIP

Every task must have exactly:

**1 Primary Owner**

A task may also have:

**0..n Collaborators**

The Primary Owner remains accountable.

---

# 19. TASK CREATION

Owner and Team Leader can create and assign work to employees under their authority.

Any employee can create a self-task.

Normal employees cannot assign other employees.

---

# 20. TASK TYPES

Support at least:

- Project task
- Non-project task
- Recurring task
- Correction task
- Site task
- Training/practical task

Task types should be configurable where practical.

---

# 21. TASK FIELDS

## Core mandatory

- Task name
- Primary owner
- Priority
- Task type
- Target/due date

## Conditional or optional

- Description
- Project
- Project stage
- Milestone
- Collaborators
- Reviewer
- Start date
- Estimated hours
- Attachments
- Dependencies
- Tags
- Reminder
- Checklist
- Client visibility
- Internal review requirement
- Client review requirement
- Recurrence
- Subtasks
- Required skills
- Preferred skills

Templates/task types may make optional fields mandatory.

Do not make every field mandatory for every simple task.

---

# 22. TASK PRIORITIES

Use:

- Low
- Medium
- High
- Critical

Critical tasks require stronger alerts/escalation.

---

# 23. TASK DATES

Support both:

### Target Date
Operational planning date.

### Committed Due Date
Controlled committed deadline.

Changing a committed due date requires:

- Owner/Team Leader authority
- Mandatory reason
- Audit history

Employees may submit:

**Deadline Extension Request**

with:

- Reason
- Proposed new date

Management approves/rejects.

---

# 24. TASK STATE MACHINE

Default:

**Not Started  
→ In Progress  
→ Waiting  
→ Submitted for Internal Review  
→ In Internal Review  
→ Corrections Required  
→ Internal Approved  
→ Submitted for Client Review  
→ In Client Review  
→ Client Revision Required  
→ Client Approved  
→ Completed**

Skip review states when a task does not require them.

`Overdue` should normally be derived from due date + completion state rather than becoming a permanent workflow state.

---

# 25. WAITING / BLOCKED WORK

Employees can mark tasks:

**Waiting**

Waiting requires:

- Reason
- Delay cause
- Dependency/responsible party where known

Examples:

- Client pending
- Consultant pending
- Material pending
- Site unavailable
- Dependency pending

Team Leader and Owner are notified where configured.

When dependency completes, notify the waiting employee.

---

# 26. DEPENDENCIES

MVP needs simple finish-to-start dependencies.

Task B may depend on Task A.

Do not hard-block starting B.

Allow it with a visible warning and audit/event tracking.

---

# 27. INTERNAL REVIEWS

Internal review is mandatory whenever configured.

Reviewer may:

- Approve
- Request corrections
- Comment
- Annotate PDF/image
- Upload markup
- Assign correction
- Escalate
- Change authorized priority/deadline

---

# 28. CORRECTION LOOP

Never destroy/reopen history as if previous work never happened.

Use:

**Original Submission  
→ Review Round  
→ Correction Task  
→ Revised Submission  
→ New Review Round**

Preserve every round.

Store:

- Reviewer
- Submission
- Version
- Comment
- Markup
- Timestamp
- Decision
- Severity
- Correction category

---

# 29. CORRECTION SEVERITY

Use:

- Minor
- Moderate
- Major
- Critical

Correction categories must be configurable.

Examples:

- Dimension error
- Coordination issue
- Missing detail
- Wrong material
- Drawing-standard violation
- Client requirement missed
- Site mismatch

---

# 30. REVISION NUMBERING

Internal revision series:

**R0 → R1 → R2 → R3...**

R0 is initial issue.

Client-requested revisions:

**CR1 → CR2 → CR3...**

Revision reason is mandatory.

---

# 31. CLIENT REVISION CLASSIFICATION

Team Leader or Owner must classify client revision requests.

Two critical categories:

### Preference / New Requirement

Examples:

- Client changes preference
- New requirement
- Scope change

This should NOT negatively affect employee performance.

### Employee Work Error

Examples:

- Missed requirement
- Drawing error
- Coordination mistake
- Incorrect execution of approved requirement

This MAY affect employee performance.

Classification changes must be audited.

---

# 32. CLIENT PORTAL REVIEW

Client portal supports:

- View
- Comment
- Annotate
- Upload reference
- Request revision
- Approve
- Reject
- Download when permission allows

Support partial approval.

Example:

Living Room = approved  
Kitchen = revision required  
Bedroom = pending

---

# 33. CLIENT APPROVAL AUTHORITY

Each project has:

**Primary Client Approver**

Additional client users may exist.

The Primary Client may invite additional client users and configure their access.

Other client users may:

- View
- Comment
- Review
- Approve if explicitly delegated

Final overall authority remains with Primary Client unless delegated.

---

# 34. CLIENT APPROVAL EVIDENCE

Portal electronic approval is sufficient initially.

Store:

- Client user
- Exact item approved
- Exact revision
- Electronic signature/signature capture
- Date/time
- IP/device where appropriate
- Approval comments

Do not require paid DSC/eSign integration initially.

---

# 35. FILE MANAGEMENT

Primary storage is the firm's NAS.

Large architecture files should not unnecessarily be duplicated into cloud storage.

Support formats including:

- PDF
- Images
- DWG
- SKP
- RVT
- Office files
- D5/Lumion files
- ZIP
- Video
- Audio

---

# 36. NAS ARCHITECTURE

The application should act as the authorization/control layer.

Avoid giving users unrestricted NAS credentials.

Store application metadata separately from physical file location.

The application must know:

- Project
- Folder
- Document number
- File reference
- Revision
- Current version
- Approval state
- Issued state
- Access permissions

New project creation can automatically create NAS folder structures.

---

# 37. DOCUMENT STATES

Suggested:

**Working  
→ Submitted  
→ Reviewed  
→ Approved  
→ Issued  
→ Superseded**

When a newer approved revision becomes current:

Previous version becomes:

**Superseded — Do Not Use**

Never delete historical revision evidence.

---

# 38. TRANSMITTALS

Formal drawing/file issues must record:

- Sender
- Recipient
- Document
- Revision
- Date/time
- Purpose
- Acknowledgement status

Critical issues may require acknowledgement.

---

# 39. FILE SECURITY

Support access restriction by:

- Role
- Team
- Project
- Folder
- File
- External portal type

Support Confidential files/folders.

Client files can be view-only where configured.

Prevent ordinary downloading/copying where practical.

Do not claim absolute screenshot prevention is possible on arbitrary client devices.

Use:

- Protected viewers
- Watermarks
- Audit
- Access expiry
- OS-level screenshot restrictions where technically available

---

# 40. PROJECT GALLERIES

Support:

### Private Client Gallery

Project-specific.

### Public Portfolio Gallery

Only explicitly approved content.

Never publish internal project files automatically.

---

# 41. TIME TRACKING

Support:

- Start
- Pause
- Resume
- Stop
- Manual entry

Time log fields include:

- Employee
- Project
- Task
- Stage
- Date
- Start/end
- Duration
- Work note
- Office/site/remote
- Billable/non-billable
- Optional evidence

Time may also be logged against non-project activity.

---

# 42. TIME LOG EDITING

Changing an existing time entry requires:

- Original value preserved
- New value
- Mandatory reason
- Editor
- Timestamp
- Audit trail

Management can correct logs.

Prevent/detect multiple simultaneous timers.

---

# 43. ACCOUNTING INTEGRATION

The accounting application should initially receive relevant time logs.

Later approved procurement requirements may also be transferred.

Do not duplicate full accounting reports into this application.

---

# 44. SKILLS

Each employee has a skill profile.

Examples:

- AutoCAD
- Revit
- SketchUp
- D5
- Lumion
- Planning
- Working Drawings
- Detailing
- Interior Design
- BOQ
- Site Coordination

Levels:

**Beginner  
→ Intermediate  
→ Advanced  
→ Expert**

Employees may request skill additions/changes.

Official rating controlled by Team Leader/Owner.

---

# 45. TRAINING AND SKILL CHANGES

Completing training does NOT automatically upgrade skill level.

Instead:

**Training Completed  
→ Skill Upgrade Recommendation  
→ Team Leader/Owner Approval**

Performance may also produce skill-upgrade recommendations.

---

# 46. WORK SCHEDULE & CAPACITY

Employee profile contains:

- Working days
- Start time
- End time
- Break
- Daily capacity
- Weekly offs
- Temporary schedule overrides

Support full-time and part-time employees.

Capacity must account for:

- Work schedule
- Holidays
- Approved leave
- Existing task allocations

---

# 47. TASK EFFORT ALLOCATION

Estimated hours consume capacity.

For collaborative tasks allocate hours per person.

Example:

Task = 12h

Primary Owner = 8h  
Collaborator = 4h

Do not automatically divide effort equally.

---

# 48. WORKLOAD

Provide:

- Daily
- Weekly
- Monthly

Suggested categories:

- Under-utilized
- Healthy
- Near Capacity
- Overloaded

Thresholds should be configurable.

Warn management before assigning work to overloaded employees.

---

# 49. LEAVE

Support configurable types including:

- Casual
- Sick
- Paid
- Unpaid
- Half-day
- Hourly
- Work from Home
- Comp-off

Support:

- Allocation
- Used
- Remaining
- Carry-forward
- Excess/unpaid leave

Leave approval may be:

- Team Leader
- Owner
- Multi-level where required

---

# 50. LEAVE IMPACT

When leave is approved automatically:

1. Reduce employee capacity.
2. Find tasks affected during leave.
3. Detect critical work.
4. Warn Team Leader.
5. Suggest reassignment.

Emergency leave should trigger the same analysis immediately.

---

# 51. ATTENDANCE

Support:

- Check-in
- Check-out
- Working hours
- Late arrival
- Early departure
- Missing punch
- Office attendance
- Site attendance

For site attendance use app-based:

**Location validation + QR + selfie**

Do not continuously track employees off-duty.

---

# 52. AUTOMATIC ASSIGNMENT / RECOMMENDATIONS

The system may recommend assignments based on:

- Required skills
- Skill level
- Availability
- Workload
- Leave
- Existing deadlines
- Similar-task experience
- Project experience
- Past quality
- First-pass approval
- Repeated mistakes
- Productivity
- Team membership
- Hierarchy

Search:

**Current Team First**

Only search other teams when Team Leader requests it.

---

# 53. ASSIGNMENT OUTPUT

System may recommend:

- Primary Owner
- Collaborators
- Reviewer

Recommendations must be explainable.

Example:

Recommended Employee A because:

- High skill match
- 58% capacity used
- 8 similar tasks completed
- Strong first-pass approval rate
- Available before deadline

---

# 54. ASSIGNMENT SAFETY

Every system-generated assignment or reassignment requires human approval.

Never silently assign/reassign important work.

Manual override is allowed but requires reason.

Store:

**Recommendation  
→ Actual selection  
→ Decision-maker  
→ Override reason  
→ Later outcome**

This creates future learning data.

---

# 55. SOP MANAGEMENT

Support SOPs including:

- Site measurement
- Drawing standards
- File naming
- Design review
- BOQ
- Site inspection
- Material approval
- Handover
- Company policy

SOPs support:

- Versioning
- Approval
- Old versions
- Text
- Images
- PDFs
- Videos
- Links
- Checklists
- Templates

Important updates may require employee acknowledgement.

Tasks/templates can reference SOPs.

---

# 56. KNOWLEDGE BASE

Support:

- SOPs
- Design standards
- Construction details
- Materials
- Vendor information
- Lessons learned
- Common mistakes
- Software guidance
- Policies

Employees may submit knowledge suggestions.

Publishing requires Team Leader/Owner approval.

Natural-language search will eventually be supported.

---

# 57. TRAINING

Training modules can include:

- Video
- SOP
- Reference files
- Quiz
- Practical task
- Reviewer assessment

Training may be assigned manually or recommended because of:

- Repeated mistake
- Skill gap
- New role
- New SOP
- Project requirement

Track effectiveness over time.

---

# 58. NOTIFICATIONS

Initial channels:

- In-app
- Mobile push

Notify for relevant events including:

- Assignment
- Reassignment
- Deadline changes
- Priority changes
- Review requests
- Corrections
- Approvals
- Client activity
- Revision changes
- File updates
- Dependencies
- Leave impact
- Site issues
- Critical risk

Support quiet hours.

Critical notifications may bypass quiet hours.

Users may control optional notifications.

Business-critical notifications may remain mandatory.

---

# 59. REMINDERS & ESCALATION

Default patterns should be configurable.

Example:

2 days before due  
→ 1 day before  
→ Due date  
→ Overdue

Overdue escalation may vary by task priority/project.

Employees may also create personal reminders.

---

# 60. SCHEDULED SUMMARIES

## Employee Morning Summary

- Today's tasks
- Priority tasks
- Due work
- Reviews
- Waiting tasks

## Employee Evening Summary

- Completed today
- Outstanding work
- Time logged
- Issues
- Tomorrow plan

## Weekly

Employee + Team Leader summaries.

## Monthly

Performance/development summary.

Owner receives organization-level summaries.

---

# 61. EMPLOYEE PERFORMANCE

The application needs one combined employee performance score.

Weighting must be configurable.

Possible components:

- On-time completion
- Quality
- First-pass approval
- Correction rounds
- Repeated mistakes
- Efficiency
- Productivity
- Review turnaround
- Collaboration
- Training
- Skill development
- Process compliance
- Attendance

Quality should have greater importance than raw speed.

Attendance should have relatively low weight.

Estimated vs actual hours primarily measure efficiency and should only lightly affect total score.

---

# 62. FAIR PERFORMANCE

External delays must not unfairly reduce employee performance.

Potential exclusions:

- Client pending
- Consultant pending
- Vendor pending
- Material pending
- Site unavailable
- Dependency pending
- Approved scope change

If a deadline extension is approved because of an external cause, performance should use the approved revised deadline.

---

# 63. PERFORMANCE EXPLAINABILITY

Employees must see:

- Current score
- Score trend
- What changed
- Why
- Evidence
- Improvement actions
- Strengths
- Weaknesses
- Repeated mistakes
- Suggested SOP/training
- Development goals

Every score change must trace back to real evidence.

No unexplained black-box score.

Employees may see:

- Own score
- Team average
- Position relative to team average

Named rankings remain management-only.

---

# 64. TEAM LEADER PERFORMANCE

Team Leaders need a separate management performance score.

Consider:

- Team delivery
- Project health
- Overdue-task management
- Review turnaround
- Capacity balancing
- Escalation handling
- Blocker resolution
- Employee development
- Training follow-up
- Project coordination

Do not simply transfer every employee error onto the Team Leader.

Measure actions within Team Leader control.

---

# 65. PERFORMANCE REVIEW CYCLES

Support:

- Weekly
- Monthly
- Quarterly
- Annual

May include:

- Metrics
- Manager comments
- Employee acknowledgement
- Goals
- Development actions

---

# 66. PROJECT HEALTH

Each project receives:

- Project Health Score
- Health status
- Schedule variance
- Milestone performance
- Delay analysis
- Workload risk
- Review/revision metrics
- Pending decisions
- Scope change impact

Statuses:

- On Track
- At Risk
- Delayed
- Critical

Design and Turnkey projects may use different weightings.

---

# 67. DELAY ATTRIBUTION

Track cause of delays:

- Internal Team
- Client
- Consultant
- Vendor
- Factory
- Procurement
- Material
- Site Condition
- Approval
- Scope Change
- Other

Management should be able to answer:

> Project delayed 18 days.

and also:

> 7 days client, 4 days consultant, 5 days internal, 2 days material.

---

# 68. SITE OPERATIONS

Site employees need a specialized dashboard.

Show:

- Today's work
- Tomorrow's plan
- Workers/manpower today
- Progress
- Photos
- Snags
- Site approvals
- Pending decisions
- Materials
- Blockers
- Critical activities

---

# 69. DAILY SITE REPORT

Capture:

- Work completed today
- Manpower
- Materials received
- Photos
- Issues
- Delay causes
- Tomorrow plan

System may precompile this from site activity.

Site responsible person confirms/submits it.

---

# 70. SITE PROGRESS

Support:

- Planned %
- Actual %
- Quantity completion
- Work-package completion
- Quality status
- Material status
- Snags

Suggested snag workflow:

**Open  
→ Assigned  
→ In Progress  
→ Ready for Verification  
→ Verified  
→ Closed**

Allow reopen if verification fails.

---

# 71. MOBILE

Mobile is a core experience.

Support:

- Tasks
- Timer
- Task status
- Photos/video
- Comments
- Reviews
- Corrections
- Self-tasks
- Leave
- Attendance
- Performance
- Training
- Site progress
- Manpower
- Snags
- Voice notes
- Markups
- Site issues

Offline capture should eventually work for site operations and sync safely when connectivity returns.

---

# 72. DELIVERY STRATEGY

Initial:

**Responsive Web Application + installable PWA**

Later:

Shared/native wrapper for iOS and Android where deeper device capabilities are required.

Avoid separate completely independent web/iOS/Android codebases unless absolutely necessary.

---

# 73. DASHBOARDS

## Owner

Prioritize:

- Needs Your Attention
- Pending decisions
- Project health
- Team performance
- Team Leader performance
- Critical tasks
- Approvals
- Workload
- Risks
- Blockers

## Team Leader

- Team workload
- Leave
- Overdue work
- Blocked work
- Reviews
- Project health
- Training
- Pending decisions

## Employee

- Today
- Priorities
- Due work
- Reviews
- Corrections
- Waiting
- Workload
- Performance
- Improvement actions

## Client

- Project progress
- Recent submissions
- Pending approvals
- Decisions required
- Approved items
- Files
- Gallery

## Site

- Today's work
- Manpower
- Progress
- Snags
- Photos
- Approvals
- Materials
- Tomorrow plan

---

# 74. MANAGEMENT ACTION CENTER

Create a shared concept for management decisions.

Examples:

- Deadline extension request
- Leave approval
- Scope change approval
- Reassignment recommendation
- Skill upgrade
- Client revision classification
- Delete request
- Procurement request
- Automation recommendation

Management should not have to search across many modules to find decisions awaiting them.

---

# 75. EXTERNAL PORTALS

## Client Portal

Supports:

- Project progress
- Review
- Comment
- Annotation
- Approval/signature
- Decisions
- Files
- Gallery
- Approved client reports

## Consultant Portal

Supports:

- Assigned projects
- Relevant documents
- Uploads
- Requests
- Reviews
- Comments
- Transmittals
- Acknowledgements

## Vendor/Factory Portal

Supports:

- Relevant drawings
- Production requirements
- Deadlines
- Uploads
- Acknowledgements
- Production status

No portal should expose internal employee-performance information.

---

# 76. PORTAL AUTHENTICATION

Support:

- Password
- OTP/passwordless
- Expiring access
- Revocation
- Session/device management

Use free/low-cost 2FA mechanisms where possible.

Do not introduce paid SMS dependencies unnecessarily.

---

# 77. REPORTS

Required categories:

## Project
- Progress
- Health
- Schedule
- Milestones
- Delay
- Tasks
- Critical tasks
- Approvals
- Revisions
- Rework
- Scope changes
- Consultant delays
- Site progress
- Snags
- Procurement
- Handover

## Employee
- Performance
- Productivity
- Efficiency
- Timeliness
- Quality
- Corrections
- First-pass approval
- Attendance
- Leave
- Workload
- Skills
- Training
- Development

## Team Leader
- Management performance
- Team delivery
- Workload management
- Reviews
- Escalations
- Development

## Time
- Employee
- Project
- Task
- Stage
- Billable/non-billable
- Office/site/remote
- Estimate vs actual
- Overtime

## Attendance
- Attendance register
- Late
- Early departure
- Missing punches
- Leave balances
- Site attendance
- Working hours

## Quality
- Corrections
- Severity
- Category
- Repeat mistakes
- Client revisions
- Internal revisions
- First-pass approval
- Review turnaround

## Documents
- Drawing register
- Revision register
- Transmittal register
- Pending acknowledgement
- Approved documents
- Superseded documents
- Handover package

## Skills/Training
- Skill matrix
- Skill gaps
- Training assigned
- Training overdue
- Training completed
- Training effectiveness

Exports:

- PDF
- Excel
- CSV
- Print

Historical weekly/monthly snapshots must not silently change later.

---

# 78. CUSTOM REPORT BUILDER

Later Phase 2 feature.

Allow management to choose:

**Data  
→ Filters  
→ Columns  
→ Grouping  
→ Charts  
→ Saved Report**

Do not make this an MVP blocker.

---

# 79. AUDIT TRAIL

Audit essentially every important business operation.

Examples:

- Task creation/edit
- Assignment/reassignment
- Deadline changes
- Status changes
- Reviews
- Approvals
- Client approvals
- File changes
- Revision changes
- Comments
- Time log changes
- Attendance changes
- Leave
- Skills
- Training
- Permissions
- Role changes
- Project changes
- Automation actions

Audit record should contain where applicable:

- Actor
- Timestamp
- Before value
- After value
- Reason
- Session/device
- IP/location
- Related entity

---

# 80. IMMUTABILITY

High-value evidence must not be silently editable.

Examples:

- Client approvals
- Drawing issues
- Transmittals
- Important authorization changes
- Finalized historical report snapshots

If correction is necessary:

Create a new corrective entry.

Never rewrite history invisibly.

---

# 81. DELETION

Employees do not permanently delete important business records.

They may:

**Request Delete**

Team Leader/Owner approves/rejects.

Approved deletion may remove it from normal operational views while preserving audit evidence.

---

# 82. AUTOMATION

Eventually support configurable:

**WHEN event  
IF condition  
THEN action**

Examples:

- Critical task overdue → notify Team Leader + Owner
- Client approval pending → escalate
- Leave approved → detect affected tasks
- New approved drawing → supersede old revision
- Repeated mistake → recommend training
- Stage completed → activate next stage

---

# 83. AUTOMATION SAFETY

Low-risk actions may execute automatically.

Examples:

- Reminder
- Report generation
- Notification
- Approved revision superseding prior version

High-impact actions require human approval.

Examples:

- Assignment
- Reassignment
- Deadline changes
- Client communication
- Skill changes
- Procurement commitment
- Deletion/archive
- Major project commitment

---

# 84. INTEGRATIONS

## NAS
Primary file storage.

## Accounting Application
Time logs and approved operational procurement information.

## Calendar
Task deadlines, meetings, reviews, milestones and site visits.

Personal calendar integration required.

## Website
Website enquiry can create lead.

## Maps
Project/site location and attendance validation.

## APIs/Webhooks
Design platform for future external integrations.

---

# 85. FUTURE WHATSAPP

WhatsApp/project communication integration may be added later.

Not MVP.

---

# 86. FUTURE CAD/BIM

AutoCAD/Revit/SketchUp/D5/Lumion integrations are future scope.

MVP handles their documents/files without deep native integration.

---

# 87. AI ARCHITECTURE

AI must be provider/model independent.

Create a clean AI abstraction instead of embedding one provider throughout business modules.

AI context must always be permission-filtered.

An employee AI assistant must never gain access to Owner-only information.

---

# 88. AI CAPABILITIES — FUTURE

## Management AI

- Projects needing attention
- Risk explanations
- Workload analysis
- Employee performance analysis
- Pending decisions
- Daily brief

## Employee AI

- Daily priorities
- SOP answers
- Task instructions
- Previous examples
- Correction explanation
- Training suggestions
- Performance coaching

## Team Leader AI

- Assignment suggestions
- Capacity planning
- Review prioritization
- Team performance
- Employee development
- Risk summaries

## Project AI

- Weekly summary
- Pending decisions
- Blockers
- Revisions
- Next actions

## Document AI

- Naming checks
- Drawing consistency
- Checklist compliance
- Revision comparison
- Potential coordination issue detection

## Site AI

- Progress assistance
- Photo comparison
- Possible snags
- Possible quality/safety issues

## Meeting AI

- Transcription
- Decisions
- Tasks
- Owners
- Deadlines
- Requirements

No client-facing AI assistant for now.

---

# 89. AI SAFETY / HUMAN CONTROL

AI may:

- Recommend
- Explain
- Analyze
- Summarize
- Predict
- Draft
- Prepare actions

AI must NOT autonomously finalize:

- Employee assignment
- Reassignment
- Skill change
- Employee performance intervention
- Client communication
- Procurement commitment
- Deadline commitment
- Project commitment
- Deletion
- External publication

Human approval required.

---

# 90. AI AUDITABILITY

When AI makes an important recommendation store:

**Recommendation  
→ Important reasoning factors/evidence  
→ Human decision  
→ Accepted/rejected  
→ Override/rejection reason**

Do not store hidden model chain-of-thought.

Store structured business evidence and explanation suitable for audit.

---

# 91. BACKUP

Current decision is to use the existing NAS.

At minimum implement:

- Scheduled database backup
- File metadata backup
- NAS snapshots/versioning where supported
- Separate NAS backup location/volume where possible
- Restore testing

Document clearly that same-NAS backups remain one physical failure domain.

Design architecture so off-site backup can be added later without redesign.

---

# 92. CRITICAL DOMAIN INVARIANTS

These should eventually be protected by database/application constraints and automated tests.

1. Every Active project has exactly one Project Lead.
2. Every task has exactly one Primary Owner.
3. Client approval references an exact revision.
4. Approved historical revision cannot be silently overwritten.
5. Superseded documents remain traceable.
6. Exiting an employee never removes project history.
7. Permission revocation immediately blocks future access.
8. Important deadline changes require a reason.
9. Important time-log edits require a reason.
10. Performance score changes require traceable evidence.
11. External delay attribution must remain separate from employee-caused delay.
12. High-impact automation cannot bypass approval.
13. AI cannot bypass application permissions.
14. Audit history must not depend on mutable display names alone; preserve stable identifiers/snapshots as needed.
15. Multi-brand data must not leak between unauthorized brands.

Create automated regression tests for these invariants.

---

# 93. ARCHITECTURE PRINCIPLES

Use:

- API-first architecture
- Modular domain boundaries
- Strong server-side authorization
- Multi-brand capability
- Audit-first important mutations
- Event-driven notifications
- Event-driven analytics where appropriate
- Storage abstraction for NAS
- AI provider abstraction
- Human-in-the-loop automation
- PWA/mobile-first responsiveness
- Offline-aware site workflows
- Immutable approval evidence
- Explainable analytics
- Configurable business rules

Avoid premature microservices unless they provide a real benefit.

A well-modularized monolith is acceptable and may be preferable initially.

Keep module boundaries clean enough to extract services later if required.

---

# 94. RECOMMENDED MODULE BOUNDARIES

Use clear domains such as:

1. Platform/Foundation
2. Identity/Auth
3. Organization/Brands
4. RBAC/Permissions
5. Employees/Teams
6. Leads/Clients
7. Projects
8. Project Templates
9. Tasks
10. Reviews
11. Revisions/Approvals
12. Documents/NAS
13. Time Tracking
14. Attendance/Leave
15. Skills/Capacity
16. Site Operations
17. Portals
18. Notifications
19. Employee Performance
20. Team Leader Performance
21. Project Health
22. Dashboards/Decision Queue
23. Reports
24. SOP/Knowledge
25. Training
26. Integrations
27. Automation
28. AI

Do not allow one giant service containing all business logic.

---

# 95. DOMAIN EVENTS

Establish an event catalogue early.

Examples:

### Project
- project.created
- project.activated
- project.on_hold
- project.scope_changed
- project.completed

### Task
- task.created
- task.assigned
- task.started
- task.waiting
- task.overdue
- task.completed
- task.deadline_changed

### Review
- review.requested
- review.started
- review.correction_requested
- review.approved

### Client
- client.review_requested
- client.revision_requested
- client.approved

### Document
- document.uploaded
- revision.created
- document.approved
- document.issued
- document.superseded

### Workforce
- time.started
- time.logged
- time.changed
- leave.requested
- leave.approved
- attendance.checked_in

### Analytics
- employee_performance.changed
- project_health.changed
- capacity.threshold_exceeded

Notifications, analytics, reports, automation and AI should consume these rather than duplicating business logic.

---

# 96. SHARED APPROVAL ENGINE

Avoid implementing approval logic independently in many modules.

Create a reusable approval concept supporting:

- Request
- Type
- Requested by
- Approver
- Approval level
- Status
- Reason
- Comment
- Evidence
- Expiration
- Delegation
- Audit

It should be reusable for:

- Leave
- Client approval where appropriate
- Deadline extension
- Skill upgrade
- Delete request
- Scope change
- Procurement request
- Automation recommendation
- Reassignment approval

---

# 97. MANAGEMENT DECISION QUEUE

Create one shared concept for pending management actions.

Examples:

- Deadline extension
- Leave
- Scope change
- Skill upgrade
- Delete request
- Client revision classification
- Reassignment
- Procurement
- Automation approval

This powers:

**Needs Your Attention**

Do not make management search module by module.

---

# 98. OFFLINE SITE DATA

Design offline behavior carefully.

Offline operations must use stable local identifiers and safe synchronization.

Plan for:

- Offline photo capture
- Notes
- Snags
- Progress updates
- Site reports
- Time information where appropriate

Define conflict resolution explicitly.

Never silently overwrite conflicting edits during synchronization.

Offline functionality can be phased, but the data model should not make it impossible later.

---

# 99. SECURITY

At minimum plan for:

- Secure authentication
- Session management
- Google login
- Microsoft login
- Email/password
- Portal OTP/passwordless
- Optional 2FA without unnecessary paid SMS
- Rate limiting
- Strong password handling
- CSRF/XSS protections where relevant
- Secure upload validation
- Permission-aware file access
- Expiring portal access
- Session/device visibility
- Forced logout
- Audit logs
- Secret management
- Backup/restore testing

Never expose NAS paths or credentials unnecessarily.

---

# 100. TESTING PHILOSOPHY

Testing is mandatory, not a final cleanup task.

For each module create:

### Unit tests
Business rules and calculations.

### Integration tests
Database/API/module behavior.

### Permission tests
Unauthorized access.

### State-machine tests
Valid and invalid transitions.

### Regression tests
Every meaningful defect discovered should receive a regression test whenever practical.

### End-to-end tests
Critical user workflows.

### Mobile tests
Critical PWA/site workflows.

### Offline tests
When offline support is implemented.

---

# 101. BUG RULE

Whenever a meaningful defect is found:

1. Identify root cause.
2. Check whether similar code paths are affected.
3. Fix the underlying cause rather than only visible symptom.
4. Add a regression test when practical.
5. Record notable architectural/business-rule discoveries in the appropriate context documentation.
6. Do not widen scope into unrelated refactoring unless necessary for correctness.

At the end of substantial QA work, provide a concise defect report including:

- Defect
- Root cause
- Fix
- Regression test
- Related risks discovered

---

# 102. DEFINITION OF DONE

A feature is not complete merely because its UI looks correct.

Every feature/module must satisfy applicable requirements for:

### Business correctness
Workflow works end-to-end.

### Data integrity
Invalid states are prevented.

### Permissions
Unauthorized access fails at API/backend level.

### Audit
Important mutations are traceable.

### Testing
Critical business rules have automated tests.

### Errors
Failure does not corrupt state.

### Mobile
Required workflow works on supported mobile experience.

### Events
Correct business events are emitted.

### Analytics readiness
Future metrics can consume trustworthy data.

### Documentation
Relevant context documentation remains accurate.

---

# 103. IMPLEMENTATION ORDER

Do not randomly implement modules.

Recommended order:

### Release 0 — Foundation

1. Platform foundation
2. Multi-brand organization
3. Authentication
4. RBAC
5. Employees
6. Teams
7. Audit framework
8. Domain-event framework

### Release 1 — Work Management Core

9. Leads
10. Clients
11. Projects
12. Project Templates
13. Stages
14. Milestones
15. Tasks
16. Subtasks
17. Dependencies
18. Recurring tasks
19. Deadline/extension rules

### Release 2 — Design Control

20. Internal reviews
21. Correction loops
22. Revision control
23. Client reviews
24. Client approvals
25. NAS documents
26. Versioning
27. Transmittals

### Release 3 — Workforce Operations

28. Time tracking
29. Work schedules
30. Attendance
31. Leave
32. Skills
33. Capacity
34. Workload

### Release 4 — Site & External Collaboration

35. Site operations
36. Manpower
37. Site progress
38. Snags
39. Daily Site Reports
40. Client portal
41. Consultant portal
42. Vendor/factory portal
43. PWA/offline site support

### Release 5 — Management Intelligence

44. Employee performance
45. Team Leader performance
46. Project health
47. Delay attribution
48. Management Action Center
49. Role-based dashboards
50. Core reports
51. Historical report snapshots

### Release 6 — Integration & Automation

52. Accounting time-log integration
53. Calendar integration
54. Website lead integration
55. API/webhooks
56. Scheduled reports
57. Automation engine

### Phase 2

58. Assignment recommendations
59. Advanced resource balancing
60. SOP/Knowledge intelligence
61. Training recommendations
62. Custom reports
63. Custom automation builder
64. Advanced project forecasting
65. Native mobile wrapper
66. WhatsApp integration
67. Advanced procurement integration

### AI

68. Knowledge assistant
69. Management summaries
70. Performance explanation
71. Assignment recommendations
72. Predictive project risk
73. Meeting intelligence
74. Drawing intelligence
75. Site-photo intelligence

---

# 104. FIRST REAL-WORLD PRODUCT CHECKPOINT

Before advanced analytics or AI, prove:

> One actual Design project can run from project creation through tasks, internal review, corrections, client review, client approval, final drawing issue and handover entirely inside the application.

This is the first major operational milestone.

---

# 105. SECOND REAL-WORLD PRODUCT CHECKPOINT

Then prove:

> One actual Turnkey project can continue from approved design through BOQ/material workflow, procurement coordination, factory/site execution, manpower, progress updates, quality checks, snags and final handover.

Only after these flows are trustworthy should advanced predictive intelligence become a priority.

---

# 106. CONTEXT EFFICIENCY REQUIREMENTS

This project will be built heavily using AI coding agents.

Optimize the repository so agents do NOT need to reread the entire codebase for every task.

Maintain concise files such as:

### `PROJECT_MAP.md`

Shows:

- Module locations
- Important services
- Important data models
- Important routes
- Tests
- Integrations

### `ARCHITECTURE.md`

Shows:

- Architectural principles
- Module boundaries
- Dependency rules
- Data ownership
- Events
- Authentication
- Authorization
- Storage
- Offline strategy
- Integrations

### `PRODUCT.md`

Shows:

- Product rules
- Workflows
- State machines
- User roles
- Major business decisions

### `AGENTS.md`

Shows:

- Repository rules
- Commands
- Coding conventions
- Testing requirements
- Context-reading order
- Modification boundaries
- Definition of done

Keep them concise.

Do not turn them into giant code dumps.

---

# 107. AI CODING MODEL USAGE

When the environment supports multiple models:

Use the strongest/highest-reasoning model for:

- Initial architecture
- Domain model
- Security
- Permission system
- State machines
- Complex bug root-cause analysis
- Major refactoring
- Cross-module integration
- Performance scoring
- Offline synchronization
- Automation engine
- AI architecture
- Pre-release architecture review

Use faster/cheaper models for well-specified work such as:

- Repetitive CRUD
- Straightforward tests
- Mechanical refactors
- Styling
- Simple components
- Documentation formatting
- Routine API wiring

Never save tokens by using a weaker model for an architectural decision that could cause significant rework.

---

# 108. CHANGE CONTROL

Do not casually alter approved business rules.

If implementation reveals that a requirement is:

- Contradictory
- Technically unsafe
- Significantly more expensive than expected
- Architecturally harmful
- Impossible on target platform

Do not silently reinterpret it.

Document:

1. Requirement
2. Conflict
3. Impact
4. Recommended resolution
5. Alternatives

Then use the safest reversible option until a product decision is made.

---

# 109. DO NOT OVERENGINEER

This is initially an internal application for a relatively small architecture/interior-design firm.

Architecture should be robust and scalable, but avoid infrastructure complexity that provides no meaningful current benefit.

Prefer:

- Clear modules
- Strong database design
- Strong permissions
- Strong testing
- Strong auditability

over:

- Premature microservices
- Unnecessary distributed systems
- Complicated infrastructure
- Expensive external services without strong reason

---

# 110. COST PRINCIPLE

Prefer solutions with low recurring cost where they still provide sufficient reliability and security.

Existing resources include a NAS/server.

Avoid introducing paid third-party dependencies unnecessarily.

However:

Do not sacrifice essential security, backup integrity, or data correctness purely to save a small recurring cost.

Whenever recommending a paid infrastructure component, explain:

- Why it is necessary
- Free/cheaper alternative
- Trade-off

---

# 111. CURRENT BACKUP DECISION

Primary backup strategy currently uses the existing NAS.

Architecture must make future off-site backup easy to add.

Do not make off-site backup a prerequisite for starting development, but record same-NAS backup as a known risk.

---

# 112. THINGS NOT TO BUILD EARLY

Do NOT prioritize these before core business data is trustworthy:

- AI assistant
- Fancy dashboard visualizations
- Predictive risk
- Employee rankings
- Automatic assignment
- Drawing AI
- Site photo AI
- Complex custom reports
- Complex automation builder
- Native mobile apps

Build the underlying evidence first.

---

# 113. YOUR FIRST TASK AFTER RECEIVING THIS PROMPT

Do **not** start feature coding immediately.

First perform a rigorous architecture and implementation preparation pass.

Produce/update the canonical repository documentation with:

### A. Current State Audit

Report:

1. Repository state
2. Existing stack
3. Existing architecture
4. Existing database/data layer
5. Existing authentication/security
6. Existing modules
7. Existing test infrastructure
8. Available build/typecheck/lint/test commands
9. Current verification result
10. Existing context files

### B. Target Architecture

Define:

- Application architecture
- Module boundaries
- Dependency direction
- Backend/frontend boundaries
- Data-access strategy
- Event architecture
- Audit architecture
- Notification architecture
- NAS abstraction
- Background jobs
- Offline strategy
- Integration layer
- AI abstraction

### C. Domain Model

Create the initial domain/entity blueprint.

At minimum cover:

- Organization
- Brand
- Team
- Role
- Permission
- Employee
- Lead
- Client
- Project
- Scope
- Stage
- Milestone
- Task
- Assignment
- Collaboration
- Dependency
- Review
- Correction
- Revision
- Approval
- Document
- Transmittal
- Time Log
- Attendance
- Leave
- Skill
- Capacity
- Site
- Snag
- Training
- Notification
- Audit Event
- Report Snapshot
- Automation
- Integration

Define:

- Entity responsibility
- Major relationships
- Ownership
- Important unique constraints
- Immutable fields
- Soft-delete/archive behavior

### D. State Machines

Document:

- Lead
- Project
- Task
- Review
- Revision
- Document
- Snag
- Leave
- Training
- Employee lifecycle

### E. Permission Matrix

Define initial effective access rules for:

- Owner
- Team Leader
- Employee
- Site Employee
- Primary Client
- Additional Client
- Consultant
- Vendor/Factory

### F. Event Catalogue

Define canonical event names and payload principles.

### G. Testing Architecture

Define:

- Unit strategy
- Integration strategy
- API tests
- Permission tests
- State-machine tests
- E2E tests
- PWA/mobile tests
- Regression-test policy

### H. Release Plan

Convert the release ordering in this specification into executable implementation milestones with dependencies and verification gates.

### I. Risks

Identify architectural risks now before code makes them expensive.

Especially inspect:

- Permission complexity
- Multi-brand isolation
- NAS security
- File versioning
- Immutable approvals
- Performance scoring
- Offline sync
- Audit volume
- Notification duplication
- Cross-module coupling
- External portals
- Background jobs
- AI permission boundaries

---

# 114. STOP CONDITION FOR THIS FIRST PASS

For this first pass:

**Do not build product features yet.**

You may create/update architecture, product, planning and agent context documentation.

You may create small non-product scaffolding only if genuinely necessary to establish the development environment, but do not begin UI feature implementation.

When finished, return a concise report with:

1. Architecture selected
2. Major modules
3. Database/domain approach
4. Permission approach
5. Testing strategy
6. Context/documentation structure
7. Key architectural risks
8. Recommended first implementation milestone
9. Any genuine unresolved blockers
10. Git checkpoint/working-tree status if applicable

The purpose of this first pass is to make later implementation **faster, cheaper, safer, and less prone to debugging and refactoring**.

---

# 115. FINAL OPERATING PRINCIPLE

For every implementation decision ask:

> Will this still make sense after Projects, Tasks, Reviews, NAS Documents, Site Operations, Portals, Performance Analytics, Automation and AI are all connected?

If not, stop and improve the underlying architecture before accumulating dependent code.

Build the system so business logic is trustworthy first.

Then build automation.

Then build intelligence.

Do not use AI to compensate for weak data modeling or weak workflows.