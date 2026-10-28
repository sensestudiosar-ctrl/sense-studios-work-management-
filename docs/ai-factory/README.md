# SENSE STUDIOS AI FACTORY — Entry Point

Read in this order:

1. [FACTORY.md](FACTORY.md) — master rulebook (invariants, autonomy
   boundaries, pipeline, self-improvement, cost rules).
2. [CANONICAL_APPLICATION_MAP.md](CANONICAL_APPLICATION_MAP.md) —
   verified app/branch/server/toolchain map (re-derive git facts at boot).
3. [AGENT_ROLES.md](AGENT_ROLES.md) + `.claude/agents/*.md` — the 8
   specialist subagents and their operating rules.
4. [RECOVERY.md](RECOVERY.md) + `scripts/factory/checkpoint.mjs` —
   durable checkpoint/recovery engine (self-test passing).
5. [BACKLOG.md](BACKLOG.md) — version-controlled issue store mirror
   (pre-cutover rows; Linear `P-SEN-1` is the issue store since the
   2026-10-27 cutover — see [LINEAR.md](LINEAR.md)).
6. [DESIGN_RULES.md](DESIGN_RULES.md), [RCA.md](RCA.md),
   [METRICS.md](METRICS.md), [LESSONS.md](LESSONS.md) — quality memory.
7. [SCHEDULES.md](SCHEDULES.md) — unattended-loop registry (currently
   BLOCKED on Owner permission for a scheduler tool).
8. [REVIEW_CYCLES_2026-10-27.md](REVIEW_CYCLES_2026-10-27.md) — the
   five readiness reviews with evidence.
9. [TOOLS_MCP_READINESS.md](TOOLS_MCP_READINESS.md) — what is connected,
   what is not, and the fallbacks.
10. [CHANGELOG_FACTORY.md](CHANGELOG_FACTORY.md),
    [HEALTH.md](HEALTH.md) — change history and run log.

Status snapshot (2026-10-27): mechanism ready, unattended loop blocked,
pilot at `AWAITING_OWNER_APPROVAL` equivalent (BLOCKED checkpoint
`factory-pilot-001`, spec in [pilot-spec-F-001.md](pilot-spec-F-001.md)).
