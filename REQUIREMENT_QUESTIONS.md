# Requirement questions requiring owner decisions

These are product decisions left open by the approved source. The owner's newer instructions already resolve two points: use branches rather than brands; every project belongs to one branch, and employees may participate across branches through explicit assignment. Questions are grouped by when their answers are needed. Proposed architecture remains subject to owner approval.

## Before foundation and first Design-project checkpoint

### Q1 — Branch membership and authority
**Question:** Does each employee have one home branch, and who may grant a cross-branch project assignment?
**Why:** Determines membership tables, list visibility, and who can expose work across branches.
**A:** One home branch; Owner or authorized owning-branch Team Lead grants audited project-specific access.
**B:** Employees may belong to multiple branches and access all projects in each.
**Technical recommendation:** A. It preserves a clear home branch and limits cross-branch access to explicit projects.

### Q2 — Project branch transfer
**Question:** Can an existing project change its owning branch after creation?
**Why:** Changes ownership, permissions, reports, numbering and NAS paths.
**A:** No transfer; create a new project or keep the original branch.
**B:** Formal Owner-approved transfer with history and access recalculation.
**Technical recommendation:** B only if the business needs transfers; otherwise A for the first release. Never edit branch_id silently.

### Q3 — Public ingress and Cloudflare
**Question:** May the app use a Cloudflare Tunnel on your existing domain to reach the NAS-hosted app, with Cloudflare handling public HTTPS traffic?
**Why:** Avoids router port forwarding and works with some ISP setups, but places an external provider in the traffic path and Free uploads have a 100 MB per-request limit.
**A:** Use Tunnel; implement chunked/resumable large uploads and retain app-level authentication.
**B:** Self-host public HTTPS ingress with a routable public IP, maintained firewall/certificates and no exposed NAS services.
**Technical recommendation:** A for lowest cost and simpler perimeter, subject to owner acceptance and realistic file-transfer tests.

### Q4 — Cost/BOQ visibility
**Question:** Who may view Turnkey BOQ pricing and cost approvals in this app?
**Why:** The workflow requires cost approval, while normal employees must not see financial metrics.
**A:** Owner and explicitly granted Team Leaders/clients see approved cost views; staff see operational quantities/status only.
**B:** Broader project staff visibility.
**Technical recommendation:** A, with field-level API authorization and separate operational versus price data.

### Q5 — Client approval delegation
**Question:** Can the Primary Client delegate final overall approval, or only approval of specified items?
**Why:** Determines signature authority and immutable evidence.
**A:** Item-level delegation only; Primary Client retains final overall approval.
**B:** Explicit time-limited delegation may include final overall approval.
**Technical recommendation:** A initially; it is simpler to audit and matches the stated default.

### Q6 — Project and task transition details
**Question:** May a project move Active → Completed directly and On Hold → Active, and may a task enter/leave Waiting from any active state?
**Why:** Displayed state sequences could be interpreted as mandatory steps, which would create unnecessary blocks or lost review history.
**A:** Treat Hold and Waiting as optional reversible states with reason/history; required reviews still gate completion.
**B:** Require strictly sequential states.
**Technical recommendation:** A. Write a precise transition matrix before implementing S07/S09.

### Q7 — Document revision numbering
**Question:** Is CR1 a separate client-request series for the same document, and which revision becomes current after a CR approval?
**Why:** Affects uniqueness, drawing registers, client approval references and transmittals.
**A:** R and CR are distinct reason/issue series, each exact version ID; a single approved current version is designated.
**B:** CR is only a request label and all issued files use the R sequence.
**Technical recommendation:** A if the firm uses CR numbers on deliverables; otherwise B. Confirm the drawing convention before S12.

### Q8 — Retention and deletion
**Question:** What retention period applies to client approvals, issued drawings, audit, attendance photos/selfies and exited-employee records?
**Why:** Sets archive/soft-delete rules, storage cost and privacy behavior.
**A:** Retain business evidence indefinitely until a later documented policy; set shorter privacy retention for site selfies.
**B:** Specify fixed periods now by data category.
**Technical recommendation:** B before production, with legal/business advice where needed; never hard-delete protected evidence without policy.

## Before workforce, site and analytics releases

### Q9 — Time-log lock and export
**Question:** When does a time entry become locked, and can a corrected entry be re-exported to accounting?
**Why:** Avoids inconsistent time totals and duplicate accounting records.
**A:** Lock after manager approval/export; corrections create adjusted versions and idempotent re-export.
**B:** Allow free edits until a periodic cutoff.
**Technical recommendation:** A.

### Q10 — Leave and work-from-home policy
**Question:** Does Work from Home consume a leave balance or only change attendance/location, and what are accrual/carry-forward rules?
**Why:** Affects balances, capacity, attendance and approval routing.
**A:** WFH is an attendance/schedule request, not leave consumption; leave types have explicit balance policy.
**B:** WFH uses a leave allocation.
**Technical recommendation:** A, with firm-specific leave accrual rules supplied before S17.

### Q11 — Site attendance evidence
**Question:** How should location + QR + selfie be handled if the device lacks permission or connectivity?
**Why:** A hard failure can block legitimate on-site work; weak fallback can enable false attendance.
**A:** Allow a provisional check-in with reason and manager review; retain evidence under a defined privacy period.
**B:** Reject check-in until all evidence is captured online.
**Technical recommendation:** A with clear audit and an exception queue.

### Q12 — Performance and health policies
**Question:** Who approves score weights, thresholds, exclusions and later changes for employee, Team Leader and project health scores?
**Why:** Formula choices affect evaluation and trust; historical scores must remain explainable.
**A:** Owner-approved versioned policies, effective prospectively; recalculate history only by explicit decision.
**B:** Team Leaders can independently alter weights for their teams.
**Technical recommendation:** A. Exact formulas and thresholds are required before S23, not before foundation.

### Q13 — External file size and access
**Question:** Must clients/consultants/vendors upload or download large CAD/BIM/video files remotely, or will the largest files stay on the office LAN?
**Why:** Determines portal transfer design and whether Cloudflare's 100 MB request cap needs chunked uploads immediately.
**A:** Remote large-file transfer is required; implement resumable chunks before portal launch.
**B:** Remote portal handles previews/smaller files; large source files use controlled LAN transfer initially.
**Technical recommendation:** A if external consultants/factory must exchange source files; validate with representative file sizes.

### Q14 — Client and lead ownership across branches
**Question:** Can one client have projects in multiple branches, and who may see the shared contact record?
**Why:** Determines CRM uniqueness, client invitations and cross-branch contact privacy.
**A:** One organization-wide client identity linked to branch-owned leads/projects, with scoped contact visibility.
**B:** Separate client records per branch.
**Technical recommendation:** A to avoid duplicate client identities, while authorizing each project and contact view independently.

## Already resolved by the owner

- D1: Replace the source's brand terminology with branch. Each project has exactly one owning branch.
- D2: Employees may work across branches when explicitly assigned.
- D3: Existing resource is a MINISFORUM NAS with 8 GB RAM and MinisCloud OS, plus a domain. Exact N5 Air model confirmation is pending; deployment must be load-tested and must not run local AI on this 8 GB baseline.
