# Factory Health Log

Newest first. Each entry: date · what ran · pass/block results ·
checkpoint ids.

## 2026-10-27 (latest) — Linear cutover (project 1 of 9)
- `linear-server` OAuth-connected; live read in fresh session
  (workspace SENSE STUDIOS, team `SEN`).
- Owner ordered factory to use Linear: project 1 **Foundation &
  Infrastructure → `P-SEN-1`** created via `save_project` (unblocked
  per Owner choice; write approved once, no other Linear writes).
- Docs cut over: LINEAR.md (cutover + Rules), BACKLOG.md (pre-cutover
  mirror, new issues → Linear), README.md #5, AGENT_ROLES.md boot
  checklist, TOOLS_MCP_READINESS.md (installed+verified). Groups 2–9
  not created (progressive discipline).


## 2026-10-27 — factory init
- Built + verified: rulebook, canonical map, 8 agents, checkpoint CLI
  (self-test 14/14), recovery runbook, RCA, metrics baseline, lessons,
  design rules, backlog fallback, schedules registry, changelog.
- **Blocks:**
  - Scheduled tasks: `create_scheduled_task` denied by session
    permission policy → SCHEDULES.md registry ready, awaiting Owner
    approval.
  - B-001 RESOLVED 2026-10-27: linear-server OAuth-connected ✔ (live read
    confirmed in fresh session). BACKLOG.md remains the version-controlled
    mirror until Linear projects are seeded; then it is read-only (LINEAR.md §Rules).
  - Cross-role audit only has Owner evidence (B-003).
- Checkpoints: see `checkpoints/`.

## 2026-10-27 (evening) — factory init complete, readiness reviewed
- Pilot `factory-pilot-001` (F-001) ran DISCOVER→INVESTIGATE→SPECIFY;
  spec at `pilot-spec-F-001.md`; checkpoint now **BLOCKED** awaiting
  Owner approval. No app files modified.
- Scheduler verification attempt: `CronCreate` one-shot test **also
  denied** by session policy ("[Auto-Mode Bypass]"). Both scheduler
  paths blocked; no workarounds attempted.
- Live VERSION-DRIFT observed: HEAD moved fd1697f → 05108bf mid-session
  (concurrent session active); canonical map annotated; my scratch
  screenshots moved to `.tmp/factory-ux-inspection-2026-10-27/` (L-005).
- 5 readiness reviews recorded in REVIEW_CYCLES_2026-10-27.md; final
  report at READINESS_REPORT_2026-10-27.md.
- Operating state: **ready for supervised pilot** (unattended loop and
  release-review-of-app-code not ready; see report §G).

## 2026-10-27 (later) — F-001 owner-approved, pipeline advanced to IMPLEMENT
- Owner: "fix F-001 now". Worktree `.claude/worktrees/f-001`, branch
  `factory/f-001-claude-md-tree-state` on remote tip `283e22c`; commit
  `2aacdd1` (docs-only CLAUDE.md section fix, 1 file, +6/−4).
- Backlog F-001 → approved. Checkpoint `f-001-implement` @ IMPLEMENT
  (completed: isolation,edit,commit; remaining: review,push,draft-pr).
- **BLOCKED (session policy):** `git push` to origin denied by the
  auto-mode classifier → push + draft PR handed to Owner (ready-to-paste
  commands in `pr-f-001-body.md`). No workaround attempted.
- Independent release review (general-purpose agent) in progress; verdict
  to be recorded here on completion.

## 2026-10-27 (final) — F-001 closed: VERIFIED, local-only
- **Independent release review: APPROVE.** All six checks (a–f) passed
  with evidence: single-file docs diff (`CLAUDE.md`, one hunk in the
  target section), no app/schema/permission/test/CI/deploy change,
  "preserved as-is / do not commit, stash, or reset" instruction
  retained and extended, branch name `codex/sense-integration` correct,
  clean rollback (`git revert 2aacdd1`). Residual risk: none blocking —
  the new wording hedges ("a few dozen") and instructs re-derivation,
  asserting no exact counts.
- **Owner decision: keep local.** No push, no draft PR. Fix lives at
  commit `2aacdd1` on `factory/f-001-claude-md-tree-state` in
  `.claude/worktrees/f-001`; main-checkout `CLAUDE.md` is unchanged and
  the main checkout's uncommitted work was never touched.
- Ledger: `f-001-implement` → COMPLETED (lease released);
  `factory-pilot-001` → COMPLETED (SPECIFY stage; implementation
  carried in `f-001-implement`).
- If the Owner later wants it external: push the branch + open the draft
  PR from `pr-f-001-body.md` — everything is staged.
- Note: branch base choice — PR #3 already bases `codex/sense-integration`
  onto `codex/sense-release`, and remote tip `283e22c` still carries the
  stale section, so the F-001 branch was rooted at remote tip `283e22c`
  to keep a clean 1-commit docs diff independent of PR #3's unpushed work.

## 2026-10-27 (later) — F-002 MERGED INTO MASTER; factory branch cleanup
- Owner directed: "review required branches, merge into master … clean
  up factory branches/worktrees (both)" + "MERGE F002".
- Master consolidation state (run by a parallel session, verified):
  main checkout cut over to `master`; F-001 already merged (2aacdd1 in
  master); `codex/sense-integration` + `codex/sense-release` published
  to remote `origin` (`new` org remote still holds pre-consolidation
  history, unchanged).
- F-002 merged into master: `a1e0f28` (no-ff, rebase-verified clean via
  merge-tree; 3 files, +35/−33; `--state-rail`/`--row-tint` count in
  master CSS now 0). `a094ad4` confirmed ancestor of master.
- Cleanup: `factory/f-002-my-work-row-density` branch deleted; worktrees
  `f-001` and `f-002` removed (both clean — f-001 work already merged
  via 2aacdd1; f-002 via a1e0f28). Consolidation candidate worktree
  (`.env.branch-consolidation-20261027/candidate`) left to the
  consolidation session.
- Local `master` is now ahead of `origin/master` (0824d27) — push is a
  separate owner/consolidation action, not performed by the factory.
- Task-composer uncommitted pair (`task-composer-fields.tsx/.js`)
  belongs to the in-flight F-005 batch and was NOT committed by the
  factory (preserve-uncommitted-work rule).

## 2026-10-27 (night) — F-002 implemented to VERIFIED; first OBSERVED recovery event
- F-002 (My Work row density, owner decisions: dot-only + 56/44)
  implemented in worktree `.claude/worktrees/f-002`
  (`factory/f-002-my-work-row-density` @ local base `05108bf`): commit
  `a094ad4`, 3 files, +35/−33, CSS + 2 test-twin updates only.
- Gates: **94/94** scoped vitest (my-work + task + task-ux), web
  typecheck PASS, eslint PASS, web build PASS. Checkpoint
  `f-002-implement` → **VERIFIED** (independent review running, verdict
  pending). Draft-PR body staged: `pr-f-002-body.md`.
- **First OBSERVED recovery (not simulated):** the 30-min checkpoint
  lease expired across a 5-hour usage-limit gap; `checkpoint.mjs
  steal` with justification recovered cleanly, no duplicate completed
  ops, no lost state. RECOVERY.md §"Simulated vs observed" now has one
  real event on record (usage-limit window + lease expiry + steal).
- Linear: Owner re-asked connect procedure; confirmed `linear-server`
  still **not registered on this machine** (~/.claude.json has no
  mcpServers entries; `claude` CLI not on this host's PATH) and
  unauthenticated. Runbook: LINEAR.md §"How to connect". Fallback
  BACKLOG.md remains authoritative.

## Subsequent Owner master consolidation — 2026-10-27

The later Owner instruction requests review/merger of all required branches into master. It supersedes the earlier local-only disposition of F-001 for this consolidation. Its original commit and dated outcome remain preserved; master carries the adapted current branch guidance. This authorizes no scheduler, external messages, application-data change or deployment. See ../operations/BRANCH_CONSOLIDATION_2026-10-27.md.
