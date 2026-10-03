# UI Specification v1 — review draft

Date: 2026-10-01 (Asia/Kolkata). Status: DESIGN REVIEW; NOT FROZEN; no broad UI implementation authorization is implied.

Owner update: the compact UX_WORKFLOW_PLAN.md is now the behavioural review entry point, followed by the mockups and screen contracts. This document remains supporting draft detail; it is not a separate large UX specification or additional approval stage. Do not duplicate approved business rules here.

## Authority and scope

Owner-confirmed choices: clean studio visual direction; desktop/mobile equally supported; My Work is everyone's default landing page; Needs your attention precedes the personal task list. Owner-approved design sequence: shell → complete My Work → Project Workspace → Task Detail and Review/Correction together → component system → resolve choices using mockups → freeze v1 before broad implementation.

This package designs the existing S01–S13 internal work journey. It does not change workflow, access, ownership, dates, review independence, evidence or approval rules. Source hierarchy: current Owner instructions, requirements/APPROVED_REQUIREMENTS.md with C-001–C-024, approved decisions, current slice specifications, then implementation. R-series references below are requirement sections, not drawing revision identifiers.

Current source documents record S14 COMPLETE for authorized development/local staging; earlier unauthorized/foundation-only descriptions are historical. This internal design package does not redesign the completed S14 portal or change CR workflows. Portal presentation receives a separate contract against S14_REVIEW_CONTRACT.md and S14_COMPLETION_REPORT.md. S15–S27 implementation remains excluded.

Deliverables: this specification, SCREEN_CONTRACTS.md, standalone mockups.html with fictional data, and REVIEW_AND_VERIFICATION.md. Application code, schema, dependencies and real data stay unchanged.

## Proposed presentation slices and requirement mapping

| Design slice | Requirements/addenda | Boundary | Dependencies |
| --- | --- | --- | --- |
| UI-D01 Shell | R-004–R-009, R-071–R-072, R-099; C-001/C-002 | Internal navigation, responsive header/sidebar/bottom navigation, security handoff | IDN, ACC, ORG |
| UI-D02 My Work | R-018–R-029, R-058, R-096–R-097; C-023/C-024 | Personal tasks and authorized actionable records; no scoring or broad S24 dashboard | TSK, REV, APR, NTF |
| UI-D03 Project Workspace | R-011–R-017, R-018–R-039; C-010/C-011/C-016/C-024 | Overview, Tasks, Reviews, Documents; planned Plan/People/History destinations | PRJ, TMP, TSK, REV, DOC |
| UI-D04 Task + review/correction | R-018–R-030, R-037; C-023 | Exact submission, independent review, retained corrections/history and existing guarded commands | TSK, REV, DOC, APR |
| UI-D05 Components and acceptance | R-006, R-039, R-079–R-080, R-092, R-099–R-102 | Derived presentation patterns, accessibility and screen acceptance | UI-D01–D04 |

These are design-package identifiers, not new authorized S-series product slices. Before application implementation, expand applicable multi-clause requirements into implementation sub-IDs and associate the bounded increment with the existing owning slice. No schema/migration design is part of this package.

## Shell

Desktop (proposed ≥1024px): 224px sidebar; flexible content; 64px header; 24px content inset. Intermediate widths 768–1023px: compact rail with accessible labels and an expand control, or drawer where content requires width. Mobile <768px: header plus four destinations My Work, Projects, Decisions, More. Use one browser-level scroll; production bottom navigation accounts for safe-area inset and never covers actions.

Sidebar order: My Work, Projects, Leads & Clients, Decisions, Documents, People, Administration. Notifications and profile live in the header. The prototype's not-yet-designed destinations explicitly explain that their screen design is outside this package; production hides inaccessible destinations and never ships inert links.

Organization → Branch → Team → Employee is the only organization hierarchy. A branch or project filter narrows authorized results; it cannot grant access. Counts, autocomplete, record labels, links and empty states must be permission-filtered. No branch selector is needed in the first prototype; projects show their owning branch explicitly.

My Work remains the default after ordinary sign-in. Deep links survive authentication and return to the requested permitted record. Back navigation restores list filters and scroll. Proposed routes are presentation contracts, not existing API claims: /work, /projects, /projects/:id/{overview,tasks,reviews,documents}, /tasks/:id, /tasks/:id/review. Preserve existing /documents, /revisions and /reviews deep links through compatible destinations when implementation is authorized.

## My Work semantics

Show Needs your attention first, then Your tasks. Personal work includes own primary-owner and explicit collaborator work; management/organization task scope is separately labelled and is not substituted for an Owner's personal task list. An Owner without an employee identity may have no personal tasks and still receive authorized decisions.

Attention is a projection of existing actionable records: assigned pending decisions, own named review rounds, assigned correction work and scoped employee-exit reassignment/project-lead replacement. Each has stable source identity, a plain-language reason and a destination. Never treat unread notification as an unfinished action, and never fabricate a decision count from a partial page. A task can appear once in the task list and in attention for a distinct pending action; duplicate attention records use the source request/round/operation ID for deduplication.

No inferred priority ranking, automatic escalation or new notification scheduling is introduced. Initial attention groups use fixed readable labels and source chronological order; ordering may be changed during review. Generic waiting work belongs in the waiting task filter, not automatically in a manager's action queue.

Task filters: Active (default), Approaching, Waiting, Review & correction, Completed. Active excludes completed and stopped delivery work. Completed preserves history; stopped records remain available through project/history access, not active capacity or reminders. Review & correction groups existing review states and correction task type without rewriting the source status.

Approaching is an explicit date-range filter with labelled date basis (Committed due or Target). The demonstration uses committed due dates 1–7 October 2026; it is not a new overdue/reminder policy. No committed date is displayed as Not committed and is not substituted silently with target date. Dates use the configured organization timezone, initially Asia/Kolkata. Do not derive approved overdue state differently from the source rules.

Search/filter scope is explicit. Demonstration filters a small complete fixture. Production must use authorized server filtering/pagination, or clearly state that a filter only searches loaded records. Page changes preserve filters; counters require an authorized complete count. No fake totals or partial-page percentages.

## Project Workspace

Persistent project header: name, owning branch, delivery type, lifecycle, named Project Lead, permitted actions. Overview prioritizes baseline/service scopes, applied template/stage/milestones and authorized delivery items. It does not show a predictive health score, invented progress percentage or employee ranking. Unknown/inaccessible data is omitted or explicitly unavailable, never presented as zero.

Tasks, Reviews and Documents stay under this header. The same record components appear in personal/global/project context. Project lists are read models of the owning domains, not separate workflow truth.

On Hold shows recorded reason and permitted resume path; exited-lead holds require Owner replacement. Cancellation remains Owner-only and terminal; stopped delivery remains stopped. Closeout is separately approved work and never reopens cancelled delivery. Completed/archived project read-only behaviour follows actual command capabilities, not a blanket status assumption.

Documents keeps folders, files, drawing revisions and issue state distinct. Current approved revision is not necessarily most recent upload. A working R2 does not displace approved R1. Superseded R0 is labelled Superseded—Do Not Use. A submitted revision and a reviewed decision bind an exact file/revision; the prototype uses different drawings for submitted and approved examples to avoid contradictory evidence.

## Task Detail and review/correction

One consistent task identity spans detail, submission and review. Show title, status, owner, collaborators, target date, committed due date, checklist, dependencies, waiting cause, previous-state/resume information, immutable changes and linked review/correction tasks.

Present next eligible action from current server capability and state, not a generic state dropdown. Reviewer assignment, submission, start, comment, decision, correction assignment, completion, escalation and withdrawal use REV commands. Target/committed-date change, waiting/resume, reassignment, extension and dependency management keep their TSK commands and reasons.

Review evidence includes reviewer, submitter, task snapshot/version, round, exact drawing revision/file, annotations/markup, decision and related correction task. Decision must never silently switch to the latest uploaded file. Reviewer cannot be submitter/current owner; other rights require separate capability. Historical severity/category names survive configuration changes.

Do not approve from attention tiles or lists: open full evidence first. A correction decision collects category, severity, reason and any required comment/evidence. Assignment is a separately permissioned action; correction completion does not approve the parent submission. Revised submission creates a retained new round. Version conflict requires refresh and re-evaluation, with unsaved text preserved; do not auto-repeat a stale approval.

## Derived visual and component system

Initial palette: background #F6F4EF, surface #FFFFFF, ink #24312C, primary forest #245847, secondary text #56665D, divider #DCDDD5. Semantic amber/red/green need AA contrast checks and visible state labels. White on primary forest and ink on background are provisional pairings to verify. Keep neutral backgrounds; no decorative charts.

Typography: local system sans-serif; base 16px mobile and 14–16px desktop; labels ≥12px; clear 24–28px page heading. Body line-height ~1.5. No purchased or external font dependency. Spacing scale 4/8/12/16/24/32; controls ≥44px effective mobile touch targets. Border radius 8px controls/12px bounded surfaces. No essential hover-only controls; focus remains visible. Respect reduced motion.

Components derived from mockups: ApplicationShell, Sidebar, MobileNavigation, PageHeader, ProjectHeader, ProjectTabs, AttentionList/Item, TaskFilterBar, TaskRow/Card, DatePair, StatusLabel, ReadOnlyNotice, SectionSkeleton, EmptyState, SectionError/Retry, DetailFacts, ReasonForm, CapabilityAction, EvidenceHeader, ReviewRoundTimeline, CorrectionLink, DocumentRow, RevisionState, Dialog and Toast/Status.

Contracts: one primary action per immediate decision group; icon-only controls have names; native semantic fields/buttons; no colour-only status; server capability is the source for writes. Skeleton announces loading without invented counts. Section errors preserve healthy sections. Dialog traps focus and returns it to trigger; errors use alert, nonurgent result uses status. Refresh never wipes valid form input. Persist preferences only after a separately reviewed persistence boundary; prototype toggles are session-local.

## Four choices to resolve with mockups

| Choice | Concrete comparison | Recommendation for Owner review | Freeze evidence |
| --- | --- | --- | --- |
| Task information/density | Comfortable vs Compact; same owner/status/priority/date identity | Comfortable default; compact desktop optional | Owner selection against desktop and mobile previews |
| Task board | List vs informational board with same fixture | List for v1; defer board implementation unless it improves actual task use | Owner selection; no drag-and-drop transition implied |
| Global Documents | Sidebar document entry vs project Documents tab | Sidebar opens permitted project picker → Project Documents first; cross-project register conditional | Owner selection; complete cross-project read model reviewed before any register implementation |
| Palette/typeface | Real screens in provisional cream/forest/system sans | Adopt displayed palette/system font | Owner review; contrast verification before implementation |

Recommendations are not approval. The project-picker fallback keeps global navigation without inventing a file register. The mockup's cross-project register remains an alternative proposal: current DOC reads are project-scoped and it requires an explicitly reviewed authorized read model. No parallel confidential index is allowed. UI_DELIVERY_PLAN.md maps field/action sources, research disposition, read-model dependencies and bounded build order; DESIGN_REVIEW_WORKSHEET.md records the remaining concrete review.

## Implementation gaps and exclusions

Existing data sources: TSK setup/list/detail/capabilities; PRJ list/detail/applied plan; REV inbox/task rounds/capabilities; DOC project folders/files/grants; revision register/issue records; APR pending queue; NTF inbox. Use current source contracts and owning services; do not scrape UI panels or join inaccessible data in the browser.

Gaps to review before production: unified personal-work composition for Owner accounts without an employee record; complete cross-module attention deduplication/counts; server-side task search/project/date/state filtering beyond current pagination; project-scoped review list instead of assuming the personal review inbox is a full project register; cross-project document register; reusable routing/deep-link shell. These may require API read changes but are not authorized by a visual mockup. Unknown totals remain unavailable.

Explicit exclusions: new role powers; schema/migrations; production persistence; broad S24 analytics/health/scoring/summaries; offline sync; site/workforce/CRM/admin redesign implementation; external file sharing/client approval; public gallery/CAD links; automated assignment; new business workflow or audit semantics.

## Review and freeze gate

1. Review desktop/mobile shell and My Work states, then Project Overview/Tasks/Reviews/Documents, then Task Detail and Review/Correction as one journey.
2. Select the four concrete design choices. Record decision date and Owner wording; modify mockups/contracts to match.
3. Confirm every major core screen's purpose, access, data, actions, layout, states and acceptance scenarios in SCREEN_CONTRACTS.md. Resolve material product ambiguity using approved sources or Owner decision.
4. Verify final mockups at 320, 390, 768, 1024 and 1440px, keyboard flows, date labels, state controls, links and contradiction-free revision evidence. This verifies mockups only, not real application permissions/persistence.
5. Mark FROZEN — OWNER-APPROVED only after the Owner accepts this concrete package and choices. Preserve revision/date; subsequent changes get a change entry. Before freeze, no broad UI implementation starts.
6. Execute bounded authorized UI increments in the agreed order, each with source mapping, backend/access review, actual acceptance tests and required quality gates. CRM, decisions, people and administration receive their own detailed contracts before their implementation begins.

## Acceptance and verification limits

Mockup acceptance covers navigation, layouts, filter/density/board comparison, connected journey, states, readability and markup/runtime checks. Real implementation acceptance additionally requires backend permission denial and grant revocation, branch isolation/ID tampering, exact evidence preservation, concurrency, real persistence and audit/events, responsive critical journeys, typecheck/lint/build and appropriate tests. pnpm verify is required for application changes when that stage is authorized; it is not claimed for this design-only package.

Design routing: primary Sol-level agent owns requirements/access/contracts and final review; GPT-6 Luna builds the bounded standalone mockup. Review evidence and limitations are recorded separately.
