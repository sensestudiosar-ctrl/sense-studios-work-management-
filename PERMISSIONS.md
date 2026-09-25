# Proposed authorization model — no enforcement implemented

Approved source: R-004–R-009, R-027–R-039, R-075–R-081, R-087–R-099. Approved C-001: Organization → Branch → Team → Employee, no Brand permission scope; one owning branch per project; employees may work across branches only with explicit assignment. Job role, reporting relation within Branch/Team, and permission grant remain separate. The matrix below is an initial baseline derived from the source, not hard-coded job titles or a finalized grant list.

## Effective access rule

Authenticate and verify an active server-side session; determine organization, branch/team/project membership and explicit grants; then authorize resource + action + scope + conditions. Default deny. Explicit deny should take precedence over allow as a proposed safe convention, subject to owner approval. A project assignment can grant work-specific cross-branch access, but does not grant access to all branch projects, confidential files, employee performance or permission management. Recheck authorization at download/stream time and on every mutation. Forced logout or grant revocation invalidates future access immediately. Owner workflow override records actor, reason and time but cannot violate integrity or immutable evidence.

| Principal | Resource → actions | Scope | Conditions/evidence |
| --- | --- | --- | --- |
| Owner | Organization, branches, roles, grants, employees, teams, projects, workflow gates, deletion, automation, security audit, sessions → manage/view/override | Whole organization | Protected changes audited; override reason required; no destructive rewrite of evidence. |
| Team Leader | Assigned projects and managed employees → assign/reassign/manage/review/deadline/leave/skills/automation as granted | Own reporting team and assigned projects; explicit Owner-granted cross-branch project access | Grant and project/team relation required; no automatic detailed access to other teams. Deadline change reason; skill/leave approval only within policy. |
| Employee | Assigned/collaborator/reviewer projects/tasks → view/work/comment; self-task → create; own time/attendance/performance/training → view or submit as allowed | Own work and explicit memberships | Cannot assign others without separate permission; confidential file policy may narrow project access. |
| Site Employee | Assigned site projects/tasks, progress/manpower/photos/snags/reports, own attendance → submit/view | Explicit site/project membership | Site evidence validation; report confirmation by site responsible person. No broad office or financial access. |
| Reviewer | Assigned submission/review → view/comment/annotate/approve/request correction/escalate | Assigned review and permitted files | Distinct review permission; deadline/priority changes require separate grant. |
| Primary Client | Own project portal → view/comment/review/approve/invite delegated client users/download where granted | Named client projects/items | Exact revision and signature evidence; Primary Client retains final overall authority. PDF/image items only; no internal-only files, employee data or NAS paths. |
| Additional Client | Own project portal → view/comment/review; approve only if explicitly delegated | Explicit invitation and item/project scope | Delegation is item-specific and time-limited; Primary Client retains final overall authority; no internal data. |
| Consultant | Assigned project documents/requests/reviews/transmittals → view/upload/comment/acknowledge | Explicit consultant project/folder/item grant | Cannot see internal performance or unrelated projects. |
| Vendor / Factory | Relevant drawings, production requests/deadlines/status → view/upload/acknowledge | Explicit project/work package and permitted revision | CAD download only through an approved project/item grant and controlled NAS-share workflow; no unrelated files, internal performance or financials. |
| Public visitor | Public portfolio → view | Explicitly published entries only | No project portal or internal file access. |

All client portal accounts receive PDF and image files only under C-002 Q13; this applies to Primary and Additional Clients. Native NAS links for vendor CAD remain outside ordinary client access until the share workflow is approved.

## Permission names and scopes

Use resource.action names such as project.view, project.manage, task.assign, task.reassign, review.decide, document.download, document.issue, client_approval.decide, employee.manage, permission.manage, performance.view_own, performance.view_team, audit.view, automation.manage. Scope vocabulary: own, assigned, team, branch, project, organization, explicit item. Conditions may include membership, document classification, workflow state, delegated approval and expiry. Configure role bundles dynamically; store explicit overrides separately from job role and hierarchy.

Security tests must cover allowed and denied behavior, guessed IDs, cross-branch assigned versus unassigned access, file direct URL replay, portal-to-internal escalation, revoked sessions, stale grants, confidential folders, unpublished galleries and AI read contexts. Never rely on frontend filtering.

## Decision dependencies

C-002 makes the Owner the only authority for cross-branch project grants and retains final overall client approval with the Primary Client. Vendor CAD share issuance/revocation controls still need a decision. The source does not authorize automatic permission inheritance from a job title. See REQUIREMENT_QUESTIONS.md.
