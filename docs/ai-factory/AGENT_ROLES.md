# Factory Agent Roles & Operating Rules

Live subagent definitions: `.claude/agents/*.md` (8 agents, all
created 2026-10-27). This file is the operating rules; the definitions
are the executable prompts.

## Roster
| Agent | File | Model tier | Writes to |
|---|---|---|---|
| factory-orchestrator | `.claude/agents/factory-orchestrator.md` | Opus | docs only; routes work |
| ui-ux-auditor | `.claude/agents/ui-ux-auditor.md` | Opus (read-only) | `docs/ai-factory/audit-findings-*.md` |
| uiux-researcher | `.claude/agents/uiux-researcher.md` | Opus | `docs/ai-factory/research-*.md` |
| frontend-engineer | `.claude/agents/frontend-engineer.md` | Sonnet (bounded) | worktree only; `.tsx`+`.js` twins |
| backend-guardian | `.claude/agents/backend-guardian.md` | Opus (read-only) | reports only |
| qa-playwright | `.claude/agents/qa-playwright.md` | Sonnet/Haiku | test assets; run reports |
| release-reviewer | `.claude/agents/release-reviewer.md` | Opus (independent) | PR description |
| factory-improver | `.claude/agents/factory-improver.md` | Sonnet/Haiku | `docs/ai-factory/` procedural docs |

Model routing follows the `opus-sonnet-cost-routing` skill: strong
reasoning for architecture/security/complex defects; economical models
for bounded routine work; the implementing agent's output is always
rechecked at the stronger tier before it gates a PR.

## Operating rules
- **Concurrency:** 1 orchestrator + max 2 specialists at a time. Raise
  only after worktree isolation, task locking (checkpoint leases),
  testing, and cost controls are confirmed working.
- **Independence:** the implementing agent is never the release-reviewer
  for its own work.
- **Session boot checklist (every factory session):**
  1. `git branch --show-current` + `git rev-parse --short HEAD` +
     `git status --short | head` — re-derive, never trust docs (L-002).
  2. Read top entry of `CURRENT_STATE.md` and `docs/ai-factory/BACKLOG.md`
     (pre-cutover mirror) — new issues live in Linear project `P-SEN-1`
     (see `docs/ai-factory/LINEAR.md`).
  3. `node scripts/factory/checkpoint.mjs list` — recover own unfinished
     tasks first.
- **Work isolation:** implementation in a git worktree branched from
  `codex/sense-integration`; the main checkout's uncommitted changes are
  never touched, committed, or reset.
- **Draft PRs only:** autonomous work ends at a draft PR +
  `AWAITING_APPROVAL` checkpoint. Merge/deploy are Owner actions.
