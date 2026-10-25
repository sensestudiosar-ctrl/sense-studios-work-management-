# Final information architecture specification

IA-2 · 25 October 2026 · One selected planning architecture, pending Owner validation. Existing URLs and backend boundaries remain.

## 1. Four distinct homes

| Category | User question | Contains | Excludes from its primary surface |
|---|---|---|---|
| Daily | What do I need to do now? | Own/authorized work, assigned reviews, decisions, notices, time and self-service | Organization policy/configuration forms |
| Project work | What is happening on this project? | Plan, tasks, contributors, files/drawings, reviews, delivery and history in selected-project context | Organization employee administration and global policy editing |
| Management | What needs supervision or a management decision? | Team/project oversight, directory/reporting, CRM, insights, reports, workforce/learning oversight | Authentication or integration secret setup as everyday work |
| Configuration | How is the system governed or connected? | Organization/access, explicit policies, presentation, templates, automation/integration setup, preferences, audit/retention | Work queues and concealed automatic business actions |

Account/security is a utility context within Configuration; CLIENT and EXTERNAL portals remain separate shells. These homes are navigation groupings, not new services, roles, Brands, Departments or Workspaces in the data model.

## 2. Desktop tree and initial disclosure

```text
Utility header: project/page context · Find a page · New task · Notifications · account

Daily (initially visible)
  Dashboard
  My Work
  Tasks
  Decisions
  More daily tools → Time · Workforce (My records) · Learning

Project work
  Projects
    Selected project
      Overview · Plan · Tasks · People · Documents · Reviews · Delivery · Activity
  Cross-project queues (disclosed, retained shortcuts)
    Project documents · Drawing register · Internal reviews · Client reviews
    Turnkey operations · Site delivery

Management (disclosed)
  People / current reporting scope
  Sales & clients
  Performance · Project Health
  Reports → Standard reports · Saved definitions · Frozen history · run history
  Scheduled summaries
  Workforce (Managed records) · Learning management
  Evidence assistance

Configuration (disclosed)
  Account & devices
  Organization, Branches, Teams
  Job roles, permissions and existing overrides
  Task creation presentation
  Project templates
  Workforce and scoring policies
  Notification preferences
  Integrations · Automation
  External access administration
  Audit & retention
```

Dashboard, My Work, Tasks, Projects and Decisions remain directly discoverable. Initially expand Daily and the active group; expand Project work on project routes. The tree is about prioritization, not minimizing the total route count. Cross-project specialists can still navigate directly. No new favorites/recent-items persistence is assumed; the current page finder and navigation filter remain the accelerators.

## 3. Canonical route-to-home decisions

| Existing route | Primary home and page purpose | Secondary links / retention |
|---|---|---|
| `/dashboard` | Daily → Dashboard: factual overview | Existing summaries, reports, reminders/schedules remain available until their equivalent contextual links are accepted |
| `/my-work` | Daily → My Work: current personal work | Existing All teams/Team/Employee scope only when returned; no automatic default change |
| `/tasks` | Daily → Tasks: cross-project register | Existing scope, views, filter/selection URL; project entry fixes context |
| `/decisions` | Daily → Decisions | Approval obligations link to owning domain; assigned review shortcut remains distinct |
| `/notifications` | Daily utility inbox | Settings/preferences are linked Configuration views, same current preference owner |
| `/projects` | Project work → Projects | Preserve directory, creation and all eight sections; contextual selected-project entry |
| `/documents` | Project → Documents → Files; retained cross-project queue | Same project/folder/file context and access workflows |
| `/revisions` | Project → Documents → Drawing register | Retained drawing-specialist queue; exact revision/transmittal links |
| `/reviews` | Project → Reviews → Internal; Daily assigned reviewer shortcut | Same task/round IDs and current queue/scope keys |
| `/client-reviews` | Project → Reviews → Client packages | Client access and presentation are disclosed subcontexts; original route remains |
| `/turnkey` | Project → Delivery → Turnkey | Cross-project entry retains eligible selector; Design users do not receive Turnkey authority |
| `/site` | Project → Delivery → Site | Direct daily Site shortcut through More for site workers; current assignments decide access |
| `/external-access` | Project access context / Configuration → External access | Existing standalone route remains until authorized project-selector entry passes; no new grant behavior |
| `/people` | Management → People | Ordinary staff current profile/authorized scope stays; Project People remains contributor/lead context |
| `/time` | Daily → Time | Existing managed/export functions get Management links; same Time module |
| `/workforce` | Daily → My records; Management → Managed records | Existing local sections; Configuration links to existing setup controls. No invented query schema |
| `/learning`, `/learning/skills`, `/learning/training`, `/learning/library` | Daily → Learning, with Skills/Training/Library local views | Management assignment/review and Configuration catalogue links stay in owning modules; old `/learning` remains valid |
| `/performance`, `/project-health` | Management → Performance/Project Health | Personal scores remain self-scoped; policy editing disclosed Configuration context, same backend |
| `/reports`, `/saved-reports` | Management → Reports | Standard report preview, saved definitions, frozen results and runs clearly named and never merged as objects |
| `/automation` | Configuration → Automation | Existing report-builder access retained as Reports shortcut; no loss of rules/runs/recommendation history |
| `/integrations` | Configuration → Integrations | Existing calendar/events get contextual Daily links; minimal label/security contract unchanged |
| `/assistance` | Management → Evidence assistance | Existing permitted personal/project requests remain accessible; deterministic/nonbinding behavior stays |
| `/settings` | Configuration/account utilities | Current personal/organization/team panels and supported `panel`/section parameters retained |
| `/workspace` | Legacy compatibility and existing CRM access | Give Sales & clients a visible link to its existing surface before reducing legacy prominence; preserve original URL and all contained capabilities |
| Internal identity/setup/recovery paths | Identity utility | Keep current account kind, passkey/recovery behavior and authorized post-login deep-link routing |
| `/client-portal/*` | Separate CLIENT shell | Project home, exact packages/items, costs/gallery and devices; no staff navigation or new password routes |
| `/external-portal/*` | Separate EXTERNAL shell | Granted project/evidence/requests/submissions/devices; no staff/client authority |
| `/portfolio`, `/install` | Public published portfolio / install help | Preserve existing public derivative and PWA behavior |

The current checkout-only `/v15-preview` is not part of the accepted deployed capability baseline and is not promoted. All accepted route declarations are indexed in `DEPLOYED_CAPABILITY_INVENTORY.json`. Context focus links without an existing URL representation must first be specified as frontend-only link behavior; do not invent backend parameters.

## 4. Project workspace

Keep the existing eight sections. Avoid another project overview wrapper around each owning module. Reuse existing project-resource reads and parameterized links first; embedding a full owning view is later approved frontend work only if its context/draft behavior survives.

| Section | Primary content | Disclosed/contextual actions |
|---|---|---|
| Overview | Title, owning Branch, delivery type, status, client link, current lead, approved scopes, current available milestones | Manage lifecycle, scope request/decision, cancellation and transfer via exact existing actions with reasons |
| Plan | Applied version, stages, milestones and dates | Existing template/plan management; empty plan explains missing applied template |
| Tasks | Existing scoped TaskWorkspace | Canonical create/subtask/detail/edit; current page/group/filters preserved |
| People | Project Lead and contributors | Only currently permitted lead/contributor commands; no org membership editing |
| Documents | Files, Drawing register, Confirmed drawings | File/folder access and upload; separate exact-revision issue workflow |
| Reviews | Internal and Client contexts with exact tasks/rounds/items | Named assigned decisions and history; no universal Approve |
| Delivery | Turnkey and Site evidence/status | Existing released-input/procurement/cost/site commands with their separate gates |
| Activity | Existing histories/requests | No fabricated universal event stream or new aggregate endpoint |

Always display selected-project identity at a readable size. Browser Back returns to the originating queue and its query/selection. Changing project clears incompatible project-specific selection only after dirty-work protection; it cannot retain a task/review from another project behind the new title.

## 5. Tablet and phone

- Retain the existing768px global-shell switch: desktop navigation at768px and above; mobile bar below. Test767/768/783 explicitly.
- Phone primary bar remains **Home · My Work · Projects · Decisions · More**. More uses the same four categories and contains every retained non-primary destination. No automatic role-dependent reordering or sixth primary item.
- Tablet at783/1024 uses the desktop shell with adaptive content: use a full object detail when the remaining width cannot support a readable list and detail. Do not force a split just because a sidebar is present.
- Local project sections use a labeled section selector or accessible wrapped/scrollable navigation with selected item discoverable; global navigation remains distinct. All sections stay reachable.
- A direct site-work shortcut in More is acceptable using existing access; changing the primary bar requires later usage evidence and Owner decision.

## 6. Permission and discovery rules

Only authoritative current capabilities can hide/reveal action controls. If a whole-area capability is not available to the frontend, retain its guarded route and clear permission state rather than invent a title-based filter. Page-finder results are destination discovery, not a promise of permission or global content search. No protected record names enter global navigation or cached recent items without a supported authorization contract.

Do not remove access merely because a capability is uncommon. Unknown frequency affects disclosure, not support. A no-records state still explains how a permitted user can begin; an unconfigured state identifies the authorized configuration path without enabling the action prematurely.

## 7. Navigation acceptance

Tree-test15 destinations against the four homes; require ≥90% correct first choice on Daily/Project targets and ≥80% on infrequent Management/Configuration targets before accepting labels. Any repeatedly misplaced consequential function is revised and retested. These are targets, not current measurements. Confirm all accepted deep links and all parity rows remain reachable before retiring any legacy presentation.
