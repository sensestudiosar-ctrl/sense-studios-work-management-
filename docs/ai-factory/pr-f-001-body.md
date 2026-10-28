# Draft PR body for F-001 (paste into `gh pr create` or the web UI)

Base: `codex/sense-integration` (remote tip at creation was `283e22c`).
Head: `factory/f-001-claude-md-tree-state` @ `2aacdd1`.

---

**Title:** `docs(F-001): correct stale branch and tree-state facts in CLAUDE.md`

**Issue:** F-001 (`docs/ai-factory/BACKLOG.md`) · Spec: `docs/ai-factory/pilot-spec-F-001.md`

**Problem & fix**
CLAUDE.md's "Current branch and tree state" section asserted branch
`codex/s20-site-integration` and "369 uncommitted changes (280 modified,
89 untracked)". Live git shows `codex/sense-integration` with a small,
drifting count. The section is now the live branch name plus an
instruction to re-derive tree state, so agent sessions are not boot-
trapped by stale counts.

**Changed files**
- `CLAUDE.md` — one section, 6 insertions / 4 deletions. Nothing else.

**Evidence**
- Docs-only diff verified by `git show 2aacdd1` (single file, single
  hunk in the target section).
- No application, schema, permission, test, CI, or deployment change.
- No tests to run (no code touched); typecheck/lint/build unaffected.

**Risks**
- None functional. Wording hedge: the new text says "a small number of
  uncommitted changes (a few dozen)" — accurate at creation (22 M / 6
  ?? / 1 D ≈ 29); exact counts intentionally not frozen because they
  drift with concurrent work.

**Known limitations**
- Section's other bullets (migrations 118, three environments) were
  verified still true and left untouched.

**Rollback**
- `git revert 2aacdd1` (single docs commit) or close the PR; no data,
  branch, or downstream implications.

**Verification status**
- Independent release review: pending/recorded in
  `docs/ai-factory/HEALTH.md` + checkpoint `f-001-implement`.
- Push + draft PR creation were blocked by session policy and completed
  by the Owner (recorded here when done).

---

## One-shot commands (Owner, from the repo root)

```bash
cd "D:\app\sensestudios work management app\.claude\worktrees\f-001"
git push -u origin factory/f-001-claude-md-tree-state
gh pr create --repo vijaychintala05/WORK-MANAGEMENT-APP-sense-studios --draft --base codex/sense-integration --head factory/f-001-claude-md-tree-state --title "docs(F-001): correct stale branch and tree-state facts in CLAUDE.md" --body-file "D:\app\sensestudios work management app\docs\ai-factory\pr-f-001-body.md"
```

(`--body-file` uses the absolute path to the main-checkout copy, since the
worktree is a separate checkout that does not contain this file. Inline
the body text instead if you prefer.)

PR description convention (append at the end of the body):
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`
