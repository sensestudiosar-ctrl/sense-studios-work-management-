# Existing versus proposed My Work

## Locked direction

Use the Owner-approved cream/pine/gold system and existing warm operational UX lock. Quiet cream canvas, readable 14px work rows, strong pine actions/selection, gold confined to identity, stronger semantic secondary text/control boundaries and visible pine focus. No decorative imagery or new component framework. Prototype uses React/TypeScript/CSS with existing Vite packages; it is disconnected and outside production routes.

## Comparison

| Existing | Prototype proposal | Type / boundary |
|---|---|---|
| Decisions + three large attention blocks precede task workspace | Compact separate decision/review context and six personal attention lenses prioritize daily work | **UX hierarchy.** Preserve independent source authorization, empty/denied/error states and pagination. Do not merge decision types into a task state. |
| Active phase/date/status filters in disclosure | Active, Overdue, Due today, Waiting, Reviews and Upcoming make supported meanings discoverable | **UX discoverability.** Overdue is a target-date lens, not status. Active includes waiting/reviews; counts overlap and are never summed. |
| Task List/Cards/Kanban/Timeline + responsive detail already exist | Concentrated list/detail prototype with selected-row context and readable mobile detail | **UX refinement**, not adding an absent pane. Other production views stay intact and require parity in any later change. |
| URL-backed query/selection and Back already implemented | Visible active filters, stable query, contextual return and focus restoration | **UX continuity.** No new persisted user preference/database contract. |
| Task owner/project/plan/dates/version in current details | Named target and committed dates; exact owner, stage, branch, version and next actor near work | **UX comprehension.** No deadline fallback or new actor/eligibility rule. Missing committed date is Not committed. |
| Reasons/capabilities in long owning-module forms | Evidence/action strip and a bounded preview of the permitted workflow | **UX decision confidence.** No universal status setter, bulk approve, automatic action or fake save. |
| Current source loading/error/denied handling | Scenario controls demonstrate loading/empty/no matches/denied/offline/error and independent source outcomes | **UX recovery/truthfulness.** Offline sample does not establish general My Work caching. |
| Local CSS palette/focus variations and operational serif | Consistent typography/radius/pine/cream surfaces | **Cosmetic consistency**, except contrast/focus/targets which are accessibility UX. No brand change. |

## Refero traceability

Reuse [existing research ledger](../02-refero-research.md) and its primary/supplement/completion raw records. No new broad searches were necessary: the missing approval/scope/date semantics are settled by Sense sources, not competitor screens. SC06 and SC15 images were retrieved again through Refero MCP for this prototype's composition check; earlier full Style/Flow records remain available.

| Decision | Reference | Adaptation / rejected behavior |
|---|---|---|
| Warm low-noise surfaces | Zelt style `04a3a1a2-a941-4fa4-a318-6f10b9a4f7bd`; foundation direction A | Preserve existing Sense colors, compact spacing. Omit marketing amber CTA/3D media. |
| Compact rows, explicit groups | [SC15 Linear](https://refero.design/pages/1e0851c0-5302-485c-ab4a-98a6df5771fd), SC02 | Work identity/metadata precede optional disclosures. Scoped sample counts, no copied product states. |
| Selected list adjacent to detail | [SC06 monday](https://refero.design/pages/e408747c-e71d-4273-95e7-54108e974544) | Retain selection/list on desktop, contextual Back on mobile. No copied columns, colors or social feed. |
| Exact evidence and decision actor | [SC04 Asana](https://refero.design/pages/b163b5b5-fbb5-49e9-9a1b-786f51252b70), [SC07 Hello Ivy](https://refero.design/pages/db328a2e-ed29-4285-abfa-279ab8b73a7b), FL03/4526 | Exact task/version and review round/revision; only named authorized action context. No generic approval rule. |
| Named command and retained context | FL02 Linear/6644, SC03 | State labels describe records; commands preview existing transitions. Status-menu arbitrary transitions rejected. |
| Discoverable next command | SC18 MonoDesk, FL07/10844 | Action available to touch/focus, not hover only. One-click Complete and Undo rejected without Sense command authority. |
| Touch/full detail and source states | Owner requirements; foundation component/state/responsive/accessibility contracts | These are Sense requirements, not claimed competitor observations. |

Current research does not supply usable native ClickUp/Notion screenshots; that existing disclosed gap is unchanged and does not block this bounded My Work pattern. Reference images are not redistributed or copied into the UI.

## Production contract mapping for later review

- Personal task query uses current employee ownership OR collaboration. Creator identity never grants access. My Work remains personal; organization scope belongs to existing Tasks.
- `phase=active` excludes completed/canceled; Waiting and review can also be active. Reviews has task-query review phase and separately authorized exact reviewer inbox; production must distinguish those sources.
- Overdue/Due today/Upcoming prototypes use ISO target calendar dates against explicitly shown **8 October 2026 sample date**. A real date boundary must use established organizational calendar/timezone semantics; never the viewer's arbitrary browser timezone.
- Search promises title/project fields in the fixture. Existing API also searches owner/creator normalized email, not arbitrary person names. Target ascending and title ascending have existing query support.
- Detail uses existing task version/capabilities and immutable history. Project/stage/owner labels require authorized setup/join context; raw task response alone is not all labels.
- Ordinary Start/Complete/Wait/Resume, guarded early start, extension, committed-date, reassignment, dependencies, recurrence, closeout, edit/checklist/collaborator and review commands remain owning workflows. A focused prototype is not exhaustive operation parity.
- Review uses exact task and round/version plus revision/blob identity when applicable. Task owner, collaborator and named reviewer are distinct. Client item approval/final batch is outside this internal prototype.
