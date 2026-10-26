# Projects directory — 26 October 2026

Status: COMPLETE for frontend development and synthetic acceptance; deployment not performed. Owner requested direct implementation using Refero MCP, UI/UX Pro Max and Sol/Luna routing.

## Scope and reference lock

Improve `/projects` in the existing Sense web application. Keep its current APIs, authorization, server paging, query state, canonical project details and creation/recovery commands. Requirements: R-011.a (delivery type), R-012.a–b (baseline scopes and additions), R-013.a (accountable lead), R-014.a–b/R-015.a–b (existing plans), R-016.a–c (lifecycle), R-017.a–e (templates), R-006/R-099 and C-010–C-016/C-024. No new business rule, API, schema, migration, retained-data operation or automatic staging promotion.

Primary visual target: the accepted Sense paper/pine shell, with Programa's lightweight project-management composition. Preserve the shared typeface, navigation, semantic status tones and controls. Use thin borders and restrained surface depth; make the directory the main full-width surface. Keep creation available on demand with its drafts mounted. Cards and List are display choices over the same server page; never imply a global status filter or invented progress.

Live Refero research: three style angles (editorial monochrome SaaS, architecture studio software, Programa); full Programa (`69987cc6-447d-4c32-a5d1-7cc9d627c40d`), Audyr (`9552d07f-2f68-4dd7-a0e9-d779d4a31562`) and Spacelab (`de162c4d-f3e5-489f-b9eb-ac31b8e0412e`) styles retrieved. Programa's exact Projects directory was not located. Its [project-management product preview](https://refero.design/pages/306d61aa-11d0-4c6b-9bb8-403f6c8c1414) was visually inspected, including its Board/List/Timeline switch and compact status/lead rows. Its [project workspace](https://refero.design/pages/a8c28bf6-5fb8-44cd-b5a5-2a6eb319a275) and [Workflow project details](https://refero.design/pages/4066bc5b-7054-4c67-9c51-26712561c906) were read as secondary structural references. This is inspiration, not an exact replica or an authenticated Programa audit.

| Decision | Evidence and role | Application |
| --- | --- | --- |
| Full-width directory | Programa preview's broad project canvas; existing Sense shell | Remove the permanent create-form side rail on `/projects` |
| Cards / List | Programa's switch between views of the same work | Same fetched rows, counts, order and opening command |
| Clear project identity | Existing API and compact reference metadata | Title, delivery type, branch, scopes, lead, next actual milestone, status |
| On-demand creation | User goal of usable project browsing; existing canonical creation | Expand existing form with New project; preserve drafts/recovery |
| Restrained surfaces | Programa and Audyr light borders; Sense tokens are primary | Keep pine actions, paper shell, readable muted text; omit borrowed yellow/violet |
| No decorative covers | No authorized cover field exists | Functional folder icon only; no invented photography or project facts |
| Responsive wrapping | UI/UX Pro Max `filter` result: Chip Collection Reflow | Wrap scope/stage content and controls; no clipped information |

UI/UX Pro Max applied from the project skill. Initial UX query found no match; narrower `filter` returned Chip Collection Reflow. React query returned stable item keys and shared-state guidance. Default Python alias was unavailable; bundled Python successfully ran the searches.

## Acceptance

Verify both views open the same project, preserve server filters/sort/pagination and selected state, retain list/detail Back behavior and current draft/task guards, and expose creation only to Owner without changing the command. Cover loading/empty/error, long values, unknown status, missing lead/milestone, keyboard focus, reduced motion and 320/390/783/1440 widths. Run existing affected project suites, new view/creation interaction coverage, web typecheck, scoped lint and web production build. Capture rendered existing app with synthetic read-only responses on a separate development port; distinguish this from real persistence/authenticated acceptance. Preserve unrelated dirty files and canonical staging.

Models: GPT-6.1 Sol read-only requirements/source audit; GPT-6 Luna bounded directory component; current Codex integration and verification. Independent Sol final review follows the exact implemented result.


## Final result and verification

Implemented the full-width directory in the existing ProjectWorkspace, Cards/List display over the same server page, current branch/scope/lead/milestone/stage metadata, on-demand native creation disclosure and canonical New project focus. Draft inputs remain mounted when collapsed. View selection survives loading/search/refresh/empty states. Failed directory reads have explicitly unavailable counts/pages instead of claiming zero projects. The creation heading has a sticky-header scroll offset; visual and DOM ordering remain aligned. API/commands/auth/schema/documents/reviews are unchanged.

Final checks in this session, pinned Node24.19.0/pnpm11.19.0:

| Check | Actual result |
| --- | --- |
| Affected project suites | 63/63 across8files passed |
| Full web regression | 704/704 across72files passed; no skips reported |
| Final UX test after test-option typing correction | 7/7 passed |
| Web TypeScript | Exit0 |
| ESLint on changed frontend/test/operator files | Exit0 |
| Web production build | Exit0; existing large-chunk and ineffective-dynamic-import warnings remain |
| Synthetic existing-app browser | 12captures; Cards/List at320/390/783/1440; Owner creation, Staff exclusion, keyboard canonical opening/Back, view persistence, search/clear, drafts, empty/error/retry, reduced motion and sticky-header focus passed; zero page overflow, page errors or API writes |
| Independent GPT-6.1 Sol | Accepted corrected source and screenshots; no remaining P0–P2 findings |

Browser evidence: `projects-programa-evidence-2026-10-26/browser-report.json` and adjacent PNGs. Operator: `scripts/acceptance/projects-directory-visual.mjs`, against isolated Vite port59765. Both task-owned previews59764/59765 were stopped after identity-checked cleanup. No retained database, session, migration, fixture or canonical release was changed. Synthetic responses are labelled in the operator/report and are not authenticated/persistence acceptance. Production build and tests used the shared current checkout, including retained concurrent work; this is not exact sealed-release or whole-checkout acceptance.

Preserved attempts: first sandbox Vitest attempt could not load6suites due temporary-transform ENOENT (13tests ran); workspace-local TEMP/TMP/TMPDIR resolved it. An early focused run had54passes/2presentation assertion failures, corrected for the new count and duplicate Clear control. Browser testing caught a real view reset during server search; the initial report is retained as `browser-report-initial-view-reset.json`. The first broad web run had702passes/1failure using the earlier component before that correction; it is not relabelled passing. The final full run passed704/704. A later typecheck caught two unsupported Testing Library `exact` options in the new regression; these were removed without weakening name assertions, then typecheck and the7UX cases passed.

Refero limitations remain explicit: the exact Programa Projects directory was not retrieved. The result is inspired by verified Programa project-management previews and workspace references, adapted to Sense's real fields and visual system. No image covers, progress percentages, fabricated status totals or new workflow rules were introduced.
