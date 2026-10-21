# Unified design system proposal

8 October 2026 · Version0.1 · **PROPOSED — Owner approval pending.** No application code, runtime stylesheet, dependency, backend or schema change is authorized by this document.

## Foundation and reference lock

Designing the internal Sense Studios web/PWA workspace and its separately secured client/external/public surfaces for professional office and field work. Users need to find their work, understand current obligations, inspect evidence and perform the next authorized action with confidence. Tone: precise, dependable and familiar. Main risk: presentation that conceals workflow gates or implies authority, calculations or data that do not exist.

Primary foundation is the [existing approved warm operational lock](../ui/UX_REFERO_DESIGN_LOCK_2026-10-08.md), now supported by full Zelt research. Preserve cream/pine/gold roles, quiet surface contrast, restrained geometry, readable work rows and factual source labels. Borrow only Linear's work-row hierarchy and Cal/UI's compact control consistency. Interaction references have bounded roles in the [research ledger](02-refero-research.md): D01–D11.

The memorable product detail is an **evidence and action strip** on consequential object views: owning project/branch, exact record or revision/round, current state, and next authorized actor/action. This is a layout proposal over existing information, not a new workflow engine. It should make “which work, which version, whose turn” visible before every consequential action.

Reject full dark-theme propagation, decorative imagery/gradients, oversized marketing headlines, generic cards for every datum, copied branded competitor palettes, fabricated metrics, unsupported global search and hidden capabilities. Zelt's amber CTA/3D marketing media are omitted rather than repurposed. Sense already owns the pine primary action and gold brand mark.

## Token architecture

Proposal values are persistent in [tokens.proposed.json](tokens.proposed.json). This is plain proposal JSON, not a runtime import or a claimed DTCG-conformant export. Later approved implementation should map primitive → semantic → component values into the existing CSS variables, module by module, without changing token meanings.

| Layer | Examples | Rule |
|---|---|---|
| Primitive | pine182c29, creamf4f1e9,4px spacing unit,8.8px control radius | Raw values have no permission/state semantics |
| Semantic | text.primary, surface.selected, action.primary, focus.visible, feedback.danger | Meaning stays stable across modules |
| Component | button.primary.fill, input.border, workRow.selected, evidenceHeader.surface | State-specific aliases; no hard-coded new local palette |

### Color roles and calculated checks

| Semantic role | Existing / proposed value | Role / decision |
|---|---|---|
| Canvas | #f4f1e9 | Preserve approved cream |
| Primary surface / subdued surface | #fffdf7 / #faf8f2 | Preserve records/secondary areas |
| Selected surface | #e3eadf | Current selection only, with marker/text |
| Primary text / strong text | #182c29 / #29463d | Preserve pine hierarchy |
| Secondary text | Existing #61736b; propose #50645b | Darken muted text on cream; do not shrink it to resolve density |
| Primary action / hover | #182c29 / #35534a; white text | Verb-led main action; no new bright-blue CTA |
| Decorative divider | #d9d8cd; softer #e2e1d8 | Decoration/section boundaries only |
| Required control boundary | Propose #7c887f | Stronger than decorative border; input/control recognition |
| Focus | Existing #b98f49; propose #29463d outer ring with surface gap | Pine2–3px ring separated from pine controls by2px light gap |
| Brand accent | #e7c680 | Mark/small existing accents; not ordinary text on cream |
| Success | #315947 on #f1f7ef | Confirmed accepted response, labeled |
| Warning | Propose #755018 on #fff4d6 | Attention/prerequisite, labeled; not approval |
| Danger | #853d33 on #fff1ed | Error/rejected/destructive context, label required |
| Information | #29463d on #e3eadf | Context/source explanation, not implicit success |

Calculated existing opaque pairs: pine on cream13.00:1; secondary #61736b on cream4.46:1 and on surface4.95:1; gold on pine8.93:1; existing gold focus on cream2.62:1; proposed pine focus on cream9.13:1; control border on surface3.63:1. Decorative divider on surface1.41:1 cannot be the only control boundary. Success/warning/danger pairs are7.28/6.57/7.03:1. [Calculation evidence](evidence/contrast-calculations.json) is not rendered accessibility acceptance. Check composed states, opacity, focus adjacency and actual text after implementation.

Status colors supplement exact words/icons; “Waiting,” “Needs correction,” “Pending approval” and “Unavailable” are different even when sharing a hue. Overdue is a derived flag, not a replacement task state. No color grants authority or computes domain status.

### Typography

Keep the existing Inter/system stack. Verify the actual loaded face before documenting Inter as a shipped font asset; do not add an external font service. Georgia stays in limited existing brand/auth contexts. Operational record titles/headings use sans-serif; changing legacy operational serif headings is a cosmetic proposal, separate from behavior.

| Role | Desktop / small-screen size and line height | Weight / use |
|---|---|---|
| Metadata |12/18px |400; timestamps/reference IDs; never sole critical instruction |
| Worklist/control |14/20px |400–500; compact rows and labels |
| Reading/form input |16/24px |400; explanatory text and touch inputs |
| Section |20/28px |600; functional groups |
| Page |28/34px; mobile24/30px |600; one clear page title |
| Numerical duration/ledger |14–16px, tabular numerals | Same UI family; explicit h/min/date/unit |
| Exact identifiers | UI monospace when helpful | Immutable IDs/checksums/technical evidence, not ordinary prose |

Use sentence case, familiar nouns and specific verbs. Keep “Task owner” distinct from organization “Owner.” Avoid all-caps for essential instructions. Display target and committed dates by name rather than unlabeled slashes. Align money/duration numerically with units and server-approved precision; do not change business calculations or timezone conventions.

### Spacing, shape, density and depth

4px unit; steps0/4/8/12/16/20/24/32/40/48/64. Use8px within related controls,16px within panels and24–32px between sections. Defaults: control radius8.8px and panel12.8px, reflecting existing .55/.8rem values at16px root. Pills belong to short status/filter chips, not every surface.

Default work rows have minimum44px height,8px vertical/12px horizontal padding; wrap long content. Comfortable mobile cards grow with content. A32px desktop compact control is allowed only with adequate hit area/spacing; it is not the mobile target. Do not introduce a persisted density preference until its storage contract is approved; responsive presentation can vary density without a new setting.

Borders/tonal surfaces establish hierarchy. Routine list rows have no shadow. Preserve subtle existing panel depth when useful; reserve stronger shadow for overlays. Avoid nested card-within-card structures where a heading/divider suffices. All controls retain explicit visible focus.

## Navigation and page grammar

Keep actual routes and object identifiers; a label change must not break bookmarks. Internal Dashboard remains the current default. My Work provides personal assigned/created/collaborating work as supported; it is not a new universal default selected by this proposal.

| Navigation layer | Proposed contract | Existing scope |
|---|---|---|
| Global | Dashboard, grouped Work/People/Insights/Manage; consistent active location; labeled route filter | Existing21 destination inventory |
| Object context | Project name, owning branch, current section/object, contextual return | Use authorized response; never infer branch from employee home |
| Project sections | Overview, Plan, Tasks, Documents, Reviews, Delivery, Activity | Existing7 sections; Plan state retained |
| Functional area | Learning skills/training/library; insights performance/health/reports/saved reports; Workforce sections; Settings sections | Retain canonical contextual routes |
| Mobile | Dashboard/My Work/Tasks/Documents and More sheet; all remaining destinations reachable | Retain current primary paths until usage research supports changing them |
| Portal/public | Separate CLIENT, EXTERNAL and published portfolio shells | Shared visual primitives only; never shared staff navigation/session |

The desktop “route filter” finds destination labels. Call it “Find a page” or equivalent, not “Search everything.” Any future content search/command palette is separately API-dependent and deferred. CRM's existing workflow deserves a proposed first-class home, but it is an IA/navigation change requiring later approval, not missing CRM functionality.

Use a consistent page grammar: context/breadcrumb → title with one dominant authorized action → source/filter/status toolbar → primary list/object content → contextual supporting evidence/history. Let dense directories use available width up to1600px; constrain reading text to about72characters. Do not force all modules into a dashboard card grid.

Capability-aware navigation is proposed only where authoritative capability context already exists. Otherwise show current guarded routes and a clear denied state; do not infer access from titles or cached fixtures. Return paths must not leak inaccessible record names.

## Reusable component contracts

| Component family | Content / interaction contract | Boundary |
|---|---|---|
| PageHeader/ContextStrip | Title, authorized project/branch, scope/as-of, primary action; actions wrap below title | Header does not invent source freshness |
| WorkList/RecordRow | Identity/title, named state, owner, project/stage, relevant dates, next action; selected marker | Views share records; never call loaded-page counts organization totals |
| FilterBar | Search field, supported scope/sort, active count/chips and Reset; secondary filters disclosed | Only supported operators/fields; preserve URL context |
| DetailPane | Canonical object/read; task/project identity, next actor/action, evidence, detail/history disclosures | Desktop retains list; mobile full detail with contextual Back |
| EvidenceHeader/Viewer | Exact file/revision/round/version; source metadata, preview unavailable/download states; side comments if space | Preview failure does not mean evidence absent; old evidence immutable |
| ActionPanel | Allowed verb, prerequisites, reason input where required, expected consequence, confirmation/result | Typed owning command, no universal Approve/state setter |
| FieldGroup | Visible label, required/optional, hint/unit, inline error; summary after attempted submit | Preserve inputs on failure; no placeholder-only labels |
| Button | Primary/secondary/tertiary/destructive; idle/hover/focus/pressed/pending/unavailable | Destructive label names object/consequence; disable duplicate submissions while pending |
| Person/ScopePicker | Named employee/role context, assignment eligibility from existing responses | One task owner; collaborators separate; no cross-branch expansion |
| Date/Duration | Named date type and organization semantics; h/min; configured schedule evidence | Do not invent default policy, round duration, or reinterpret overnight date |
| Dialog/Sheet | Heading/context, focused form/evidence, cancel/submit, contained scroll; mobile full-width sheet | Keyboard focus/return; no hidden loss of drafts |
| Notice/ResultReceipt | Exact completed action and object, recoverable next step; announcement | Toast supplements retained result/history, never the only durable receipt |
| Empty/Unavailable/Error | Separate no records, no matches, denied, missing source, insufficient evidence, failure, offline | Never convert all into zero, green check or shared empty-state copy |
| AuditTimeline | Actor, exact command/result, timestamp/version/reason, linked correction | Comments and nonbinding suggestions do not become official decisions |
| Chart/Metric | Formula/policy version, permitted source/date range/unit, missing-data state; textual/table alternative | No new frontend score/weighted report aggregation |
| OfflineQueue | Local draft/pending/syncing/conflict/failed/receipt, prepared account/project, explicit compare | Local capture never presented as approved server state |

No new component framework is required. Later implementation should extract only repeated, settled patterns into the current stack, preserving per-module behavior. Avoid a giant shared form that masks different authorities.

## Interaction-state specification

| State | Visual/content response | User control / acceptance |
|---|---|---|
| Initial loading | Reserved content area and named status; no fake zero metrics | Navigation/cancel still usable; each source independent |
| Partial loading | Ready sources visible; pending sources named | No aggregate derived from incomplete/unrelated sources |
| Empty authorized data | Explain what is absent, show permitted create action | No action shown if unsupported |
| Filter no matches | Show criteria and Reset/Edit filters | Retain selected exact detail where appropriate |
| Permission denied | Explain scope and safe return; avoid disclosure | Retry must not imply it can grant access |
| Source unavailable/error | Identify affected source, recoverable Retry if appropriate | Keep other loaded sources and selected draft/context |
| Unsaved draft | Edited/saved distinction, explicit Save/Cancel | Warn on actual draft loss; no persisted-draft promise without contract |
| Submission pending | Button names operation; pending feedback, duplicates disabled | No success/optimistic approval before accepted server response |
| Success | Exact response/result plus canonical record/history | Return to same filtered context; no generic “Done” ambiguity |
| Validation failure | Error at field plus recovery instruction; values retained | Focus/announce first relevant error |
| Version conflict | Previous/current evidence and permitted amend/keep choices | No silent overwrite/retry of consequential mutation |
| Terminal/withdrawn | Read-only retained context, reason/history/expiry | Do not expose delivery reopen controls |
| Offline | Prepared scope/draft and queue receipt states clearly labeled | Sensitive decisions remain online; sync reauthorizes |
| Expired session/access | Preserve safe local context per existing security policy; reauthenticate/return | Do not show stale privileged data as current |

Use feedback motion120ms and panels180ms as proposal targets. Respect reduced motion; no status meaning depends on movement. Never animate evidence to imply successful persistence.

## Responsive layouts

Proposed breakpoints are content constraints, not device names:320–639px small,640–1023px medium,1024px+ large. Existing behavior must be rechecked before changing breakpoints.

- Small:16px gutters, one-column forms,44px primary targets, full-width detail, contextual Back, wrapping filters. Bottom navigation and sticky actions reserve safe-area/padding and never cover focus or final rows.
- Medium:20px gutters, one or two columns when labels/values fit. Use overlay detail if an adjacent pane makes both unreadable. Navigation remains complete through its existing alternate presentation.
- Large:24px gutters,240px proposed sidebar, flexible list/detail. Detail minimum width about360px; retained list about320px; fall back before either loses essential data.
- Evidence review: preview and action/comments side by side only when both fit; otherwise preview followed by decision context. File/version remains visible across scroll.
- Tables: offer content-driven cards for record workflows. Genuine two-dimensional drawings, timelines and comparison tables may use contained horizontal scroll with named region and preserved headers; ordinary pages do not.
- Verify320/390/768/1024/1440px,200% text zoom and400% browser zoom/reflow. Test long titles, errors, keyboard opening and empty/denied states, not only ideal data.

## Accessibility acceptance target

Target [WCAG2.2 AA](https://www.w3.org/TR/WCAG22/): text contrast4.5:1 (3:1 large), control contrast3:1, reflow, keyboard access, visible/unobscured focus, dragging alternatives,24px minimum targets subject to criterion exceptions, accessible authentication and status messages. Product touch target is44px. This proposal is not a conformance claim.

Use native controls where suitable. Dialog keyboard/focus behavior follows [W3C APG dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus inside, contained tab sequence, Escape where permitted and return to the invoking context. Searchable pickers follow [APG combobox guidance](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) for accessible names, selection and keyboard behavior. APG patterns inform interaction; they do not alone establish WCAG conformance.

Apply visible labels, heading hierarchy, meaningful button names, current navigation state and live announcements without repetition. Test an actual screen reader. Dates/status/evidence decisions need readable text, not color/tooltip alone. Provide non-drag commands and ensure every hover-only action is available by focus/touch. Permit zoom, paste and password-manager use. Real preview text cannot be made accessible through decorative alt text; provide appropriate file/download/text alternatives where supported.

## Approval and later adoption

Approve the direction, semantic token roles, navigation/component/state contracts and validation-first roadmap as a **proposal baseline**. The proposed contrast adjustments, operational-heading rules, evidence/action strip and CRM IA move are explicit review decisions. Approval here does not implement them.

Future work needs a bounded module brief, current source/contract check, operation-parity inventory, representative rendered prototype, explicit implementation authorization and applicable validation. Keep existing approved lock/status documentation intact; this package adds a reusable specification for approval, not a retrospective acceptance claim.

