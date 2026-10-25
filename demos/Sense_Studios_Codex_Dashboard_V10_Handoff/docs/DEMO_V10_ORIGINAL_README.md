# Sense Studios · Dashboard V10 — Shell & Left Navigation

**Standalone HTML prototype:** `index.html`. Open the saved file directly in Chrome, Edge, or Safari. The interface is self-contained with embedded CSS/JavaScript and synthetic demo data. It is not a connected production system.

## What changed from V9

- Refined desktop sidebar with restrained pine hierarchy, clear everyday links (Dashboard, My Work, Projects, Decisions), collapsible Project Delivery, People & Insights, and More Tools groups.
- Group links and the page-finder list are filtered using the **synthetic demo's capability flags**. Backend service authorization remains mandatory in production; navigation filtering is not security enforcement.
- Workspace context clearly identifies the current view without pretending to switch organization permissions.
- Redesigned top header with page breadcrumb, context, quick page finder, one prominent New Task entry, inbox/notifications and identity access.
- **Ctrl/Cmd + K** (or `/` outside input controls) opens a keyboard-accessible page finder; type a page name and press Enter to open, Escape to close. The page finder searches **pages**, not record content.
- Collapsed sidebar becomes a focused icon rail; its search icon opens the same page finder.
- Mobile header exposes search + notifications, with existing fixed bottom navigation and floating task-create control intact.
- Role-specific customizable V9 dashboard, draggable cards, compact time tracker, unified performance and bottom Attention Queue remain unchanged.
- V9 non-JavaScript static fallback updated with the reorganized primary navigation.

## How to test

1. Select an actor with **Demo Controls** (Owner, Scoped Manager, Employee, Site Employee, Reviewer, Cross-branch).
2. Expand/collapse left-side navigation categories and the full sidebar.
3. Click **Find a page**, or press **Ctrl/Cmd + K**; try searching `Projects` and pressing Enter.
4. Open **Customize** and use the V9 drag / add / hide widgets interface.
5. Change the actor and verify permitted pages in the sidebar/page finder.
6. At a narrow/mobile browser width, test the top search icon, bottom tabs, task-create button and More sheet.

## Validation performed

- Chromium injected-page checks at viewport widths 1440, 1024, 390 and 320px, with no detected JavaScript page errors and no document-level horizontal overflow.
- Checked logo rendering, nav grouping, sidebar collapse, Ctrl+K page selection/navigation, Dashboard return, widget edit mode, mobile page finder and mobile bottom navigation.
- Confirmed employee role cannot find performance in the page finder when their demo permission disallows it. Employee has a valid Decisions demo capability; it should not be assumed to be inaccessible merely because the role is Employee.
- `node --check` passed for the extracted in-file JavaScript.
- Direct file:// behavior was not independently tested here. A browser that disallows JavaScript may show the static fallback instead.

## Refero reference decisions

- **Primary structure:** Linear light workspace sidebar — [reference](https://refero.design/pages/e78dc2c3-4fb5-41e4-8be5-5664f34acd95). Adopted stable destinations and grouped secondary areas, not its brand palette.
- **Secondary:** monday.com workspace navigation — [reference](https://refero.design/pages/5f085460-f769-40f8-ae05-85aae7b82f01). Adopted workspace context and compact active navigation.
- **Styling discipline:** shadcn/ui flat utility surfaces and subdued borders — [source](https://ui.shadcn.com). Preserved Sense pine/cream/gold tokens.

## Production integration boundaries

Navigation and spotlight must use server-provided authenticated capabilities in the real app. The page finder should consume the same route/access registry as sidebar and mobile menus. Store sidebar collapse and expanded group choices per user if desired. Search result links must still be validated by the corresponding owning endpoints. Do not infer role grants from UI labels, demo permissions or navigation placement.

The date and all stats shown are frozen synthetic demo fixtures dated 2026-10-15, Asia/Kolkata. Module routes beyond Dashboard remain integration previews.
