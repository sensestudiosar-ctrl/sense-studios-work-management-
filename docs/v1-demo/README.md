# Build tab demos in ChatGPT, then hand them back for integration

This pack accompanies the [V1 internal pilot plan](../development/V1_INTERNAL_PILOT_PLAN_2026-10-15.md). The [backend contract](BACKEND_CONTRACT.md) describes the real data and workflows for each requested tab and labels additions that need implementation.

Start with the focused [application shell and Dashboard demo brief](SHELL_DASHBOARD_DEMO_BRIEF.md). Attach it alongside the backend contract and the approved My Work visual reference.

## Recommended demo order

1. Shared shell and reusable UI controls.
2. Task creation and task detail.
3. My Work.
4. Projects, including its child tabs.
5. People management.
6. Settings and access control.
7. Dashboard, Decisions and Notifications as supporting workspaces.

Use the same fictional organization, people, projects and tasks across the demos. The task created in demo 2 should appear with the same ID in My Work and Project Tasks. Build one tab at a time to keep review and later integration manageable.

## What to attach in ChatGPT

Attach `BACKEND_CONTRACT.md`, the relevant approved existing demo/reference if available, and any previous accepted tab demo so the visual system stays consistent. The contract is self-contained for the tab's backend rules; ChatGPT does not need repository credentials, database access, private staff data or real project documents.

## Copy this prompt for each tab

```text
Create an interactive visual demo for the [TAB NAME] tab of the Sense Studios
Work Management application, using the attached BACKEND_CONTRACT.md.

This is a demo for a future internal pilot with real staff. Use synthetic data
and an in-memory mock API; do not contact real services or ask for credentials.

Read the shared identity/access rules, the relevant tab section, and the
contract-gap register before designing. Keep EXISTING SOURCE, PROPOSED V1
and DEMO MODEL clearly distinguished in your technical handoff notes.

Match the attached approved visual reference and previous tab demos. If no
visual reference is attached, propose the visual direction before finalizing it.
Use the same shell, typography, colors, spacing, buttons, forms, badges and
person/project/task IDs throughout. Do not replace domain rules with UI guesses.

Deliver a self-contained interactive HTML file with CSS and JavaScript, or a
complete small React/TypeScript source package with all local assets. Include
editable source, not only an image. Avoid build dependencies for a single HTML
demo. Keep mock API/data access separate from rendering and event handlers.

Make every button and filter behave: open dialogs/drawers, save to the shared
mock store, update matching lists/counts and preserve context on return. Simulate
loading, empty, denied, network error, stale data and conflict states. Label
simulated/proposed behavior in the handoff rather than pretending it is live.

Use the actual canonical task/project states, API field names and limits.
Respect explicit access, exactly one task owner, required Target, separate
Committed date, independent reviewers and human approval. A status dropdown
cannot bypass workflows. Role presentation is not permission.

Use organization day 2026-10-15, timezone Asia/Kolkata, for repeatable examples.
Verify layouts at 1440, 1024, 390 and 320px, short mobile heights, keyboard/focus,
long names, many rows, form errors and unsaved changes. Protect first-action
visibility on small screens. Use readable labels and semantic icons/status text.

If the design needs new data, actions, permission rules or APIs, list each as
PROPOSED with its reason. Do not invent backend availability. Keep a clear
integration mapping from each screen action to its existing/proposed contract.

Return the working source/assets, a short interaction map, the synthetic fixture
data, state/role scenarios, and the proposed backend-gap list.
```

## Add one tab-specific paragraph

| Tab | Add this instruction |
| --- | --- |
| Shared shell | “Show Dashboard, My Work, Projects, People, supporting workspaces and Settings with desktop grouped navigation and mobile More. Preserve Dashboard as the existing default entry. Use capability-aware menus and accessible focus behavior.” |
| Task creation/detail | “One composer must launch from My Work, Tasks and Project Tasks, with required essentials, progressive optional planning, context-valid people/project choices, review requirement and error recovery. An employee-less Owner chooses an employee. Implement real-child and checklist distinction in detail.” |
| My Work | “Build personal tasks and the typed Needs action queue, separate task/review/decision counts, Overdue/Waiting, filters with Clear restoration, existing supported views and canonical task/review/decision opening. Include an empty Owner personal queue with separate management actions.” |
| Projects | “Build list/detail with Overview, Plan, Tasks, People, Documents, Reviews, Delivery and Activity. Embed the shared task list/composer. Project membership and lead appointment remain Owner-only under the existing APIs. Show explicit Draft-to-Active readiness and gated completion.” |
| People | “Build Owner directory, scoped manager view, self view, onboarding, person details, membership/reporting/roles, access explanation and project-assignment links. Mark display names/unified self/exited reads as proposed. Suspension and exit are different; never delete history or auto-reassign all work.” |
| Settings/access | “Build focused personal and Owner panels. Use a readable permission catalogue with separate role bundles, employee overrides and membership; generic scopes are ORGANIZATION/BRANCH/TEAM/SELF. Each panel has current values, draft, Save/Cancel, required reason, recent-sign-in recovery and real error states.” |
| Supporting tabs | “Build Dashboard source summaries, Decisions navigating to owning workflows, and the personal Notifications inbox. No generic approve-anything action or fake aggregate/score.” |

## What to hand back to Codex

- The exact HTML or complete component/source package and local assets/fonts actually used.
- Which tab/revision it represents and the visual reference it matches; include any intentional responsive differences.
- Synthetic fixture data and stable IDs, including Owner/manager/employee/site/reviewer contexts and denied cross-branch examples.
- A short list of working interactions, expected save/error/conflict behavior and route/context restoration.
- A list of proposed new fields/APIs/workflow rules, separate from current-contract behavior.
- Screenshots or a recording are useful supplementary references; source is needed to preserve the UI and working pattern accurately.

## How the real-app integration will work

1. Inspect the returned demo and map every visible field/action to the current contract and permissions.
2. Record a concrete gap list; resolve material workflow/access/schema choices before dependent code. Existing settled rules stay settled.
3. Reuse shared production components where possible, adapt the approved UI, and replace mocks with typed owning-service API calls.
4. Add only reviewed additive backend changes required for agreed gaps, with real persistence/audit/version/authorization checks.
5. Verify source checks and actual desktop/mobile authenticated journeys, including denied/revoked/stale/concurrent cases. Compare integrated captures to the exact returned demo.
6. Deliver the working bounded slice for Owner acceptance. A demo's visual acceptance is not backend, current-tree or pilot acceptance.

The initial pack was prepared without application changes. Delivery has since started; the backend contract records the first source additions and links to exact verification. Use its current labels when making demos. No migration, retained-data mutation or pilot acceptance is implied.
