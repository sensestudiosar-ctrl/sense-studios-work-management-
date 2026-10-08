# Visual Reference & Benchmark Library

Date: 2026-10-05 · Classification: **PROPOSED research input; no style chosen or frozen**

Use this library to ask design questions and compare patterns. Linear, Asana, Notion, ClickUp, Atlassian Design System (ADS), and Shopify Polaris are principle references, not products or systems to clone. A reference does not supply Sense Studios data, authority, business semantics, architecture, interaction acceptance or implementation authorization. Confirm examples against the referenced current official materials during the future visual-design phase because product interfaces and documentation change.

## How to use this library

For each candidate pattern, compare a Sense Studios screen against at least two applicable references, a mobile case where relevant, and at least one denied/error/empty state. Record the source pattern/version/date, what was observed, the transferable principle, what must be rejected, and the adapted contract. Prefer direct screenshots and notes from official demos/docs plus ethically obtained product experience. Never import another tool's terminology, role model, hierarchy, shortcut, automation, approval or data assumptions as if they belonged to Sense Studios.

Labels inside **current problem** summarize the S22 audit and are scoped findings, not user research. “Needs baseline validation” means inspect in the final accepted app and task sessions before treating the observation as representative. The benchmark material below is formative, not a visual-direction vote. Every “principle NOT to copy” constrains adaptation; it is not a criticism of a reference product.

## Reference set

| Reference | Patterns to examine | Principle lens | Explicit limits |
| --- | --- | --- | --- |
| [Linear](https://linear.app/docs) | Custom saved list/board views, issue/project context, inbox and search | Focused work queues, low-friction navigation, context-preserving views and actionable inbox | Software issue lifecycle, keyboard map, team/workspace assumptions, status model, and every shortcut remain product-specific. Linear custom views and project views are configurable/shared patterns in its own scope. |
| [Asana](https://help.asana.com/s/article/quick-start-guide-to-asana) | My Tasks, project task views, creation points, forms, approvals and inbox | Connect personal work to project context; keep assigned tasks, dates and next steps legible | My Tasks' semantics, flexible collaborator model, user-configurable sections, approval task states and automation do not define Sense Studio roles or authority. |
| [Notion](https://www.notion.com/help/navigate-with-the-sidebar) | Sidebar, linked database views, search, flexible page layouts and knowledge | Findability, context-specific views over a shared source, progressive information density | Free-form pages/databases, drag-reparenting and broad workspace search can change access or expose content. Never mirror these without exact Sense authorization. |
| [ClickUp](https://help.clickup.com/hc/en-us/articles/6310172583831-Use-Task-views) | Home/sidebar and view bar; list, board, table, mobile views, forms and dashboards | Make view purpose apparent; support task, time and project lenses on desktop/mobile | Feature-rich hierarchy, configurable status workflows, view permission/plan behavior and drag transitions are not approved domain semantics. Avoid feature clutter. |
| [Atlassian Design System](https://atlassian.design/components) | Navigation, form controls, focus, messages, pagination, dynamic tables, tokens and motion | Explicit component responsibility, composable primitives, semantic tokens, visible focus and predictable states | ADS components, brand, product vocabulary, package/API and deprecated components are not a Sense implementation prescription. Use current documented principles/patterns, not automatic package adoption. |
| [Shopify Polaris](https://polaris.shopify.com/) | Page/Index table, forms, filters, status and empty states, narrow-screen patterns | Clear hierarchy for operational records, scannable row actions, purposeful forms and complete states | Merchant/store data, Shopify navigation/context/actions, commercial workflow and component API are product-specific. Do not inherit merchant metaphors or UI package. |

Official documentation anchors include [Linear custom views](https://linear.app/docs/custom-views), [Linear projects](https://linear.app/docs/projects), [Linear inbox](https://linear.app/docs/inbox), [Linear search](https://linear.app/docs/search), [Asana My Tasks and Inbox](https://help.asana.com/s/article/quick-start-guide-to-asana), [Asana forms](https://help.asana.com/s/article/forms?language=en-US), [Asana approvals](https://help.asana.com/s/article/approvals), [Asana tasks](https://help.asana.com/s/article/understanding-tasks?language=en-US), [Notion sidebar](https://www.notion.com/en-gb/help/navigate-with-the-sidebar), [Notion database views](https://www.notion.com/en-gb/help/views-filters-and-sorts), [Notion search](https://www.notion.com/help/search), [Notion page layouts](https://www.notion.com/en-gb/help/layouts), [ClickUp views](https://help.clickup.com/hc/en-us/articles/6310172583831-Use-Task-views), [ClickUp mobile views](https://help.clickup.com/hc/en-us/articles/6310424201751-Use-views-on-the-mobile-app), [ClickUp forms](https://help.clickup.com/hc/en-us/articles/30687934700055-Create-and-access-Forms), [ADS component index](https://atlassian.design/components), [ADS dynamic table](https://atlassian.design/components/dynamic-table/), [ADS composition](https://atlassian.design/get-started/develop/composition), [Polaris Index table](https://polaris-react.shopify.com/components/tables/index-table?example=index-table-with-row-navigation-link), [Polaris form design](https://shopify.dev/docs/apps/design/user-experience/forms), and [Polaris empty state](https://polaris-react.shopify.com/components/layout-and-structure/empty-state). The current documentation describes product examples/features; the cross-product design principles below are planning inferences, to be checked against visual evidence and actual user tasks.

## Pattern benchmark

### 1. App shell and navigation

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** internal workspace navigation is a flat collection of module links and the signed-in root combines account identity, work, notifications and Owner controls. Route wrappers repeat context/session navigation. The retained v1 plan favored clean studio styling and equal desktop/mobile support; no frozen shell contract exists. |
| **Reference products** | Linear sidebar/team pages; Asana project/task navigation and Home; Notion sidebar/favorites/search; ClickUp global/sidebar/view navigation; ADS Navigation system and breadcrumbs; Polaris app/page navigation and contextual actions. |
| **Principle worth borrowing** | Make location and scope visible; keep a small number of stable primary destinations; use contextual project navigation; provide a predictable return path; let secondary administration stay discoverable without dominating the work surface. |
| **Principle NOT to copy** | Notion's user-created nesting/reparenting/access implications; ClickUp's deep Spaces/Folders/Lists hierarchy and feature count; Linear/Asana team/workspace hierarchy or shortcut map; Polaris merchant/store assumptions; any reference's permission filtering as a substitute for server authorization. |
| **Adaptation for Sense Studios** | **PROPOSED:** evaluate a scoped desktop rail and mobile primary navigation; every internal employee sees My Work, with Decisions/Projects central and authorized secondary modules grouped. Show Organization → Branch → Team context and project owning branch without granting access via context. Keep Client, EXTERNAL and public shells separate by identity and audience. Preserve old direct links through a route bridge. |
| **Applicable roles/workflows** | All internal personas; Owner/authorized manager administration; Project Lead/task return paths; separate client, consultant, vendor/factory, and public journeys. |

### 2. My Work

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** tasks appear embedded in the long signed-in workspace. Existing mine/assigned scopes are not a reliable single “all my work” contract: Owner list is broader; staff assigned can combine collaboration and authorized management. S24 unified attention remains planned. |
| **Reference products** | Asana My Tasks and Inbox; Linear user views, assigned issues and priority inbox; ClickUp Home and list views; Notion Home/My Tasks and linked views. |
| **Principle worth borrowing** | Start with a useful personal slice, group by a meaningful time/work state, show project/context next to each action, and connect notifications to source records without losing the work queue. |
| **Principle NOT to copy** | Do not assume each task has one owner or that every assignment equals personal responsibility; do not import user-configured completion sections/statuses, a vendor's inbox priority algorithm, or organization-wide counts into an employee home. |
| **Adaptation for Sense Studios** | **PROPOSED:** separate personal, collaborator and explicitly authorized management groupings. Start with verified actionable attention, correction/review, Waiting and due basis; display why an item appears and its source capability. Do not claim completeness until S24/read-contract completeness exists; show independent source failures. |
| **Applicable roles/workflows** | Employee, explicitly assigned collaborator, Project Lead/team manager when separately authorized, Owner own-work vs org-management views; daily, correction, review and Waiting return. |

### 3. Project workspace

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** project and operations surfaces are spread across root content and module routes. S19/S20/S21 evidence is long and dense; authorized project context must survive across separate domains. |
| **Reference products** | Linear project overview and attached views; Asana project summary/task views/portfolio; Notion page with linked views/layout; ClickUp location header/view bar; ADS page composition and tabs; Polaris page header/resource sections. |
| **Principle worth borrowing** | Lead with purpose/identity, current state and next useful action; keep related work navigable in a stable context; provide more than one authorized lens over the same records. |
| **Principle NOT to copy** | Do not infer project membership from team membership; do not imply multiple owners/branches or portfolio aggregation beyond approved access; avoid unrestricted inline editing, generic progress charts, configurable status transitions or page-builder complexity. |
| **Adaptation for Sense Studios** | **PROPOSED:** project frame shows identity, owning branch, single lead, delivery type, scope and lifecycle/hold; tabs group Overview, Plan & Tasks, Documents, Reviews, Delivery and Activity. Turnkey/Site appear only when applicable and authorized. Every progress claim carries source/date/completeness; milestones are not completion percentage. |
| **Applicable roles/workflows** | Owner, explicitly permitted Project Lead/Team Leader, employees assigned to that project, exact granted portal audiences; lead→project→template→task→review→delivery. |

### 4. Task list

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** project/own/assigned task work exists; no retained broad My Work/task-list screenshot was found. List density, scan speed and desktop/mobile parity require baseline validation. |
| **Reference products** | Linear list/custom views; Asana list and My Tasks; ClickUp list/table views; Notion table/database views; ADS dynamic table/pagination; Polaris Index table/filters. |
| **Principle worth borrowing** | Make filters, sorting, grouping and visible columns legible; let a user open the exact record without losing their list position; provide a list as a dependable non-visual alternative to a board. |
| **Principle NOT to copy** | Vendor status-column drag, guessed result counts, hidden filters, high-density tables on small screens, user-defined property proliferation, cross-scope aggregate lists without server-filtered paging. |
| **Adaptation for Sense Studios** | **PROPOSED:** establish a readable list default; allow board only as a secondary presentation after explicit state/capability mapping. Preserve target vs committed dates, primary owner vs collaborators, review/dependency state and completeness. Only display sorting/filtering supported by authorized server read models. |
| **Applicable roles/workflows** | Employees/collaborators, authorized management, task triage, project plan and S24 reporting. |

### 5. Task detail

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** task domain has rich dates, status history, collaborators, extensions, dependencies, review/closeout and project guards. The UI must explain these separate concepts clearly without reducing the task to a title/status card. |
| **Reference products** | Linear issue detail/activity/relations; Asana task details/subtasks/collaborators; ClickUp task details/custom fields; Notion task database page/layouts; ADS drawer, inline edit and activity components; Polaris contextual resource details. |
| **Principle worth borrowing** | Keep canonical identity, owner, deadline and next action visible; group supporting context/history; preserve a quick path back to the originating list. |
| **Principle NOT to copy** | Do not copy generic completion as a replacement for project stop, Waiting, review, client approval, closeout, site verification or handover states. Do not provide unrestricted inline edits/assignment or destructive comment semantics. |
| **Adaptation for Sense Studios** | **PROPOSED:** full mobile detail; desktop pane only when source identity remains clear. Separate primary owner/collaborators; target/committed date; ordinary Waiting/exit reassignment; extension request/decision; dependencies; exact evidence/review round; immutable change history. Show actions returned/allowed by the backend and current version. |
| **Applicable roles/workflows** | Owner, authorized assignee/collaborator/manager/reviewer according to capability; task creation, progress, pause/resume, extension, correction and closeout. |

### 6. Task creation

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** task create forms coexist with complex project assignment, date, dependency, workload and review options. New users need clear required-vs-advanced fields; no capture sampled creation across roles. |
| **Reference products** | Linear quick creation/template/draft preservation; Asana contextual add-task and task creation; ClickUp create/Form view; Notion property layouts; ADS Form/field compositions; Polaris form sections and inline guidance. |
| **Principle worth borrowing** | Start from the current project/person context; ask core information first; disclose advanced fields on demand; preserve a recoverable draft only where data-retention rules permit. |
| **Principle NOT to copy** | No implicit task creation from arbitrary text, free form submission into a production queue, inferred assignee authority, hidden auto-routing, or unsanctioned browser draft persistence. |
| **Adaptation for Sense Studios** | **PROPOSED:** title, responsible primary owner, dates and project context first; collaborator, estimate, plan item, dependency, recurrence and review details progressive and capability-aware. Explain overload warning and acknowledgement, current eligible people, and target vs committed date semantics. Submission summary lets user check assignment/project before save. |
| **Applicable roles/workflows** | Owner and explicitly authorized task assigners; employees' own permitted task creation; project/template-context creation. |

### 7. Reviews and corrections

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** internal rounds, CR files, correction tasks, client item decisions and Primary final approval are separate authorities. An undifferentiated approve button or latest-file shortcut would alter meaning. |
| **Reference products** | Asana approval/request-changes/reject visibility; Linear issue relations/activity; ClickUp task comments/status/history; Notion comments/page history; ADS focused dialogs/progress/status messages; Polaris contextual decision/confirmation patterns. |
| **Principle worth borrowing** | Put requested action, exact item/revision, decision choices, impact and prior feedback together. Show clear pending/approved/changes/rejected outcomes and durable context. |
| **Principle NOT to copy** | Never turn generic task approval into formal drawing/item/package approval; no vendor lifecycle or color-coded single status that collapses round/revision/actor authority; no self-review, delegated Primary authority or bulk decision unless approved contracts allow it. |
| **Adaptation for Sense Studios** | **PROPOSED:** review workspace binds checksum/exact revision/round, named eligible reviewer, markup/comment, correction category/severity, next source task and immutable original. Client item approval and Primary batch finalization remain separate named steps. Historical evidence stays read-only. Unsupported viewer blocks annotation/decision. |
| **Applicable roles/workflows** | Named internal reviewer, correction assignee, client item delegate, Primary Client, authorized Owner/Lead; submission→review→correction→resubmission→client item/final package→issue. |

### 8. Dashboards

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** S22 has no S24 role dashboard suite. Current totals can be incomplete or scoped; S23 score/health and S24 summaries/snapshots are planned, not available at the audit cutoff. |
| **Reference products** | Asana portfolio/project status; Linear project insights/views; ClickUp Dashboards; Notion linked views/chart/database layouts; ADS cards/status/freshness; Polaris resource summaries. |
| **Principle worth borrowing** | Answer a small set of role-specific questions; show a route to the underlying source; surface freshness and denominators; make a dashboard actionable and explain its boundaries. |
| **Principle NOT to copy** | No dense everything-grid, vanity metrics, misleading confidence colors, arbitrary widget builders or metrics over incomplete data. Do not reveal named peer scores to roles lacking authority. |
| **Adaptation for Sense Studios** | **PROPOSED:** begin with S24 approved role fields only. Pair metric value with date/as-of, source coverage and definition. Distinguish loaded-only, unavailable, unconfigured and zero. Reports/snapshots link to their immutable as-of context. |
| **Applicable roles/workflows** | Owner, authorized Team Leader/Project Lead, employee self view, limited Site and client views only where requirements authorize their fields; weekly/daily triage. |

### 9. Forms

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** forms are frequently stacked inside long workspaces. Correct validation, state and business concepts matter more than uniform field count. |
| **Reference products** | Asana contextual tasks/forms; ClickUp forms; ADS native field/form guidance; Polaris TextField/Select/validation patterns; Notion structured properties. |
| **Principle worth borrowing** | Labels stay visible; related questions group together; errors explain recovery beside the field; irreversible consequences get review before commit; required and optional inputs are explicit. |
| **Principle NOT to copy** | No form builder/custom property feature is implied; no silent submission routing/default state; no auto-submit or hiding critical reason/consent; no fake progress stepper for a simple form. |
| **Adaptation for Sense Studios** | **PROPOSED:** one dominant action per focused form, progressively disclose optional detail, state exact consequences for approval/correction/assignment/evidence. Retain reason, exact target and current version when domain requires them. No storage of protected drafts without an approved retention contract. |
| **Applicable roles/workflows** | Task/create, CRM, leave/time, upload, snags/report confirmation, typed decisions, portal advisory submissions and automation setup. |

### 10. Tables and operational data

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** most components use cards/lists; retained workforce image shows a dense workload table compressing on mobile. Audit source search did not establish broad interactive table coverage. |
| **Reference products** | ADS Dynamic Table (documented pagination/sort/reorder); Polaris Index table; Linear list; Asana list; ClickUp table; Notion database table. |
| **Principle worth borrowing** | Semantic column names, legible row hierarchy, persistent row identity, explicit sorting/pagination, controlled column density and clear row-to-detail action. |
| **Principle NOT to copy** | Avoid desktop grids shrunk to unreadable mobile, unlabeled reorder affordances, bulk destructive edits, sortable labels unsupported by backend, select-all across hidden pages or data export leaking scope. |
| **Adaptation for Sense Studios** | **PROPOSED:** use a table when comparison across multiple fields matters; at narrow widths choose prioritized columns, deliberate horizontal scroll with cues or equivalent labeled cards. Server-backed pages expose truthful range/total. Disable bulk mutations unless domain authority and confirmation are separately approved. |
| **Applicable roles/workflows** | Workforce workload, project/task registers, CRM pipelines, documents/revisions, portal submissions, integration runs and reports. |

### 11. Search

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** no universal search experience is verified. Current route/project pickers and scoped queries are module-specific. Cross-project index is a proposed dependency, not available by assumption. |
| **Reference products** | Linear search and current-view filtering; Notion workspace/database search; ClickUp hierarchy-scoped views; Asana project/Inbox search; ADS typeahead/menu composition; Polaris filters/resource search. |
| **Principle worth borrowing** | Search should make its scope visible, support useful refinements, keep recent/direct navigation convenient and explain no-result scope. Search and filter within the current result are distinct. |
| **Principle NOT to copy** | No global result surface before authorization across every source; no autocomplete that leaks existence, people, folders, hidden branch names or Confidential file titles; no fuzzy result described as exact evidence. Keyboard shortcuts are optional and never the only path. |
| **Adaptation for Sense Studios** | **PROPOSED:** begin with in-context task/project/document search only after confirming server-side scope and filtered counts. State indexed entity types, branch/project scope, freshness and excluded sources. Global search remains gated on an accepted permission-filtered read model. |
| **Applicable roles/workflows** | All internal roles, project document picker, authorized review lookups and bounded external exact-grant portal search if specified. |

### 12. Notifications and attention

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** notification center and approval queue exist separately. S24 intends broader cross-source attention; read state does not mean source action completed. |
| **Reference products** | Linear priority inbox/source detail/snooze; Asana Inbox with source jump; Notion Inbox filters/notification settings; ClickUp activity/inbox; ADS badges, flags and section messages; Polaris contextual status/feedback. |
| **Principle worth borrowing** | Group actionable attention separately from passive updates; preserve source, actor and next step; let the person return later without corrupting domain state. |
| **Principle NOT to copy** | No vendor priority/snooze semantics if unavailable, no invented one-click completion, no notification read-as-approval and no count that suggests complete attention while sources fail. |
| **Adaptation for Sense Studios** | **PROPOSED:** S24 center identifies typed source, recipient/actor, urgency only when specified, exact route and source capability. Acknowledge/dismiss only through supported notification commands. Independent group loading and incompleteness visible. |
| **Applicable roles/workflows** | Internal recipients, named reviewer/approver, site and workforce actions; client/external notices in separate portal identities. |

### 13. Approvals

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** typed approval queue exists, but approval types have distinct eligible actors, source objects and consequence bindings. |
| **Reference products** | Asana Approval object states and reviewer affordance; ADS confirmation/dialog/focus guidance; Linear action inbox; Polaris contextual destructive confirmations and banners. |
| **Principle worth borrowing** | Make the thing being decided, the exact eligible actor, options, evidence, impact and reason explicit; show result and history after commit. |
| **Principle NOT to copy** | Do not universalize Approved/Changes/Rejected across every Sense workflow; no requester self-approval, delegate privilege, changing bound evidence, bulk approval or status-only action unless explicit authority permits. |
| **Adaptation for Sense Studios** | **PROPOSED:** decision card and full request detail are distinct; server capability/version determines controls; consequence text names the exact resulting state. For stale requests, refresh and stop. Do not make task status look like formal document/client/procurement/site approval. |
| **Applicable roles/workflows** | Owner/authorized named decision-maker, Project Lead/explicit Team Leader, named reviewer, Primary Client and item delegate in their distinct contract. |

### 14. Knowledge and learning

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** S18 skills/SOP/knowledge/training remains conflicted and excluded; there is no verified S18 runtime UI to improve. |
| **Reference products** | Notion nested knowledge/search/page layouts; Linear team documents/pinned resources; ClickUp Docs and mobile; Asana templates/embedded guidance; Polaris content hierarchy/help text. |
| **Principle worth borrowing** | Put instruction beside the task where it applies; provide source/version/owner; make search/refinement and acknowledgement discoverable; distinguish current from archived guidance. |
| **Principle NOT to copy** | No editable wiki convention as a substitute for controlled SOP publication, no automatic visibility to every workspace member, no learned content treated as approved policy and no completion-to-skill-upgrade shortcut. |
| **Adaptation for Sense Studios** | **PROPOSED and conditional:** reserve a separate Skills & Learning information area only if S18 is reconciled and functionally accepted. Show SOP version, publication authority, acknowledgement and assessment evidence; training completion does not upgrade skill alone. |
| **Applicable roles/workflows** | Conditional employee/manager/trainer/Owner only under accepted S18 access and lifecycle. |

### 15. Analytics and reports

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** S23 Performance/Health and S24 Dashboards/Reports are outside the S22 accepted baseline; exact formulas, approved weights, delay attributions and snapshots must remain domain-owned. |
| **Reference products** | ClickUp dashboards/workload; Asana portfolios/project views; Linear project insights/custom views; Notion charts/linked views; ADS data visualization/table tokens; Polaris page metrics/status summary patterns. |
| **Principle worth borrowing** | Pair a chart with the source list/definition, range, denominator, freshness, filters and limitations; use a visualization only when it supports a task or comparison. |
| **Principle NOT to copy** | Never infer delivery percentage from task counts or partial load; no unexplained ranking, assumed industry benchmarks, mutable historic report, unlabeled delay or fabricated zero for unavailable. |
| **Adaptation for Sense Studios** | **PROPOSED:** display only accepted S23/24 snapshots and formulas; score requires Owner-configured approved weights/thresholds; separate role-group and project formulas; hide named ranking per approved policy. Report exports retain authorization and frozen as-of values. |
| **Applicable roles/workflows** | Owner/explicit manager, employee own view, authorized site/project health; approved client fields only. |

### 16. Mobile and site workflows

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** S17/S19/S20/S21/S22 mobile captures show broad stacking, while site pages are very long and S22 offline capture/compare is consequential. Fixed screenshots do not establish unassisted usability or field network/device quality. |
| **Reference products** | Asana My Tasks mobile; ClickUp mobile task/list/form views; Notion mobile navigation/database pages; Linear mobile issue/inbox, if current official examples are available at study time; Polaris responsive/touch patterns and ADS adaptive primitives. |
| **Principle worth borrowing** | Keep capture task-first, give context before submission, let the user understand local save/upload/sync stage, provide a clear retry/recovery and avoid forcing desktop-width controls. |
| **Principle NOT to copy** | No desktop sidebar squeezed onto a phone, hover/drag-only action, offline behavior inferred from a vendor app, background sync guarantee, sensitive photo retention or offline approval shortcut. |
| **Adaptation for Sense Studios** | **PROPOSED:** offline capture starts after explicit online preparation, presents only allowed capture actions and clear queue stages, supports safe return/reauth, then human comparison for version conflicts. No cached API/project documents/private files; no offline approvals/completion. Site mobile prioritizes assigned package, factual report/capture, snag, independent verification/closure boundary. |
| **Applicable roles/workflows** | Site staff/Project Lead/named verifier within capabilities; desktop/mobile internal, plus separate exact-grant portal users. |

### 17. Empty, loading, error and unavailable states

| Dimension | Planning record |
| --- | --- |
| **Current problem** | **CURRENT:** source contains labeled loading/empty/error/retry patterns; no broad states were visually audited. S20/S22 captures expose the need to distinguish long operational sections, local saved, unsynced and conflict. |
| **Reference products** | ADS section message/progress/empty guidance; Polaris empty states and inline error patterns; Linear Inbox/search no-result/action state; Asana Inbox/My Tasks empty cases; Notion search/empty database guidance; ClickUp view/loading/no-results. |
| **Principle worth borrowing** | Say what is loading, what scope was searched, whether data is incomplete, what failed, whether retry is safe and the next permitted recovery. |
| **Principle NOT to copy** | No blank canvas construed as zero, no fake sample data in production, no spinner without context, no generic success toast for a consequential state change and no retry that duplicates a non-idempotent command. |
| **Adaptation for Sense Studios** | **PROPOSED:** standard text+icon states: loading, genuine empty, scoped-empty, partial, stale, unavailable/unconfigured, denied, validation error, retryable network failure, terminal conflict, local-only saved, upload pending and synchronized receipt. Preserve source identity and command idempotency; clear protected data on authority loss. |
| **Applicable roles/workflows** | Every internal/portal surface, dashboards/reports, viewer, forms and offline queue. |

## Benchmark observation worksheet for later Gate B

For each representative prototype, attach a short record:

| Field | Record |
| --- | --- |
| Sense screen/task and CURRENT/PLANNED basis | |
| Product/reference pattern, official URL, version/date captured | |
| User goal and observed number of decisions/steps | |
| Principle retained | |
| Source behavior deliberately rejected | |
| Adaptation to Sense records, role and capability | |
| Desktop/mobile and empty/error/restricted examples | |
| Terminology/evidence/authority risks | |
| Owner decision; unresolved question | |

## Source freshness and research limitations

Official docs are living sources. This 2026-10-05 snapshot uses official product docs discovered for saved views/inboxes/tasks/forms, navigation/search/knowledge, mobile views, design tokens/tables/navigation and semantic empty/error composition. It is not a procurement, comparative feature score, full visual inspection of every named product, or component/API compatibility assessment. Before Gate B, revisit all links, record capture/version/access date, inspect desktop and mobile examples directly, include alternative visual directions, and perform the adapted-task study with representative Sense Studios users. No third-party code/assets/components are included or authorized.
