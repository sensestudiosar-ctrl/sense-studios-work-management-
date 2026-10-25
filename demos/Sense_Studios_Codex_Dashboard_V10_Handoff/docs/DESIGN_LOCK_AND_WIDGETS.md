# V10 design lock and widget decisions

## Locked references
- Primary visual + interaction target: `reference/Sense_Studios_Dashboard_V10_Refined_Shell.html`.
- Prior widget editing details: `reference/Sense_Studios_Dashboard_V9_Customizable_Apple_Widgets.html`.
- Navigation hierarchy: [Linear light workspace](https://refero.design/pages/e78dc2c3-4fb5-41e4-8be5-5664f34acd95) with useful compact/persistent sidebar; [monday workspace](https://refero.design/pages/5f085460-f769-40f8-ae05-85aae7b82f01) with active work context.
- Home scan reference: [Asana Home](https://refero.design/pages/aed51553-d67a-4b4b-a956-31d83d455f39).
- Workload reference: [Wrike](https://refero.design/pages/8bb3f47e-e801-4864-a8e9-280512bbadb4) contextual workload bars.
- Widget editing inspiration: [iOS add-widget reference](https://refero.design/screens/ffe5a38b-1816-45e7-bebb-ce07f1a190c7). Not a direct Apple clone.

## Color roles
- Canvas cream: `#f4f1e9`; card paper: `#fffdf7`; soft panel: `#faf8f2`.
- Primary pine / dark text: `#182c29`; action pine: `#29463d`; text: `#20332e`; secondary text: `#61736b`.
- Border: `#d9d8cd`; active surface: `#e3eadf`; focus/gold: `#e7c680`, deeper `#b98f49`.
- Genuine danger / overdue: `#a7463b` (semantic; no decorative red).
- Typeface: Inter/system sans. Compact professional hierarchy; 8/12/14/16 spacing rhythm with tight cards.

## Shell map
- Desktop left: Brand + organization; Dashboard / My Work / Projects / Decisions; collapsible Project Delivery / People & Insights / More Tools; bottom Settings + account. Current route highlighted, collapse-to-icon rail.
- Desktop top: breadcrumb + current context; page finder (Ctrl/Cmd+K); notifications; account; one New Task action.
- Mobile top: context, search, notifications. Mobile fixed bottom: Home / My Work / Projects / Decisions / More. Floating New Task above bar; accessible More bottom sheet.

## Widget IDs and actual V9/V10 demo defaults
The IDs listed here are found in source HTML `WIDGET_INFO` and `WIDGET_DEFAULTS`. They are proposed stable UI registry IDs, not existing domain endpoints.

| Widget ID | Purpose | Default? |
|---|---|---|
| `time` | Compact Time Tracking | Most, only when action permitted |
| `decisions` | Separate approvals and assigned review rounds | Owner, manager, named reviewer |
| `projects` | Authorized projects + milestones/risks | Owner, manager, employee, site, cross-branch |
| `performance` | ONE Team/Employee panel (Owner), employee-only for manager | Owner and permitted team manager |
| `nextAction` | Single actionable task preview | Employee, site, reviewer, cross-branch |
| `site` | Assigned site/snags | Site |
| `workload` | Supplemental relative workload | Optional authorized widget |
| `training` | Supplemental training | Optional authorized widget |
| `health` | Supplemental project-risk breakdown | Optional authorized widget |
| `signals` | Supplemental task distribution | Optional authorized widget |
| `shortcuts` | Module links | Optional authorized widget |

Exact V10 prototype defaults:

```
owner:    time, decisions, projects, performance
manager:  time, decisions, projects, performance
employee: time, nextAction, projects
site:     time, nextAction, site, projects
reviewer: decisions, nextAction, time
cross:    time, nextAction, projects
```

The five primary task summary cards are fixed. The Attention Queue is a final fixed module with two initial rows. Everything else can be hidden/reordered through Edit Widgets if authorized.

## Personalization
- Desktop: independent natural-height columns, no dead space. Mobile: single column.
- Enter Customize through button/long-press, then Move, Add, Hide, Reset and Done. No continuous wiggle; reduced-motion safe.
- Persist only widget ID/order/column display preference per account, distinct desktop/mobile order; the demo localStorage does not constitute production persistence.
- Role/access change intersects saved widget list with newly permitted catalog and must purge hidden protected data.

## Important prohibited shortcuts
- No fake percentage team score from task counts; no fabricated leave capacity or utilization.
- No client-side role grant based on title or widget display.
- No unlimited page finder/global search claim.
- No generic approve/complete dropdown; every action uses its own review/approval/task service.
- No duplicate Owner team and employee performance widgets.
- No full-width timer, no Attention Queue at top.
- No backend rewrites, no schema changes without new approved decision.
