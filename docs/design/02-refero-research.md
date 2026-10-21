# Refero research and design rationale

8 October 2026 · Research completed; synthesis proposed for Owner approval.

## Method and evidence strength

Research used the installed [Refero skill](C:/Users/HI/.codex/skills/refero-design/SKILL.md) and live Refero MCP. Six full Styles form five candidate directions below. Seven complete Flows supplied step goals/actions/responses. Nineteen screen detail records and their actual images were retrieved and inspected, requesting full images. Returned images were suitable for composition analysis, not pixel measurements or accessibility certification.

The [primary raw evidence](evidence/refero-research-2026-10-08.json) preserves searches, five full styles, six flows and ten screen records. The [supplement](evidence/refero-supplement-2026-10-08.json) adds Zelt and six screen records. The [completion evidence](evidence/refero-completion-2026-10-08.json) adds MonoDesk10844 and three screen records. UUIDs, original URLs and retrieval records make the research reusable. The bibliography links to Refero records; access may require Refero Pro. Reference images remain provider-hosted; this package does not redistribute a downloaded screenshot library.

This is comparative interface research and a source-informed expert proposal. It is not interviews, observed staff usability, an authenticated workflow acceptance run, or evidence of competitor business rules. Screenshot descriptions can overstate behavior: the final Appwrite navigation image still shows a palette, despite flow text describing completed navigation. That exit is unverified.

### Product coverage

| Requested comparison | Actual coverage | Use |
|---|---|---|
| Linear | Full Changelog style, creation/status flows, composer/list/status images | Operational density, retained context and explicit state feedback |
| Asana | Full style, approval detail and rejection-history images | Visible decision choices and actor/time activity |
| monday.com | Full style and board with detail pane image | Keep selected work adjacent to originating list |
| ClickUp | Brand, domain, task/time screen queries and site search pages 1–2 returned adjacent products | No ClickUp interface finding claimed; Marathon/Programa cover timing patterns |
| Notion | Brand/domain/database/navigation queries and site search pages 1–2 returned adjacent products | No native Notion finding claimed; component-system style and Appwrite cover narrow structural questions |
| Adjacent products | Zelt, Cal.com, shadcn UI styles; Hello Ivy, Programa, Marathon, Appwrite images/flows | Fill specific evidence gaps with named alternatives |

These results do not prove ClickUp or Notion are absent from Refero. They mean usable native references were not returned in the reviewed searches. Generic search matches mentioning those brands were rejected as competitor-interface evidence.

## Five visual directions

Styles currently describe marketing/product pages. Their hero scale, section spacing, decorative media and sales CTAs are not application requirements.

| Direction | Full reference identifiers / source | Concrete traits | Fit / cost / decision |
|---|---|---|---|
| **A. Sense operational warmth — recommended** | Zelt `04a3a1a2-a941-4fa4-a318-6f10b9a4f7bd`, [source](https://zelt.app); existing approved Sense lock | Warm neutral surface layers, sans type, soft 12px containers, very low shadow; Zelt uses amber for action and decorative abstract 3D | Closest to existing approved brand. Keep Sense pine action/cream/gold roles; omit Zelt amber and decorative media. Reduce marketing whitespace for worklists. Low brand migration risk |
| B. Neutral utility | Cal.com `23fd2b9b-b9ea-45e3-8370-7451ea05cee6`, [source](https://cal.com); shadcn UI `c14c0a94-1037-449e-bf5b-4cb972656ac7`, [source](https://ui.shadcn.com) | Cal paper/white surfaces and near-black actions; 14/16px UI text and 8–12px geometry. UI: Geist, compact forms, neutral dividers and semantic accents | Strong control consistency, but wholesale adoption would replace current identity. Borrow a bounded component vocabulary and utility hierarchy, not colors/fonts/library dependency |
| C. Precision dark workspace | Linear Changelog `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6`, [source](https://linear.app/changelog) | Almost-black canvas, Inter, mid-weight headings, 4px base/8px elements/24px sections, borders and tonal depth | Excellent scanning discipline. Full dark theme conflicts with approved current lock and adds dual-theme verification. Reject as app-wide default; use light Linear product images for row structure |
| D. Open collaborative workspace | Asana `a62c0ef5-f510-4e58-9321-e7605524a47e`, [source](https://asana.com) | Near-white canvas, strong black hierarchy; pills; blush/deep-coral pair for contained interaction; 10–16px bordered cards | Approachable review surfaces. Marketing 60–72px display fonts and 80–120px section gaps impede daily work. Borrow explicit review choices from screens, not brand palette |
| E. Color-organized workspace | monday.com `0dc5e09f-fa60-4e17-b8ee-83dacb8cbf7d`, [source](https://monday.com) | Poppins, violet primary action, colorful category backgrounds, 8px grid, 24px cards/pill buttons | Scannable categories, but multiple colors compete with Sense's approval/evidence semantics. Borrow adjacent list/detail structure; reject broad decorative category fills and gradients |

The recommendation is a continuation of [the existing approved lock](../ui/UX_REFERO_DESIGN_LOCK_2026-10-08.md), not a fresh rebrand. Zelt supports the primary surface language. Secondary visual ingredients have only two jobs: Linear's compact work-row hierarchy, and Cal/UI's consistent control geometry. Asana, monday and flow references inform interaction placement rather than palette ownership.

Extracted references contain inconsistencies. Cal describes subtle borders in some components but prohibits card borders elsewhere; UI lists both rectangular and pill button guidance; Zelt's prompt appendix contradicts its amber CTA rules; Asana includes a malformed gray hex. None is copied as an authoritative token. Existing Sense source and explicit proposal decisions resolve these differences.

## Actual screen inspection register

| Evidence ID | Product / inspected image | Observed detail | Adapt / reject |
|---|---|---|---|
| SC01 | [Linear composer](https://refero.design/pages/e5fb7da7-81e7-4855-880d-9cb566924d24) | Title/description above compact owner/priority/type chips; separate save/create footer | Focus creation within selected project; preserve all Sense required fields and reasons. Do not infer supported drafts/recurrence from reference |
| SC02 | [Linear creation result](https://refero.design/pages/d0d9c7d9-96d8-4e8a-b490-571a6f4ef818) | Parent/subissue rows, group count and small success notice remain in worklist | Confirm exact created object and refreshed list; counts describe returned scope |
| SC03 | [Linear status menu](https://refero.design/pages/ab6ce0f5-7d32-4e4e-bdd4-d47a817c1d3e) | Row-anchored menu with named states and selected marker | Use authorized state commands; reject universal status dropdown that bypasses review |
| SC04 | [Asana approval detail](https://refero.design/pages/b163b5b5-fbb5-49e9-9a1b-786f51252b70) | Approve/request-changes/rejected strip precedes labeled metadata; visibility note is explicit | Decision panel adjacent to exact Sense evidence; distinguish internal/client/management authority |
| SC05 | [Asana rejection history](https://refero.design/pages/694dfb61-f5cc-42d7-abef-980b3dff17cd) | Rejection has actor/time among chronology, followed by separate comment input | Keep immutable decision record distinct from comments; omit sticker/celebratory clutter |
| SC06 | [monday board/detail](https://refero.design/pages/e408747c-e71d-4273-95e7-54108e974544) | Selected row stays visible beside a pane with Updates/Files/Activity | Retain list and selection; preserve canonical object and all actions. Do not replicate bespoke columns |
| SC07 | [Hello Ivy evidence viewer](https://refero.design/pages/db328a2e-ed29-4285-abfa-279ab8b73a7b) | Filename/version/type at top, large preview, comments to the right | Keep submitted revision/version visible; filenames alone are insufficient identity |
| SC08 | [Hello Ivy approved viewer](https://refero.design/pages/f81922ed-0520-4a99-a185-84a8bee91f2c) | Approval label changes while preview/comments remain | Show confirmed exact-round result; reject arbitrary file-status edit |
| SC09 | [Programa manual-entry form](https://refero.design/pages/2399759b-2111-415f-8897-afbab6d6fafb) | Hours/minutes/date/project, optional phase/task/note, fixed footer | Explicit units and context; Sense project work must retain its required task association |
| SC10 | [Programa saved ledger](https://refero.design/pages/c8501eac-e001-412a-b8a3-15c3ba96deed) | New dated row and scoped totals appear after save; compact timer persists | Confirm row/history using authorized response; reject copied billing assumptions |
| SC11 | [Appwrite project palette](https://refero.design/pages/d764862d-a516-41dc-8744-ef56d9ca1404) | Grouped projects, keyboard hints and underlying context visible | Narrow future project finding; no implication of existing global content search |
| SC12 | [Appwrite later palette](https://refero.design/pages/5245716e-60de-4ce7-a626-45c0ae4669b4) | Palette still open with project query/match | Exit navigation is described by metadata, not visually confirmed |
| SC13 | [Marathon compact timer](https://refero.design/pages/2f1843e4-9ca3-4285-aa49-29f6ce74e1b1) | Small elapsed indicator near Track while detail remains | Consider discoverable active-timer context if existing authorized reads support it |
| SC14 | [Marathon expanded timer](https://refero.design/pages/9ef8037c-fb20-46dc-a6cc-9c16eba2ee82) | Timer panel, project chip, description, quick time additions | Visible controls useful; reject quick increments or contextual reassignment unless Sense contract supports them |
| SC15 | [Linear regrouped list](https://refero.design/pages/1e0851c0-5302-485c-ab4a-98a6df5771fd) | In Progress group appears above Todo with changed counts | Success must reconcile list placement; preserve filtered-page scope |
| SC16 | [Cal marketing image](https://refero.design/pages/25ea0211-37fa-4988-a983-6c930d7898db) | Near-white layered frames, dark CTA and explanatory diagram | Surface language only; omit diagrams and oversized marketing rhythm from operations |

| SC17 | [MonoDesk project board](https://refero.design/pages/32fea949-78a1-4ca3-8ec2-239dbd051169) | To Do/Doing/Done columns and per-card timing metadata | Board is a view; Sense retains canonical states and page scope |
| SC18 | [MonoDesk complete control](https://refero.design/pages/53c02456-42e5-4b38-95aa-0f8ed230798b) | Visible green check and Mark as complete tooltip | Make permitted next command discoverable on focus/touch as well as hover |
| SC19 | [MonoDesk completion feedback](https://refero.design/pages/eb697309-9fff-4144-8dc5-f258f83140bc) | Task marked as complete snackbar with View Tasks and Undo | Confirm result/link to source; Undo is not copied without authorized reverse command |

SC01–SC19 all have actual image inspection, not only search summaries. Flow intermediate screens have detailed step metadata; images for every intermediate step were not requested.

## Flow findings and requirement fit

| Flow | Reviewed sequence | Sense mapping / preservation | What the reference cannot establish |
|---|---|---|---|
| [FL01 Linear 6645](https://refero.design/flows/6645), create issue | Entry/empty list → composer → title/context → progressive metadata → subissue/upload/recurrence → created list and notice;25 captures,20 named steps | S09/S10, R-018–026: progressive disclosure; one accountable owner, explicit project/assignment, committed-date semantics; create and return to same list | Sense recurrence policy, optionality, drafts, upload finalization, permission or review assignment |
| [FL02 Linear 6644](https://refero.design/flows/6644), change status | Row → status menu → selection → regrouped list;4 steps | S09/S10/S13: show the allowed next command and confirmed result; work complete may require submission/review rather than Done | Universal one-click completion, undo, reopening or gate bypass; captured target is In Progress, not final completion |
| [FL03 Hello Ivy 4526](https://refero.design/flows/4526), asset approval | Exact preview/version → status menu → Approved;3 steps | S12–S14: evidence before decision; comments and outcome in same context; name the authorized actor/round | Sense independent reviewer, internal CR clearance, Primary final batch, passkey step-up or immutable checksum binding |
| [FL04 Appwrite 6056](https://refero.design/flows/6056), project navigation | Project context → palette → matched project → metadata-described destination;3 steps | S07/S08/S24: retained project context, grouped selection, eventual breadcrumb; existing directory remains primary | Last image does not prove destination/closed palette; no new global-search API implied |
| [FL05 Programa 13441](https://refero.design/flows/13441), manual time | Ledger → entry form → duration/date → project → task → created dated entry;6 steps | S16 R-041–043: explicit duration/date/source; exact saved ledger and correction history | Optional project-task association, billing, arbitrary duration increments or correction bypass |
| [FL06 Marathon 4857](https://refero.design/flows/4857), task timer | Detail → overflow action → compact indicator → timer panel;4 steps | S16: surface the one open timer and control it without losing task context where supported | Timer-stop durability/recovery or simultaneous timers; no end-to-end stop result captured |
| [FL07 MonoDesk10844](https://refero.design/flows/10844), task completion | Board → inline complete affordance → confirmation snackbar;3 steps, all3 images inspected | S09/S13: visible authorized next action and confirmed result with link back to task | Undo execution/persistence was not observed. Done-column counts decrease across captures; do not treat them as proof of Sense totals or state transitions |

Task completion has full flow and image evidence (FL07), alongside FL02 for status sequencing. Its snackbar is useful feedback; its one-click completion and Undo must not bypass Sense review gates. All five requested journey areas were examined with full flow details and key actual images.

## Decision ledger

| ID | Proposed decision | Evidence owner / source role | Why Sense needs it |
|---|---|---|---|
| D01 | Preserve cream/pine/gold and neutral layer hierarchy | Existing approved lock; Zelt surface layering only | Consistency with approved direction; avoid costly rebrand |
| D02 | Inter/system UI, moderate headings; Georgia confined to existing brand/auth contexts | Current source; Linear UI typography and Cal small-control hierarchy | Faster scanning of operational records without new fonts |
| D03 | Stable list plus exact-object detail; mobile contextual return | SC06/SC01–03; current Task/Project implementation | Work context survives inspecting and acting |
| D04 | Object/evidence identity and next authorized actor above decision | SC04/07/08, FL03; Sense S12–14 contracts | Approval confidence depends on the exact submitted version |
| D05 | Explicit time units/context with confirmed ledger result | SC09/10, FL05; S16 | Prevent ambiguous project attribution and save success |
| D06 | Group navigation by Work/People/Insights/Manage; keep portals separate | Existing approved/source architecture; SC11 is optional future finding | Reusable IA without merging session/permission boundaries |
| D07 | Stronger secondary text and visible focus;44px product touch target | Calculated existing color pairs; Refero craft; W3C criteria | Readability and keyboard/touch access |
| D08 | Semantic source states and precise totals | S23/S24/S26 contracts; current unavailable dashboard observation | Missing or denied sources must not look like zero/complete work |
| D09 | Disclosure preserves discoverability of all existing operations | FL01; existing parity ledger | Reduce initial complexity while keeping full functionality |
| D10 | No decorative new media on work surfaces | Existing lock; Zelt media is marketing decoration | Preview space belongs to real work evidence |
| D11 | Validation first for recently implemented homes | Current-tree status, dated source/captures | A polished source change is not accepted usability or persistence |

## Reuse rule

For each later module proposal, cite a D/SC/FL identifier, the exact requirement/subclause and current owning command/read. Record observed versus proposed versus API-dependent behavior. Recheck the reference if the decision depends on an unobserved state; competitor layouts never define Sense authorization or business policy.
