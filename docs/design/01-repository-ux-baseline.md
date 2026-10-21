# Repository UX baseline and constraints

8 October 2026 · Source-informed baseline; current-tree runtime acceptance remains **IN PROGRESS**.

## Authority and evidence boundary

Exact GPT-6.1 Sol read the Owner instruction, CURRENT_STATE.md, IMPLEMENTATION_STATUS.md, MODULE_REGISTRY.md, then focused relevant product, trace, architecture, domain, database, permissions, workflows, storage, testing and plan documents before source/callers. This package incorporates that handoff. See [current state](../../CURRENT_STATE.md), [implementation status](../../IMPLEMENTATION_STATUS.md), [module registry](../../MODULE_REGISTRY.md), [requirements](../../requirements/APPROVED_REQUIREMENTS.md), [clarifications](../../requirements/CLARIFICATIONS.md) and [implementation plan](../../IMPLEMENTATION_PLAN.md).

Current Owner direction supersedes stale historical S18/S27 exclusions. S01–S27 are complete for their authorized development/local-staging scopes, including accepted S18 integration and bounded S27. S18 migrations110–114 and S27 migration115 remain unchanged. Recorded57-browser/full-gate acceptance applies to the recorded484-file fingerprint, not subsequent Review/source/UX edits. Actual operational R-104/R-105 and production readiness remain unverified. The S27 prerequisite waiver covers bounded local implementation only.

[Current UX verification](../ui/UX_CURRENT_VERIFICATION_2026-10-08.md) and status documents record more recent partial checks, PostgreSQL fixture/provisioning failures and incomplete browser acceptance. Counts differ across subsequent runs; this research does not reconcile them by inventing a latest green result. It neither reruns gates nor changes fixtures/data. Working HEAD observed during this session was611354b5a839bbd0dbcecafd1ec5d91e46e4c2c9, with extensive concurrent uncommitted work. Treat this as a moving-tree observation, not an accepted snapshot.

Older UI plans and gap tables are historical. Current Task scopes/views, Project sections, Settings/Workforce homes and contract increments already exist with acceptance pending. Revalidate their latest code/execution rows before opening any “missing feature” item. In particular, Site delivery belongs to active TURNKEY, despite older prose saying DESIGN. S18 C-025–027 supplement the earlier C-024 boundary.

## Existing frontend architecture and design system

| Area | Source / current behavior | Design consequence |
|---|---|---|
| Frontend | [web package](../../apps/web/package.json), React/Vite/Router, TSX and module CSS | Retain current stack; no new component framework dependency proposed |
| Entry isolation | [main.tsx](../../apps/web/src/main.tsx), lazy CLIENT, EXTERNAL, public portfolio before internal fallback | Share visual rules without sharing identity/navigation/data |
| Internal shell | [app.tsx](../../apps/web/src/app.tsx), setup/security exceptions and ready-user Dashboard redirect | Dashboard remains current default; avoid rewriting sign-in/setup during UX work |
| Navigation | [workspace-navigation.tsx](../../apps/web/src/workspace-navigation.tsx),21 destinations, Dashboard plus Work/People/Insights/Manage | Keep all routes; mobile Dashboard/My Work/Tasks/Documents+More; label filter is not global content search |
| Project | [project.tsx](../../apps/web/src/project.tsx), Overview/Plan/Tasks/Documents/Reviews/Delivery/Activity | Preserve7 sections and context; linked owning workspaces still need return/reload acceptance |
| Task | [task.tsx](../../apps/web/src/task.tsx), [controller](../../apps/api/src/task.controller.ts), scopes/sort/plan-item, List/Cards/Kanban/Timeline | Validate current features first; board/timeline do not imply drag scheduling |
| People/settings | [workforce.tsx](../../apps/web/src/workforce.tsx), [settings-homes.tsx](../../apps/web/src/settings-homes.tsx) | Preserve self/management, operational sections and personal/org boundaries |
| Design tokens | [styles.css](../../apps/web/src/styles.css), pine/cream/gold, Inter/system with limited Georgia, radius/control/panel/gutters | Formalize existing roles; hard-coded module values still need semantic mapping |
| Prior design authority | [approved lock](../ui/UX_REFERO_DESIGN_LOCK_2026-10-08.md) | Continue approved warm operational direction; research alternatives require approval to replace it |
| Existing UX coverage | [parity ledger](../ui/UX_OPERATION_PARITY_LEDGER_2026-10-08.md), [remaining presentation work](../ui/UX_FRONTEND_REMAINING_IMPLEMENTATION_2026-10-08.md) | Partial source inventory and implemented/unverified presentation are separate from full parity |

Relevant runtime families remain in owning module components: approval-queue/CRM, project/template/task, document/revision/review/client-review, time/workforce, learning/training/library, turnkey/site/offline, external portal/gallery, performance/health/dashboard/reports, integrations/automation/assistance. The roadmap maps every slice; no operation is removed by this proposal.

## Personas and authorization constraints

Hierarchy is Organization → Branch → Team → Employee, with no separate Brand/Department tier. Every project owns one branch. Assignment, reporting tree, job title and action permission are distinct. Explicit cross-branch assignment is required. Default deny, explicit-deny precedence and current server authorization remain authoritative.

| Persona | Primary work | UX obligation |
|---|---|---|
| Owner | Oversight, setup, policies, exceptional approval/lifecycle | Show consequences/reasons/evidence; no integrity override implied |
| Team Leader / Project Lead | Explicit scoped management/reporting/project work | Titles do not confer unrestricted authority; distinguish request from decision |
| Employee/intern/part-time | Own/assigned/collaborating work, time, leave, learning | Prioritize next work, accurate dates/context and safe return |
| Site employee | Assigned active Turnkey field capture/report | Touch-first actions and clear local/server states; no broad finance access |
| Named reviewer | Exact assigned independent round/evidence | Version and next authorized action visible; no self-review |
| Primary / additional Client | Exact granted item and delegated review; Primary final batch | Isolated CLIENT session; item result differs from Primary passkey final batch |
| Consultant/vendor/factory | Narrow granted advisory/upload/progress/receipt | Separate EXTERNAL identity, exact expiry and no implicit internal release authority |
| Public visitor | Explicit published sanitized derivatives | No private project/file/portal information |

Cross-cutting immutable evidence, retained correction history, independent approvals, current source/field authorization and audit/events are design constraints, not optional friction to optimize away.

## Observations and confidence

| Finding | Evidence level | Consequence / next validation |
|---|---|---|
| New shell/groups and operational homes already exist | Current code and current reports | Standardize/validate; do not recreate |
| Project context crosses independent module routes | Code | Back/Forward/reload/filter/selection continuity test |
| CRM workflow is in legacy aggregate without first-class nav destination | Source | Proposed dedicated home is an IA improvement, not new CRM persistence |
| Module-specific CSS mixes root tokens with hard-coded colors/type | Source | Semantic token migration after approval; avoid broad overrides |
| IDENTITY phase badge remains in whole-app header | Source and live dashboard observation | Cosmetic/content correction; low effort, not a functional completion gate |
| Secondary text/focus color pairs need attention on cream | Calculated opaque colors | Proposed stronger text/focus; rendered verification still required |
| Many commands have conditional roles, reasons and evidence versions | Specs/source/parity ledger | Object-specific action contracts; no generic “Approve all” abstraction |
| Missing/unavailable data must remain factual | Specs and live dashboard | Independent source-state design; no synthetic totals |

Live read-only observation of the user's already open localhost59223/dashboard showed an Owner-labeled small-viewport dashboard with supporting data and all source cards reporting Permission denied/unavailable, Retry controls, a wrapped section chooser and fixed bottom navigation. This establishes only that rendered state. It does not establish the reason for denial, working positive journeys, desktop layout, current database acceptance or a measured usability defect. No action or record mutation was performed. Repeated Retry controls in a denied state warrant later comprehension testing; fixing permissions/backend is outside this request.

Three local Oct7 images were also visually inspected: [task split prototype](../ui/refero-revision-2026-10-07/task-split-desktop.png), [mobile task prototype](../ui/refero-revision-2026-10-07/tasks-mobile.png), [time prototype](../ui/people-review-2026-10-07/after-time.png). They explicitly show sample/reset-on-refresh validation UI. Use them for historical structure only; they are not current authenticated application captures.

## Scope for this delivery

In scope: Refero research, repository/workflow comparison, reusable proposed tokens/component/state/IA contracts, module priorities and future verification plan, persistent files under docs/design.

Out of scope: UI implementation, backend/schema/permissions changes, dependency installation, tests/fixture modifications, database provisioning/reset, deployment, external transmission or claims of production use. Existing concurrent work and status records remain intact. New design documentation is reviewable and does not silently supersede the approved lock.

