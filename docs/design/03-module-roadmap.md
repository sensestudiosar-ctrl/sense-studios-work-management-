# Prioritized module UX improvement roadmap

8 October 2026 · **PROPOSED — approval pending.** All27 authorized slices covered. These are opportunities and validation tasks, not reopened functional slices or implementation authorization.

## Priority method

Impact/effort/risk each use1–5. Impact estimates frequency, reach and cost of confusion:1 narrow/occasional,3 recurring scoped work,5 daily/cross-role or costly action. Effort estimates UI/verification complexity:1 localized copy,2 bounded component,3 multiple screens,4 broad cross-module,5 major contract change. Risk estimates domain/access/evidence regression:1 decorative,3 context/state,5 approval/privacy/immutable or policy outcomes. These are expert estimates, not measured staff data or delivery-day commitments.

Opportunity score =2×impact−effort−risk. Sort by score, impact, then lower risk/effort and slice ID. **Rank is an opportunity queue, not unrestricted execution order.** Dependency waves below govern delivery; high-risk workflows require earlier design review even where the score penalizes them. Cosmetic changes are a separate lower-priority backlog and never compete against correctness through this score.

The first dependency is current-tree acceptance and inventory: recent scopes/views/sections are already implemented but not fully runtime accepted. Do not implement a duplicate feature to close an old gap table. No new backend/API/schema/permission changes are in this roadmap's frontend track.

## Delivery waves and safeguards

| Wave | Focus / dependency | Entry and exit |
|---|---|---|
| **P0 before all waves** | Rebaseline current moving tree and operation parity | Separate engineering work obtains accepted dedicated-target gates; UX validates role/context states. Preserve all retained data. This documentation task does not provision or repair targets |
| A | Shared primitives, navigation, source/error states and Dashboard | Approved system; representative small/large rendering, contrast/keyboard, route reachability and honest source totals |
| B | Daily Tasks/My Work, Decisions, notifications, internal review and assistance handoff | A; exact objects/actions/reasons/versions; retained-list Back/reload, allowed actor/denied actor and correction flow |
| C | Project/Plan, CRM home proposal, documents/revisions | A/B; branch/lead identity and immutable design evidence; context across canonical routes and upload/result states |
| D | Time, Turnkey/Site/offline, client/external/gallery | C plus relevant authorized contracts; touch/unstable network, strict identity/evidence boundaries; no online approvals in offline queue |
| E | Workforce and Learning | A, configured policies and exact authored learning versions; own/management, dated impact and named review |
| F | Performance/health, reports/saved reports/automation/integrations/settings | A plus relevant domain waves; source manifests/policies, snapshots/runs/receipts and human finalization |

S24 spans A (Dashboard state) and F (reports); S27 spans B (human handoff) and F (evidence/reporting language). This is sequenced UX work, not permission to alter those domains. Parallel bounded module work is safe only after shared contracts are settled and operation ownership is explicit.

## Ranked opportunities

Every row is **UX** because it changes finding, comprehension, decision confidence, recovery or task continuity. Cosmetic items follow separately. Requirement groups expand to the exact approved subclauses in the named slice spec before a future code brief; grouped ranges here do not grant their unbounded interpretation.

|Rank|Slice/modules|Requirement anchors|Impact/effort/risk; score|UX opportunity and current status|Wave/dependencies/research|Concrete acceptance check|
|---|---|---|---|---|---|---|
|1|S01 FND/GOV|R-091;093–094;100–102|5/3/2; **5**|Validate → standardize; Shared shell and source-state vocabulary; responsive focus/header/bottom-nav clearance|A; All homes; D06/D07/D08|At320–1440px every destination/action remains reachable; focused content unobscured|
|2|S16 TIM/INT|R-041–043|5/2/4; **4**|Validate → refine; Discoverable active timer, explicit manual units/context, saved/corrected ledger|D; Authorized timer/ledger reads; D05|One open timer; stop/save result is exact; project/task or explicit non-project context, locked correction history|
|3|S24 DASH/RPT/NTF|R-058–060;073–074;077|5/2/4; **4**|Validate → refine; Validate current source cards; scoped counts/as-of/retry; report freeze/export context|A/F; Authorized source ports/manifests; D08|Zero vs denied/unavailable distinguishable; no double-counted attention; frozen full manifest reauthorized|
|4|S04 AUD/EVT/NTF|R-058;079–080;095|5/3/4; **3**|Validate → refine; Exact-source notifications, filtered return, audit/receipt state|B; Owning object reads; D03/D08|Typed supported IDs open exact permitted source; stale/revoked links fail safely without resolving notice|
|5|S07 PRJ|R-011–013;016; C-010–016/024|5/3/4; **3**|Validate → refine; Project7-section continuity with branch/lead/lifecycle evidence strip|C; Directory/exact read; D03/D04|Reload/Back retain section/project/filter; cancellation/hold controls obey existing workflow|
|6|S09 TSK|R-018–024;092; C-023–024|5/3/4; **3**|Validate → refine; Validate existing scopes/views then consistent row/detail/next-action layout|B; Current task list/exact detail; D03/D09|All four views retain scopes/sort/page/context; owner/collaborators distinct; same canonical record|
|7|S10 TSK/NTF|R-023;025–026|5/3/4; **3**|Validate → refine; Named target/committed dates; Waiting reason, extension/dependency/recurrence disclosures|B; S09; D03/D09|Ordinary/exit Waiting distinguished; early-start acknowledgement/reasons/date approvals remain unchanged|
|8|S11 DOC/ACC|R-035–036;039|5/3/4; **3**|Refine; Per-file transfer/finalization/retry and confidential access context|C; Storage/authorized manifests; D04/D09|Partial upload remains partial; retry retains completed files; no inaccessible filename/ancestor leak|
|9|S05 APR|R-096–097|5/2/5; **3**|Refine; Decision queue explains owning workflow, actor and prerequisites|B; Current typed approval handlers; D04|No generic decision bypass; actor/evidence/reason/consequence visible before each supported action|
|10|S08 TMP/PRJ|R-014–017|4/2/3; **3**|Refine; Readable applied template/version, stages and milestones in Plan|C; S07 Plan; D09|Applied immutable version and exact stage gate distinct from labels; no progress-as-approval inference|
|11|S12 DOC|R-030;037–038|5/3/5; **2**|Refine; Immutable R/CR current/superseded/evidence/transmittal hierarchy|C; Exact revision reads; D04|Exact version/issue/named receipt preserved; ordinary upload never presented as release|
|12|S13 REV/TSK|R-027–029;024;037|5/3/5; **2**|Validate → refine; Evidence-first internal round, correction/escalation/result panel|B; S09/S12; D04|Independent named reviewer and exact submitted version preserved; correction creates new retained round|
|13|S14 PORT/REV/IDN|R-031–034;075–076;104; C-013–015|5/3/5; **2**|Validate → refine; Distinct item vs Primary final batch review with exact consent/step-up context|D; Isolated CLIENT/current grants; D04|Item approval cannot imply final batch issue; wrong actor/version/passkey errors recover safely|
|14|S20 SITE|R-068–070;105; C-020–021|5/3/5; **2**|Refine; Field-first report/snags/verification/closure/handover hierarchy|D; Active TURNKEY/current grants; D04/D07|Independent verifier and subsequent management close/handover remain separate online actions|
|15|S22 SITE/FND/DOC|R-071/S22.a;072.a;098.a–f|5/3/5; **2**|Validate → refine; Explicit draft/queued/sync/failed/conflict/server-receipt states|D; Prepared account/project offline contract; D07/D08|Offline draft never approved; explicit conflict comparison; sync reauthorizes without silent overwrite|
|16|S06 CRM|R-010.a–d; C-017–019|4/3/3; **2**|New IA proposal; Propose first-class Leads/Clients home over existing workflow; retain history|C; Route/home approval; D06/D09|Every existing CRM command reachable; stage skips/reasons/Lost and linked new enquiry semantics preserved|
|17|S02 IDN|R-005.a–b;007.a,c;099; C-008|4/2/4; **2**|Validate → refine; Clear enrollment/session/recovery steps and result receipts|F; Existing auth; D07|Expired/rejected enrollment never reads as success; keyboard/paste/passkey paths preserved|
|18|S17 WFM|R-046–051; C-003/004/009/022|4/3/4; **1**|Validate → refine; Validate existing sections then request/balance/dated-capacity explanation|E; Configured policy/self-management; D05/D08|No invented schedule/balance default; dated full/half/hourly/overnight/future-cancellation behavior preserved|
|19|S18 SKL/KNW/TRN|R-044–045;055–057; C-025–027|4/3/4; **1**|Validate → refine; Learning outline/version/criteria/next-reviewer and skill-request distinction|E; Skills/library/training canonical reads; D04/D09|Completion never auto-upgrades skill; audience, independent publisher and authored review/effectiveness retained|
|20|S26 AUT/RPT/APR|R-078.a–f;082.a–d;083.a–c|4/2/5; **1**|Validate → refine; Definition/version/run/receipt and scalar-filter/count-chart clarity|F; Current source fields; D08/D09|Actions remain internal notices/reports; recommendation human review differs from actual domain decision|
|21|S27 AI|R-052–054;087–090 bounded; S27_SPEC|4/2/5; **1**|Validate → refine; Evidence freshness/unavailable factors, nonbinding decisions and domain handoff|B/F; Deterministic current evidence; D04/D08|No inference/transmission/ranking invention; accept evidence suggestion never executes business action|
|22|S03 ORG/ACC|R-004–009;092; C-001/023–024|4/3/5; **0**|Refine; Explain branch/team/reporting/grant scope next to management action|F; Settings; D04/D06|Owner/leader/employee scenarios distinguish title, assignment and action grant; zero scope leakage|
|23|S19 TURNKEY|R-015; S19_SPEC authorized clauses|4/3/5; **0**|Refine; Design/BOQ release and cost/procurement approval context|D; Exact approved releases/protected fields; D04|Client cost shares remain granted-only; replacement/reapproval and immutable price evidence preserved|
|24|S21 PORT/IDN/DOC|R-075/S21.a–f;076/S21.a–b; C-006/012/016|4/3/5; **0**|Refine; Grant/expiry/advisory/own-receipt and CAD/closeout context|D; Isolated EXTERNAL; D04/D06|Advisory submission never formal release; own-recipient acknowledgement and Owner CAD constraints preserved|
|25|S23 PER/HLT|R-061–067; C-005|4/3/5; **0**|Validate → refine; Explain scored/unscored evidence and history/policy; validate retained project list|F; Approved policies/current scope; D03/D08|Every value links permitted sources/policy; insufficient/unavailable distinct; no new learning score|
|26|S15 DOC/PORT|R-040.a–c|3/2/4; **0**|Refine; Private gallery vs public derivative publication/withdrawal clarity|D; Existing grant/publication; D04/D10|Private original never leaks into portfolio; withdrawal/cancellation are distinct labeled operations|
|27|S25 INT|R-084.a–f|3/2/4; **0**|Refine; Show configuration/delivery/retry receipts and exact one-way scope|F; Existing adapter state; D08|No bidirectional sync/WhatsApp/CAD promise; failure and current delivery receipt unmistakable|

Research D01–D11, SC01–SC19 and FL01–FL07 are defined in [the Refero ledger](02-refero-research.md). Each future change must preserve the current owning command/read, current recipient/grant and exact evidence identity. Expected improvements need baseline task time/error/discovery measurements; no percentage improvement is claimed yet.

## Cosmetic UI backlog — distinct from UX work

|Priority|Cosmetic change|Effort/risk estimate|Why separate|
|---|---|---|---|
|C1|Replace stale IDENTITY phase badge with an Owner-approved appropriate label or omit it|1/1|Content polish; does not prove any functional scope complete|
|C1|Align existing operational title sizes/weights and restrict legacy serif use|2/2|Visual hierarchy adjustment; preserves all content/actions|
|C1|Unify border/radius/shadow and icon stroke treatment through existing tokens|2/2|Appearance consistency; no workflow outcome by itself|
|C2|Normalize row padding, panel margins and button variants after density checks|2/2|Cosmetic unless it changes target size/focus/data reachability, which then belongs to UX/accessibility|
|C2|Standardize status-chip styling while preserving exact labels and distinct states|2/3|Visual semantics; never map color to a new domain transition|
|C3|Refine noncritical empty-state illustration/brand ornament only if a real need emerges|2/1|Deferred; work surfaces prioritize actual evidence over decoration|

Contrast, keyboard focus, touch targets and state-copy recovery are **not cosmetic** when they affect operability or comprehension. Their fixes stay in the UX/accessibility foundation.

## Deferred/API-dependent proposals

|Idea|Dependency / safe current approach|
|---|---|
|Global content search/command palette|Needs explicit authorized searchable-source/read contract; current route-label filter remains accurately named |
|Capability-filtered nav|Use authoritative existing session capability context only; do not infer permission from titles or hide a valid workflow. Missing context requires separate scoped design |
|Persistent user density/pinned workspace preferences|Needs approved preference storage; use existing responsive density first |
|Embedded unified project workspace|Reconcile exact module routes/reads/actions before replacing current canonical navigation. Keep contextual links/return now |
|Offline timer or approvals|Not justified by current offline Site scope; retain supported online TIM and consequential actions |
|Drag scheduling, bulk approval or generic Undo|Needs existing authorized command and recovery rules; keep current explicit domain actions |
|New performance formulas/learning scoring|Owner policy and S18→S23 integration remain unresolved; show factual/unscored states |
|S27 collaborator mutation/ranked recommendations/live AI|Unsupported/excluded; disclose deterministic evidence and ordinary human-domain handoff |
|Two-way calendar, WhatsApp/deep CAD/BIM provider automation|Outside accepted bounded integration scope; do not promise it |

Frontend discovery of a missing contract is a separately recorded dependency. It does not authorize backend modification or hiding existing functionality to make the page simpler.

## Measurement and exit conditions

For each selected wave, record baseline discovery time, successful completion, wrong-object/wrong-actor attempts, context loss after return, error recovery, and mobile completion. Use representative Owner, employee, manager/reviewer and portal/field participants where relevant; report sample size and task conditions. Proposed pilot target: at least5 representative participants per materially distinct journey group, no unresolved critical access/evidence mistake, and all preserved commands reachable. This is a suggested study scope, not a statistical performance guarantee.

Acceptance combines domain checks and real persistence with keyboard/screen-reader/touch/responsive observation and user comprehension. “Looks cleaner,” source review, synthetic prototype coverage, local fixture success and production readiness are separate facts. Use [the validation plan](06-validation-and-approval.md) before marking a wave accepted.

