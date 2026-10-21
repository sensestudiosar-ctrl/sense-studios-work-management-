# MW-I02 — bounded frontend visual corrections

MW-I02 remains **IN PROGRESS**. Owner accepted Functional Reliability PASS for run `1791643972610-275f9b9a894e`; its Prototype Visual Fidelity FAIL is preserved. No new authenticated acceptance or disposable database operation has been performed for these corrections.

## Locked source and scope

The exact approved interactive `Sense_Studios_My_Work/prototype.html` and matching captures in `acceptance/prototype/` remain authoritative. Decisions: fix collisions through responsive flow; retain independent obligation sources and canonical task fields; compact existing framing; distinguish selection, hover and keyboard focus. No prototype sample counts, future grouping/actions/drawers, or shared-shell changes are implemented. Requirements preserved: R-018.a–b, R-021.a–b, R-022.a–b, R-023.a, R-024.a–b and independent R-027–029 obligations.

## Exact frontend files changed in this correction

1. `apps/web/src/task.css`: separate 320px filter/action rows; full-width open filter panel; scoped intermediate queue grid and compact mobile gaps; long-owner ellipsis.
2. `apps/web/src/task.tsx`: presentation class and full-text title on the owner cell. The existing accessible task description still includes the full owner. No task behavior changed.
3. `apps/web/src/my-work-attention.css`: safe label/count flow, compact source cards and links, compact phase buttons, explicit light unselected hover and existing independent focus outline.
4. `apps/web/src/my-work-attention.tsx`: short visible phase labels with full accessible labels retained; remove duplicate ownership intro and expanded-panel count. About-counts explanation, full section headings, every item reason/project/link and source states remain.
5. `apps/web/src/my-work-attention.test.tsx`: add Waiting-selected/Completed-unselected regression; assert stale/refreshed count in its retained summary location; retain ownership semantics in the About-counts assertion after redundant intro removal.

No backend, schema, permission, lifecycle, accepted command, shared shell or production configuration edits are part of this correction. Existing unrelated working-tree changes were preserved.

## Before / after

| Defect in accepted run's fresh captures | Correction | Frontend evidence |
|---|---|---|
| 320px Filters & sort under Apply filters | Disclosure and action group use separate full-width rows; open filter contents span the form | No bounding-box overlap; both controls at least 44px; real fixture touch open/select/Apply/task-open passes |
| 390px Management label collides with count | Mobile label and count occupy separate wrapping tracks in compact cards; long source states can wrap | No label/count collision at all four widths |
| Dark unselected Completed in Waiting capture | Scoped unselected hover stays light; selected remains dark; keyboard focus has independent gold outline | Hover background `rgb(250,248,242)`, text `rgb(36,48,43)`; selected `rgb(24,44,41)`; keyboard Tab focus outline 3px solid |
| Repeated framing and tall pre-queue presentation | Client context shares source grid, concise phase labels, compact widgets; ownership explanation retained in About counts | Four-width component captures; real authenticated hierarchy comparison pending |
| 1024px seven fields wrap into tall rows; technical owner expands | Two-row intermediate grid; compact gaps; full owner text retained in DOM/title/accessibility with visual ellipsis | Long-identifier fixture first row 121.4px; all canonical fields retained; no page overflow |
| Owner expanded panel repeats its count and has tall nested rows | Count shown once in disclosure, denser item padding/text; full Management heading/Refresh/reasons remain | Auto-open five-link fixture at all four widths; truthful empty personal state remains |

**P0 overlapping-control defects are resolved in current-source frontend geometry checks.** These checks do not establish the authenticated shared-shell result or final visual acceptance.

## Evidence and checks

Evidence directory: [`evidence/frontend-corrections-20261010/`](evidence/frontend-corrections-20261010/).

- `LAYOUT_EVIDENCE.json`: Chromium current-component render at 1440/1024/390/320; no horizontal page overflow, no Management collision, hover/selection/focus results. Mobile summary/Apply nonintersection and 44px minima are asserted by the retained review script.
- `fixture-designer-initial-{width}.png`, `fixture-designer-waiting-{width}.png`, `fixture-owner-{width}.png`: **mocked reads, writes disabled, not authenticated acceptance**. They reuse the existing isolated frontend fixture and actual current components/styles. No separate mobile acceptance test was created. The fixture's synthetic records are not application data or evidence of backend/role enforcement.
- `focused-tests-final.log`: **40/40 PASS**, two files (previous focused suite 39 plus one selection-state test).
- `typecheck-final.log`, `lint-final.log`, `build-final.log`: **PASS**, exit 0. Build retains existing chunk-size/ineffective dynamic-import warnings.
- Node **24.19.0**, pnpm **11.19.0**, established Windows host workflow.
- Initial frontend check found two assertions tied to deliberately removed duplicate copy/count locations; their evidence is preserved in `focused-tests.log`. Assertions now target the retained count and ownership explanation. No API predicate, denial, stale/retry, pagination or command assertion was removed.
- Initial fixture focus inspection used programmatic focus after pointer input, which does not establish keyboard `:focus-visible`; corrected inspection uses actual Tab keys and verifies the focused element and outline. No application focus workaround was added.

The earlier 19 complete-web baseline failures and two DashboardWorkspace exceptions remain separately tracked reliability debt. The full web suite was not rerun in this focused correction; no claim is made that baseline debt is fixed. No new failure remains in the affected frontend checks. Authenticated regression verification of changed source is pending.

## Remaining discrepancies, ranked

1. **P1 / MW-I02 acceptance pending:** actual authenticated post-correction hierarchy/density and all role states require fresh captures. Mobile queue remains below the source disclosures, phase summary and real controls; confirm the resulting density against the exact reference. Check long-owner readability in task detail and real fixed-navigation clearance. No final fidelity PASS claimed from fixtures.
2. **P1 / evidence gap:** Owner setup pending/denied still lacks real-browser capture; existing denied/unavailable frontend tests remain passing. Do not infer employee-less state from missing setup. Owner 1440 capture must include the lower personal-empty explanation; old image omission is not proof of application clipping.
3. **Reserved shared-shell remediation / MW-I09:** header/sidebar/account heading/mobile navigation proportions remain outside this change.
4. **Future MW-I03–MW-I08:** prototype date/pinned groups, saved/customized views, drawers and specialized Site Actions remain excluded.
5. **Necessary backend differences:** truthful personal phases and zero employee-less Owner tasks, independent management/review counts, canonical recorded dates/statuses, and authorized task commands remain unchanged. Expanded genuine obligations naturally move personal information below the fold.

## Read-only environment confirmation

At `2026-10-10T15:20:35.388Z`, existing guarded read-only query confirmed system ID **7693570241708228348**, `127.0.0.1:45434`, exact retained directory `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`, and absence of `sense_mw_i02_validation_20261009_test`. `pg_ctl status` and Windows listener both identify running PID **35672**. See `read-only-cluster-preflight.json`. No PostgreSQL startup/restart/stop or database writes occurred. The owned frontend fixture server was stopped after inspection.

## Proposed single authenticated run — requires new Owner approval

Repeat identity/process/absence guards in Windows Medium context with pinned tools. Stop on stopped cluster or mismatch; no startup, retries or fallback. Use existing guarded setup once for the exact absent disposable database, 116 existing migrations and reviewed synthetic fixtures. Run task integration, existing full monolithic Playwright once (all four roles, five genuine exit holds, mobile interactions, commands and four-width fresh captures), then review integration only if browser passes. Preserve unique run evidence and compare with the exact approved prototype. Attempt manifest-bound cleanup on every outcome when guards pass: revoke only owned sessions, stop only owned API/web processes, verify OID/marker/connections/catalog, drop only that run's database, verify other catalog preservation. Leave retained PostgreSQL running. Risk is limited to reviewed synthetic disposable-database writes. No production/schema/security/permission changes.

Functional Reliability: **PASS previously accepted for the bounded run; current-source authenticated rerun pending**.

Prototype Visual Fidelity: **BLOCKED pending fresh authorized authenticated comparison; previous FAIL preserved**.

Actual routing: GPT-6.1 Sol context/final review; GPT-6 Luna bounded attention presentation implementation; primary agent integrated, inspected and ran checks. MW-I03 remains excluded.
