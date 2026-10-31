# Factory Health Log

Newest first. Each entry: date · what ran · pass/block results ·
checkpoint ids.

## 2026-10-31 (latest) — Factory audit: F-008 tail verified, F-018 scheduler-observability defect discovered, Linear in-flight syncs retried
- **F-008 verification tails now OBSERVED (recorded in SCHEDULES.md §"Verified fires"):**
  first scheduler fire confirmed (nightly-dev ×3, daily-qa-audit ×3,
  factory-recovery ×3, 2026-10-29→10-31, all "succeeded"); usage-limit
  denial behavior observed as a NEGATIVE result — see F-018; local
  Refero/Playwright-MCP/Linear re-verified working in-session 2026-10-31
  (Refero live search, linear-server live read of P-SEN-1, Playwright MCP
  tools present); cloud scheduled-runner availability remains unverified
  (not offered on this host) — F-008's last open tail.
- **DEFECT F-018 raised, then APPROVED 2026-10-31 by Owner
  (button "Fix F-018") — PARTIALLY DEPLOYED, honestly recorded:**
  nightly-dev prompt update LANDED (step-0 FIRES.md sentinel +
  quota-wall protocol live, verified by re-read). Updates to
  daily-qa-audit / factory-recovery / weekly-retro prompts BLOCKED by
  the session permission classifier ([Unauthorized Persistence] /
  "Blocked by classifier", 2 attempts) — NOT retried further per the
  no-workaround rule; the 3 prompt updates are the Owner's next action
  (allow `mcp__scheduled-tasks__update_scheduled_task`, or run the
  updates from a non-auto session). Repo side landed: FIRES.md scaffold
  + detector contract, SCHEDULES.md §"F-018 fix" (protocol spec +
  deployment status + residual), BACKLOG F-018 row → APPROVED/PARTIAL.
  Residual recorded: pre-boot quota-wall deaths remain detection-only;
  the headroom/staggering prevention lever is an Owner choice, not
  applied. Root-cause note preserved: every observed fire terminated
  at the 5h usage-quota wall before its boot sequence (run
  last-activity ≈ start+4s; the assistant turn is a bare usage-limit
  line), so no checkpoint, no HEALTH note, no issue pickup;
  weekly-retro has 0 runs.
- **Linear in-flight state syncs (retry of the 2026-10-28 denied batch):**
  SEN-8 (F-005) → In Progress LANDED + read back (status "In Progress",
  startedAt 2026-10-31). SEN-11 (F-008) and SEN-20 (F-017) → In Progress
  DENIED again by the auto-mode classifier [External System Writes] —
  recorded as still-not-synced, retriable. No IDs fabricated; all three
  keys re-read live via `list_issues` (open set = SEN-8/10/11/20).
- **Checkpoint ledger:** 6/6 records COMPLETED, no PAUSED/RECOVERABLE/
  RUNNING-with-stale-lease rows — nothing recoverable, no recovery
  actions needed (verified via `checkpoint.mjs list`,
  FACTORY_WORKER_ID=factory-audit).
- **Live git/PR context re-derived (docs never trusted):** main checkout
  now on `codex/tasks-kanban-v42` @ `180688e` (moved since 10-28;
  parallel Kanban work merged); master tip `9240d7d`;
  origin/master `b3f3f04`; PR #1 (master→codex/sense-integration) still
  OPEN/unmerged with the full test battery's last gate (59-journey S27)
  stalled on usage limits in session local_f7bdf0d3 (5/6 gates PASS on
  record). No factory write to app source, schema, permissions, CI or
  deploy in this audit; only the four factory ledger files touched.
- Not run / not claimed: pnpm verify, any staging build/promote,
  F-005 release, F-017 authenticated acceptance tail, B-002 MW-I02
  start, B-003 cross-role personas — all remain Owner-gated.
- Checkpoint ledger: no new records this audit (read-only audit + docs).

## 2026-10-28 — F-batch shipped to master + scheduler live + Linear close-batch
- **Shipped (committed on master):** F-002b owner avatar fold `2731e11`
  (35/35 my-work+task-people, typecheck, eslint, build); F-004 PWA
  "Later" session-persistence `3041a26` (full web suite 733/733);
  F-006 review-view human labels via shared `workState()` `bc4320a`
  (14/14 review+revision); F-009 tasks-tab-review shipped-state
  addendum `2c9ae3d`; ledger commits `67c6e94` + this batch.
- **F-003 closed as verified-already-shipped:** "C" shortcut in
  `d38e957`, composer employee self-default in `task.tsx` — both
  test-covered (97/97 task-suite re-verified). No code change.
- **F-008 scheduler now LIVE (unblocked):** 4 durable routines via
  `mcp__scheduled-tasks__create_scheduled_task` — nightly-dev
  (`23 1 * * *`), daily-qa-audit (`41 9 * * *`), factory-recovery
  (`17 12 * * *`), weekly-retro (`7 20 * * 0`), all enabled, verified
  via `list_scheduled_tasks`. The 2026-10-27 "blocked by classifier"
  record in SCHEDULES.md was superseded — earlier create attempts had
  actually persisted. Remaining F-008 tail: first observed fire
  (nightly-dev next run 2026-10-28 20:01 UTC), usage-limit-denial
  behavior, cloud tool availability.
- **Projects T1–T7 (F-010…F-016) confirmed DONE + merged to master by
  the Projects session:** `22b7552`…`d90240e`, final selected-source
  `2525206` (ancestor of master, verified). Bounded isolated-fixture
  acceptance on record (web regression 717, affected 65, Workforce PG
  19, browser 5). F-017 (T8) stays open: full-shell/zoom/AT
  acceptance + owner-gated matched staging release.
- **Linear close-batch executed (linear-server live this session):**
  12 issues closed to Done with read-back verification —
  SEN-5/6/7/9/12/13/14/15/16/17/18/19 (F-002b, F-003, F-004, F-006,
  F-009, T1–T7). 3 in-flight state updates (SEN-8, SEN-11, SEN-20 →
  In Progress) DENIED by the auto-mode classifier
  [External System Writes] — recorded as not-synced, retriable when
  the permission is allowed. No Linear IDs fabricated; all 16 issue
  IDs re-read live via `list_issues`.
- **Lease hygiene observed:** 30-min checkpoint leases expired across
  long turns → `steal --justification` used for f-002b-impl and
  f-006-impl (legal VERIFIED → AWAITING_APPROVAL → COMPLETED path).
  RECOVERY.md §3 already mandates the "checkpoints every ≤25 min"
  convention; no doc change needed.
- Not run / not claimed: `pnpm verify` full, authenticated acceptance,
  any staging promote/deploy, MW-I02 stack start. F-005 release and
  F-017 staging remain Owner-gated.
- Checkpoint ledger: f-002b-impl COMPLETED, f-006-impl COMPLETED,
  f-002-implement AWAITING_APPROVAL (merged to master `a1e0f28` —
  record may be closed if the Owner confirms the merge is final).

## 2026-10-27 — Linear cutover (project 1 of 9)
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
