# Dashboard navigation and overview refinement — 2026-10-08

Status: implementation in progress under the current Owner instruction.

## Scope and requirement anchors

The Owner requests Dashboard as the first workspace destination above Work, and as the first page after ordinary sign-in, with an improved dashboard UI/UX. Requirement anchors: R-073.a–c (internal role dashboards), R-074.a–b (typed management attention), R-006/R-092/R-099 (identity, source authorization and navigation), G08–G10 (exact evidence, partial source states and factual health), and F-G04 (workspace navigation). S24 dashboard/report behavior remains accepted only within its recorded fingerprint; current-tree operational acceptance is tracked separately.

In scope: the existing web workspace sidebar/mobile More sheet; the existing authenticated `/` route; the existing Dashboard overview and its presentation. Keep the report, summary, reminder, schedule, and navigation destinations reachable.

Out of scope: API, schema, authentication policy, permission grants, source queries, report semantics, task/decision state changes, new dashboard metrics, synthetic recommendations, and edits to concurrent S18/S27 or other unrelated work.

## Refero research and reference lock

Refero MCP style searches covered spacious enterprise software, operations dashboards, Linear, and Attio. Full style references retrieved: Perplexity AI (`5c7acdfb-996b-4c6f-b361-264a3f580f7d`), Operate (`a0f473eb-0310-4df5-b5f6-5bc124ad5954`), and Attio (`9f0c028b-6b11-415e-ab92-f32e4597cbe2`). Screen research included Wrike analytics (`d1f4e91a-7898-4976-9ace-d3f0bc92979a`), Visitors activity (`6ea55f03-f093-4aa5-a728-506c908d6889`), and Hello Ivy's Workspace Overview flow (flow `4397`, overview screen `bee912f6-d68e-4a10-999f-6bd0b035ceb8`). Workspace sign-in/entry flow `11908` was reviewed as a sequence reference.

- **Primary direction:** a calm, precise, source-led workspace inspired by Perplexity's digital-parchment restraint and clear persistent navigation. It informs hierarchy and surface quietness only; its palette does not replace Sense tokens.
- **Preserve:** Sense Studios' cream/pine/gold palette; compact operational type; clear Dashboard context; responsive two-column-to-one-column information grid; factual, independent source cards; semantic unavailable/loading/empty/error states; keyboard and screen-reader order.
- **Borrow:** Hello Ivy's concise overview context and grouped task/project metadata; Operate's ledger-like alignment and fine rules; Attio's compact interaction hierarchy and restrained separators. Do not import its marketing hero or font/palette.
- **Token roles:** canvas `#f4f1e9`; surfaces `#faf8f2`/`#fffdf7`; pine `#182c29`/`#29463d`; muted body `#61736b`; hairline `#d9d8cd`; active `#e3eadf`; gold focus/accent `#e7c680`/`#b98f49`. Keep status colors semantic. Use Inter/system sans for controls/body and only existing limited Georgia heading use.
- **Layout and content decisions:** standalone Dashboard link is the first item above the Work group and no longer duplicated in Insights. The mobile primary bar starts with Dashboard while My Work, Tasks, Documents, and More destinations remain reachable. Ordinary authenticated `/` opens `/dashboard`; preserve the Owner setup exception, explicit `/workspace` route, and `/?taskId=…` task deep link. Use the compact factual date/account context, put decisions and tasks first in actual DOM order, then show the remaining source sections. Retain every source's current independent loading/error/retry/read time and source-provided rows/order. Do not add aggregate counts or sum the overlapping task sections.
- **Reject:** generic KPI totals, zeros replacing unavailable data, fabricated success/health/attention scores, charts without authorized complete aggregates, new permission semantics, full-app dark mode, decorative gradients, and marketing-sized dashboard headlines.
- **Media:** none; use code-native structure and existing icons/brand mark.

## Acceptance plan

Review route exceptions and current auth/request/authz boundaries; pinned frontend typecheck, scoped lint and production build; visually inspect authenticated desktop and mobile states for first-position Dashboard, active navigation, wrapping, partial/error/empty states, and continued report and destination reachability. Do not add or run tests under the current instruction. Record runtime/integration or acceptance limitations plainly. No current work claims production readiness.

## Decision ledger

1. Replace the old navigation lock's Dashboard placement/combined label/mobile-primary preservation only as explicitly superseded by this Owner request; retain all other destinations and the mobile More interaction.
2. Change only the ordinary authenticated home destination. Keep exact task-link redirection and Owner setup access intact.
3. Improve information order and spacing without changing service contracts, role boundaries, field meanings, or mutations. Permission errors remain visibly errors; missing/stale/denied evidence never renders as zero or all-clear.
4. Keep decision and task source cards first in DOM order so keyboard and assistive-technology sequence follows the visible priority.
5. At widths below 360px, keep the four primary destination labels legible and move the Bell shortcut into More; Notifications remains directly available there.

## Execution record — 2026-10-08

Implemented the route/nav and source-card changes in `apps/web/src/app.tsx`, `workspace-navigation.tsx`/`.css`, `dashboard.tsx`/`.css`; also removed the body 320px minimum that forced horizontal scrolling when a 320px viewport had a vertical scrollbar, and added narrow-phone nav sizing in `apps/web/src/styles.css` and `workspace-navigation.css`.

Live CUA review confirmed the ordinary signed-in `/` route lands at `/dashboard`; desktop and 390px mobile show Dashboard first with the correct active state. At 320px there is no horizontal document overflow; Dashboard, My Work, Tasks, Project documents remain in the primary row, and the More panel retains Notifications and all other destinations. Decision center and tasks are first in dashboard DOM/accessibility order. The report actions/routes remain present in source. Current `owner@local.test` data requests show `Permission denied` and organization date `Unavailable`; this change deliberately does not alter account grants or authorization.

Scoped ESLint passed for `app.tsx`, `workspace-navigation.tsx`, and `dashboard.tsx`. Web typecheck remains IN PROGRESS: direct TypeScript execution fails on broad current dependency declaration errors, including missing `react-router-dom` and Testing Library exports throughout the existing web tree; those environment errors prevent a clean full-project typecheck result. The web build was not verified: installed pnpm is 11.25.0 rather than pinned 11.19.0; Corepack could not download 11.19.0 because registry DNS was unavailable, and the available pnpm build attempt failed with EPERM resolving the workspace app path. No tests were added or run. No production readiness or full-project acceptance is claimed.
