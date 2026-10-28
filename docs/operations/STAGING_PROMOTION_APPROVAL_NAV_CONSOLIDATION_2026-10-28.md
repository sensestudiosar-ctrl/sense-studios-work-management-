# Bounded approval request — rebuild + promote sealed staging (59443/59442), 28 October 2026

Status: **DRAFT, awaiting Owner sign-off.** No build, acceptance run, or promotion has
started from this document. The 59443 preview remains on its current release until the
Owner approves this request and the steps below execute in order.

## 1. What this approval covers

One bounded cycle:

1. **Precondition** — PR #1 (`master` → `codex/sense-integration`) CI green and merged.
2. **Build** — matched web/API artifact from the exact post-merge integration tip via
   `node scripts/staging/build.mjs 'D:/app/sensestudios work management app' <40-sha>`,
   exported to a fresh `.env.staging/releases/<sha>/`. No rename.
3. **Acceptance** — the gated set in §4 against isolated targets (disposable databases;
   never the retained one).
4. **Guarded promotion** — `node scripts/staging/cli.mjs promote <sha> <private-acceptance-json>`:
   preserves the prior active pointer, validates new artifact/database before switching
   either child, no automatic rollback downgrade.
5. **Post-promotion record** — exact release identities, retained pre/post snapshots,
   cache/offline behavior, and any limits, in a completion entry in `CURRENT_STATE.md`.

## 2. Exact lineage and what goes live (read before approving)

Current live release at 59443/59442:

- commit `cc7b9ca3f3b232a90f8b73748cde399a3d8dbb28` (branch `codex/task-writing-staging-20261028`),
  build `cc7b9ca3f3b2-1793126588680`, schema 120, built 2026-10-27T18:43Z.
- This commit is **not** an ancestor of `master` nor of `codex/sense-integration`.

After PR #1 merges, the promotion target is the post-merge integration tip. The span from
the live release to that target includes, in addition to this session's change:

- `b87764e` — **this change**: eight project-scoped left-rail panels under a single
  "Project queues" disclosure (presentation-only; no route, permission, schema or data
  change; 92/92 scoped tests, typecheck, lint and Vite transform verified in-session).
- `22b7552` + `7ec0bb2` — approved project workspace/task panel design and its focus fix.
- `a094ad4` (F-002 My Work row density) and the task-writing refinements `44d824b`, `d7868d3`.
- `4f239a4`, `c610612` — browser test fixtures/assertions.
- Factory/Linear and documentation commits (`a8e1d7f` … `6398726`).

**The Owner approving this request approves promoting the whole span, not only the
navigation change.** The schema stays at 120: the PR span adds no Prisma migrations,
so no migration, seed or reset of the retained database is required or performed.

## 3. Invariant list (what never happens in this cycle)

- No restart, reseed, migration or reset of the retained PostgreSQL database (45434);
  retained rows/snapshots are compared before/after and must match (all non-session
  tables unchanged; sessions table diff expected under live use).
- No log-in of the Owner through the test-only controller; staff personas activate in a
  separate Chromium only, as in the S18/S27 surface.
- The MW-I02 acceptance stack (59542/59543) stays PREPARED, NOT STARTED; untouched.
- No rename of the release directory; no promotion from a dirty checkout — the build
  exports an explicit Git commit.
- No automatic downgrade; rollback is the same explicit acceptance+promotion process
  against the preserved prior artifact.

## 4. Gated acceptance set (run against isolated targets before promotion)

Minimum (required for promotion):

- Web unit tests, repository typecheck (with Prisma client generation), scoped lint,
  production web/API/contracts build — from the frozen commit.
- Artifact integrity: exact build id, manifest SHA256, served index; matched web/API
  release identities after promotion.
- Database compatibility: schema count 120, exact migration ledger, retained identity
  check on the disposable target; cache/offline preservation rehearsal.
- "Project queues" disclosure present in the served bundle and reachable via the
  desktop rail, mobile More sheet and Ctrl/⌘K page finder (synthetic fixture, as in the
  2026-10-27 project-inner run).

Recommended (span contains project/task UI changes beyond presentation — scale the
Owner wants on sign-off):

- The 59 authenticated desktop/mobile journeys with no skips/retries, 224 shared
  layouts, populated inner-section captures — same battery as the
  `docs/design/project-inner-workspaces-2026-10-27.md` activation run.

## 5. Preconditions checklist (must all be true before step 2)

- [ ] PR #1 CI green (auto-fix monitor is on; any failure is fixed and re-run first).
- [ ] PR #1 merged into `codex/sense-integration` (auto-merge is off; the Owner merges).
- [ ] Build commit SHA fixed and recorded here: `________________________`.
- [ ] Retained pre-snapshot taken (database identity, migration ledger, table counts).
- [ ] This document signed below.

## 6. Sign-off

Owner approval (name + timestamp, plus "minimum" or "full" acceptance scope from §4):

```
Approved scope: ______
Owner: ____________  Date: ______
```

Until signed, nothing in §1 executes. A later entry in `CURRENT_STATE.md` records the
executed acceptance and promotion, or the reason the cycle was not run.
