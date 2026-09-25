# Product context — approved requirements, planning only

The verbatim source is requirements/APPROVED_REQUIREMENTS.md, sections 1–115. REQUIREMENTS_TRACE.md assigns stable R-### IDs. This summary does not replace the source. No product feature exists yet.

## Purpose and boundary

Sense Studios needs an operating platform for an architecture and interior-design firm: lead → project → design, tasks, review, client approval → drawings → turnkey site execution → handover (R-002). It should make decisions, risk, workload, delays, current revisions, and development needs visible to authorized people. It is not the accounting or payroll system; time logs and later approved procurement data may integrate with the existing accounting application (R-003, R-043).

## People and organization

The approved organizational hierarchy is Organization → Branch → Team → Employee (C-001); one organization may contain multiple branches. Each project belongs to exactly one current branch and may move only by formal Owner-approved transfer; each employee has one home branch/team and may participate across branches only through an Owner-granted project assignment. Job role, reporting relationship within the approved hierarchy, and permission are distinct; roles are configurable. Internal users include Owner, Team Leader, employee, site employee, reviewer, part-time worker, and intern. External users include primary/additional client, consultant, vendor, and factory users, each restricted to a portal (R-005–R-009, R-075–R-076).

## Operational capabilities

| Area | Approved behavior | Source |
| --- | --- | --- |
| Leads and projects | Basic lead CRM in MVP; won lead can become a project. Authorized handlers may jump forward over unused stages with a reason; skipped stages remain distinct from completed steps (C-017). A returning Lost enquiry becomes a new lead linked to the preserved Lost record (C-018). Design and Turnkey delivery types; multiple service scopes, formal scope changes, accountable Project Lead, configurable project templates, stages and milestones. | R-010–R-017 |
| Tasks | One primary owner; optional collaborators. Self-tasks, project/non-project/recurring/correction/site/training tasks, configurable fields and types, priority, target and controlled committed dates, extension requests, waiting reasons, simple finish-to-start dependencies with warning rather than hard block. | R-018–R-026 |
| Design control | Internal/client review, retained correction rounds, severity/category, internal R and client CR review series, classified client changes, partial approval with exact revision and evidence, transmittals. | R-027–R-034, R-037–R-038 |
| Files | NAS as primary physical store; app-controlled access and separate metadata, historical revisions, confidential/view-only controls, private galleries and explicitly published portfolio content. | R-035–R-040 |
| Workforce | Timers/manual time, reasoned corrections, accounting transfer; skills, training, schedules, capacity, workload, leave and impact analysis, attendance including site validation. | R-041–R-057 |
| Communication and intelligence | In-app/email at launch, with mobile push later; reminders, summaries; explainable employee/Team Leader performance, project health and delay attribution; dashboards, decision queue, reports and frozen snapshots. | R-058–R-067, R-073–R-074, R-077–R-078 |
| Site and mobile | Daily site reports, progress, manpower, photos, snags; responsive installable PWA first, safe offline site capture later. | R-068–R-072, R-098 |
| External and future | Client PDF/image portal, consultant/vendor portals with Owner-controlled file-specific CAD links for assigned consultants/vendors, integrations, guarded automation and provider-independent, permission-filtered AI. Native wrapper, WhatsApp, CAD/BIM, advanced recommendations and custom builders are later work. | R-075–R-076, R-082–R-090, R-103, R-112 |

## Rules that must survive implementation

- An Active project has exactly one accountable Project Lead; every task has exactly one primary owner. Only the Owner can cancel a Draft, Active or On Hold project, with reason and preserved history. Unfinished delivery tasks stop; completed tasks stay completed; distinct closeout tasks may link to the Cancelled project without reopening delivery after assigned Project Lead or explicitly authorized Team Leader approval; any vendor/consultant closeout access is narrow and time-limited. Vendor/consultant project access ends and active native CAD links are confirmed revoked at cancellation. Clients retain only read-only access to previously issued PDF/images and their own approval history, with new reviews/comments/approvals stopped and read-only access automatically expiring on an Owner-set date for each client, changeable by the Owner with audit (R-013, R-016, R-018, R-024, R-092, C-010–C-016).
- Client approval binds the exact item and revision; approved and superseded evidence is retained for its approved C-003 period. Important changes produce append-only audit evidence, including actor and reason (R-028, R-034, R-079–R-080, R-092).
- Revoked permissions stop future access; active external CAD links are cancelled by the Owner and recorded; branch data cannot leak. External users never see internal employee performance or unrestricted NAS paths (R-006, R-036, R-075, R-092).
- External delay is separated from employee-caused delay; score changes remain explainable and evidence-backed. Quality counts more than speed; attendance and estimated-versus-actual hours have limited weight (R-031, R-061–R-067, R-092).
- High-impact automation and AI prepare recommendations for human approval; they never finalize assignment, commitments, deletion, publication, or external communication alone (R-054, R-083, R-087–R-090, R-092).

## Delivery checkpoints

The first operational proof is one real Design project from creation through tasks, internal corrections, client approval, final drawing issue, and handover (R-104). The second is one real Turnkey project through BOQ/materials, procurement coordination, factory/site execution, manpower, quality, snags, and handover (R-105). Advanced analytics and AI follow trustworthy operational data. Detailed vertical slices and verification gates are in IMPLEMENTATION_PLAN.md.

## Open decisions

C-001 through C-018 record approved owner decisions. Branch leave allowances and numerical score policies are Owner setup data before their features become active. OD-10 on active-lead backward moves is open. The final consistency review and architecture approval remain pending; proposals in ARCHITECTURE.md are not yet approved product behavior.
