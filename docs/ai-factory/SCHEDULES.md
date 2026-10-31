# Factory Schedules (registry)

Timezone: Asia/Kolkata (local machine time). Off-minute picks avoid fleet
:00/:30 collisions.

**Status as of 2026-10-28: ALL FOUR ROUTINES ARE CONFIGURED AND ENABLED**
(verified live via `list_scheduled_tasks`; the 2026-10-27 "blocked"
record below was superseded — the creates succeeded despite two earlier
denied attempts):

| id | Cron (local) | Enabled | Next run (verified) |
|---|---|---|---|
| nightly-dev | `23 1 * * *` | yes | 2026-10-28 20:01 UTC |
| daily-qa-audit | `41 9 * * *` | yes | 2026-10-29 04:20 UTC |
| factory-recovery | `17 12 * * *` | yes | 2026-10-29 06:50 UTC |
| weekly-retro | `7 20 * * 0` | yes | 2026-11-01 14:46 UTC |

Remaining F-008 verification tail: **no observed fire yet** (first
nightly-dev run lands 2026-10-28 20:01 UTC); usage-limit denial
behavior unobserved; cloud tool availability unverified. Each run's
report lands in `docs/ai-factory/HEALTH.md` per the routine prompts.

## Verified fires (2026-10-31, via `list_task_runs`)

- **First observed scheduler fire: CONFIRMED.** nightly-dev ×3
  (10-29, 10-30, 10-31), daily-qa-audit ×3, factory-recovery ×3, all
  reported "succeeded". weekly-retro still 0 runs (Sunday slot not
  hit yet on a live host).
- **Usage-limit denial behavior: OBSERVED (negative result).** Every
  run's session terminated at the 5h usage-quota wall *before* the boot
  sequence ran — run last-activity is ~4s after start, the assistant
  turn is a bare "usage limit reached" line, so no checkpoint, no
  HEALTH.md note, no issue pickup. The unattended loop is therefore
  non-operational in effect despite "enabled + fired". Raised as
  **F-018** (backlog; owner approval required — it's scheduled-run
  prompt self-modification).
- **Cloud tool availability:** local Refero/Playwright-MCP/Linear
  verified working in-session 2026-10-31 (Refero search live,
  linear-server live read of P-SEN-1, Playwright MCP present). Cloud
  scheduled sessions remain unverified (not offered on this host) —
  the local-runner limitation in §"Honest limitations" stands.

---

## Historical (2026-10-27, superseded)
**Status as of 2026-10-27: nothing autonomous is scheduled.**
Two independent attempts were both denied by the session's permission
policy (auto-mode classifier):
1. `mcp__scheduled-tasks__create_scheduled_task` → "Blocked by
   classifier."
2. `CronCreate` (harness) one-shot scheduler-test → "[Auto-Mode
   Bypass]."
No workarounds were attempted. **Owner action (either path):**
- allow `mcp__scheduled-tasks__create_scheduled_task` (or
  `CronCreate`/`CronList`/`CronDelete`) via a permission rule, then
  re-run "create the factory schedules"; or
- create the four durable tasks by hand from the registry table below.
Until then the factory's unattended loop is **not operational** — only
the durable checkpoint/recovery engine and the agent roster are in place.

## Intended registry (durable, survives restarts; ~7-day auto-expiry
on recurring jobs applies on the app scheduler)

| id | Cron (local) | Purpose | Concurrency |
|---|---|---|---|
| nightly-dev | `23 1 * * *` | Recover interrupted tasks first (checkpoint `list` + RECOVERY.md), then one READY+approved issue through the pipeline to a **draft PR** + AWAITING_APPROVAL. Read-only discovery if nothing is approved. | 1 task/night |
| daily-qa-audit | `41 9 * * *` | CI failure check, regression sweep of recent commits, stale-duplicate issue sweep, factory health read. Skip expensive browser audits when no relevant source changed (compare HEAD + sealed build id vs last audit). | read-mostly |
| factory-recovery | `17 12 * * *` | Midday checkpoint sweep: PAUSED/RECOVERABLE records, stale leases, bounded-retry hygiene. No new work — recovery only. | 1 |
| weekly-retro | `7 20 * * 0` | Weekly factory retrospective → `docs/ai-factory/retros-<week>.md`: completed/open, quality trends from METRICS.md, repeated mistakes, process improvement evals, efficiency/cost, next priorities. | 1 |

## Prompt contract (what each scheduled run must do)
- Boot: re-derive git state (branch/HEAD/dirty) — never trust docs.
- Read FACTORY.md, BACKLOG.md, LESSONS.md, top of CURRENT_STATE.md.
- Nightly: recover first, implement second; end at draft PR —
  **never merge, deploy, reseed, or enable paid usage**.
- Every run writes a progress note to `docs/ai-factory/HEALTH.md`
  (newest first): date, what ran, pass/block results, checkpoint ids.
- Usage-limit behavior: if a trigger is denied on limits, leave a clean
  RECOVERABLE checkpoint and let a later trigger retry — no aggressive
  retry loop.

## Honest limitations
- Durable jobs run while the app/session environment is available; a
  machine that's off cannot host a local scheduled run. This is a
  **local-runner** setup; cloud scheduled sessions are NOT configured
  (a cloud runner would need its own Refero/Playwright/DB access — not
  verified; see TOOLS_MCP_READINESS.md "cloud" rows).
- Do not claim a schedule is active until `list_scheduled_tasks`
  shows it and at least one fire has been observed.
