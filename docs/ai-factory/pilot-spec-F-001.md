# Pilot Spec — F-001 · Stale "Current branch and tree state" in CLAUDE.md

Pipeline stage: DISCOVER → INVESTIGATE → SPECIFY (read-only + spec write).
NOT owner-approved → implementation stays pending. No app files edited.

## Problem statement
`CLAUDE.md`'s "Current branch and tree state" section asserts a branch
name and uncommitted-change count that no longer match the live working
tree. An agent booting from that doc would mis-identify the branch of
record and the dirtiness of the tree.

## Evidence (live `git`, 2026-10-27)
```
$ git branch --show-current
codex/sense-integration
$ git rev-parse --short HEAD
fd1697f
$ git status --short | awk '{print $1}' | sort | uniq -c
      6 ??
      1 D
     22 M
```
Stale claims in CLAUDE.md:
- `Branch: codex/s20-site-integration` → actual `codex/sense-integration`.
- `369 uncommitted changes (280 modified, 89 untracked)` → actual ~29
  (22 modified, 6 untracked, 1 deleted).

Still-true lines (keep): the three easily-confused environments,
118 source migrations, and the "do not commit/stash/reset without
Owner direction" instruction.

## Proposed minimal fix (docs-only; no regression risk)
Replace only the two bullet facts:
- `Branch: \`codex/s20-site-integration\`` → `Branch: \`codex/sense-integration\``
- `The working tree has **369 uncommitted changes** (280 modified, 89 untracked).`
  → `The working tree has **~29 uncommitted changes** (22 modified, 6 untracked, 1 deleted).`
Leave the rest of the section untouched.

## Acceptance criteria
The section's branch name and change counts match
`git branch --show-current` and `git status --short`. The "Current
branch and tree state" block no longer contains `s20-site-integration`
or `369`.

## Approval status
Awaiting Owner. F-001 is a docs correction, not a product-behavior
change; it does not lift any production hold.
