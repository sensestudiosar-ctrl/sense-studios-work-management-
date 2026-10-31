# Factory fire log (F-018 sentinel)

One row per scheduled fire, appended by the run itself at step 0 — before
any boot work — so a fire that has quota headroom always leaves a trace.
Row outcome is updated at end-of-run.

- `running` → row just opened by step 0
- `done` → run completed its pipeline/read-only work and committed ledger
- `died-at-<step> (quota wall)` → 5h usage-limit notice hit at that step;
  a clean RECOVERABLE checkpoint (or "no work in progress") is recorded
- `booted: no — pre-boot quota wall` → backfilled by factory-recovery or
  weekly-retro: `list_task_runs` shows a fire with no FIRES.md row at all
  (the run died before step 0; no headroom to write the trace)

A fire that is "succeeded" in `list_task_runs` but absent from this table
was **not** a completed run — it is a pre-boot quota-wall death until a
detector backfills it.

| ISO time (local Asia/Kolkata) | task | session/run id | outcome |
|---|---|---|---|
| _no rows yet — first sentinel row lands with the first post-fix fire_ | | | |

## Detector contract (factory-recovery, weekly-retro)

1. Read `list_task_runs` for each of the four routines (nightly-dev,
   daily-qa-audit, factory-recovery, weekly-retro).
2. For every run started after 2026-10-31 with no matching FIRES.md row:
   backfill one row as `booted: no — pre-boot quota wall (run
   <session-id>, <started_at>)`.
3. Count pre-boot deaths in the run's report; three or more pre-boot
   deaths within 7 days is a signal to propose the staggering/headroom
   lever (Owner decision — see SCHEDULES.md §"F-018 fix" residual
   limitation).
