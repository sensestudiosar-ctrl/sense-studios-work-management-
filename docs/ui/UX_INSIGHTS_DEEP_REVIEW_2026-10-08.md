# Insights — page-by-page UX revision

8 October 2026. Continuing low-fidelity UX validation. Production UI, backend, permissions, policies and calculations remain unchanged. No visual direction, UX freeze or Gate B.

## Research brief and decisions before implementation

Goal: users can predict which Insights page answers their question, inspect source evidence, act in its canonical context and return without losing scope. Keep sample records early, neutral layout and progressive disclosure.

| Page / issue | Inspected Refero evidence | Adapted hierarchy | Sense Studios constraint |
|---|---|---|---|
| Performance: generic action catalogue lacks person/cycle evidence | [Officevibe goal detail](https://refero.design/pages/1bca9211-f47f-454b-98e9-2042b6b0e03d) | Scope/person → evidence → separate goal/cycle detail; retain originating list | Do not copy progress percentages or invent scores/policy values. Dated policy and ordinary source evidence remain authoritative. |
| Project Health: indistinguishable from Performance | [Asana portfolio progress](https://refero.design/pages/f2272c25-3305-4a1b-ae89-47af23141715) and [Wrike analytics filtering](https://refero.design/flows/1501) | Project directory → selected project → applicable components → exact exceptions | Design and Turnkey evidence differ. Unknown/unconfigured is not zero or healthy. No manual replacement for a calculated health policy. |
| Reports: report preview and evidence identity are buried | [TravelPerk export flow](https://refero.design/flows/5226) | Category/period → authorized source rows → explicit preview/snapshot/export state | Fixed S24 categories and current source access; column builder belongs Saved Reports. Frozen evidence never changes with current source. |
| Saved Reports: generic RP-014 page does not explain the definition/run relationship | [Attio reporting directory](https://refero.design/pages/a351127c-b7d4-4a22-9b89-470e622b66f3), [Attio source/configuration layout](https://refero.design/pages/26fc4267-b937-46a5-acfd-73aa0c8800ef), [Mercury saved filtered view](https://refero.design/flows/11055) | Named/versioned definitions → disclosed configuration → retained run → rows/count grouping | Only accepted sources, six columns and scalar filters; count charts only, no arbitrary aggregation or automatic domain mutation. |

Refero MCP full screen metadata and images were inspected; complete filtering/export/saved-view flows were read. These patterns guide information placement and recovery, not business logic or styling.

## Scope conflict found

The previous shared RP-014 renderer described an arbitrary Task report source on both Reports and Saved Reports. Current fixed reports use eight predefined categories; bounded saved definitions use the supported existing sources. The catalogue label “Select period / columns” must not imply arbitrary column configuration on fixed Reports: fixed schema is inspected there, selectable columns belong to Saved Reports. Record this correction explicitly while retaining capability discoverability.

## Routing

Exact GPT-6.1 Sol owns source intake and final source review. GPT-6 Luna owns bounded prototype page implementations. The primary agent integrates, checks connected artifact journeys and records remaining limitations. No production completion is inferred from prototype presence.

Actual routing: exact `gpt-6.1-sol` performed intake, conflict resolution and final source review; `gpt-6-luna` drafted Performance/Health and Reports/Saved Reports. Both Luna turns encountered an account usage limit before completing corrections. The primary agent completed the corrections, integration and artifact walkthroughs. The 70/30 preference was used for initial allocation, not asserted as a measured final token ratio.

## Authoritative distinctions retained

- Performance: employee and leader families stay separate. Current management scope is explicit; own read/acknowledgement does not authorize own snapshot generation. Snapshot evidence cannot extend into the future. The monthly sample cycle uses 1–7 October month-to-date, an exact matching truthful insufficient-evidence snapshot and an Owner finalization reason.
- Project Health: ordinary project readers can inspect available evidence. Generation needs management grants; delay attribution/correction is Owner-only. Design and Turnkey use their applicable inputs, without inferred weights, thresholds or healthy status.
- Reports: exactly eight fixed categories and six fixed columns. Skills/Training remains an unavailable report source despite its separate IN PROGRESS UX destination. Whole retained snapshot access is rechecked, not merely the currently displayed rows.
- Saved Reports: seven available fixed sources, ordered subsets of the same six fields, equals/contains scalar filters and NONE/BAR/PIE display. Counts mean report rows; several rows may describe one task. Definition versions, current preview, retained generated runs and Owner-frozen snapshots are separate objects.
- Back restores UI selections/drafts; it must never restore older copies of canonical snapshots, definitions, runs, cycles or correction history.

## Owner walkthrough

| Journey | Expected result |
|---|---|
| Performance → Ananya → Employee evidence → RCP task → Back | Same person/family/period; original target and current commitment remain distinct |
| Performance → Meera → Leader | Different personally controlled metric family; no employee metric substitution |
| Monthly month-to-date cycle → manager comment/goal → Ananya acknowledgement → Owner finalization | Exact target/snapshot/period; named actions; final history read-only |
| Project Health → Palm | Site, quality and snag context appears; no Azure source substituted |
| Owner delay correction → source → Back → retained history | Explicit equivalent days and reason; supersedes chain, one current source attribution |
| Reports → category/period → preview → current export | Fixed schema and explicit sample export result |
| Owner freeze → source changes → linked correction | Original values stay fixed; correction is a new linked snapshot |
| Snapshot/run access loss, including a filtered-out source | Entire retained read/export concealed |
| Saved Reports → definition → columns/filter/group → save next version | Original definition remains; configuration uses supported fields/operators |
| Run definition → change draft → inspect old run | Original run schema/version/rows remain unchanged |
| Saved export / generated run / Owner freeze | User can explain the three different operations |
| Mobile → each Insights destination → source → Back | Page-specific hierarchy stays understandable; no page overflow |

## Revised connected prototype

[Open prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html). Refresh an older open tab to load these changes. The four destinations remain visible under **Insights**: Performance, Project Health, Reports, Saved Reports. Other navigation groups, notification bell, Settings, task/project views and mobile candidates A/B remain available.

### Performance — person, evidence and review cycle

- Person / family / period scope precedes PE-023, its exact period, policy identity and evidence state. First-pass review and correction-free review remain separate components. Meera's Leader family shows review/extension/allocation evidence separately.
- PE-023 uses 1–7 October month-to-date and an explicitly fictional, historically approved POL-UX-023 v2 policy/group assignment. Its numeric configuration is copied from the accepted S23 test fixture and disclosed separately; these values are **not organization defaults**. Missing required task-on-time evidence produces `INSUFFICIENT_EVIDENCE`, with no score.
- Expand the review cycle to inspect comments, named goals/actions, own acknowledgement and Owner finalization. Manager comments/goals lock after finalization; the subject can still acknowledge that exact finalized cycle.
- RCP, exact review, TE-204 and AT-071 open their canonical contexts. Back restores the person, family, period and tab. Retained history is restricted to the selected person/family.
- Owner setup now demonstrates explicit blank-value policy authoring → DRAFT → exact-version approval → immutable APPROVED version → prospective group assignment. Employee/Leader and Design/Turnkey catalogs differ. Old snapshots do not adopt new policy values.

### Project Health — project exceptions and attribution

#### Owner refinement — all projects and retained switching

Project Health now opens with all currently accessible projects together. Each project has its own compact health rail and explicit availability label. Selecting a project changes the layout to a compact project list on the left and the selected project's health evidence on the right. Users can select another project directly without Back. Mobile retains a compact project list above the selected detail.

The common period and selected Records/Policy/History tab remain while switching projects. An employee filter is retained only when valid for the new project. Source-specific draft context and notices do not carry across projects. Source navigation/Back retains the selected project and split layout. Accessible projects with no task records remain discoverable.

The present fixtures have no computed project-health snapshots: each rail is unfilled and labeled **Health unavailable — no computed snapshot**. A task completion percentage or count is not substituted for project health. This layout change does not add a scoring rule.

This refinement received source review only; the browser tool rejected the local `file://` preview under its URL policy. No new browser walkthrough, automated test or visual validation is claimed for this refinement. Prior checks documented below apply to the preceding Insights revision. Owner should refresh the prototype and inspect initial directory → project selection → direct switching, desktop/mobile placement and Back retention.

- Project / period / optional project owner scope leads to available task/date, milestone, first-pass, decision, scope, delay and workload evidence. Palm additionally exposes site, quality and snag context.
- Facts remain unscored when complete policy/source evidence is unavailable. Unknown status never becomes On Track or zero.
- Exact pending decision, client package, task, Plan, Reviews and Delivery links retain project context. Palm has no invented review fixture. Employee choices use accessible task owners in the selected project.
- Owner delay entry/correction is disclosed below the evidence. Enter explicit equivalent days, source, cause, dates, optional matching employee, external flag and reason. The walkthrough supports `TASK_STATUS`; the other accepted source kinds remain discoverable through the action catalog but require richer fixture evidence for full interaction.
- Correction requires the exact current superseded record. Future dates, source-owner mismatches and an external `INTERNAL_TEAM` allocation are rejected. History appends and only one allocation remains current per represented source.

### Reports — fixed categories and immutable snapshots

- Eight categories, inclusive date range up to 366 days, search and six fixed columns. Actual source records appear before freeze/history actions.
- Current preview exports, Owner freeze and linked correction snapshots are distinct. CSV/XLSX/PDF/print give clearly simulated outcomes; no files are generated.
- Freeze retains the original period, rows, full source manifest, generation date and reason. Corrections append a linked snapshot using that original period. Source edits do not alter prior rows.
- Read/export checks the complete retained manifest, including records hidden by filtering. Source-access loss conceals all retained facts and actions.
- Skills/Training remains visible as an unavailable accepted report source while S18 integration is IN PROGRESS. Presence of the Skills prototype does not establish report-source acceptance.

### Saved Reports — definition, version, draft and generated run

- Named definitions remain beside the selected definition on desktop. Configuration is collapsed so the authorized preview appears early.
- Seven supported sources, ordered subsets of six columns, scalar equals/contains filters, active-filter count/clear, grouping and neutral NONE/BAR/PIE row-count representations. This bounded walkthrough edits up to two filters; that is a prototype limit, not a new business rule.
- Save appends an immutable definition version. A stale expected version shows a conflict. Inspecting an older version does not revise the current one.
- Draft preview is labeled explicitly. **Generate run from saved version** uses the selected retained version, not unsaved edits. Retained runs keep their original configuration, rows and full pre-filter manifest. Ordinary current-preview export refreshes current authorized facts.
- Owner sees accessible definitions; explicitly scoped Meera sees her creator-owned definitions. Employees without report management see no builder or private definition/run facts. This is fixture visibility, not backend authorization acceptance.
- Exact rows open the same task/review/document/time/attendance/decision workflows. Back restores UI selections/drafts without rolling back versions, runs, cycles or corrections. Automation opens its existing Manage home.

## Capability-to-home map — Insights refinement

| Capability | Primary home | Contextual shortcuts | Visible roles in fixture | Canonical object | Required state | Validation journey |
|---|---|---|---|---|---|---|
| Employee / Leader evidence | Insights → Performance | Exact task, review, Time, Attendance | Own reader; Owner or explicit current manager for others | Person/family/period snapshot | Current subject/source scope | Person → PE-023 → RCP → Back |
| Policy create / approve; group assignment | Performance → Policy/group setup | Project Health → Policy setup | Owner | Policy ID/version; dated person/group | Explicit inputs, future/current effective date, matching version | Draft → approval → assignment |
| Comment / goal / development action | Performance → review cycle | Exact retained snapshot | Current manager/Owner | CY-023 / PE-023 | Matching subject/period; OPEN | Append → finalize → history |
| Own acknowledgement | Performance → own cycle | Own snapshot | Exact subject | CY-023 acknowledgement | Current own visibility; OPEN or FINALIZED | Owner finalizes → Ananya acknowledges |
| Project health / delay evidence | Insights → Project Health | Project Plan/Tasks/Reviews/Delivery | Current project readers | Project/period source evidence | Accessible project/source | Palm → S-014; Azure → EXT-019 |
| Delay record / correction | Project Health → Owner delay section | Source task; retained history | Owner | Exact source attribution / supersedes chain | Explicit equivalent days/reason; source match | Record → conflict → exact correction |
| Fixed report preview / current export | Insights → Reports | Exact source records | Current source scope | Category/period/authorized rows | Eight categories; six fixed columns | Preview → source → Back → export |
| Freeze / linked correction | Reports → disclosed Owner snapshot | Retained history | Owner for write; current full-source scope for read | Immutable snapshot/full manifest | Required reason, valid range, whole-manifest access | Freeze → source changes → correction |
| Saved definition / ordered columns / filters / chart | Insights → Saved Reports | Reports builder shortcut | Owner / explicit report.manage; staff creator scope | Definition ID / immutable version | Supported seven sources/six fields | v1 → edit → v2 → inspect v1 |
| Current export / retained generated run | Saved Reports → preview / retained runs | Manage automation | Authorized definition/source scope | Selected version + retained full-manifest run | Current source auth; original run reauthorization | Run v1 → draft edit → inspect old run |

The regenerated [whole-application map](UX_CAPABILITY_HOME_MAP_2026-10-07.md) retains **35 families and 352 distinct family/action labels**, including the original 33/335 plus S18/S27. Catalogue preservation is not a claim that every action has a complete production-equivalent prototype flow.

## Validation findings / Owner review table

| Issue | Reference/pattern used | Change / screen | Why | What still needs testing | Owner decision needed? |
|---|---|---|---|---|---|
| Insights pages previously shared a generic catalog shape | Officevibe / Asana / Attio | Distinct person, project, fixed report and definition hierarchies | Users can predict the home from the question they need answered | Unassisted destination choice and naming | Validate four homes and names |
| Evidence and scope were buried | Officevibe scope/detail; Wrike filter flow | Compact scope and source records; secondary forms disclosed | Reduce simultaneous controls and repeated navigation | Time to identify person/project/next action | No new business decision |
| Performance mixed first-pass and correction-free evidence | Sense Studios S23, not a borrowed rule | Separate metrics; exact approved fictional policy identity | Prevent misleading scores and wrong-person evidence | Real source completeness and scored snapshot comprehension | No; accepted rule retained |
| Policy setup had incomplete generic proposals | Sense Studios S23 | Explicit draft, approval, dated group flow | A proposal is not an approved policy; old evidence stays immutable | All metric combinations, revision conflicts and full health-policy journeys | No new defaults requested |
| Delay context could borrow Azure data for Palm | Asana context + Sense S23 | Project-scoped rows, exact sources and append-only correction | Prevent cross-project attribution and unstructured waiting assumptions | Non-TASK_STATUS source kinds and full period coverage | No; broader fixture coverage remains |
| Fixed reports appeared configurable like Saved Reports | TravelPerk export; Attio config placement | Fixed six-field preview vs bounded Saved builder | Keep accepted workflows predictable | Can users distinguish current export, run and Owner freeze? | Validate wording |
| Saved drafts could be confused with retained definitions/runs | Mercury saved view; Attio directory | Explicit version/draft/run identity, current export vs saved-version generation | Preserve the meaning of retained evidence | Larger definition lists; unsaved changes warning/discard wording | Validate recovery wording |
| Opening sources lost list context | Wrike source/filter retention | Shared canonical object links with scoped Back | Avoid searching again | Browser Back and long-list position with many records | No; participant walkthrough |
| Lost source access could disclose retained facts | Sense Studios authorization contract | Central gate and whole pre-filter manifest recheck | A filtered-out record is still part of retained evidence | Every protected field and original source permission change | No; no permission change proposed |
| Mobile stacked tables lacked readable field identity | Neutral low-fidelity layout inspection | Labeled stacked cells and retained scope | Keep records understandable at 390px | Larger mobile definition directory and first-record depth | Owner comparison of A/B remains pending |

### Remaining scattered / hidden / duplicate actions

- Multiple source links are intentional shortcuts to one canonical object; no duplicate task/review records are created.
- Fixed Reports catalog wording “period / columns” is retained for coverage but sends column configuration to Saved Reports. Owner should validate whether that catalog wording is misleading.
- The secondary capability catalogs preserve all accepted controls; some advanced operations still route to scoped setup or an explanatory prototype state. Full implementation parity is not claimed by retaining a label.
- Operational People/Insights stay outside Settings. Policy configuration is contextual to Performance/Project Health; organization configuration remains under Settings/Manage.
- On mobile, Saved Reports' definition directory appears above selected detail. Larger lists may push records too low; compare an expandable directory or selector during user validation.

## Actual checks and review evidence

- `UX_REFERO_REVISION_CHECK_2026-10-07.cjs`: U01–U07 passed; U08 connected journeys passed for both mobile candidates. 37 legacy workflow/role visits, 375 visible controls preserved; zero page errors. Human preference/comprehension comparison remains pending.
- `UX_INSIGHTS_WALKTHROUGH_2026-10-08.cjs`: nine connected checks passed: scoped source/Back, finalization + post-finalization acknowledgement, explicit delay correction, immutable report freeze/correction, access-loss concealment, saved-version/run retention, creator scope and four mobile layouts. Zero page errors and no page overflow at 390 × 844.
- `UX_INSIGHTS_POLICY_CHECK_2026-10-08.cjs`: five checks passed: policy draft, exact Owner approval, prior snapshot preservation, prospective assignment, Employee concealment. Test inputs are explicit fictional values.
- `UX_INSIGHTS_GUARD_CHECK_2026-10-08.cjs`: five checks passed: filtered-out source denies full manifest, creator visibility, project owner choices, no fabricated Palm review, Leader exact review link. Zero page errors.
- `UX_GAP_WALKTHROUGH_2026-10-08.cjs`: S18 skill/training/publication, S27 nonbinding decision/task handoff, document transfer/finalization/recipient acknowledgment and revised Reports Back/access loss still pass; six mobile surfaces, zero page errors.
- `UX_CAPABILITY_MAP_BUILD_2026-10-07.cjs`: regenerated 35-family/352-label inventory.
- Desktop and mobile PNGs inspected under [insights-review-2026-10-08](insights-review-2026-10-08). JSON results beside captures record actual checks.
- Exact GPT-6.1 Sol accepted the bounded prototype source after fixes. Sol did not run the browser checks; the primary agent ran them. No production gate, application build, API/database test or deployment was run for this UX-only revision.

## Owner decisions and readiness

Only UX decisions are requested: validate the distinct four Insights destinations; wording for preview/run/frozen snapshot and unsaved changes; mobile directory placement and navigation candidate A/B. Policy values and permissions remain governed by accepted rules—no new defaults or workflow decisions are proposed.

**NOT READY FOR UNASSISTED USER VALIDATION of the complete application.** Ready for a guided Owner walkthrough of the revised Insights journeys. Source manifests are intentionally incomplete, scores remain uncomputed, exports are simulated, fixtures reset on refresh, advanced delay-source kinds and larger directory/mobile recovery paths need more representation and participant evidence. Successful artifact checks establish connected behavior, not user comprehension or operational acceptance.

Stop at this revised low-fidelity package. UX is not frozen; no visual direction, Gate B, production UI, backend, schema, permissions or business rules were changed.
