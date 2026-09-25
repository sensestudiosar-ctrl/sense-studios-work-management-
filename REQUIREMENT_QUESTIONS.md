# Owner decision register and open policy details

This preserves the original Q1–Q15 interview options and answers. C-001 fixes the Branch-only hierarchy; C-002 answers Q1–Q15; C-003 through C-020 record the later approved retention, leave, scoring, CAD sharing, backup, sign-in, notification and project-cancellation decisions. The original numbered questions are answered. New material owner questions discovered during consistency review are listed below. Final architecture and S01 remain subject to explicit owner approval.

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
**Owner answer (2026-09-25):** B — C-003 fixes 10 years for approvals/drawings/audit, 7 years after exit for employee records and 90 days for site selfies. C-009 fixes the clock anchors and scheduled expiry with advance Owner notice and documented holds. Legal/contract review remains a production gate.

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
**Owner answer (2026-09-25):** A — Work from Home changes attendance/schedule, not leave balance. C-004 fixes the leave year, upfront credit, Branch-specific Owner-configured allowance, calendar-day proration, five-day carry-forward cap and expiry; actual Branch allowance values are Owner setup data before S17.

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
**Owner answer (2026-09-25):** A — Owner-approved versioned policies. C-005 fixes role-group employee formulas, separate Design/Turnkey project-health formulas and no score until the Owner enters and approves initial weights. Numerical weights/thresholds are Owner setup data before S23.

### Q13 — External file size and access
**Question:** Must clients/consultants/vendors upload or download large CAD/BIM/video files remotely, or will the largest files stay on the office LAN?
**Why:** Determines portal transfer design and whether Cloudflare's 100 MB request cap needs chunked uploads immediately.
**A:** Remote large-file transfer is required; implement resumable chunks before portal launch.
**B:** Remote portal handles previews/smaller files; large source files use controlled LAN transfer initially.
**Initial technical recommendation:** A if external consultants/factory must exchange source files; validate with representative file sizes.
**Owner answer (2026-09-25):** Custom — Clients receive PDFs/images only. C-006 permits assigned vendors and consultants to receive Owner-issued, file-specific native MinisCloud CAD links with seven-day expiry, extraction code, app record and cancellation when access ends.

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

## New material owner decisions after the original interview

### OD-01 — Project cancellation authority (RESOLVED)
**Product/business decision for the Owner:** Who may cancel a Draft, Active or On Hold project? The source calls Cancelled a terminal state and requires a reason, but does not name the cancelling authority. For example, if a client abandons an interior-design project after measurement, this determines who can close it as Cancelled.
**A:** Owner only; Project Leads/Team Leaders can request cancellation. Strongest control, but Owner action may delay closure.
**B:** Owner or the assigned Project Lead/authorized Team Leader. Faster operations, but a project can be terminated without Owner review.
**Technical recommendation:** A, because cancellation affects tasks, client access, reporting and retention. Engineering can safely make Cancelled terminal, preserve all history, and require reason/audit; it cannot choose business authority for the Owner.
**Owner answer (2026-09-25):** A — Only the Owner may cancel a Draft, Active or On Hold project; Project Leads/Team Leaders may request it. Reason, actor/time and history are retained (C-010).

### OD-02 — Unfinished tasks when a project is cancelled (RESOLVED)
**Product/business decision for the Owner:** When the Owner cancels a project, what happens to its unfinished tasks? For example, a client cancels a home renovation while drawings and a site checklist are still assigned.
**A:** Mark unfinished delivery tasks Stopped due to project cancellation, retaining their work/time/review history. If cleanup is needed, create separate closeout tasks still linked to the cancelled project without reopening delivery. Active delivery lists stay clean, but closeout work must be added explicitly.
**B:** Keep unfinished project tasks active until the Owner closes them one by one. Existing assignments remain available, but reminders and workload may continue under a terminal Cancelled project.
**Technical recommendation:** A, because a terminal project should not carry active delivery work or misleading overdue alerts. Engineering can preserve task history and make the transition atomic; only the Owner can decide the business behavior.
**Owner answer (2026-09-25):** A — Stop unfinished delivery tasks when the Owner cancels the project, retain their history, and permit separately identified closeout tasks linked to the Cancelled project without reopening delivery (C-011).

### OD-03 — Vendor and consultant access after project cancellation (RESOLVED)
**Product/business decision for the Owner:** When a project is cancelled, should assigned vendors and consultants lose access to that project's files and work immediately? For example, a fit-out client cancels while a factory still has a seven-day CAD download link.
**A:** End their project access when cancellation takes effect. The Owner cancels any active native MinisCloud links as part of the cancellation process. This limits further access, but any legitimate return or cleanup work needs a new, separately approved closeout arrangement.
**B:** The Owner may keep vendor/consultant access for a specified closeout period. This helps them finish returns or handover, but cancelled-project files remain accessible for longer and need a clear end date and review.
**Technical recommendation:** A. Cancellation is a clear access boundary and C-006 already requires native links to be cancelled when recipient access ends. Engineering can revoke app access and track link cancellation, but the business timing is for the Owner to decide. Native MinisCloud revocation must be confirmed; the app cannot assume a working automation interface.
**Owner answer (2026-09-25):** A — Vendor and consultant project access ends when the Owner's cancellation takes effect. The Owner cancels active native MinisCloud CAD links as part of that process; later closeout access requires a separate approved arrangement (C-012).

### OD-04 — Client portal access after project cancellation (RESOLVED)
**Product/business decision for the Owner:** After the Owner cancels a project, what may that project's client still see in the app? For example, a homeowner may need a PDF drawing already issued before the interior-design project was cancelled.
**A:** Keep read-only access to PDFs/images already formally issued to that client and their own approval history. Stop new reviews, comments and approvals; do not expose drafts or internal records. This helps the client retrieve records, but the firm must continue securing that limited access.
**B:** End all client portal access to the cancelled project immediately. This creates a clear cutoff, but the Owner must arrange a separate controlled way to provide records the client is entitled to receive.
**Technical recommendation:** A, because it preserves a usable record of what was actually delivered while preventing new project decisions. Engineering can enforce read-only, exact-item access and existing revocation rules; whether any access remains is the Owner's business decision.
**Owner answer (2026-09-25):** A — After cancellation, clients retain read-only access to PDFs/images already formally issued to them and their own approval history. New reviews, comments and approvals stop; drafts and internal records stay hidden (C-013).

### OD-05 — Duration of cancelled-project client access (RESOLVED)
**Product/business decision for the Owner:** How long should a client retain that limited read-only access after cancellation? For example, a homeowner might return months later for an issued PDF drawing.
**A:** Keep access until the Owner explicitly revokes it or the record reaches its approved retention/deletion date. The client can retrieve issued records later, but the firm must keep the account and permissions secure for longer.
**B:** End access automatically after a fixed period chosen by the Owner, with an Owner-approved extension if needed. This limits long-term exposure, but the client may need to request records again after expiry and the firm must administer extensions.
**Technical recommendation:** A for a small firm, because it avoids an arbitrary cutoff on issued records while preserving Owner revocation and the approved retention/deletion rules. Engineering can enforce secure login, exact-item scope and revocation; the access duration is a business decision.
**Owner answer (2026-09-25):** B — Limited read-only client access ends automatically after a fixed period, with an Owner-approved extension if needed. OD-06 was later clarified as separate Owner-set end dates for each client project grant (C-015).

### OD-06 — Length of cancelled-project client access (RESOLVED — CUSTOM)
**Product/business decision for the Owner:** What fixed period should clients have to retrieve already issued PDFs/images and their own approval history after the project is cancelled? The clock begins when cancellation takes effect, not when someone first requests cancellation.
**Historical options offered (not selected):**
**A:** 12 months. Gives clients a full year to retrieve design records; access stays open longer and requires account protection for that year.
**B:** 90 days. Limits exposure sooner; clients renovating later may need to request an extension or ask the firm for records.
**C:** 3 years. Convenient for long renovation cycles; keeps a portal grant active much longer and increases review/security work.
**Historical technical recommendation (superseded by the Owner's custom answer):** A (12 months). It allows more time for design and construction follow-up than 90 days while still ending access automatically before the approved ten-year record-retention period. Engineering can calculate expiry, enforce it on every request, and record Owner-approved extensions; the period is the Owner's business choice.
**Owner answer (2026-09-25):** Custom — No organization-wide fixed period. The Owner sets a separate end date for each client's access to each cancelled project; invited client users may have distinct dates within their existing permissions. The date is required at cancellation and may be extended by the Owner with an audit record (C-015). The A/B/C global durations above were not selected.

### OD-07 — Who authorizes closeout work after cancellation? (RESOLVED)
**Product/business decision for the Owner:** Once a project is Cancelled, who may authorize new closeout tasks, such as returning material samples or documenting a final site condition? A Project Lead or Team Leader could request the work. This also affects whether an external vendor or consultant may be brought back for that specific closeout job.
**A:** Only the Owner authorizes closeout work and any temporary vendor/consultant access. An assigned Project Lead or Team Leader may request it and manage the approved work. Strong control and a clear audit trail, but the Owner must act for each closeout request.
**B:** An assigned Project Lead or authorized Team Leader may authorize ordinary closeout tasks and limited external portal access; the Owner still alone issues any CAD link under C-006. Faster for routine cleanup, but a cancelled project can gain new work and external access without Owner approval.
**Technical recommendation:** A, because the Owner alone cancelled the project and C-012 already requires separately approved external closeout access. Engineering can enforce narrow task scope, expiry and audit after authority is chosen; it cannot choose who may restart work on a cancelled project.
**Owner answer (2026-09-25):** B — The assigned Project Lead or an explicitly authorized Team Leader may approve ordinary closeout tasks and narrow, time-limited vendor/consultant portal access after cancellation. Only the Owner may issue CAD links, and Owner-only cross-branch grants and other protected approvals remain unchanged (C-016).

### OD-08 — May a lead skip sales stages? (RESOLVED)
**Product/business decision for the Owner:** When an enquiry reaches a later sales step without completing every listed earlier step, may staff move it directly to the step that really happened? For example, a returning architecture client asks for a proposal without needing a new introductory meeting. This affects the CRM pipeline, staff workload and sales reports (R-010, S06).
**A:** An authorized lead handler may move forward to a later stage with a required reason. The app records which stages were skipped and who made the change. This is faster and keeps the record truthful, but reports need to distinguish skipped steps from completed steps.
**B:** Staff must move through every stage in order, marking an unused step as not applicable with a reason. Reports have a uniform path, but staff must make extra updates for steps that did not happen.
**Technical recommendation:** A, because architecture and interior-design enquiries often enter at different points. Engineering can enforce permission, reason and audit and make reports display skipped stages accurately; the Owner must choose the sales behavior. This question does not decide whether a Won/Lost lead can later reopen.
**Owner answer (2026-09-25):** A — An authorized lead handler may move forward to the stage actually reached with a required reason. The app records skipped stages and who made the change; reports distinguish skipped steps from completed work (C-017).

### OD-09 — What if a Lost lead returns? (RESOLVED)
**Product/business decision for the Owner:** When a lead marked Lost comes back months later, should staff reopen its old sales record or create a new, linked lead? For example, a homeowner declines a renovation proposal in January but asks to restart the project in September. This affects the sales pipeline, conversion reports and history (R-010, S06).
**A:** Reopen the original Lost lead and continue from the appropriate stage. Staff see one record and less duplicate entry, but the old Lost outcome changes and historical sales reports need special handling.
**B:** Keep the old lead Lost and create a new lead linked to it. This preserves the original outcome and time-period reports; staff make a new lead record but can see the earlier discussion and proposal.
**Technical recommendation:** B, because it preserves what happened in January while showing September as a new opportunity. Engineering can link records, carry over contact details with review, and keep audit history; the Owner must choose whether returning business counts as the old or a new sales opportunity. This question concerns Lost leads only; Won-to-project history remains protected.
**Owner answer (2026-09-25):** B — Keep the old lead Lost and create a new lead linked to it when the person returns. Preserve the original loss and its reporting period (C-018).

### OD-10 — Can an active lead move back to an earlier sales stage? (RESOLVED)
**Product/business decision for the Owner:** If real discussions move backward, may staff update the lead's current stage to match? For example, a client negotiating a turnkey fit-out changes the scope, so the team must prepare a new proposal. This affects the CRM screen, follow-up work and sales-stage reports (R-010, S06). A mistaken click can always be corrected with an audited correction; this question concerns a real change in sales progress.
**A:** Permit an authorized lead handler to move an active lead to an earlier stage with a required reason. Staff see the work actually needed, but reports must show both the backward move and earlier progress rather than erasing history.
**B:** Keep active leads moving forward only; staff record renewed proposal work as an activity while the current stage stays at Negotiation. The pipeline remains simple and stable, but its current stage may no longer show the team's actual next step.
**Technical recommendation:** A, because design scope and client decisions often change during negotiation. Engineering can retain every stage change, require the reason and show stage movement honestly; the Owner must choose what the current sales stage means for operations and reporting.
**Owner answer (2026-09-25):** A — An authorized lead handler may move a nonterminal lead back to an earlier stage after a real sales change, with a required reason and preserved history (C-019).

### OD-11 — Who verifies a site snag before it closes? (RESOLVED)
**Product/business decision for the Owner:** A site worker or vendor says a snag is fixed. Who is allowed to check the result and mark it Verified before closure? For example, a joinery defect in a turnkey apartment is repaired and someone must confirm the finish is acceptable. This affects the site task list, quality record and handover (R-070, S20).
**A:** The Project Lead or authorized Team Leader names a verifier for each snag; the verifier must be someone other than the person who fixed it. The right expert can inspect each issue and responsibility is clear, but someone must assign the verifier.
**B:** The project's designated site responsible person verifies every snag. The rule is simple and consistent, but verification can stall when that person is absent or lacks the right expertise.
**C:** The person who reported the snag verifies it. They know what was wrong originally, but they may be unavailable or may not have authority to accept the completed work.
**Technical recommendation:** A, because different snags need different checks and separating the fixer from the verifier protects the quality record. Engineering can enforce the assignment, keep photo/comment evidence, and reopen a failed check; the Owner must decide who has acceptance authority.
**Owner answer (2026-09-25):** A — The assigned Project Lead or authorized Team Leader names a verifier for each snag; the verifier must be different from the person who repaired it (C-020).

### OD-12 — Who marks a verified site snag Closed? (OPEN)
**Product/business decision for the Owner:** After the named verifier confirms a repaired snag passes inspection, who makes the separate final Closed decision? For example, a joinery repair passes inspection, but the project record still needs its final closure before handover. This affects the site quality list and handover evidence (R-070, S20).
**A:** The named verifier may mark it Closed after recording a passed check. Fast and simple, but the same person handles verification and final closure.
**B:** The assigned Project Lead or explicitly authorized Team Leader marks it Closed after seeing the passed check. Adds a separate management sign-off, but can delay closure if that person is unavailable.
**C:** The app closes it automatically as soon as verification passes. No extra click, but there is no deliberate final check of records or handover readiness.
**Technical recommendation:** B, because Verified and Closed are separate steps in the approved workflow; a management check gives Closed a distinct meaning. Engineering can enforce the state order, preserve inspection evidence and record the closer; the Owner must decide the final acceptance authority.
**Owner answer:** Pending.

## Already resolved by the owner

- C-001: Organization → Branch → Team → Employee; no separate Brand model or Department tier. One owning branch per project.
- D2: Employees may work across branches when explicitly assigned; C-002 Q15 makes the Owner the only grant authority.
- D3: Existing resource is a MINISFORUM NAS with 8 GB RAM and MinisCloud OS, plus a domain. Exact N5 Air model confirmation is pending; deployment must be load-tested and must not run local AI on this 8 GB baseline.
