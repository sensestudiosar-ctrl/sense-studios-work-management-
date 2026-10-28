# F-002 — My Work row density (draft PR, ready when pushed)

**Head:** `factory/f-002-my-work-row-density` @ `a094ad4`
**Base:** `codex/sense-integration` — must be **local** `05108bf` (the
tasks design pass `7e9a1e7` sits 23 commits ahead of remote tip
`283e22c`; a push of the base branch is a prerequisite, not something
this factory does unilaterally).
**Files:** `apps/web/src/my-work/my-work-parity.css`,
`my-work-parity.test.tsx`, `my-work-parity.test.js` (35+/33−).

## Problem & fix
Owner-approved F-002 decisions (recorded in `docs/ai-factory/spec-F-002.md`):
1. **Dot-only** — remove the per-status left color rail and the whole-row
   tint; the 6px status dot is now the only per-row color (tasks-tab-review F1).
2. **Density** — 56px comfortable / 44px compact row heights (was 65/50).
Column-header padding re-aligned to the removed 5px rail; `.is-selected`
and the state rules no longer reference the deleted `--state-rail`/
`--row-tint`/`--my-work-rail` variables.

Contract tests updated to the new spec: the old "drives the left rail and
whole-row tint" test now asserts the dot-only contract (no rail, no tint,
per-state `--my-work-status-dot` preserved), and the height test pins
56/44. No other assertions changed; palette, priority pills, status chips,
5-column grid, and mobile card behavior remain asserted.

## Evidence (run in worktree, 2026-10-27)
- `vitest run src/my-work/ src/task.test.tsx src/task-ux.test.tsx` →
  **94/94 PASS** (3 files).
- `pnpm --filter @sense/web typecheck` → PASS.
- Scoped eslint on changed files → PASS (0 errors; CSS is out of eslint
  scope by config).
- `pnpm --filter @sense/web build` → PASS (PWA 20 precache entries).
- No API/contract/permission/audit/state-machine change; the
  presentation-only parity renderer stays presentation-only.

## Risks / known limitations
- **Demo-parity divergence (intentional, owner-directed):** the Owner's
  My Work demo uses rail + tint; this change departs from it on the
  Owner's explicit decision. `docs/design/tasks-tab-review-2026-10-25.md`
  F1/F6 is the origin of the target; the design doc itself still pins
  65/50 + rail for the demo — a docs-follow-up is tracked, not part of
  this PR.
- Owner → avatar fold was **deferred to F-002b** (needs the shared
  `initials` primitive + edge cases "You"/"Task owner"/emails).
- 320px mixed-attention scroll carry-over (documented in the CSS) is
  unaffected.

## Rollback
`git revert a094ad4` — single presentation commit, clean reverse; no
data, schema, or branch implications. (Note: reverting puts the CSS out
of sync with the tasks-tab-review doc's target, which the follow-up docs
update will close.)

## One-shot commands (Owner)
```bash
cd "D:\app\sensestudios work management app\.claude\worktrees\f-002"
git push -u origin factory/f-002-my-work-row-density
gh pr create --repo vijaychintala05/WORK-MANAGEMENT-APP-sense-studios --draft --base codex/sense-integration --head factory/f-002-my-work-row-density --title "feat(web): F-002 My Work row density — dot-only status colour + 56/44 rows" --body-file "D:\app\sensestudios work management app\docs\ai-factory\pr-f-002-body.md"
```
Base prerequisite: `codex/sense-integration` remote must be pushed to at
least `05108bf` first (Owner action; the factory does not push the
integration branch). PR description convention: append
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
