# Factory Behavior Change History

Every change to factory behavior — agent definitions, hooks, CI,
dependency pins, security rules, deployment settings, procedural
improvement adoptions — is logged here. Newest first. Gated changes
record their approval (who, when, evidence); autonomous observational
changes note the trigger.

---

## 2026-10-27 — factory init: verified capability gaps (recorded, not papered over)
1. **Custom subagent types are NOT auto-discoverable via the `Agent`
   tool in this build.** `Agent(subagent_type: "factory-orchestrator")`
   returned "not found. Available agents: claude,
   claude-code-guide, Explore, general-purpose, Plan,
   statusline-setup." The 8 files in `.claude/agents/` are valid
   definitions, but this session's agent registry only exposes the
   six built-ins. **Workaround used:** the orchestrator pilot ran its
   DISCOVER→INVESTIGATE→SPECIFY stages inline (Opus) with the same
   constraints the agent file states. Until the host surfaces
   `.claude/agents/`, specialist work is routed by spawning a built-in
   type (e.g. `general-purpose`) *with the agent's instructions
   inlined from `.claude/agents/<name>.md`* — the agent files remain
   the source of truth for the prompt.
2. **Both scheduler mechanisms were denied by the session permission
   policy** (details in SCHEDULES.md): `create_scheduled_task` →
   "Blocked by classifier"; `CronCreate` one-shot test →
   "[Auto-Mode Bypass]". No workarounds attempted. Unattended operation
   is therefore **not operational** until the Owner authorizes a
   scheduler tool.
3. Durable checkpoint CLI (`scripts/factory/checkpoint.mjs`) verified:
   14/14 self-test scenarios pass (state machine, lease TTL/steal,
   duplicate-trigger safety, idempotent completed-ops, terminal
   states, release-on-terminal).

## 2026-10-27 — factory initial creation (this session)
- **Created:** `docs/ai-factory/` knowledge structure; 8 subagent
  definitions in `.claude/agents/`; `scripts/factory/checkpoint.mjs`
  durable checkpoint/recovery CLI (self-test passing: state machine,
  lease TTL + stale steal, duplicate-trigger safety, idempotent
  completed-ops, terminal states).
- **Adopted:** factory rulebook (FACTORY.md), canonical app map,
  design rules, RCA taxonomy, metrics baseline, lessons log seeded
  from 2026-10-27 discovery evidence.
- **Blocked:** durable scheduled tasks (`mcp__scheduled-tasks__create_scheduled_task`
  denied by session permission policy). Registry documented in
  SCHEDULES.md; **Owner approval required.**
- **Not changed:** agent permissions (beyond tool grants written into
  each agent's frontmatter — read-only for auditors/guardians,
  bounded writes for engineers), CI configuration, dependencies,
  security rules, or deployment settings. No hooks installed.
- **Approval:** Owner master directive of 2026-10-27 (the factory
  build request) — non-destructive configuration authorized;
  merge/deploy/paid actions remain Owner-gated per FACTORY.md §3.
