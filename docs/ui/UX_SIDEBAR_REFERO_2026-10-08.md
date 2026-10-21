# Sidebar Refero research and decision ledger — 2026-10-08

## Scope and authorization

This bounded desktop-navigation update is authorized against the approved [`UX_REFERO_DESIGN_LOCK_2026-10-08.md`](UX_REFERO_DESIGN_LOCK_2026-10-08.md). It covers the FND/web application shell and navigation presentation only; the S02 identity-security invariant R-099 remains unchanged. Preserve every current route, label, ordering, active-route behavior, access boundary, primary mobile destination, More dialog behavior, and all existing product/domain behavior. This work does not authorize broader G01–G12 completion or full UX acceptance.

## Research ledger

The root review inspected the following Refero flows and saved screens; this implementation consumes that reviewed evidence. Direct opening of the Refero flow URLs was unavailable to this documentation pass, so no additional interaction details are claimed beyond the reviewed observations recorded here.

| Reference | Reviewed observation | Applied decision |
| --- | --- | --- |
| [Linear compact/collapsible navigation, flow 6643](https://refero.design/flows/6643) | Compact route rows and collapsible navigation groups make a long destination list easier to scan. | Add group disclosure controls and compact text-plus-outline-icon route rows. Keep all group content available by disclosure or route filtering. |
| [Linear sidebar customization, flow 6680](https://refero.design/flows/6680) | Sidebar groups can be organized and collapsed as a distinct navigation behavior. | Preserve the existing Work, People, Insights, Manage taxonomy and order; offer local collapse controls, not user-configurable groups or persistent preferences. |
| [Hello Ivy persistent navigation, flow 4397](https://refero.design/flows/4397) | A compact persistent navigation remains available alongside the active workspace. | Retain the desktop sidebar as the route context while the content area changes; do not add a third content pane or duplicate route destinations. |
| [Linear reviewed light screen](https://refero.design/pages/3dad5d85-1680-4b79-8d5e-ecfed05bde18) | Light, restrained navigation reference. | Use existing Sense Studios cream/pine tokens and hairlines; no new palette. |
| [Hello Ivy reviewed screen](https://refero.design/pages/bee912f6-d68e-4a10-999f-6bd0b035ceb8) | Compact persistent navigation reference. | Keep labels readable, preserve the current desktop width, and use restrained icon outlines rather than icon-only navigation. |
| [Linear existing lock screen](https://refero.design/pages/4a094449-e0ab-4893-8e58-c6239e7c228c) | Existing grouped navigation reference already captured in the approved design lock. | Treat as supporting evidence; the approved Sense Studios design lock remains primary. |
| Full Loops style reference (reviewed screen `32b75557-0663-4570-9859-36f19afe41c1`) | System sans-serif, compact 12px hierarchy, fine separators. | Use a clear compact label hierarchy and subtle separators without adopting another brand's palette. |
| Dropbox style reference (reviewed screen `3585a6ac-12d4-4ace-88b8-a8089c109250`) | Low shadow and monochrome outlined icon treatment. | Use small, decorative, monochrome outline route icons and avoid shadows that compete with route state. |

The reference flows inform interaction and density only. They do not override the approved brand, current route model, permission enforcement, or the user's existing small-screen workflow.

## Locked visual direction

- Preserve current brand colors: canvas `#f4f1e9`, surface `#faf8f2`, ink `#182c29`, pine `#29463d`, muted text `#61736b`, hairline `#d9d8cd`, active surface `#e3eadf`, and gold focus `#b98f49`.
- Preserve current desktop sidebar widths and brand mark usage. Keep typography on the existing system-sans/Inter stack.
- Keep compact text labels with restrained decorative outline icons. Desktop rows target 32–36px; mobile/touch targets remain at least 44px.
- Do not introduce a full-sidebar icon-only collapse, new marketing surface, new palette, persistent preference, fabricated counts, or route duplication.

## Implementation decision ledger

1. **Notifications utility and route parity.** Keep one active Notifications utility `NavLink` in the desktop sidebar and exclude only `/notifications` from the desktop Work group. Keep the existing mobile Notifications control and do not duplicate it in a second desktop location. Preserve all 21 route labels, hrefs, group ordering, and active `NavLink` semantics.
2. **Local route filter.** Add a desktop-only `Find a page` label and `Filter navigation…` input. It matches route labels only; it does not search work content, invoke APIs, or imply permission discovery. Provide a clear control only when a query exists, truthful no-results text, and a clear action. Search temporarily expands matching groups and clearing restores the user's local collapse choices.
3. **Collapsible group controls.** Work, People, Insights, and Manage become heading buttons with `aria-expanded` and unique `aria-controls` targets. Work is initially open. Other groups start closed unless they contain the current route. Route changes open the destination's group. Users may collapse the active group; its active route stays represented in the visible desktop context marker and the group button gets a non-color active indication. Do not put `aria-current` on group headings.
4. **Independent desktop/mobile state.** Desktop disclosure and filtering do not change the mobile More sheet. The mobile More dialog continues to show every non-primary destination in all four groups with existing focus trap, Escape, backdrop, navigation, and resize behavior. Preserve primary My Work, Tasks, and Documents links.
5. **Unique accessibility targets.** Desktop and mobile render their own group headings and content concurrently at some viewport conditions. Use unique IDs for each instance and maintain valid `aria-labelledby`/`aria-controls` relationships.
6. **Sidebar layout.** Keep the existing app header non-sticky. Start the desktop sidebar at viewport top, with a viewport-height flex shell capped to `100dvh`; keep the sidebar heading/filter stable while its group list scrolls (`min-height: 0`). Do not hide navigation in a footer or make disclosure controls unreachable on short screens.
7. **Icons and active states.** Use decorative `aria-hidden` SVGs with `focusable="false"`, a shared route-to-icon mapping, existing active-route semantics, visible keyboard focus in gold, and textual labels at every desktop width.

## Existing route map to preserve

| Group | Paths and labels in current order |
| --- | --- |
| Work | `/my-work` My Work; `/decisions` Decisions; `/notifications` Notifications (desktop utility only); `/tasks` Tasks; `/projects` Projects; `/documents` Project documents; `/revisions` Drawing register; `/reviews` Internal reviews; `/client-reviews` Client reviews; `/assistance` Evidence assistance; `/turnkey` Turnkey operations; `/site` Site delivery |
| People | `/time` Time; `/workforce` Workforce; `/learning` Learning |
| Insights | `/dashboard` Dashboard & reports; `/performance` Performance |
| Manage | `/settings` Account & settings; `/integrations` Integrations; `/automation` Automation & reports; `/external-access` External access |

The complete set remains 21 destinations; the desktop Work group visually omits only the item provided by the Notifications utility, and the mobile More dialog omits the three existing primary routes.

## Acceptance boundary and status

Acceptance requires exact label/href parity, preserved active route behavior including nested routes and query strings, working desktop filter/clear/no-results and collapse state, current-route group opening on navigation, no IDs duplicated across desktop/mobile, short-height/tablet reachability of all desktop destinations, and unchanged mobile More keyboard/focus/backdrop/navigation/resize behavior. Verify keyboard focus, reduced-motion expectations, readable layout at desktop/tablet widths, and mobile touch target sizing during root-owned visual checks.

This ledger records the settled design and implementation decisions before source changes. The sidebar is implemented and served by the live Vite preview. Full acceptance remains in progress because the production build was not completed. This bounded sidebar work does not complete the wider UX program or claim production or actual-project validation.

## Observed checks and limitations

- Node 24.19.0 web TypeScript and scoped navigation ESLint exited 0 for the initial implementation. Final adjustments added only CSS sizing/focus and replaced an SVG path string; the initial checks were not rerun afterward. Targeted whitespace checks passed after those adjustments.
- The first production-build invocation used the wrong root dependency path and failed with MODULE_NOT_FOUND. The corrected invocation was not executed: automatic approval review failed because its usage limit was reached. This is an approval-service availability limitation, not an unsafe-action determination; the approval check was not bypassed.
- Authenticated live browser review covered desktop 1152×884, mobile 390×844 and short tablet 900×600. Default Work expansion, People expansion, report filtering across Insights/Manage, no-results/clear, lower Manage destination navigation and current-route reopening were observed. DOM inspection found 21 distinct sidebar destinations, no duplicate IDs, and a 3px gold keyboard outline on the Notifications utility.
- Mobile More opened with Close focused; Shift+Tab wrapped to External access; Escape closed the sheet and restored focus to More. The initial review exposed a stretched mobile bar on short content. Explicit mobile grid row sizing corrected it, and the updated capture shows the normal compact bar.
- The viewport override was reset and the existing tab was returned to the selected Documents route. Captures: .env.checkpoint-tools/sidebar-refero-20261008/before-desktop.jpg, after-desktop.jpg, after-mobile.jpg and after-tablet.jpg.
- No test suites were added or run. The existing navigation unit assertion assumes every desktop group is always expanded and Notifications lives inside the group; that assertion needs an authorized update before claiming navigation-suite acceptance. The wider application's permission-denied page states were present before this sidebar work and remain outside its scope.

Actual routing: GPT-6.1 Sol context interpretation/source review; GPT-6 Luna bounded sidebar implementation; root live visual review. No backend, database, session, grant or domain behavior was changed.
