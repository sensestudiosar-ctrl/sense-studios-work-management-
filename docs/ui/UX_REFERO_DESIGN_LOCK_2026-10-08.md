# Refero design lock — Sense Studios workspaces

Date: 2026-10-08
Status: approved for direct implementation by the Owner's “implement this plan” instruction.

## Brief

Designing the authenticated Sense Studios work-management workspace for Owners, staff, and project collaborators on desktop and mobile. The goal is to make navigation, daily work, task/project context, and source-backed insights easy to scan without changing permissions or domain behavior. The current brand direction is warm, precise, and operationally trustworthy. Existing session states and accurate/unavailable data must remain clear.

## Refero research

Visual references retrieved through Refero MCP:

- [Zelt style](https://zelt.app): near-neutral warm canvas, clean light surfaces, restrained actions, and low visual noise. Adapt the surface hierarchy and spacing discipline; do not copy its amber tokens.
- [Say Briefly style](https://saybriefly.com): deep olive as a strong text/navigation anchor, concise typographic hierarchy, and controlled accent use. Adapt the hierarchy, not its palette or marketing typography.
- [Linear task workspace](https://refero.design/pages/4a094449-e0ab-4893-8e58-c6239e7c228c): grouped navigation, precise task rows, and separation of workspace, list, and contextual detail. Adapt the task scanning and grouping patterns; do not copy its dark theme or third-column profile panel.
- [Hello Ivy task board](https://refero.design/pages/6e885ff3-df28-46a7-83c2-3888e8c4f07a): clear work-state grouping, filters, compact metadata, and assignee/date cues. Adapt board/list hierarchy only; retain this app's accepted task states and commands.

## Reference lock

- **Primary direction:** warm, low-noise operational workspace inspired by Zelt's surface contrast and spacing discipline.
- **Preserve:** Sense Studios' forest/cream/gold identity; dense but readable work rows; factual source labels; existing route and permission boundaries; keyboard-visible focus and error/empty/loading states.
- **Borrow:** Say Briefly's restrained dark-olive hierarchy; Linear/Hello Ivy's compact row metadata and explicit view/state grouping.
- **Token roles:** existing cream canvas (`#f4f1e9`), warm header/surface (`#faf8f2` / `#fffdf7`), pine ink/actions (`#182c29` / `#29463d`), muted body (`#61736b`), hairline (`#d9d8cd`), active surface (`#e3eadf`), gold accent/focus (`#e7c680` / `#b98f49`). Status/error colors retain their semantic meaning. Do not repurpose status hues as decoration.
- **Typography:** Inter/system sans for application controls, tables, labels, and navigation; Georgia remains for limited brand/editorial headings where already established. Use compact page headings on operational routes instead of promotional hero sizing.
- **Layout:** grouped desktop sidebar; mobile keeps a short primary destination bar plus the accessible More sheet; content uses a consistent gutter and maximum readable width; tables preserve essential fields or switch to stacked cards where they otherwise overflow.
- **Reject:** full-app dark mode, oversized marketing heroes, decorative pastel panels, generic bright-blue link/button overrides, heavy shadows, route duplication, and any synthetic score/status.
- **Media:** no new imagery; use code-native layout and existing brand mark. Work surfaces need information hierarchy, not decorative assets.

## Implementation decision ledger

1. Group all current destinations under Work, People, Insights, and Manage; preserve every href, label, active route, mobile primary destination, and dialog keyboard behavior.
2. Give Dashboard a clear heading/context strip, compact factual summary, and predictable source-card hierarchy. Keep independently authorized source cards, retry paths, timestamps, and unscored/unavailable language intact.
3. Standardize Task and Project canvas, panels, filters, status tags, actions, and selected rows on the existing brand tokens. Do not change commands, fields, scopes, or selection semantics.
4. Tune responsive breakpoints and control wrapping without hiding information, weakening contrast, or changing focus order.

## Acceptance boundary

This is a presentation refinement. It does not close all G01–G12 contract gaps, add new mobile/product capabilities, or claim actual-project/production validation. Current authenticated browser acceptance depends on a dedicated local runtime; code-level and relevant unit/build gates must still pass.
