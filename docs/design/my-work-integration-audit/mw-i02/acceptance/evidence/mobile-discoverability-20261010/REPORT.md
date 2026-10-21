# MW-I02 mobile task discoverability correction — 2026-10-10

MW-I02 remains IN PROGRESS. No MW-I03 work. No PostgreSQL, database, API, production, permission, schema, task lifecycle or shared-shell changes were made in this correction.

## Acceptance boundary

**Functional Reliability: PASS — Owner-accepted bounded authenticated run 1791645789215-1922209c6d12, preserved.** Current presentation changes pass 45 affected frontend tests and component interaction inspection; they have not received another authenticated run.

**Prototype Visual Fidelity: BLOCKED for current-source final acceptance.** Component evidence improves discoverability materially, but does not replace fresh authenticated full-shell captures or Owner acceptance. The previous authenticated visual FAIL remains historical evidence.

## Exact frontend files and changes

- apps/web/src/task.tsx
- apps/web/src/task.css
- apps/web/src/task.test.tsx
- apps/web/src/my-work-attention.tsx
- apps/web/src/my-work-attention.css
- apps/web/src/my-work-attention.test.tsx

- Attention: three repeated zero-count source cards plus client framing become one native “Other work sources” disclosure on mobile only when all three independently fetched task/review sources are successfully confirmed empty and fresh. Expanding retains each source/count separately; client project context has no personal total. Loading, denied, failed, stale or positive sources remain visible. Mounted source components are preserved. Confirmed employee-less Owner bypasses compaction and keeps Management automatically expanded.
- Phases: one horizontally scrollable mobile widget row replaces two rows. All four phases, independent totals, accessible labels and keyboard focus scrolling remain. About-count explanations stay in a native disclosure. Ready Waiting feedback is concise; stale/denied/unavailable warnings remain explicit. No totals are combined.
- Controls: Display and its select share a row with Refresh. Search retains its accessible label and visible placeholder. Apply/Reset appear on search/filter focus, open filters or pending draft changes; Enter submits search. Existing native filter panel and corrected 320px action layout remain. Pagination follows the queue in mobile personal views only, including DOM/keyboard order; desktop/tablet position is preserved.

## Matched before/after geometry

Actual production components rendered against the **same synthetic fixture**, at fixed height **844px**, widths390/320, scrollY0. The fixture starts the component at y94 in both versions. The initial state uses active42, waiting14, review14, completed14; selected Waiting shows14 matching tasks. Reviews/corrections/management each return independently confirmed0. These fixture values are not authenticated production data. The shared TaskWorkspace personal rendering path is used by Designer and Site Employee; this inspection is not a fresh role-authentication claim.

| Width | State | Queue container y before → after | First task button y before → after | Earlier by |
|---|---|---|---|---|
| 390 | initial | 754.1 → 523.8 | 795.2 → 564.9 | 230.3 |
| 390 | waiting | 880.0 → 576.5 | 921.2 → 617.7 | 303.5 |
| 320 | initial | 798.9 → 568.5 | 840.0 → 609.7 | 230.3 |
| 320 | waiting | 945.8 → 621.3 | 987.0 → 662.5 | 324.5 |

The first task is visible within the fixed844px viewport in all four after captures. The whole task row remains an accessible task-opening button. No document horizontal overflow in these states or any of the four display views.

### Section-by-section height, px

| Section | Before390 | After390 | Before320 | After320 |
|---|---:|---:|---:|---:|
| Task heading/create |44.0|44.0|44.0|44.0|
| Independent obligations, including approval navigation |150.0|99.2|150.0|99.2|
| Phase widgets + About (initial) |181.6|117.8|181.6|117.8|
| Phase block with selected Waiting feedback |307.6|170.6|328.6|170.6|
| Display/Refresh toolbar |70.4|52.2|70.4|52.2|
| Search/closed secondary filters (initial) |106.8|62.0|151.6|106.8|
| Pagination before queue |44.0|0 — after queue|44.0|0 — after queue|

The phase widgets themselves shrink135.2→71.5px by using one row, not by shrinking touch targets. Waiting feedback becomes one44px row. At320px search and Filters remain separate rows to preserve readable labels and touch access. Unchanged header and normal gaps/borders account for the remaining task-local space. Expanded or active obligations intentionally increase height and are not suppressed to meet a pixel target.

## Approved prototype comparison and shell attribution

Exact reference: D:/app/reference from codex chat/Sense_Studios_My_Work_UX_Package/Sense_Studios_My_Work/prototype.html. SHA256 **F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8**. New local reference captures use matching widths and844px height, scrollY0, initial/Waiting selections; original reference and all earlier evidence remain untouched.

The prototype initial queue container begins at y334.3 at both widths. Its first task begins at y540.3 because its queue contains additional toolbar/chip/group framing. The corrected component first task is y564.9 at390 (**24.6px later**) and609.7 at320 (**69.4px later**). Queue-container offsets and first-task offsets are different measurements; neither is substituted for the other. Prototype sample counts/grouping are not canonical backend totals. Future date groups/drawers/Site Actions remain excluded.

Historical authenticated shell geometry records main-content start y119, account heading y135–162, and component toolbar y598 at both widths. Matching baseline component toolbar y509.7 gives **88.3px additional upstream offset** in that old capture. This combines the shared shell/account heading/container spacing and differences between the real and fixture containers; it is not a fresh current-source shell measurement. Applying that offset to the new fixture predicts first-task starts around653/698px initial,706/751px Waiting; these are **estimates only**, not acceptance evidence. Historical320 capture height was740, while this controlled comparison uses844. A full-shell authenticated run must measure the actual nav-clear viewport before claiming320 viewport acceptance. Existing shared header/sidebar/fixed-nav CSS is unchanged.

Remaining discrepancies by priority:

1. **MW-I02 verification gap:** fresh authenticated full-shell Designer/Site Employee initial and Waiting captures and exact first-task/nav-clear positions are still required. No component result is promoted to authenticated visual PASS.
2. **MW-I02 visual difference:** component queue container remains189.5px later at390 and234.3px later at320 than the prototype queue container. Most of this comparison is offset by the prototype’s larger queue-internal framing: first-task gaps are24.6/69.4px in the component fixture. Current extra sections preserve independently authorized obligations, existing views/Refresh, count explanations and usable320 search/filter controls. Owner must judge the actual full-shell result.
3. **Shared shell / MW-I09:** retained header/account-heading/navigation offset and visual treatment; unchanged. Fixed navigation clearance remains accepted prior evidence, not newly proved by a fixture without that shell.
4. **Future MW-I03–MW-I08:** date groups, drawers, Site Actions and task aggregation; deliberately not implemented.
5. **Backend-driven:** separate personal phases/reviewer/correction/management sources, uncounted approval/client navigation and truthful employee-less Owner zero. No fabricated organization or aggregate counts.

## Verification and preserved behavior

- Pinned Node24.19.0/pnpm11.19.0 affected frontend tests: **45/45 PASS**, two files. Source-specific exact totals, pagination destinations, Owner prioritization, loading/denial/stale/error visibility and filter/phase/task behavior retained. Initial failed runs and corrected asynchronous waits are preserved in logs; valid assertions and fixture totals were not weakened.
- Workspace typecheck, ESLint, production build: **exit0** each. Logs retained beside this report.
- Component interactions at390 and320: **PASS** for native independent-source disclosure; search focus/draft/Enter; status selection/Apply; filter/action collision check; all four views; Refresh; task open/back; keyboard phase focus/selection; and five expanded Owner fixture links. See component-interactions.json. These do not establish backend authorization; prior authenticated evidence remains intact.
- No P0 overlapping filter/action controls or horizontal page overflow observed in these component checks. Selected/hover/focus styles and management summary layout were preserved; no accepted shell/navigation changes.
- Full web suite was not rerun: previous232pass/19established baseline failures remain separate reliability debt. No new failures in the affected45 tests. No authenticated tests or database operations ran during this correction.

## Evidence

- [Before/after/prototype comparison](COMPARISON.html)
- [Before geometry](before-geometry.json), [after geometry](after-geometry.json), [prototype identity/geometry](prototype-geometry.json)
- [Interaction evidence](component-interactions.json), [final source hashes](source-manifest.json)
- [Focused tests](focused-verified.log), [typecheck](typecheck.log), [lint](lint.log), [build](build.log)

Models actually used: GPT-6.1 Sol for intake and final source/geometry review; GPT-6 Luna for bounded attention/phase implementation and test corrections. Final pinned combined gates were run by the parent agent. Earlier successful authenticated evidence/screenshots were preserved. Another authenticated disposable-database run requires separate Owner authorization. Stop for review; do not mark COMPLETE.
