# Shared Task Filter Icon Evidence

This standalone Playwright fixture uses the current task search/filter SVG markup and common filter form structure with the actual `apps/web/src/task.css` in `page.setContent`. It is a CSS/component fixture only; it does not use an application server, authentication, or an authenticated runtime.

The baseline capture includes the already-corrected search icon and the still-unfixed filter icon. On the shared `/tasks` layout, the filter SVG expands to 1351 px at 1440 viewport width, 942 px at 1024, 290 px at 390, and 220 px at 320. The personal layout keeps its current 16 px filter icon. Both icons, the input, and overflow state are recorded in `task-icons-before/geometry.json` with screenshots at each requested width.

The approved common `.task-filter-icon` baseline now uses the existing 1rem size, non-shrinking behavior, monochrome outline, and inline alignment. Personal workspace declarations remain unchanged. The `after` capture measures both icons at 16.8 × 16 px for all eight viewport/layout combinations; the search input remains visible and no horizontal overflow appears. That run asserts both icon dimensions are at or below 24 px, the input remains visible, and no overflow appears.

Post-fix geometry and screenshots are saved in `task-icons-after/`.

Use Node 24.19.0, pnpm 11.19.0, and the existing Playwright browser cache:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\HI\AppData\Local\ms-playwright'
node .env.s27-tools/task-icons-geometry.mjs before
node .env.s27-tools/task-icons-geometry.mjs after
```
