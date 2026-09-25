# Owner decision register and open policy details

This preserves the original interview options and records approved owner answers in C-002. C-001 fixes Organization → Branch → Team → Employee with no Brand or Department tier. Every project has one owning branch, with explicit cross-branch assignments. C-003 fixes Q8 retention durations. Q10 leave accrual/carry-forward values, Q12 score formulas and Q13 vendor CAD sharing controls still need specifics. Final architecture remains subject to explicit owner approval.

## Before foundation and first Design-project checkpoint

### Q1 — Employee home membership
**Question:** Should each employee have exactly one home branch and one home team, while still being able to work on explicitly assigned projects in other branches?
**Why:** Determines employee membership records, reporting, capacity and default list views. Project-specific permission is still required in either option.
**A:** Exactly one home branch/team; cross-branch projects are explicit assignments.
**B:** Multiple formal branch/team memberships; reports and managers must choose a primary one.
**Initial technical recommendation:** A. It gives each employee a clear reporting home without blocking cross-branch work.
**Owner answer (2026-09-25):** A — Exactly one home Branch and Team per employee; cross-branch project access requires explicit assignment.

### Q2 — Project branch transfer
**Question:** Can an existing project change its owning branch after creation?
**Why:** Changes ownership, permissions, reports, numbering and NAS paths.
**A:** No transfer; create a new project or keep the original branch.
**B:** Formal Owner-approved transfer with history and access recalculation.
**Initial technical recommendation:** B only if the business needs transfers; otherwise A for the first release. Never edit branch_id silently.
**Owner answer (2026-09-25):** B — Formal Owner-approved project Branch transfer, with history and access recalculation.

### Q3 — Public ingress and Cloudflare
**Question:** May the app use a Cloudflare Tunnel on your existing domain to reach the NAS-hosted app, with Cloudflare handling public HTTPS traffic?
**Why:** Avoids router port forwarding and works with some ISP setups, but places an external provider in the traffic path and Free uploads have a 100 MB per-request limit.
**A:** Use Tunnel; implement chunked/resumable large uploads and retain app-level authentication.
**B:** Self-host public HTTPS ingress with a routable public IP, maintained firewall/certificates and no exposed NAS services.
**Initial technical recommendation:** A for lowest cost and simpler perimeter, subject to owner acceptance and realistic file-transfer tests.
**Owner answer (2026-09-25):** A — Cloudflare Tunnel on the existing domain for public app ingress; app authentication remains mandatory.

### Q4 — Cost/BOQ visibility
**Question:** Who may view Turnkey BOQ pricing and cost approvals in this app?
**Why:** The workflow requires cost approval, while normal employees must not see financial metrics.
**A:** Owner and explicitly granted Team Leaders/clients see approved cost views; staff see operational quantities/status only.
**B:** Broader project staff visibility.
**Initial technical recommendation:** A, with field-level API authorization and separate operational versus price data.
**Owner answer (2026-09-25):** A — Owner and explicitly granted Team Leaders/clients may see approved cost views; staff see operational quantities/status only.

### Q5 — Client approval delegation
**Question:** Can the Primary Client delegate final overall approval, or only approval of specified items?
**Why:** Determines signature authority and immutable evidence.
**A:** Item-level delegation only; Primary Client retains final overall approval.
**B:** Explicit time-limited delegation may include final overall approval.
**Initial technical recommendation:** A initially; it is simpler to audit and matches the stated default.
**Owner answer (2026-09-25):** A — Item-level delegation only; Primary Client retains final overall approval.

### Q6 — Project and task transition details
**Question:** May a project move Active → Completed directly and On Hold → Active, and may a task enter/leave Waiting from any active state?
**Why:** Displayed state sequences could be interpreted as mandatory steps, which would create unnecessary blocks or lost review history.
**A:** Treat Hold and Waiting as optional reversible states with reason/history; required reviews still gate completion.
**B:** Require strictly sequential states.
**Initial technical recommendation:** A. Write a precise transition matrix before implementing S07/S09.
**Owner answer (2026-09-25):** A — On Hold and Waiting are optional reversible states with reason/history; required reviews still gate completion.

### Q7 — Document revision numbering
**Question:** Is CR1 a separate client-request series for the same document, and which revision becomes current after a CR approval?
**Why:** Affects uniqueness, drawing registers, client approval references and transmittals.
**A:** R and CR are distinct reason/issue series, each exact version ID; a single approved current version is designated.
**B:** CR is only a request label and all issued files use the R sequence.
**Initial technical recommendation:** A if the firm uses CR numbers on deliverables; otherwise B. Confirm the drawing convention before S12.
**Owner answer (2026-09-25):** A, clarified — R is internal review; CR is client review. They are distinct revision series and exact versions.

### Q8 — Retention and deletion
**Question:** What retention period applies to client approvals, issued drawings, audit, attendance photos/selfies and exited-employee records?
**Why:** Sets archive/soft-delete rules, storage cost and privacy behavior.
**A:** Retain business evidence indefinitely until a later documented policy; set shorter privacy retention for site selfies.
**B:** Specify fixed periods now by data category.
**Initial technical recommendation:** B before production, with legal/business advice where needed; never hard-delete protected evidence without policy.
**Owner answer (2026-09-25):** B — Fixed periods per category; C-003 follow-up Schedule A sets 10 years for approvals/drawings/audit, 7 years after exit for employee records and 90 days for site selfies. Legal/contract review and purge mechanics remain production gates.

## Before workforce, site and analytics releases

### Q9 — Time-log lock and export
**Question:** When does a time entry become locked, and can a corrected entry be re-exported to accounting?
**Why:** Avoids inconsistent time totals and duplicate accounting records.
**A:** Lock after manager approval/export; corrections create adjusted versions and idempotent re-export.
**B:** Allow free edits until a periodic cutoff.
**Initial technical recommendation:** A.
**Owner answer (2026-09-25):** A — Lock after manager approval/export; corrected versions and idempotent re-export.

### Q10 — Leave and work-from-home policy
**Question:** Does Work from Home consume a leave balance or only change attendance/location, and what are accrual/carry-forward rules?
**Why:** Affects balances, capacity, attendance and approval routing.
**A:** WFH is an attendance/schedule request, not leave consumption; leave types have explicit balance policy.
**B:** WFH uses a leave allocation.
**Initial technical recommendation:** A, with firm-specific leave accrual rules supplied before S17.
**Owner answer (2026-09-25):** A — Work from Home changes attendance/schedule, not leave balance. Accrual/carry-forward values remain open.

### Q11 — Site attendance evidence
**Question:** How should location + QR + selfie be handled if the device lacks permission or connectivity?
**Why:** A hard failure can block legitimate on-site work; weak fallback can enable false attendance.
**A:** Allow a provisional check-in with reason and manager review; retain evidence under a defined privacy period.
**B:** Reject check-in until all evidence is captured online.
**Initial technical recommendation:** A with clear audit and an exception queue.
**Owner answer (2026-09-25):** A — Provisional check-in with reason and manager review when evidence/connectivity is missing. C-003 fixes selfie retention at 90 days.

### Q12 — Performance and health policies
**Question:** Who approves score weights, thresholds, exclusions and later changes for employee, Team Leader and project health scores?
**Why:** Formula choices affect evaluation and trust; historical scores must remain explainable.
**A:** Owner-approved versioned policies, effective prospectively; recalculate history only by explicit decision.
**B:** Team Leaders can independently alter weights for their teams.
**Initial technical recommendation:** A. Exact formulas and thresholds are required before S23, not before foundation.
**Owner answer (2026-09-25):** A — Owner-approved versioned policies; exact score weights/thresholds remain open.

### Q13 — External file size and access
**Question:** Must clients/consultants/vendors upload or download large CAD/BIM/video files remotely, or will the largest files stay on the office LAN?
**Why:** Determines portal transfer design and whether Cloudflare's 100 MB request cap needs chunked uploads immediately.
**A:** Remote large-file transfer is required; implement resumable chunks before portal launch.
**B:** Remote portal handles previews/smaller files; large source files use controlled LAN transfer initially.
**Initial technical recommendation:** A if external consultants/factory must exchange source files; validate with representative file sizes.
**Owner answer (2026-09-25):** Custom — Clients receive PDFs/images only. Vendors may download CAD through NAS sharing capabilities; exact controlled workflow remains open.

### Q14 — Client and lead ownership across branches
**Question:** Can one client have projects in multiple branches, and who may see the shared contact record?
**Why:** Determines CRM uniqueness, client invitations and cross-branch contact privacy.
**A:** One organization-wide client identity linked to branch-owned leads/projects, with scoped contact visibility.
**B:** Separate client records per branch.
**Initial technical recommendation:** A to avoid duplicate client identities, while authorizing each project and contact view independently.
**Owner answer (2026-09-25):** A — Organization-wide Client identity, branch-owned leads/projects, permission-scoped contact view.

### Q15 — Cross-branch assignment authority
**Question:** Who may grant an employee access to a project owned by another branch?
**Why:** The grant exposes project work and files, so it must have a clear accountable approver.
**A:** Owner only; strongest central control, but slower for routine staffing.
**B:** Owner or an explicitly authorized Team Leader of the project's owning branch; faster, with a recorded grant and audit.
**Initial technical recommendation:** B, with the Owner able to revoke any grant.
**Owner answer (2026-09-25):** A — Only the Owner grants cross-branch project access; grant and revocation are audited.

## Already resolved by the owner

- C-001: Organization → Branch → Team → Employee; no separate Brand model or Department tier. One owning branch per project.
- D2: Employees may work across branches when explicitly assigned; C-002 Q15 makes the Owner the only grant authority.
- D3: Existing resource is a MINISFORUM NAS with 8 GB RAM and MinisCloud OS, plus a domain. Exact N5 Air model confirmation is pending; deployment must be load-tested and must not run local AI on this 8 GB baseline.
