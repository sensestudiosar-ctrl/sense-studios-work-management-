# My Work card interaction evidence — 2026-10-12

## Delivered

Overdue/Waiting now follow the demo's selection flow: selected border/checkmark and light palette, click again to clear, another card replaces selection, detail closes, pagination resets, and the real Work queue is revealed and focused. Search/applied filters and view remain intact. The queue-local strip shows the server total and Clear widget filter. It preserves loading/denied/unavailable/stale meaning. Unsaved detail edits require confirmation; cancelling preserves the draft and current selection. The guard conservatively prompts after a changed detail field even if its original value was restored.

The live screenshot exposed a legacy selected-button rule filling the tile dark green. A top-card-specific override now preserves the prototype's light card, green selected outline and dark text. Before/after evidence is retained; shared shell and other selected controls were not changed.

## Exact frontend files changed in this correction

- `apps/web/src/task.tsx`
- `apps/web/src/task.test.tsx`
- `apps/web/src/my-work-metrics.tsx`
- `apps/web/src/my-work-metric-focus.tsx`
- `apps/web/src/my-work-metric-focus.test.tsx`
- `apps/web/src/my-work-visual.css`

The repository already contains substantial accepted/pending changes; this list describes this correction, not the entire dirty-tree diff. `source-hashes.json` records final fingerprints and the matching exact prototype hash.

## Verification

Pinned Node24.19.0/pnpm11.19.0, established Windows host context. Final affected frontend set: **130/130 tests in9 files PASS**; web TypeScript PASS; affected ESLint and repository ESLint PASS; web production build PASS. Existing chunk/dynamic-import build warnings remain. `checks.json` preserves exact commands/results and the earlier optional-prop type error, which was corrected before final checks.

The new regression checks cover populated server totals/pagination, count/queue filters, card toggle/replacement/Clear, filter restoration, detail closure/focus and draft cancellation/confirmation. Loading/denial/failure/stale behavior is component evidence. No new failures occurred in the affected set. The full frontend suite was not rerun; the previously recorded285pass/20 baseline failures remain separately tracked and are not claimed as current full-suite results.

## Actual existing Owner session — read-only browser evidence

These are current-source captures of the real authenticated existing preview at `localhost:59223`. No database setup, record mutation, service lifecycle or authenticated acceptance harness was run. The Owner has no employee identity and **zero personal tasks**. The retained50 synthetic staff tasks do not become Owner personal tasks. These screenshots cannot establish populated staff first-task visibility or four-role final acceptance.

Every width was checked after real keyboard card toggle/activation. A separate Waiting → Overdue → Clear sequence was observed. `transitions.json` records selection/URL/result/focus restoration. Browser overrides were reset afterwards.

Capture verification found that the immediate screenshot API could return the preceding painted frame even while the DOM already reported the new selection. Earlier images and measurements are retained. The gallery now uses additional `*-settled.jpg` captures taken after the real selected result appeared in the accessibility state. `settled-capture-geometry.json` records the accompanying DOM geometry and actual bitmap dimensions. The in-app screenshot surface returned narrower/shorter bitmaps than the configured CSS viewports (320×740 →305×705;390×844 →375×812;1024×900 →1009×887;1440×900 →1425×891). These are supplementary browser proof, not pixel-exact viewport captures for final visual acceptance. No layout was manipulated to improve a screenshot.

| Viewport | Queue top after activation | Result strip top–bottom | Clear button top–bottom | Bottom nav top | Horizontal overflow |
| --- | ---: | ---: | ---: | ---: | --- |
| 320×740 | 187.84 | 287.14–383.53 | 326.53–370.53 | 674 | No |
| 390×844 | 175.84 | 275.14–371.53 | 314.53–358.53 | 778 | No |
| 1024×900 | 258.70 | 498.59–567.59 | 510.59–554.59 | Not shown | No |
| 1440×900 | 258.70 | 498.59–567.59 | 510.59–554.59 | Not shown | No |

Header bottoms were60px mobile/64px desktop. Focus was Work queue at every width. The Clear button is44px high and unobstructed. The scroll position is naturally limited by the short empty Owner page; no layout or count was manipulated. The table uses the settled captures; the earlier 320px measurement is preserved in `owner-geometry.json`. The settled navigation content bounds are inside the fixed navigation container whose top is674px/778px on mobile.

## Remaining scope and decisions

**Material MW-I02 gap:** Needs Your Attention still opens independent sources; Reviews still opens the assigned reviewer inbox. They do not yet implement the newly requested task predicates. The Owner requested an exact backend-filter plan after the audit found the existing Review phase broader than the demo. Do not claim all-card parity.

See `../../../../CARD_INTERACTION_AND_ATTENTION_PLAN_2026-10-12.md` for canonical source evidence, the proposed narrow Reviews predicate, actor-specific attention evaluation and open deadline/urgency/source decisions. Personal-zero truth, reviewer independence, approval authority and management permissions must remain intact. Follow-up/verified-risk records must not be invented. Existing Review phase behavior in More remains a backend-driven difference until a separate additive metric is approved.

Shared-shell and future-slice differences are unchanged. Fresh populated four-role authenticated acceptance is pending its applicable bounded authorization. Earlier accepted functional evidence is preserved; this frontend pass is not a replacement full acceptance run. MW-I02 remains IN PROGRESS; MW-I03 has not begun.

Context/source/final review used GPT-6.1 Sol. The delegated component implementation used its existing GPT-6 agent; no Luna execution is claimed.
