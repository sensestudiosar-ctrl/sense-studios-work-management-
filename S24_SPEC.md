# S24 — Dashboards, summaries and reports

Status: COMPLETE for Owner-authorized development/local staging, 2026-10-05. Final evidence and independent acceptance are recorded in S24_COMPLETION_REPORT.md and S24_ACCEPTANCE_REVIEW.md. This authorization supersedes older S24-unauthorized status only. S18 remains unresolved/excluded; S25–S27 remain unauthorized. Actual routing: exact GPT-6.1 Sol intake/design/permissions/schema/acceptance; exact GPT-6 Luna bounded UI and exporter implementation.

## Owner decisions

The Owner instructed starting and finishing S24 using Sol/Luna, and approved all three clarified boundaries: Owner-only organization reminder/escalation/summary schedule configuration and frozen-report finalization/corrections; explicitly unavailable S18 Skills/Training/Development sources; explicit configured mandatory/critical/escalation policies without seeded numeric or recipient defaults. Ordinary readers/generators/exporters retain existing domain permissions. Personal reminders belong only to their creator. No action center, dashboard, summary or report grants new approval authority.

## Requirements and boundary

- R-058.a–c: reuse the accepted S04 in-app/email preference, quiet-hours, mandatory/critical, verified mailbox, current-recipient reauthorization and deduplicated delivery foundation. Add relevant configured S24 notices; mobile push remains the accepted later-channel boundary.
- R-059.a: explicitly configured task reminder offsets and priority/project filters; overdue excludes Completed and cancellation-Stopped tasks. No example cadence is adopted as policy.
- R-059.b: explicitly configured escalation audience; current domain/reporting scope must permit every notified source. Configuration cannot create project or employee access.
- R-059.c: persistent personal reminders, creator-only read and delivery.
- R-060.a: morning summary shows today/priority/due/review/waiting work.
- R-060.b: evening summary shows completed/outstanding work, factual logged time, issues and tomorrow plan; absent evidence is unavailable.
- R-060.c–e: weekly employee/scoped manager, monthly accepted performance/development, and Owner organization summaries using explicitly configured local timezone/cadence and immutable generation receipts.
- R-073.a–e: Owner, scoped Team Leader, employee, existing isolated Client and assigned Site dashboard contexts. Visibility is derived from current permissions and source read ports, never titles. Owner attention prioritizes pending decisions, critical work, health/performance, workload, risks and blockers. Skills/training are explicitly unavailable under excluded S18.
- R-074.a–b: aggregate existing typed pending approval decisions and links to owning workflow; preserve handler canView/canDecide, requester independence and exact source authority.
- R-077.a: operational Project, Employee, Team Leader, Time, Attendance, Quality, Documents, Skills/Training report categories. Every required clause maps to actual persisted source values or an explicit unavailable source/metric status; no new invented score/progress calculation.
- R-077.b: explicit date filters and field projections retain one owning Branch/project assignment, employee report-tree scope and Confidential/exact-revision access.
- R-077.c: genuine PDF, XLSX, CSV and printable HTML exports, safe literal spreadsheet cells, escaped print content and readable paginated PDF.
- R-077.d/R-080.b: Owner-finalized weekly/monthly snapshots store exact values, filters, generation time and source manifest; later source edits do not redraw historical values. Corrections append linked snapshots with reasons. Current source access must be rechecked on read/export, including replay; permission loss never revives access to frozen evidence.
- Cross-cutting R-006/R-092/R-079/R-080/R-095 and C-001/C-011/C-023/C-024: current internal identity/session, backend scope, audit/events, cancellation/exit preservation, atomic idempotent persistence and safe outputs.

Dependencies: accepted S04/S05/S23 plus implemented source modules S03/S07–S17/S19–S22. S18 absence is explicit and does not authorize integration. Out of scope: custom report builder S26, external integrations S25, AI S27, new business workflows/approval authority, accounting duplication, mobile push, production deployment and actual-project R-105.

## Source ports and implementation

Read aggregation calls public owning services: TaskService.list/detail/assertTaskReadInTransaction; ApprovalService.attention/canReadEvidence; TimeService.list with an explicit report-all option retaining each entry's scope; WorkforceService.list/setup; PerformanceService.context/employee/project; ProjectService.reportContext; ReviewService.detail; managed ClientReviewService.projectDetail; RevisionService.list/canReadRevisionEvidence; DocumentService.authorizeFile; SiteService.projects/detail; TurnkeyService.detail; existing separate client portal scope/review/gallery ports for client context. Dashboard and report code owns no business-source mutations. Source field and API clauses are mapped in S24_API_CONTRACT.md.

DASH/RPT own read composition, frozen snapshot/command identity and source manifest. NTF owns schedule configuration, personal reminder identity, generated slot receipts, inbox/email. Schedule generation uses current singleton organization and eligible active recipients. Slot identity deduplicates concurrent workers and restarts; source changes or timezone changes cannot replay a committed slot as a different result. Failure must remain visible and must not log report bodies or credentials.

## Acceptance and preservation

1. Forward additive schema deploys to fresh dedicated targets and a populated retained S23 clone. Explicit exact-target guards reject system databases, wrong source/clone or accidental fallback. All 137 original-table column/count/digest snapshots and 15,474 retained rows remain unchanged.
2. Real PostgreSQL API regressions verify Owner/scoped manager/self/client/site fields, other employee/project/Branch ID tampering, Confidential and current source access, revocation/session-after-wait, immutable/corrective snapshots and no workflow approval bypass.
3. Generation/filtering tests verify factual period rows, unavailable S18/metrics, cancelled/Completed reminder exclusions, local day/time and DST semantics, explicit policies, slot dedupe/concurrent worker/replay, optional preferences/quiet hours, mandatory/critical flags and delivery authorization after access loss.
4. Export verification parses generated PDF/XLSX/CSV/HTML; Unicode, long rows, paging, spreadsheet formula defense and HTML escaping preserve evidence. Download response is authenticated, no-store, with fixed safe filename/content type.
5. Desktop/mobile browser journeys persist and refresh dashboard/report/snapshot/personal-reminder/rule workflows, check denied role controls, downloads and prior-snapshot stability after source edits; capture final current states for Sol visual review.
6. Required pinned Node 24.19.0/pnpm 11.19.0 frozen install, Prisma validate/generate/migration status, full single pnpm verify including typecheck/lint/unit/API/PostgreSQL/build/desktop-mobile gates, preservation and Sol source/security/visual acceptance pass. Actual commands/results and earlier failures are recorded; unrun checks are not claimed.

Production hosted CI/NAS/Brevo/offsite key custody/restore and actual-project R-105 remain separate gates. S22's unintended local postgres migration is preserved and is not cleaned up here.
