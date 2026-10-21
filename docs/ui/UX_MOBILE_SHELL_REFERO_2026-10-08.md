# Mobile navigation and authenticated header — Refero lock (2026-10-08)

## Scope and requirement anchors

Current Owner request: move the mobile primary destination bar to the bottom of the screen, put Notifications in the top site header, and provide a global Log out action there. Anchors: FND shell / SC-00–SC-01 and R-006–R-009 equivalent desktop/mobile destination access; S02 identity and session controls R-005.a–b, R-007.a/c, R-099.a/b/f and C-008; existing NTF `/notifications` route. This updates only presentation and authenticated shell access. Keep the four current mobile destinations, Dashboard first, More sheet routes/keyboard behavior, desktop grouped sidebar, existing identity boundaries, CSRF enforcement, offline-data cleanup and session-ended event.

## Refero research

Styles were searched across warm operational SaaS, calm productivity, known-product and dark floating-navigation directions, then retrieved in full for PostHog, Perplexity AI, Dimension and Evernote. App-screen references were searched and retrieved for Slite Notifications, Perplexity Account, and Dribbble's user menu. Refero's indexed app screens were desktop captures; the mobile placement decision therefore follows the Owner's provided mobile screenshot plus the Dimension style's persistent bottom-navigation placement, not an unverified mobile screenshot claim. Account actions are grounded in Perplexity's clearly grouped System section and Dribbble's top-right user menu with a distinct Sign out item. Slite's notification panel anchors a compact Notifications entry with a clear title and functional control.

## Reference lock

- **Primary direction:** keep the approved Sense Studios warm, precise workspace language and existing tokens; keep the mobile destinations visible as a compact, persistent bottom bar.
- **Adapt:** Dimension's viewport-anchored navigation placement only. Do not carry its dark surfaces, translucency, blurred glass or pill treatment into this app.
- **Borrow:** Slite's clear notification utility and Perplexity/Dribbble's explicit, plainly labelled account sign-out affordance. Put the bell in the existing top header; make Log out a direct, text-labelled action.
- **Preserve token roles:** canvas `#f4f1e9`, header/surface `#faf8f2` / `#fffdf7`, pine `#182c29` / `#29463d`, muted `#61736b`, hairline `#d9d8cd`, active `#e3eadf`, gold focus `#b98f49`. No palette, typography or status-color changes.
- **Reject:** duplicate Notifications bells, hidden account actions behind a newly introduced menu, bottom bars that obscure page/footer content, and any front-end-only logout or weakened CSRF/session behavior.

## Implementation ledger

1. At widths below the existing 768px desktop breakpoint, pin the current four destination links plus More to the viewport bottom; account for `safe-area-inset-bottom` and reserve the bar height after page/footer content so it stays reachable while scrolling.
2. Place one accessible Notifications icon link in the global site header for authenticated sessions, retain the same `/notifications` route, and remove the duplicate bell from both mobile bar and desktop sidebar utilities. Keep Notifications accessible in the mobile More destinations as well.
3. Place a visible, text-labelled Log out action in the global site header only while authenticated. It uses the existing `POST /api/v1/auth/logout`, cookie credentials and session CSRF token. On success or already-ended session, preserve the existing offline account purge, pointer clear, `sense-session-ended` event, and navigate to the signed-out/root route. On failure, show an accessible error and leave the session intact.
4. Do not show Notifications during required Owner setup. Keep Dashboard first, preserve all route targets/active states, desktop grouped navigation, More dialog focus/escape/backdrop behavior and current business permissions.
5. Keep the global header visible at the top while scrolling. Measure its actual rendered height with `ResizeObserver` into `--sense-header-height`, retaining a safe CSS fallback for initial layout; offset and size the desktop sticky sidebar below the header using viewport-height fallback declarations. Keep the mobile bottom bar below the header and the native More dialog above both sticky elements.

## Acceptance plan and boundaries

Inspect existing auth/session paths and current mobile More behavior; run only scoped source/lint/build checks that are available (no test suites are authorized in this task); inspect authenticated renders at 320, 390 and 700px, plus desktop to confirm the sidebar is unchanged. Verify top-header Notifications and Log out visibility, safe-area/content/footer clearance, active route, keyboard focus, and successful/failed logout UI using the existing local fixture if available. This increment makes no schema/API/domain change and does not claim production or actual-project acceptance.

The sticky-header follow-up adds acceptance points: scroll an authenticated desktop workspace and confirm the global header stays at viewport top while the sidebar starts immediately below it and fits the remaining viewport; inspect the <=640px wrapped header and confirm the source measures it into `--sense-header-height`; open More and confirm its dialog is layered above the sticky header.

## Observed checks and limits

- Scoped ESLint passed for `apps/web/src/app.tsx` and `apps/web/src/workspace-navigation.tsx`; `git diff --check` passed for the touched source and planning files. No tests, typecheck, or production build were run by this increment.
- Authenticated CUA review at 320×720, 390×844, 700×884 and 1152×884 showed the bottom bar fixed to the viewport, four routes fitting without horizontal overflow, bell and Log out in the top header, no desktop sidebar bell, and the desktop navigation still grouped. At narrow widths the long Documents label wraps cleanly.
- More opens at 320px with Dashboard and Notifications among available destinations; Escape closes it and restores focus to More. The mobile bottom scroll state showed the final task controls and footer above the fixed bar after reserved footer space was added.
- Logout was reviewed in source but not submitted during visual acceptance; no session or offline data was changed. The local Owner source panels continue to show their existing Permission denied state.
- Existing current-tree typecheck/build limitations are documented in `CURRENT_STATE.md` and `IMPLEMENTATION_STATUS.md`; this shell increment remains IN PROGRESS pending those gates. No backend/schema/permission/auth policy changes or production/actual-project claims.
- Sticky-header follow-up visual review: on the 1265×710 desktop app tab, scrolling the dashboard kept the header at the viewport top and the sidebar began directly below it; the sidebar remained viewport-height constrained and internally scrollable. On the 446px mobile tab, the two-row header stayed pinned while dashboard content scrolled and the bottom bar remained at the viewport edge. More opened over the page with its backdrop covering the sticky header; Escape closed it and restored focus to More. The 446px view also showed the wrapped header; source review confirms `ResizeObserver` updates `--sense-header-height` and a resize listener is the fallback. A forced header-error state and exact 320/390/700px follow-up resize were not exercised. No logout or other session mutation was performed.
- Sticky-header follow-up implementation: `styles.css` makes the site header sticky above the mobile bar; `App` measures the live header size into `--sense-header-height`, with a `5.25rem` fallback; the desktop sidebar consumes that offset and the remaining `vh`/`dvh` viewport height. Scoped ESLint for `app.tsx` and `git diff --check` passed. No tests/build were run. Web typecheck was attempted: pnpm stopped at workspace realpath EPERM, while direct tsc reported broad dependency declaration failures (React Router exports and Testing Library types). The overall shell remains IN PROGRESS pending applicable current-tree gates; there are no backend/schema/permission/auth-policy changes or production/actual-project claims.
