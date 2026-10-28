# Verified Lessons Log

Only *verified* lessons — each has a reproducing evidence link and a
date. Unverified "lessons" are proposed in `improvements-*.md` and move
here after baseline evaluation. Newest first.

---

## L-001 · Verify build identity before any visual comparison — 2026-10-27
**Lesson:** Screenshot diffs and "the UI changed" claims are void unless
the serving commit is recorded. The sealed release serves only committed
revisions; the hot loop serves the working tree. Comparing across that
boundary is a `DEPLOY-MISS`/`VERSION-DRIFT` defect.
**Evidence:** `scripts/staging/build.mjs` uses `git archive <commit>`;
59443 footer chip "Release <sha> · API <sha>" was read live. The
master UX audit explicitly recorded checkout HEAD vs deployed build as
distinct.
**Applies to:** ui-ux-auditor, qa-playwright, release-reviewer.

## L-002 · Repo docs go stale; git is the source of truth for tree state — 2026-10-27
**Lesson:** `CLAUDE.md` claims branch `codex/s20-site-integration` with
369 uncommitted changes; live git shows `codex/sense-integration` with
~29 and HEAD `fd1697f`. Always re-derive branch/HEAD/dirty-state from
git, not from docs.
**Evidence:** `git branch --show-current`, `git status --short`,
`git log -1` run 2026-10-27.
**Applies to:** every agent at session start (see AGENT_ROLES.md boot
checklist).

## L-003 · The checkpoint self-test caught real bugs in the factory CLI — 2026-10-27
**Lesson:** Recovery tooling is ordinary code; run its self-test before
trusting it. First run exposed three defects (undefined `notes` array,
illegal `PAUSED→RESUMING` shortcut, `lock` self-exclusion guard).
Self-test now passes 14 scenario assertions.
**Evidence:** `node scripts/factory/checkpoint.mjs self-test` output.
**Applies to:** factory-improver; treat `self-test` PASS as a gate for
any checkpoint-store change.

## L-004 · Sealed release ≠ acceptance of the working tree — 2026-10-27
**Lesson:** The S18/S27 acceptance boundary is a 484-file fingerprint;
concurrent later edits to `review.tsx/css` sit outside it. A live server
being "up" says nothing about which source is certified.
**Evidence:** `CLAUDE.md` acceptance-boundary section;
`docs/design/application-ux-audit-2026-10-25/MASTER_UX_PLAN.md` §2.
**Applies to:** release-reviewer; never fold "server is up" into
"acceptance passed".

## L-005 · Untracked scratch artifacts accumulate at repo root — 2026-10-27
**Lesson:** `.playwright-mcp/` page dumps and root-level PNGs from ad-hoc
inspections are untracked noise that risks accidental commit or Vite
serving. Keep scratch captures in `.tmp/` or `docs/design/` subdirs and
never `git add -A` from repo root.
**Evidence:** `git status` shows 4 untracked `.playwright-mcp/*.yml`
plus stray root PNGs from prior sessions.
**Applies to:** every agent that opens a browser session.
