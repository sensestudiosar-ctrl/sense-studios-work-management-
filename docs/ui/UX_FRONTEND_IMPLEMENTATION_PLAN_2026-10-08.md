# Sense Studios — prototype-to-application frontend plan

Date: 8 October 2026. This is the earlier presentation plan. The Owner has since authorized gap closure, including backend/API work; see the current execution record in [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) and [gap register](UX_FRONTEND_CONTRACT_GAPS_2026-10-08.md). Authorization does not imply UX freeze or Gate B approval.

## 1. Owner boundary

Implement the validated prototype's navigation, hierarchy, contextual actions, desktop/mobile layouts and connected flows using existing application services and rules. This document plans that work; it does not begin it.

- Backend/API/schema/migrations, authorization, business rules, calculations, domain events and delivery providers are not prescribed by this presentation plan. Current Owner instruction authorizes bounded additive API work through the separate execution record; it does not authorize invented rules or weakened access checks.
- No invented endpoints, artificial scores, seeded policies, mock production success states, new approval systems or browser-maintained business records.
- Preserve existing domain forms and actions even where the prototype shows only a representative action catalogue. The prototype is not a complete replacement specification for those forms.
- Treat unsupported prototype behavior as a recorded gap. Do not disguise it with filtering one page, crawling every page, copying data into local storage or combining partial totals.
- Keep internal, client, external and public shells/session boundaries separate.

## 2. Sources and current baseline

Current Owner direction precedes historical documents. Use approved requirements/addenda, settled slice specifications and contracts, current implementation, then prototype proposals. The neutral prototype specifies presentation and journeys; Refero supplies placement evidence, never business logic.

Inspected checkout HEAD: `5a3f8b6dec73d9b08ef96ed751326c2087e8e458`. The working tree contains substantial existing changes, so HEAD alone is not a complete source pin. Before execution, record the actual frontend/API source hashes, reconcile changes made since this review and preserve unrelated work.

Relevant sources:

- [Current state](../../CURRENT_STATE.md), [implementation status](../../IMPLEMENTATION_STATUS.md), [module registry](../../MODULE_REGISTRY.md), [implementation plan](../../IMPLEMENTATION_PLAN.md), approved requirements and requirement trace.
- [Connected prototype](UX_VALIDATION_LOW_FIDELITY_2026-10-07.html), [architecture](UX_ARCHITECTURE_PHASE_2026-10-07.md), [Refero revision package](UX_REFERO_REVISION_PACKAGE_2026-10-07.md), [capability-to-home map](UX_CAPABILITY_HOME_MAP_2026-10-07.md), [flow adoption review](UX_REFERO_FLOW_ADOPTION_2026-10-08.md), [mobile refinement](UX_MOBILE_REVISION_2026-10-08.md), [S18/S27 frontend batches](UX_S18_S27_FRONTEND_PLAN_2026-10-08.md).
- Current application routes/components/controllers. Older [master plan](master-plan/UI_UX_MASTER_PLAN.md) and [API gap register](master-plan/API_GAP_REGISTER.md) are historical S22 evidence; their missing-route/contract/status claims must not be carried forward without rechecking.

Current Owner direction records S18 and S27 **COMPLETE for development/local staging** following current documentation and acceptance. The reported final aggregate verification was 275 API, 220 web, 367 PostgreSQL and 57 browser tests; the separate final 484-fingerprint acceptance excludes later review edits. These results are historical acceptance evidence, not checks run for this planning update. Actual-project/production operations remain unverified. See the [S18/S27 frontend plan](UX_S18_S27_FRONTEND_PLAN_2026-10-08.md) for the bounded frontend batches; this plan does not claim actual-project or production acceptance.

The application already has `/tasks`, `/my-work`, `/projects`, `/reviews` and many other domain routes. Reuse them. Health is currently within `/performance`, fixed reports within `/dashboard`, and saved reports within `/automation`. Separate presentation homes can be frontend routes over these existing components/contracts.

## 3. Mandatory parity ledger

Before each implementation batch, expand the existing **35 families / 352 catalogue labels** into operation-level rows. Those numbers describe the prototype catalogue, not 352 verified production actions.

Each row must contain: requirement/sub-ID; owning slice/module; prototype entry; current component; existing API operation and returned identifier; permitted actor/capability; valid source state; intended desktop/mobile home; contextual shortcuts; list/detail/Back journey; status; evidence/test reference; gap ID.

Use three statuses: **existing interface to reuse**, **frontend presentation work**, and **contract gap**. S18/S27 acceptance is complete and is not a conditional frontend gate. Do not call a family complete merely because its navigation label is present. Map multi-clause requirements separately and retain omitted authoring, advanced configuration, cancellation, recovery and history operations.

## 4. Presentation architecture

### Navigation

| Group | Homes to implement or retain |
|---|---|
| Work | Dashboard, My Work, Tasks, Projects, Reviews, Decisions; existing evidence assistance where authorized |
| People | Time, Workforce, Leave/WFH, Attendance, accepted Skills/Library/Training |
| Insights | Performance, Project Health, fixed Reports, Saved Reports |
| Business | Existing leads/clients workflows |
| Manage | Organization/Access, Templates, Integrations, Automation, Audit/Retention using existing permission checks |
| Account/Settings | Personal preferences, notifications, sessions, passkeys/recovery and sign-out |

Lower-frequency groups disclose progressively. Mobile B remains the working candidate: Dashboard / My Work / Tasks / Projects / More. Retain A for comparison until Owner validation settles placement. Shared destinations may have different desktop/mobile layouts; they use the same records, actions and service responses.

Settings is a category index over existing configuration. It links to existing Manage workflows rather than creating duplicate integration/automation/access editors. People and Insights remain operational destinations. Role names in the prototype are examples; production visibility comes from the current session and returned capabilities, with the existing backend enforcing every request.

### Routes and context

Retain existing URLs and protected wrappers. Add only frontend route/selection state needed for new homes. Final URL shapes are implementation details, not new domain functionality.

- One canonical task-detail component serves My Work, global Tasks, Project Tasks, review corrections, Dashboard and notifications.
- Selected IDs come from authorized responses or are reloaded through existing exact-object reads. An ID in a URL grants no access.
- Keep scope, supported filters, sort semantics, view, project, selected object and list position in navigation state/query state. Separate UI state from persisted business records.
- Desktop retains originating list beside detail; mobile uses a full-screen detail and contextual Back. Browser Back must restore the original list state, not merely leave old variables intact.
- On sign-out, account change, access loss or denied reads, clear/conceal sensitive cached content. Do not keep an old snapshot visible after authorization fails.
- Preserve current conflict handling, reason fields, expected versions, CSRF/session handling and command payloads. Refetch the exact object after a successful mutation and refresh affected summaries through existing reads. A failed/partial refresh is explicit; do not mark the whole application resolved locally.

## 5. Implementation sequence

These are proposed frontend batches, not new product slices. Begin only after explicit execution authorization and applicable UX decisions.

| Batch | Work and existing interfaces | Dependency | Acceptance |
|---|---|---|---|
| F01 — Baseline/parity | Expand ledger, pin source, resolve contract labels, record accepted S18/S27 interfaces and remaining frontend gaps | Current source/contract audit | Every catalogue family has an owning interface or named gap; no legacy action disappears |
| F02 — Shell/context | Adapt `workspace-navigation.tsx`, existing `WorkspaceLayout`, `app.tsx`; grouped desktop/mobile navigation, Bell/Settings, protected frontend homes | F01; retained identity boundaries | Old routes work; direct links and Back preserve scope; no internal shell inside isolated portals |
| F03 — Tasks/My Work | Refine `task.tsx`, `my-work-attention.tsx`; compact search/scope/view, supported filter/sort semantics, four task presentations, one detail/create; desktop split/mobile full screen | F02; G01–G05 decisions | Same authorized task set in supported views; real Create/detail/Back; no fake creator/collaborator scope |
| F04 — Projects | Adapt `projects-route.tsx`, `project.tsx`, `project-template.tsx`; Cards/List directory and seven-section workspace | F03; current project/plan interfaces | Project context reaches Plan/Tasks/Documents/Reviews/Delivery/Activity; Plan stays distinct from Tasks |
| F05 — Review/evidence/decisions | Refine `review.tsx`, `review-evidence.tsx`, `revision.tsx`, `document.tsx`, existing approval queue/client review | F04; exact-object reads/capabilities | Real immutable revision/round → correction → resubmission; client consent/issue/receipt remain distinct |
| F06 — Dashboard/notifications | Restructure `dashboard.tsx` around attention/next work/exceptions; link actual source references to canonical detail; expose existing inbox/preferences | F03–F05; dashboard source contracts | First meaningful action discoverable; counts open supported filtered sets; partial/stale/denied source visible |
| F07 — People/Delivery | Compose `time.tsx`, `workforce.tsx`, `site.tsx`, Turnkey and existing offline capture interfaces into distinct contexts | F04–F06; existing S16/S17/S19–S22 rules | Timer/request/punch/allocation/snags have distinct homes and actual evidence; no UI-derived entitlement/capacity |
| F08 — Insights/Manage/Account | Extract presentation panels from `performance.tsx`, `dashboard.tsx`, `automation.tsx`, existing security/organization controls | F02; S23/S24/S26 reads | Health/Reports/Saved Reports/Performance distinct; retained versions/manifests and personal/admin distinction preserved |
| F09a — Skills / Library / Training | Present accepted S18 catalogue, skill, library and training workflows using current interfaces | F01 ledger; [S18/S27 frontend plan](UX_S18_S27_FRONTEND_PLAN_2026-10-08.md) | Preserve current actor, criteria, version and independent assessment rules; recommendation does not become an official rating |
| F09b — Evidence assistance | Present accepted S27 deterministic evidence, candidate and human-decision workflow using current source ports | F01 ledger; [S18/S27 frontend plan](UX_S18_S27_FRONTEND_PLAN_2026-10-08.md) | Preserve source evidence and decisions; handoff remains through ordinary authorized domain workflows |
| F09c — Remaining parity | Preserve CRM/templates/access/audit, galleries/publication/client/external workflows | F01 ledger; owning current interfaces | Reconcile remaining catalogue families and retain authoring/admin operations |
| F10 — Acceptance | Application flow, access-loss, responsive/accessibility and regression evidence; refresh docs | All supported batches; explicit gap outcomes | Accepted supported frontend scope, listed remaining gaps, no backend diff and no production-readiness claim |

F06 follows canonical detail work so attention items can open the actual object rather than a generic module that requires another search. Existing accepted domain components remain usable while each presentation batch is introduced. Do not replace all modules at once or refactor owning services.

## 6. Screen and capability coverage

| Prototype home/family | Existing slice/requirement anchor | Planned frontend treatment |
|---|---|---|
| Dashboard / reminders / inbox | S04; S24 R-058–060, R-073–074, R-077 | Existing authorized read model; concise summaries, deep links, recipient-specific inbox and supported schedule/preference forms |
| Tasks / advanced tasks / My Work | S09–S10, settled date/wait/dependency/recurrence rules | List/detail/create and existing advanced operations; UI views do not mutate task state |
| Project setup/lifecycle / Plan / templates | S07–S08 | Existing direct/Won creation, ownership/scope, milestones/gates, versioned templates and audited overrides |
| Documents / revisions / transmittals | S11–S12 | Exact upload/readiness, protected files/grants, register R/CR, issue and own-recipient acknowledgement |
| Internal review | S13 | Named independent reviewer, submission/round, feedback/category/severity, correction task, retained history and guarded recovery |
| Client access/review/issued items | S14 | Existing staff management and isolated Primary/Delegate portal; exact consent/approval and package/item grants |
| Private/public galleries | S15 R-040.a–c | Existing exact granted sources, publication/withdrawal; preserve standalone public entry |
| Time | S16 R-041–043 | Timer/manual records, immutable correction/approval history and existing accounting delivery status |
| Workforce / Leave / Attendance | S17 R-046–051 | Distinct page/panel homes over existing schedules, dated allocations, leave/WFH and attendance rules |
| Skills / Library / Training | S18 R-044–045, R-055–057, C-025–027 | Accepted S18 interfaces for catalogue/ratings/requests, library publication/acknowledgement and training authoring/assessment; frontend integration remains planned |
| Turnkey / procurement / factory | S19 | Exact design/BOQ releases, separate cost/procurement approval, materials/progress and existing controlled snapshots |
| Delivery / Site / snags | S20 R-068–070 | Work packages, confirmed reports, independent verification, separate closure/handover |
| External access / native CAD | S21 | Current advisory/transmittal/native-share/closeout interfaces; isolated external authority |
| Offline capture | S22 | Existing supported local drafts, queue/receipt/conflict handling; no new offline command types |
| Performance / project health | S23 R-061–067 | Service-computed approved-policy evidence and delay records; no frontend scoring |
| Fixed reports / exports / snapshots | S24 | Eight current categories, current source fields, existing formats, immutable retained snapshots and reauthorization |
| Calendar / website intake / maps | S25 | Existing bounded connectors/configuration and factual status; no broader sync/WhatsApp/deep CAD |
| Saved reports / automation | S26 R-078, R-082–083 | Current scalar filters/columns, versioned definitions, runs/receipts, count charts and nonbinding human review |
| Evidence assistance | S27 bounded R-052–054, R-087–090 | Accepted S27 deterministic source facts, unranked candidates, reasoned decisions and ordinary domain handoff; frontend integration remains planned |
| Leads/clients / organization/access / audit/security | S02–S06 | Rehome existing editors, approvals, sessions/passkeys/recovery and audit/retention; preserve scope/reason and authorization gates |

This table groups all catalogue families; the detailed capability map remains the per-action inventory. When the prototype omits an existing detailed form, retain the application form and place it in its owning context. Do not fill the omission with a generic “Record prototype step” dialog.

## 7. Connected flow contracts

| Flow | Planned journey | Existing authority/state guard | Return / completion |
|---|---|---|---|
| U01 — Today's work | Dashboard → My Work → task | Authorized task/attention response; personal ownership versus oversight explicit | Same task; owner, project/stage, target/committed date and real required action; Back restores list |
| U02 — Task scopes/views | Tasks → supported scope → List/Cards/Kanban/Timeline → detail | Existing paginated query; G01–G05 limitations visible | Same query/loaded set across views; no dragged status changes or invented schedule editing |
| U03 — Create project task | Cedar equivalent real project → Tasks → Create → existing create command → exact detail | Authorized project/plan item, owner/collaborators, required fields/reason/overload acknowledgement where current form requires it | Read-only reviewer context; reviewer planning remains separate; created record recoverable through supported query |
| U04 — Internal correction loop | Exact drawing revision/task submission → Review → authorized approval OR correction → linked correction task → corrected submission → new round | S13/S12 commands, named independent actor, immutable old submission/round and expected version | Current revision/round and next actor always visible; historical evidence read-only; client review follows its separate workflow |
| U05 — Site | Palm equivalent real Turnkey project → Delivery → Site → exact snag/report/package | Existing repair evidence, independent verification, management closure and handover gates | Waiting reason/action retained; ordinary domain success refreshed; no “approve all” shortcut |
| U06 — Attention/notification | Item/count → exact source or supported filtered list → existing action | Recipient/source visibility and designated decision actor | Mark read affects notification only; domain resolution refreshes source; other pending work remains |
| U07 — Settings | Personal category → existing preference/session/passkey control; authorized admin → existing config | Current identity/permissions and mandatory notification policies | Selected category retained; operational People/Insights stay outside configuration |
| U08 — Mobile | Repeat U01–U07 and discovery of Reviews/Decisions/Site/Settings | Same canonical responses/actions as desktop | Full-screen detail, contextual Back, keyboard/focus, no obscured controls; compare A/B before freeze |
| Documents | Project → folder/file → upload progress → existing explicit finalize → exact revision → clearance → issue → receipt | S11–S14 scoped upload/immutable R/CR, own-recipient acknowledgement | Uploading/finalized/approved/issued/acknowledged remain separate states; real retry/conflict handling |
| Time/People | Task → timer/manual time → existing submit/correction; Workforce → allocation/request/punch | S16/S17 exact schedule, balance, date and actor rules | Persisted record/history returned; no browser-calculated paid minutes or entitlement |
| Insights | Health → project → current computed evidence → source; Reports → current/frozen → authorized export; Saved definition → version → run | S23/S24/S26 source/field/policy/manifest checks | Direct project switching; definition/run/snapshot separate; unavailable source concealed, not approximated |
| Learning | Published exact library version → acknowledgement; assigned training → submit → changes → resubmit → assessment | Existing S18 actor, criteria, version and independent assessment rules | Skill recommendation/request separate from official rating; do not mark completion from page navigation |
| Assistance | Exact authorized source → request → facts/candidates → human decision → ordinary task/reviewer workflow | Existing S27 source access, current Team scope, immutable evidence and decision reason | Evidence acceptance does not assign person or approve work; no external transmission or live inference |
| Other catalogue flows | CRM → Won → project; scope/lifecycle decisions; templates; gallery publish/withdraw; integrations/rule runs; external advisory/cancellation | Owning current domain component and contract for every ledger row | Preserve existing commands and evidence; no generic cross-domain action implementation |

Azure/Cedar/Palm names are validation examples. Production must display actual returned records, not install those fixtures or hardcode their owners/revisions/dates.

## 8. Gaps and safe outcomes

The companion [current contract gap register](UX_FRONTEND_CONTRACT_GAPS_2026-10-08.md) identifies prototype behaviors that cannot be promised under unchanged contracts. A gap can stop one feature while supported presentation work proceeds after authorization. Full prototype parity must not be claimed while gaps remain.

Do not silently remove accepted features to simplify navigation. If a scope or behavior lacks a contract, preserve its requirement in the ledger and tell the Owner it is unavailable for production. An honest existing-scope presentation is a proposed fallback requiring explicit acceptance where it changes the validated experience.

## 9. Verification plan — future execution, not run here

Each batch needs typecheck/lint/build plus relevant API-contract and application-flow checks under the current execution authorization. The original frontend-only diff constraint below is superseded for the authorized backend/API expansion in `IMPLEMENTATION_PLAN.md` and the current contract gap register. Review additive API changes for authorization, filtered totals, stable paging and data provenance. Follow current repository verification policy; use pinned Node 24.19.0 / pnpm 11.19.0. Preserve access rules and migrations/data. Any required integration target/setup limitation must be reported explicitly.

Application acceptance must cover:

- U01–U08 with real existing fixtures/persistence and both desktop/mobile; actual Back events and restored query/selection/position.
- Desktop originating list retained; mobile 360/390/430px, large text, keyboard open, dialog focus/close, safe-area navigation, horizontal Kanban and readable record labels.
- All catalogue families and existing commands, including low-frequency authoring/admin/recovery, not just five representative pages.
- Owner/staff/project leadership/site/client/delegate/external/public cases consistent with actual identities and grants; denied deep link, revoked project/item/source, account switch, session expiration and confidential evidence concealment.
- Exact revision/round and client approval distinction; correction/resubmission, interrupted upload, immutable history, stale-version conflict and failed request without false success.
- Accurate supported scope/filter/pagination/total labels. No union totals, client-derived scores or “no work” conclusions from unavailable sources.
- Existing accounting/integration/automation/offline behavior retained; no new external provider/network behavior.
- Review the changed-file diff to distinguish authorized additive query/read contracts from unrelated pre-existing checkout changes. Confirm no migration, permission expansion, business transition, or policy default was added without settled scope.

Prototype's 84 script/DOM checks are interaction guidance evidence only. They do not verify React rendering, real persistence, authorization, full browser history on local files or production readiness.

## 10. Handoffs, stop points and readiness

Exact GPT-6.1 Sol owns context intake, contract interpretation, routing/capability decisions, difficult integration and final acceptance. GPT-6 Luna implements bounded settled frontend batches and documentation, escalating unsupported contract/state behavior. Target approximately 70% Luna/30% Sol allocation, without replacing verification with a ratio claim.

Before execution, record Owner outcomes for: remaining UX/mobile navigation validation; identified contract gaps/fallbacks; scope of production frontend implementation; and whether visual direction is to remain separate or receive its own later approval. This plan starts none of those phases.

Recommended first implementation batch after authorization: **F01 and F02**, followed by canonical Tasks/Project context. Do not start by copying the prototype's entire HTML or sample state into React.

**Status: execution is in progress under the updated Owner authorization.** S18/S27 development/local-staging acceptance is complete; current scope and supported outcomes are tracked in `IMPLEMENTATION_PLAN.md` and the gap register. This earlier plan remains the presentation reference. No production readiness or actual-project operation is claimed.

### Planning review evidence

Actual routing for this update: the bounded source/document edit was performed by the Luna implementation agent; Sol settled the S18/S27 status and reviewed the acceptance facts. The Review workspace increment remains **IN PROGRESS**; no status change is implied here. The reported S18/S27 aggregate counts and final 484-fingerprint acceptance are prior evidence, and the latter excludes later review edits. No tests were run for this update; no new runtime acceptance or production readiness is claimed.
