# Approved clarifications and addenda

The original 115-section requirements remain unchanged at APPROVED_REQUIREMENTS.md. This file records newer owner instructions without erasing source history. In conflicts, the newer explicit clarification takes precedence.

## C-001 — Branch-only organizational model (approved 2026-09-25)

The organizational hierarchy is **Organization → Branch → Team → Employee**. One organization may have multiple branches. Each project has exactly one owning branch. Employees belong to the appropriate organizational/branch structure; explicitly authorized project assignments may permit cross-branch work.

There is **no separate Brand model, entity, table, permission scope or architectural layer**. Any source use of “Brand” or “multi-brand” describing organizational partitioning and isolation is superseded by Branch and branch isolation. This applies to introductory text and source sections R-004, R-006, R-007, R-092, R-093, R-094, R-103 and R-113. Other uses of role, team, project membership and explicit permission overrides remain meaningful and are not renamed.

The original source lists “Departments” and “Hierarchy” as organizational layers. The approved hierarchy has no Department level. Reporting-manager relationships and dynamic job roles may still be needed for Team Leader authority and assignment recommendations, but they must live within the approved Organization/Branch/Team/Employee structure, not create another organizational tier. Their exact home-membership cardinality and cross-branch grant authority were resolved by C-002 Q1 and Q15 below.

This clarification changes organizational structure only. It does not remove any project, task, review, file, workforce, site, portal, analytics, automation or AI capability from the original source.

## C-002 — Owner answers to Q1–Q15 (approved 2026-09-25)

The owner selected Q1 A: each employee has exactly one home Branch and Team. Cross-branch project work remains possible by explicit assignment and applicable permission. Q2 B: an existing project's owning Branch may change only through a formal Owner-approved transfer with retained history and access recalculation. Q3 A: use Cloudflare Tunnel on the existing domain for public app ingress, with app authentication and transfer tests; this is not approval to publish unrestricted NAS services.

Q4 A: Turnkey BOQ prices and cost approvals are visible only to the Owner and explicitly granted Team Leaders or clients; staff see operational quantities/status. Q5 A: the Primary Client may delegate approval of specified items, but retains final overall approval. Q6 A: project On Hold and task Waiting are optional, reversible states with recorded reasons/history; required review gates still apply. Q7 A with an explicit convention: R denotes internal review and CR denotes client review. They are distinct series with exact revision identities; one approved current version is designated. Do not treat CR as a generic correction-request label.

Q8 B: use fixed retention periods by data category. The owner has not supplied the periods yet; no period or deletion behavior is approved. Q9 A: time entries lock after manager approval/export; corrections retain history and export idempotently. Q10 A: Work from Home changes attendance/schedule rather than consuming leave; leave accrual and carry-forward figures remain to be specified. Q11 A: missing location, QR, selfie or connectivity permits a provisional site check-in with reason and manager review, subject to an approved privacy retention period. Q12 A: the Owner approves versioned performance and project-health policies prospectively; exact weights/thresholds remain to be specified.

Q13 is a custom answer: clients receive PDF and image files only. Vendors may need CAD downloads using the NAS's sharing capabilities. The precise vendor share approval, expiry, revocation, audit and portal handoff workflow remains to be approved; do not assume direct NAS folder access or that large files must pass through the public app Tunnel. Q14 A: one organization-wide Client record may link to branch-owned leads/projects, with contact views scoped by permission. Q15 A: only the Owner may grant an employee cross-branch project access; grant and revocation are audited.

These answers refine the preserved source and C-001. They approve product rules, not the final implementation architecture. Open policy details and the final architecture approval gate remain in REQUIREMENT_QUESTIONS.md and AGENTS.md.

## C-003 — Fixed retention schedule for Q8 (approved 2026-09-25)

The owner selected follow-up Schedule A for Q8. Retain client approval evidence, issued drawings and audit records for **10 years**; exited-employee records for **7 years after exit**; and site attendance selfies for **90 days**. The attendance event may remain after its selfie expires, subject to the applicable employee-record policy. This completes the duration choice in C-002 Q8 and the selfie duration needed for Q11.

The schedule's legal and contract fit must be checked before production. Record expiry clock start, legal-hold exceptions, backup expiry and controlled purge/audit behavior in the final architecture. For planning, use project closure for approvals/drawings, event time for audit/selfies and exit date for employee records; these clock anchors are implementation proposals, not additional owner-approved durations. No application behavior or deletion job is implemented.
