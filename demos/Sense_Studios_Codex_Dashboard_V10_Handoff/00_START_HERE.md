# Sense Studios Dashboard V10 — Codex Handoff

## Which file to give Codex?

**`01_MASTER_PROMPT_FOR_CODEX.md`** is the complete implementation prompt. The ZIP contains all reference assets needed to understand it; hand the entire extracted folder to the agent, not just one screenshot.

## Package layout

- `01_MASTER_PROMPT_FOR_CODEX.md` — full task, constraints, implementation stages and test gates.
- `reference/Sense_Studios_Dashboard_V10_Refined_Shell.html` — **primary reference**, fully self-contained interactive HTML with synthetic demo data, no server required.
- `reference/Sense_Studios_Dashboard_V9_Customizable_Apple_Widgets.html` — earlier interaction source for edit/add/hide/reorder behavior if V10 shell changes obscure details.
- `reference/screenshots/` — fixed viewport, collapsed rail and widget edit-mode visual evidence.
- `contracts/APPLICATION_SHELL_DASHBOARD_BRIEF_2026-10-15.md` — historic scoped shell/Dashboard request and contract boundaries.
- `contracts/VERIFIED_BACKEND_STRUCTURE_2026-10-15.md` — historical verified API/workflows, to be rechecked against current repo.
- `docs/DESIGN_LOCK_AND_WIDGETS.md` — tokens, shell design, default widget IDs and role-specific rules.
- `docs/ACCEPTANCE_MATRIX.md` — explicit tests.
- `tests/` — browser tests originally supplied with the demo as *regression examples*, not automatic proof of integrated production acceptance.

## Important limitations

- The HTML is a **synthetic prototype**, not an existing backend implementation. The agent should replicate design and interactions within your real application, **not paste the HTML into React** or copy mock auth into production.
- The V10 source is the best available shell/Dashboard visual reference. The previously approved `Sense_Studios_My_Work_Final_Demo.html` was not found among the available files. If you have it, give it to the agent too, with precedence for shared My Work list/drawer design.
- The provided V10 logo is a **demo mark**. If the production Sense Studios logo exists in your repo, use the real asset.
- The contracts are from 2026-10-15. Check the **current** source before coding; do not assume unchanged API readiness or approval.
- Offline file viewers (including some chat previews) may block scripts; download the HTML and open in Chrome/Edge/Safari to inspect actual interaction.

## Simplest way to start in Codex

1. Open your existing Sense Studios work-management repository in Codex.
2. Copy/unzip this folder into `design-references/dashboard-v10/` (or a similar ignored reference folder in your workspace).
3. Paste the contents of `01_MASTER_PROMPT_FOR_CODEX.md` as the implementation instruction.
4. If Codex can read local files, instead use the short launcher prompt below.

```
Implement the Sense Studios Dashboard and shared Application Shell in this EXISTING repo, exactly following design-references/dashboard-v10/01_MASTER_PROMPT_FOR_CODEX.md. Inspect all provided V10/V9 HTML/screenshots and backend contracts first. Keep backend logic, RBAC, API shapes, My Work workflow and current tests unchanged unless a separately approved backend change is essential. Begin with the source audit and plan, then implement checkpoint-by-checkpoint and verify browser visual fidelity and authenticated access. Do not use synthetic scores or demo permissions in production.
```
