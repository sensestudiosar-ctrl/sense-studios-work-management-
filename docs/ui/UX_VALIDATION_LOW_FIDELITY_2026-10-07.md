> Current revision: [Refero-informed validation package](UX_REFERO_REVISION_PACKAGE_2026-10-07.md) and [capability-to-home map](UX_CAPABILITY_HOME_MAP_2026-10-07.md) supersede earlier layout descriptions. The current connected prototype uses condensed Dashboard sections and disclosed secondary widgets. S18 and bounded S27 are IN PROGRESS under current Owner direction; historical exclusion wording below is superseded. Current artifact checks are recorded in UX_REFERO_REVISION_CHECK_2026-10-07.cjs; earlier checks are historical.

# Sense Studios — low-fidelity UX validation

**Updated:** 7 October 2026. **Status:** provisional; architecture is not frozen.

[Interactive prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html) · [Slice and feature coverage](UX_VALIDATION_FEATURE_COVERAGE_2026-10-07.md)

**Owner correction: global Tasks is essential.** The prototype now exposes Tasks in desktop Work navigation, the visible Work destination strip, Dashboard/My Work links and mobile More. It has All accessible tasks, Created by me, Assigned to me, Collaborating, a prominent Create task, search, project/state filters and List/Board/Timeline views. The table names task, project/stage, state, assigned owner, original creator, target/committed dates and Open. Sample creation retains creator account ID separately from current owner employee ID and appears immediately in the relevant directory views. Project Tasks filters the same records; My Work prioritizes personal/shared action. This supersedes the earlier assumption that My Work plus project Tasks was sufficient.

Created by me is a newly requested prototype filter: production retains `createdById`, but its current query API has no creator filter. All accessible describes the authorized sample union, not a new production `all` scope. No API or business rule was changed. The five-item mobile primary navigation remains a candidate; global Tasks is now visible through the Work strip and named entry points for validation.

The recheck found omitted capabilities, inert navigation, reused project context and an incorrect revision loop. This expanded package replaces the earlier narrow representation. It uses Azure House (Design), Cedar Row Residence (Design) and Palm Courtyard (Turnkey + Site), named owners/reviewers, stages, milestones, dates, waiting causes, exact revisions and distinct approval authorities.

## What is interactive

The five connected experiences support navigation, Projects Card/List, separate Plan and Tasks, sample task creation, work filters/views and the correction loop. Supporting developed features have distinct reachable workflow representations with contextual action families, essential/advanced information and reason/history steps. These are walkthrough representations, not complete business-rule simulations. Actions change this page only; no API, persistence, file transfer, export, grant, passkey or signature is connected. Refresh resets the session.

| Journey | Walkthrough |
|---|---|
| Dashboard → My Work → Task | Open personal/shared work, filter, then open RCP. Target 6 Oct is overdue; committed extension 8 Oct is upcoming on 7 Oct. Owner team attention is not confused with personal assignment. |
| Dashboard → Project → task | Open Azure/Cedar/Palm; Tasks; exact named task. Directory compares several projects in Card or List mode. |
| Dashboard → Review/Decision → context | Cedar opens A-201; Palm Owner request routes to procurement. CP-03 awaits Primary Client and is not a staff decision. |
| Project → Documents / Reviews / Delivery | Evidence and review stay in selected project. Palm has Turnkey/Site/offline; Design projects omit Delivery. |
| Review → Correction → Resubmission | Cedar R1 / round 1 correction → Kabir task → immutable R2 / round 2 → further correction → R3 / round 3 → exact approval. Task completion is a separate action. |

## Navigation hypotheses

Desktop shows Work, People, Insights, Manage and Account groups. People and Insights remain visible for frequent Owner use. Mobile retains Dashboard / My Work / Projects / Decisions / More; More has named destinations. Primary Client, delegate, Consultant, Vendor, Factory and Public Visitor examples use separate scoped representations. These illustrate sample assignments/grants, not a new authorization policy.

## Owner validation table

| UX ISSUE | CURRENT / PROPOSED SOLUTION | SCREEN | WHY | OWNER DECISION NEEDED? |
|---|---|---|---|---|
| Global Tasks was missing despite the existing developed Tasks route. | Add a visible Tasks destination with All accessible, Created by me, Assigned to me, Collaborating and Create task. Keep creator distinct from current owner. | Desktop Work / Tasks / mobile Work strip | Owners need to track work they created across projects, including tasks assigned to others. | Owner explicitly requested it; validate mobile prominence and view labels. |
| Cannot compare projects. | Working Card/List directory with selected-project entry. | Projects | Scan type, lead, stage, milestone and attention. | Validate default mode. |
| Tasks had no obvious tab. | Separate Plan and Tasks, as requested. | Project | Plans/gates and actionable work have distinct homes. | Confirm split after use. |
| Developed functions were omitted or inert labels. | Reachable workflow representations and per-slice register. | Shell / supporting workflows | Simplifying navigation must retain capability. | Review grouping. |
| Owner People/Insights could be buried. | Visible desktop groups; named mobile More entries. | Navigation | Predictable placement and frequency matter. | Validate mobile depth/clutter. |
| Dashboard/My Work duplication. | Team exceptions route from Dashboard; assigned/shared work lives in My Work. | Dashboard / My Work | Clarify personal next work versus oversight. | Validate ordering. |
| Files, drawings and galleries have competing homes. | Documents contains files/register/transmittals/gallery; Reviews contains review/grant/package context. | Documents / Reviews | Keep evidence project-specific. | Test need for subtabs. |
| Delivery is broad. | Separate Turnkey, Site, snag and offline entries within Palm Delivery. | Delivery | Preserve distinct developed workflows. | Test cards versus subtabs. |
| Decisions could imply authority for others. | Eligible request opens domain source; Primary Client status is informational for staff. | Decisions | Review, approval, advice and acknowledgement differ. | Confirm shared queue boundary. |
| Wrong revision/round could be acted on. | R1 → R2 → R3, named next actor, exact decision and retained history. | Review / Task | Immutable evidence and correction linkage. | Validate comprehension. |
| Repairer could verify own repair. | Rohan repairs; Meera verifies; closure/handover stay separate. | Site / Snags | Preserve independence. | Validate wording only. |
| Advanced capability overwhelms first view. | Essential context first; advanced/history disclosure. | Task / supporting workflows | Reduce scattered options while retaining access. | Decide prominence from trials. |
| Automation could appear to bypass approvals. | Notice/report actions only; nonbinding recommendation links to ordinary domain workflow. | Automation | Preserve bounded S26. | No new business decision. |

## Actions still requiring Owner findability validation

- **Multiple locations:** review/task shortcuts must feel like entry paths to one record. The advanced workflow representation describes decision families as well as the exact Review Workspace; test whether this feels duplicated.
- **No obvious home:** gallery/public publication inside Documents; external grants inside Overview/Reviews; Owner organization schedules inside Account. These placements remain hypotheses.
- **Unnecessary navigation:** mobile site work uses Projects → Palm → Delivery → Site. Test a contextual Today-on-site shortcut before changing primary navigation.
- **Globally exposed/contextual:** cross-project health/reports must open source evidence. Website intake belongs to Manage; project location belongs to project context.
- **Hidden too deeply:** workforce entitlements/retention, time accounting export, native CAD shares and frozen report corrections need explicit advanced entry points.
- **Duplicates:** Fixed versus Saved Reports; personal reminders versus organization schedules; audit versus selfie retention; organizational versus project/client/external grants. Preserve separate authority while testing labels.

## Evidence and limits

Read-only audits used GPT-6.1 Sol and GPT-6 Luna. [Artifact checks](UX_VALIDATION_CHECK_2026-10-07.cjs) exercise navigation, workflow action dialogs, Card/List, task creation, exact correction loop, sample role visibility and 390px mobile layout. Exact results and per-slice findings are in the coverage register. No participant success or production permission verification is claimed.

Stop at Owner UX review. No Gate B, visual design, production implementation, backend/schema/business-rule/permission edits, T01–T08, S18 or S27 work.


## Owner Dashboard / widget requirement — 7 October 2026

Dashboard is an interactive attention, orientation and action-routing layer: See → Understand → Open/Act → Resolve → Dashboard Updates. Every count drills into its matching scope, and known items route to exact canonical records. Contextual Back restores selection, filters, tab and position without restoring stale work state. Source actions update derived task/review/client/decision/site summaries. Review and Decisions remain distinct; high-consequence actions require evidence context. Expandable Dashboard widgets and embedded typed source action panels replace generic blocking dialogs. Safe inline recipient-notification read and UI filters remain separate from domain decisions. Loading/unavailable/stale/restricted section states never treat unknown as zero.

The mandatory per-element interaction matrix, source/capability mapping, empty/error states, API dependencies and actual artifact checks are in [UX_DASHBOARD_INTERACTION_MATRIX_2026-10-07.md](UX_DASHBOARD_INTERACTION_MATRIX_2026-10-07.md). This amendment supersedes prior passive Dashboard/dialog descriptions. It does not authorize production implementation or freeze UX.


### Owner Tasks Kanban request — 7 October 2026

Global Tasks now names its board view **Kanban**, alongside List and Timeline. Horizontal state columns show filtered canonical tasks, counts and empty columns; each card opens the same task detail. Created by me, Assigned to me, collaboration, search/project/state filters and contextual Back retain their meaning across modes. State changes remain in the task context in this prototype. No production UI or business rules changed.


Tasks display modes now include **List, Cards, Kanban and Timeline**. Cards shows a flat grid of the same filtered records; Kanban groups those records in state columns. Both remain available alongside each other.


## Settings panel — Owner request, 7 October 2026

A header Settings button opens a neutral hub: Personal, Security, Authorized tools, and Owner-only Organization & access, Policies & schedules, Integrations & automation, Templates & retention. Tiles open existing canonical destinations and contextual action panels; Back retains the Settings origin. Settings creates no separate configuration workflow or persistence. Personal controls remain distinct from scoped/project grants and Owner policy. External sessions keep separate portal security. No unapproved theme/language/provider-sync settings were added. Grouping remains provisional; production permissions remain authoritative. JavaScript syntax checked; no new browser verification claimed for this addition.

