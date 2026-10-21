# MW-I02 work queue corrections — current evidence

MW-I02 remains IN PROGRESS. This report covers frontend corrections and read-only UI inspection; it does not replace previously accepted authenticated evidence or claim final visual acceptance.

## Implemented presentation and interaction

- Demo palette/status rails and Work queue Search/Filters/Save view/Customize/More presentation retained.
- Confirmed-empty Reviews, Corrections and Management panels are removed from the initial view; hooks remain mounted. Positive, loading, stale, denied and failed sources remain discoverable. The genuine Owner five-item behaviour remains covered by focused tests; this session's actual Owner has0 management items.
- Filters now open a desktop popover or mobile sheet with the original canonical controls, Apply/Reset, outside-click/Escape closure and focus restoration.
- Applied filters now have individual remove buttons and Clear all. Removing Project clears its dependent Stage; removing the last date bound clears its unused date basis. Unrelated applied filters and drafts remain intact; scope stays personal and pagination resets.
- List People cells now show circular avatars and a separate People trigger. Authorized task detail is fetched lazily on activation; the existing task navigation button remains independently accessible. No fake collaborators, assigning person or reviewer name is shown.
- The interim Needs action card uses separate authoritative Corrections/Management numbers and a Decisions link. The Owner's latest task-filter direction is being designed in `../NEEDS_ACTION_DESIGN_2026-10-12.md`; that new behaviour is not implemented yet.

## Files changed for the current correction set

Production frontend: `task.tsx`, `task.css`, `task-people.tsx/css`, `my-work-visual.css`, `my-work-attention.tsx/css`, `approval-queue.tsx`, `app.tsx`, `my-work-metrics.tsx`, `my-work-filter-chips.tsx/css`, and `my-work-queue-preferences.tsx`. Corresponding focused test files changed or were added. Existing saved-view files and palette/shell changes are retained from the earlier approved work.

Verification support: `apps/web/visual-fixtures/mw-i02.tsx`, `.env.checkpoint-tools/mw-i02-visual/verify-queue-direct.mjs`, and new evidence/report files. Unrelated API/e2e dirty files are preserved; no backend source, migration or historical manifest was modified by this correction.

## Checks

Pinned Node24.19.0 and pnpm11.19.0, Windows host context. Installed package CLIs were invoked through pinned Node because pnpm exec CMD shims stalled in two earlier frontend-only check attempts; only verified owned check processes were stopped. No application server/database lifecycle was changed.

| Check | Current result |
| --- | --- |
| Eight affected frontend test files | **100/100 PASS** |
| Full frontend | **285 PASS /20 FAIL** |
| ESLint | PASS |
| Contracts build/typecheck | PASS |
| Web typecheck | PASS |
| API typecheck using existing generated client | PASS |
| Web production build | PASS |

The20 failing full-suite test names exactly match `top-cards-20261012/full-web-final.json` (255pass/20fail):18 identity/authentication-shell tests, one external-portal test and one workspace-navigation test. `FAILURE_CLASSIFICATION.json` records **no new failures and no silently removed baseline assertions**. The earlier original19 failures and later external-portal failure remain separately tracked debt.

New test failures observed during development were preserved and corrected: an asynchronous positive-disclosure assertion now waits for the actual open state; a filter interaction waits until Apply is enabled; eager chip label lookup tolerates unavailable setup arrays without erasing the original setup failure UI. All affected tests now pass. Assertions were not removed or weakened.

## Current screenshot evidence

Evidence directory: `acceptance/evidence/work-queue-final-confirmed-20261012/`.

Actual application: existing authenticated Owner, no employee identity, genuine0 personal tasks and0 management obligations, captured at1440×900,1024×900,390×844,320×740. Applied-filter removal was exercised through the real UI using read-only task requests; its URL returns to personal/active and keyboard focus returns to Filters.

Populated/Waiting/People examples are **synthetic component previews with writes disabled**, explicitly labelled in the gallery. They are not post-change authenticated Designer/Site Employee/five-exit acceptance. Earlier accepted evidence remains preserved.

At both mobile widths, the Filter sheet ends at the fixed navigation top:778px at390×844 and674px at320×740. Apply/Reset are side by side,44px high, ending21px above navigation; no document overflow was measured. Desktop popup width320px,44px actions, within the viewport.

### Populated component discoverability (synthetic, scrollY0)

| View | Queue heading top | First task button top–bottom | Fixed navigation top | Visible task pixels | Scroll to reveal full task |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial390×844 |359.84|471.14–720.31|778|249.17|0|
| Waiting390×844 |410.23|521.53–770.70|778|249.17|0|
| Initial320×740 |371.84|483.14–747.36|674|190.86|73.36|
| Waiting320×740 |422.23|533.53–782.70|674|140.47|108.70|

At1024px the first task button is72.55px high with the technical owner identifier contained. At320px an actionable part of the first row is visible immediately, but the bottom action label/full row requires scrolling. This is an unresolved visual limitation, not a PASS claim. The interim two-source Needs action card adds task-local height; the next agreed single task metric should replace that presentation. `GEOMETRY.json` records queue/first-task positions separately.

## Remaining discrepancies and backend gaps

| Classification | Outstanding item |
| --- | --- |
| MW-I02 material interaction/design | Needs action is still an independent-source shortcut; Owner now wants a task metric. Eligibility/scope must be agreed before backend work. |
| MW-I02 visual | Interim two-source card is149.5px high desktop and increases mobile card-area height. Management wraps at320px. Final single-metric design should restore compact proportions. |
| MW-I02 mobile validation | Full row/action visibility on320×740 requires73–109px scrolling in the current synthetic preview; real four-role post-change evidence is pending. |
| Backend-driven | Owner has no employee identity: personal total remains0, management obligations stay separately authorized. No organization-total substitution. |
| Backend-driven People | List has no collaborator roster/count before lazy detail; assigning actor's reliable display name is unavailable. Do not fabricate them. Full named assigning/reviewer parity needs a reviewed read-model plan. |
| Shared shell /MW-I09 | Navigation/header/sidebar differences beyond the expressly approved styling remain separately bounded. |
| Future slices /new decisions | Date grouping/compound priority-due sort, task drawer, Site Actions, private tasks/multiple memberships/subtasks are not implemented by this correction. |

Prototype SHA256 remains `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. The supplied exact Work queue crop and source tokens were used. Literal full-screen parity is not claimed; a new demo file-URL browser capture was unavailable under the browser tool's restriction.

**Functional Reliability:** affected frontend checks PASS; current-source four-role authenticated regression remains unrun. Prior bounded functional acceptance is preserved.

**Prototype Visual Fidelity:** FAIL / pending the Needs action design correction and Owner's full-shell review. No final completion claim.

No PostgreSQL startup, database setup, production-data write or authenticated acceptance harness was run. Actual models: GPT-6.1 Sol for intake/design/review; GPT-6 Luna for bounded People/filter-chip/empty-source components. Stop for Owner rule/design review; no MW-I03.
