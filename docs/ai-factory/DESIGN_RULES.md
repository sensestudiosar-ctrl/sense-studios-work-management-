# Design Rules for Factory UI Work

Binding references, in precedence order (highest first):

1. **Owner's live instructions** for the specific change.
2. **Approved demos** — `demos/Sense_Studios_Codex_Dashboard_V10_Handoff/`
   (Dashboard), task-creation kit, My Work demo
   (`docs/design/demo-parity-completion-plan.md` references the My Work
   HTML demo).
3. **Approved shell** — cream/paper canvas, dark pine navigation,
   restrained gold accent, unboxed page titles, page gutters, underline
   section navigation (deployed `70b047cd`, [SHARED_SHELL_STAGING_2026-10-24.md](../../docs/development/SHARED_SHELL_STAGING_2026-10-24.md)).
4. **Reference lock** from
   [MASTER_UX_PLAN.md §7](application-ux-audit-2026-10-25/MASTER_UX_PLAN.md):
   pine action, gold brand accent, paper canvas; bounded secondary
   references: Linear (row hierarchy, view/detail continuity), Asana
   (personal vs project nav), monday.com (grouped hierarchy), Programa
   (project-centered client home). **Never** import their colors, board
   system, or approval semantics.
5. **ui-ux-pro-max skill** generic guidance (accessibility, touch
   targets, spacing) — lowest precedence; conflict with 1–4 means the
   skill loses.

## Non-negotiables
- Status color encodes meaning; never encode approval/permission state
  with color alone (label accompanies).
- Presentation-only parity renderer (`my-work-parity`) stays
  presentation-only: no API scope or authorization changes.
- No new UI library (no shadcn migration); extract a primitive only
  after ≥2 real callers share behavior.
- 44px practical phone targets; visible focus; sentence-case labels;
  no ALL-CAPS 9px labels.
- One global navigation mode; no duplicated account strips.
- Responsive: desktop 1440/1024, tablet 768/767/783, phone 390/320;
  no viewport overflow; sticky bars never cover content.
- Motion: short, purposeful, reduced-motion respected.

## Process
UI/UX research goes through `uiux-researcher` (Refero + skill + cached
`docs/design/` evidence). Findings carry evidence (screenshot path +
selector + serving commit). Implementation goes through
`frontend-engineer` in a worktree; `qa-playwright` verifies desktop +
mobile; `release-reviewer` gates the draft PR.
