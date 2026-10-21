# Color emphasis refinement

9 October 2026. Owner instruction: use colors to convey importance; the existing layout is accepted. This authorizes a color refinement of the isolated prototype only.

Reuse the approved cream/pine/gold direction and existing Refero SC06/SC15 list/detail references, with Sense's semantic feedback tokens. This is an adaptation of the existing reference lock, not a fresh visual direction or a copied competitor priority model. Exact GPT-6.1 Sol interpreted the bounded scope; GPT-6 Luna performs the focused prototype edit.

| Color | Meaning | Use |
|---|---|---|
| Red | Overdue work, corrections required, errors | Date cues, attention accents, correction/status labels |
| Amber | Due today, waiting, employee-exit hold | Date cues and distinctly labeled waiting/hold states |
| Restrained blue | Internal review | Review lens, review state and review context |
| Pine | Active work, completed work and primary actions | Existing brand/action/focus system; completed stays quieter |
| Neutral slate | Upcoming work or not started | Lower-emphasis date/lens and status context |

Selected lens borders/underlines and keyboard focus remain pine. The existing pine selected-row background identifies selection; the thin row marker independently highlights its date/status attention cue. Status and date emphasis are independent: an in-progress/waiting/review task can also be overdue. Completed tasks do not acquire overdue styling. No priority field, urgency score, sorting/count rules, capability or transition is introduced. Exact words remain present so color is supplementary.

Opaque feedback text/surface pairs: red #853d33/#fff1ed (7.03:1), amber #755018/#fff4d6 (6.57:1), blue #315b7b/#edf3f8 (6.45:1), pine #315947/#f1f7ef (7.28:1). All four exceed 4.5:1 for normal text in the [calculation evidence](evidence/color-contrast.json). Rendered verification is recorded separately; this is not a whole-product accessibility certification.

The prototype layout, navigation, filters, metadata, sample records and supported preview actions are retained. Production pages, backend, permissions, database and domain logic remain outside scope. Existing acceptance limitations in [the checklist](04-acceptance-checklist.md) still apply.

## Actual verification

Pinned Node 24.19.0 TypeScript, focused ESLint and isolated Vite build all passed, exit 0: [final color-check log](../my-work-prototype/verification-color.log). Sol review caught completed labels below 4.5:1; the corrected #50645b is 5.83:1 on the completed pill and 5.65:1 on the evidence surface. Pine selected-lens borders now stay independent of semantic text color.

The final in-app browser check found identical desktop geometry before/after for lenses, filters, four visible rows and detail at 1440×1000. At 390×844, labels/counts remained readable and document width stayed within the viewport. Rendered red/amber/blue/pine badges and independent date/status cues were inspected. The selected Reviews lens had a pine border with blue label; completed detail had corrected muted ink and no overdue badge. [Browser evidence](evidence/color-browser-verification.json) records these checks.

- [Revised desktop capture](evidence/color-desktop.jpg)
- [Revised mobile capture](evidence/color-mobile.jpg)

This is color-only prototype acceptance evidence; prior production, screen-reader, zoom, real-device and actual-project limitations remain unchanged.
