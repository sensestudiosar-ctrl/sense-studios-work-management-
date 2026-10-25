# Measurable usability, visual, accessibility and parity acceptance

25 October 2026 · Future acceptance specification. No targets below are claimed as achieved by the current plan or by reference screenshots.

## 1. Separate gates and precedence

Every approved prototype/application slice reports **PASS / FAIL / BLOCKED / NOT RUN** independently for: functional capability parity; permission/evidence/workflow reliability; accessibility; responsive behavior; usability; visual fidelity; source/release verification where applicable. A weighted average cannot hide failure in one gate.

Precedence when a reference conflicts: **current security/business contracts and supported functionality, accessibility, responsive correctness, then visual matching**. Record the exact reference/hash/state, conflict, minimal adaptation and evidence in a deviation register. Never remove functionality, hide an error, reduce focus visibility or shrink text/targets to force a visual match. The Owner reviews the concrete adaptation; earlier exact-reference policies are not permission to retain an inaccessible or misleading interaction.

## 2. Usability protocol and metrics

The Owner confirmed three primary workflow clusters: **create tasks; check work/project progress; read review comments, correct work and resubmit**. These drive the first prototypes and tests. Other candidate workflows remain estimated-frequency until confirmed; retained test records are not usage telemetry.

Recruit8–12 representative participants through the Owner, including task creators/workers, leaders/Project Leads, reviewers, Site staff and Owner/administrator as relevant. Include at least2 participants per distinct internal workflow persona where feasible, and separate eligible CLIENT/EXTERNAL participants when those paths are audited. Do not contact users through tools without instruction. Do not use synthetic persona switches as participants or permission evidence.

Establish current-UI baselines before comparing the connected prototype, using equivalent task brief/object state/role/device. Use a counterbalanced order for repeated tasks. Record completion, wrong turns, assistance, navigation actions, context rebuilds, elapsed time and SEQ1–7. Use neutral sample work, not private operational content. For each primary scenario, collect at least10 eligible attempts across desktop/phone or mark its estimate exploratory; report raw n and individual failures.

| Metric | Target / denominator | Blocking or diagnostic rule |
|---|---|---|
| Routine success | ≥90% unassisted correct completion of each primary scenario, not only aggregate | Any systematic role-specific failure blocks that scenario |
| Creation efficiency | Given an already-written brief: employee simple task median≤60s; eligible assignment median≤90s, or ≥20% faster than current if task complexity differs | Exclude time inventing a brief. Never save time by skipping required fields/evidence/reasons |
| Check work/project progress | Locate named task's state, Primary Owner, Target/Committed distinction and relevant Project in≤30s median | Must answer correctly; a faster wrong answer is failure |
| Review correction discovery | Locate exact review comment/decision, correction task and resubmission prerequisite in≤30s median |100% correct record/round identification required for consequential scenarios |
| Navigation burden | No worse than the current fastest supported contextual path; ≥25% reduction only where baseline includes repeated project/person selection | Report each path. No universal reduction promise for already-one-click actions |
| Context retention |100% of tested detail/create/review returns retain permitted query, page/group, selection and supported focus/scroll | Lost dirty draft/uncertain receipt, wrong Project or account context is failure |
| User confidence | Median SEQ≥5/7 per primary workflow, with no persona median<4 | Review low-scoring comments even if success target passes |
| IA first choice | ≥90% correct for Daily/Project targets; ≥80% for infrequent Management/Configuration targets | Retest ambiguous labels with users rather than move features arbitrarily |
| Consequential comprehension |100% distinguish submission/internal decision/client item/Primary final/Issue/site handover in scripted scenarios | Any false approval, wrong version or unauthorized-action belief blocks acceptance |

A prototype only proves its interaction model. Real persistence and backend authorization must be verified later with actual sessions/records on approved targets; no prototype outcome is substituted for those checks.

## 3. Accessibility and keyboard gates

Target WCAG2.2AA plus the following stronger product criteria where specified. Test keyboard-only and a real screen reader, not just automated scans.

- All available actions operable by keyboard; no trap outside modal contexts. Page finder, More, true tabs, disclosure, dropdowns, list selection, drawer, validation and exact review evidence each get an explicit case.
- One meaningful main landmark/heading structure, working skip link, clear current/selected/expanded/pressed semantics, specific icon labels and associated field errors.
- Focus remains visible and not obscured by sticky chrome/keyboard; form errors and dialog dismissal move focus predictably. Current route focus does not appear as an unexplained decorative heading box.
- Product phone target goal44×44CSSpx; any smaller target requires a documented equivalent/spacing rationale and actual usability/accessibility review. WCAG2.2AA's24px/spacing exceptions are not misrepresented as44px.
- Actual composed normal text contrast≥4.5:1; appropriate large text and meaningful non-text boundaries≥3:1. Status is never color-only. Focus indicator must be visibly distinct; a stronger2px product ring is not mislabeled as an AA Focus Appearance rule.
- Text resize200%,320CSSpx reflow and long labels work without lost controls/content. Necessary two-dimensional tables/evidence canvases use labeled local regions; no viewport overflow workaround that hides fields.
- No essential dragging, long-press or hover-only control; reorder widgets has explicit Move actions. Reduced motion preserves final state and functionality.
- Screen reader can identify current Project/task/review round, submitted versus current evidence, errors, pending/uncertain result and permission changes. No repeated announcement storm from background source timestamps.

References checked in this session: [WCAG2.2](https://www.w3.org/TR/WCAG22/), [Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Focus not obscured](https://w3c.github.io/wcag/understanding/focus-not-obscured-minimum.html). These are acceptance references, not a conformance certification.

## 4. Responsive acceptance

Run the approved scenario matrix at1440×900,1395×884,1024×900,783×900,768×900,767×900,390×844 and320×740, plus landscape and a real software-keyboard phone check. Test expanded/collapsed sidebar, long names,200% text, scrolling, error banners and waiting-worker/update UI.

Required outcomes: exactly one global navigation mode; no covered first/last item or active control; complete forms/evidence/actions reachable; selected context visible; no forced unreadable split at tablet widths; no viewport horizontal scroll except documented essential evidence/table cases confined locally; touch and keyboard use the same supported actions. Capturing a screenshot alone does not pass these interactions.

## 5. Visual fidelity acceptance

Lock exact demo hashes and component scopes from DEMO_PARITY. Compare **equivalent** viewport, shell state, fixture clock, data/role/scope/selection/loading state and installed fonts. Test public/reference and actual application independently; prototype-only pictures do not prove actual application fidelity.

| Dimension | Objective check | Review rule |
|---|---|---|
| Shared shell | Navigation mode, header/sidebar offsets, content gutters, current-route marker and title treatment match accepted V10/current shell | Key aligned anchors within4CSSpx of the approved target unless a documented responsive/accessibility adaptation requires otherwise |
| Typography | Existing approved UI family/weights, readable hierarchy, meaningful labels; loaded font verified | Approved target sizes within1CSSpx where equivalent; no inaccessible shrinking or copied marketing serif substitution |
| Color/surfaces | Approved semantic palette roles, selected/feedback states, meaningful boundaries | Measure actual contrast; no token-role swapping or color-only state |
| My Work | Approved widgets/groups/rows/filter/save/detail composition in equivalent personal/management state | No replacement queue; sample teams/counts/roles are never copied into live data |
| Task Creation | Approved Brief/Assignment & timing hierarchy, all supported fields/types, phone footer/scroll and errors | Additional type/required fields or focus accommodations are explicit adaptations, not removed to match |
| Regression pixels | Frozen browser/fonts/data and documented masks for genuinely nondeterministic content | Suggested≤2% changed pixels in unchanged static chrome is a review alarm, not a sole pass/fail metric. Never mask lost fields/errors/focus/permissions |

Visual gate requires saved actual/reference images, discrepancy ledger and human review of hierarchy/spacing/type/state/overlay/phone behavior. Initial in-app full-page capture anomalies are not treated as defects; use stable viewport geometry and correct screenshots. Loading/empty/denied images do not pass populated-state fidelity.

## 6. Feature-parity acceptance

The current planning denominator is409 user-capability obligations,374 deployed API handler declarations,1694 UI declaration locations and43 deployed Route declarations including catch-alls. These are different inventories, not a sum of user features. The endpoint/control register provides traceability; every conditional state still needs runtime evidence.

For each approved slice and affected PAR row:

1. Record original and proposed entry/home, same canonical object/action, relevant current capability/state guard, required fields, source/command and return path.
2. Prove allowed discovery/action with actual authorized session and denied/changed scope/state with a different actual session or existing revoked case. Controlled network simulations are separately labeled.
3. Preserve source/evidence/version/reason, ordinary command result, recovery, audit/event behavior and current pagination/query semantics.
4. Verify every affected desktop/tablet/phone/keyboard path, supported alternate view and contextual shortcut.
5. Retain old route/presentation fallback while any row is FAIL/BLOCKED/NOT RUN. No missing or unsupported row is silently waived from the denominator.

Design mapping can be100% complete while runtime parity remains unproven. The current redesign is unbuilt and not authorized, so its runtime parity status is **NOT RUN**. No “all features preserved after redesign” claim is possible yet.

## 7. Later application verification and rollout

Before code: bounded requirement sub-IDs, selected files/components, dependencies, source/API/permission invariants, tests and acceptance recorded per AGENTS. Use approved current source and latest explicit Owner decisions; do not adopt stale119-only or S18/S27-excluded wording against their accepted bounded scopes. Additive task-review120 remains accepted; excluded client-password work does not become approved.

During later authorized implementation: targeted meaningful component/query/routing tests, web typecheck/lint/build, affected real persistence/permission/concurrency checks and browser regressions; then applicable full repository gates and independent review on exact candidate. No weakening of valid tests to match prototype behavior. Existing backend/security/data tests remain applicable even if no backend files change.

Staging only after explicit approved matched-commit acceptance through current immutable export/release workflow. Preserve previous artifacts, configuration, data, refs, offline drafts/captures and working changes. No automatic retained migration/seed/reset, new deployment platform, new frontend or provider. A later rollback restores accepted presentation artifacts without changing business data. Operational R-104/R-105, production/NAS, offsite/restore/legal and hosted-CI limits remain separately recorded.

## 8. Current result

Planning documents and audit evidence are delivered. Actual STAFF read-only role/entry/selected-workflow evidence exists; CLIENT/EXTERNAL configured states are BLOCKED by verified absence. No usability participant outcomes, redesigned runtime parity, application test-suite/build/deploy pass, or accessibility certification is claimed.
