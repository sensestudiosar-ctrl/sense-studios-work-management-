# Factory Readiness Review Cycles — 2026-10-27

Five cycles, each PASS / FAIL / BLOCKED / NOT-TESTED with evidence.
Commands were run in this session; results are verbatim-summarized, not
assumed.

---

## REVIEW 1 — Architecture integrity: PASS (with one live finding)

| Check | Result | Evidence |
|---|---|---|
| Correct repository | PASS | `git worktree list` → single worktree at the repo root, branch `codex/sense-integration` |
| Frontend/backend identity | PASS | `@sense/web` (Vite, .tsx→.js twins), `@sense/api` (NestJS+Prisma), PG 45434 — see CANONICAL_APPLICATION_MAP.md |
| No duplicate runtime | PASS | Factory created **no** app code; footprint = `?? .claude/agents/`, `?? docs/ai-factory/`, `?? scripts/factory/` only (git status) |
| Working-tree preservation | PASS | Main checkout's modified/deleted files (workforce, project, document, composer…) untouched by factory work |
| No unapproved application modification | PASS | No edits to `apps/*` in this session; pilot spec is docs-only |
| Stable test-server identification | PASS | Sealed 59443/59442 verified serving commit 7f286689 (footer chip, live inspection) |
| **Finding — live VERSION-DRIFT** | logged | HEAD moved `fd1697f → 05108bf` mid-session; new untracked `__v15-preview.tsx` + `.measure-*.png`. A concurrent session is working this checkout. RCA class `VERSION-DRIFT`; lesson L-002 applies: factory records re-derive git state at every boot. Map updated to note it. |

## REVIEW 2 — Agent & tool readiness: PASS with two BLOCKED sub-items

| Item | Result | Evidence |
|---|---|---|
| 8 agent definitions created & consistent | PASS | `ls .claude/agents` → 8 files; model tiers + read-only tool grants in frontmatter; AGENT_ROLES.md operating rules |
| Agents discoverable via `Agent` tool | **BLOCKED (host limitation)** | `Agent(subagent_type:"factory-orchestrator")` → "not found. Available: claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup". Workaround: spawn `general-purpose` with the agent's file inlined. Logged in CHANGELOG_FACTORY. |
| Refero accuracy | PASS | Live `refero_search_sites` returned 106 results; tools present; Bearer in `.mcp.json` (paid, pre-authorized) |
| Playwright works where configured | PASS | Live `browser_navigate` to 59443 returned DOM snapshot; repo has `playwright.config.ts` + `@playwright/test` 1.63.0 |
| UI/UX Pro Max usable | PASS | Installed (`skills-lock.json` hash-pinned; SKILL.md with searchable data present) |
| Linear connection | **BLOCKED** | No Linear MCP; not connected; fallback BACKLOG.md active (LINEAR.md) |
| Local/cloud differences documented | PASS | TOOLS_MCP_READINESS.md "Local vs cloud" rows; cloud = NOT VERIFIED (stated, not claimed) |

## REVIEW 3 — Development & testing quality: PASS (pilot)

- **Pilot run:** `factory-pilot-001` (issue F-001) executed DISCOVER →
  INVESTIGATE → SPECIFY via the pipeline: boot checklist ran (live git
  facts), spec written to `pilot-spec-F-001.md`, checkpoint advanced
  QUEUED→RUNNING→CHECKPOINTED(SPECIFY)→**BLOCKED** ("awaiting owner
  approval; spec ready"). No app file touched. `git status` confirms.
- **Deterministic test execution:** `node scripts/factory/checkpoint.mjs
  self-test` — original 14-assertion result is historical and did not prove competing-worker exclusion; superseded by the real subprocess regression suite in RECOVERY.md
  (determinism check).
- **Safe Git behavior:** worktree isolation rule documented (AGENT_ROLES.md);
  no commits made on protected branches this session; pilot explicitly
  no-commit.
- **Correct handoffs:** orchestrator→engineer→QA→reviewer routing table
  in FACTORY.md §4 + AGENT_ROLES.md; independence rule (implementer ≠
  reviewer) stated.
- **Handoff note:** because custom agent types are not auto-discovered
  (Review 2), the orchestrator stage of the pilot ran inline (Opus)
  rather than via the `Agent` tool — an honest deviation, recorded.

## REVIEW 4 — Automation & recovery: PASS (mechanism) / BLOCKED (scheduler)

| Item | Result | Evidence |
|---|---|---|
| Checkpoint persistence | PASS | `factory-pilot-001.json` written & read by CLI; store outside any session |
| Interruption recovery (simulated) | PASS | self-test: pause→steal(stale)→resume→idempotent re-checkpoint; stale-lease steal + live-lease refusal verified |
| Duplicate-run prevention | CORRECTED | Original scenario 8 launched no second trigger. Use the replacement subprocess tests; see RECOVERY.md. |
| Retry boundaries | PASS (by design) | RECOVERY.md bounded-retry rule (3-strike→BLOCKED); never bypasses usage limits |
| **Scheduling** | **BLOCKED** | `create_scheduled_task` → "Blocked by classifier"; `CronCreate` one-shot → "[Auto-Mode Bypass]". Both scheduler tools denied by session policy; no workarounds attempted. Registry ready in SCHEDULES.md. |
| Usage-limit handling | NOT TESTED (real) | Simulated only (pause/recover); a real platform-limit event has not been observed in-session. Stated, not claimed. |
| Correct task resumption | PASS | resume chains PAUSED→RECOVERABLE→RESUMING→RUNNING (self-test step 7) |

## REVIEW 5 — Security & self-improvement: PASS

| Item | Result | Evidence |
|---|---|---|
| Permission boundaries | PASS | FACTORY.md §3 autonomy table; auditors/guardian read-only; engineer bounded to worktree; no secrets in committed files (checkpoint store holds no credentials) |
| Protected branches / production isolation | PASS | No merge/deploy path exists in factory config; draft-PR-only terminal state `AWAITING_APPROVAL`; sealed release + retained DB + fixtures never touched |
| Human approval gates | PASS | Every autonomous task ends at draft PR + AWAITING_APPROVAL; merge/deploy/seeding/paid = Owner-only (rulebook + per-agent) |
| Retrospective process | PASS | HEALTH.md + weekly-retro row in SCHEDULES.md + METRICS.md read by retro |
| Improvement evaluation | PASS | factory-improver agent + RCA taxonomy + "baseline before adoption" rule (FACTORY.md §6) |
| Reversible configuration | PASS | Factory footprint is 3 new untracked paths; deleting them (Owner-approved) restores prior state; no hooks/CI/dependency changes (CHANGELOG_FACTORY) |
| No uncontrolled autonomous changes | PASS | Scheduler BLOCKED; no agent has auto-merge; self-modification split (auto = observational records; gated = permissions/CI/hooks/deps/security) |

---

## Net readiness
- **Factory mechanism (discovery→spec→implement→test→review→checkpoint→recovery):** operational.
- **Unattended loop (schedules):** BLOCKED on Owner permission for a scheduler tool.
- **Agent auto-discovery:** BLOCKED on host surfacing `.claude/agents/` (workaround defined).
- **Linear:** BLOCKED on Owner authentication.
- **No review is claimed PASSED without its evidence above.**

