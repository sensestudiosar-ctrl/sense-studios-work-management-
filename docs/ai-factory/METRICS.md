# Factory Quality Metrics & Baseline

Real measured data only — no synthetic quality scores. Every metric row
records the source (command output, CI run, checkpoint id) and the date.

## Tracked metrics (define before first measurement)

| Metric | Definition | Unit | Baseline (2026-10-27) |
|---|---|---|---|
| Critical workflow pass rate | Share of critical QA workflows (§6.4 of the master directive) passing on first verified run | % | unmeasured — set at first QA run |
| Build success rate | `pnpm --filter @sense/web build` + API build success on a candidate revision, before/after a change | % | n/a |
| Regression failures | Count of new test failures introduced by a change (not pre-existing) | count/PR | n/a |
| Defects escaping later stages | Defect found in stage N that should have been caught in stage < N | count | n/a |
| Reopened issues | Factory issues reopened after VERIFIED | count | 0 |
| Repeated defect categories | Same root-cause category in RCA.md appearing in ≥3 distinct issues | categories | n/a |
| Test flakiness | Same test passes and fails across reruns without code change | count | n/a |
| UI consistency findings | New visual/inconsistency findings from ui-ux-auditor | count/audit | n/a |
| Demo discrepancy | Measured gap vs approved demo (needs a defined metric — never claim % without one) | per-metric | n/a |
| Accessibility failures | Contrast/keyboard/focus/label failures from QA runs | count | n/a |
| Time-to-resolve | First commit on issue → VERIFIED checkpoint | days | n/a |
| Avoidable rework | Retouched commits after a review finding in same scope | count/PR | n/a |
| Agent coordination failures | Handoff errors, lost context, double-ownership | count | 0 (factory init) |
| Cost per accepted improvement | Where the platform exposes usage: tokens/run per VERIFIED change | tokens/PR | unmeasurable here; log manually when visible |
| First-use-limit recovery success | Recovery executions that resume without duplicate side effects | % | mechanism verified (self-test); real-event observation pending |

## How a metric gets a value
- Only from an executed command's output, a CI run id, or a checkpoint
  record. Never estimated.
- Record the command verbatim in the entry.
- Weekly retrospective reads this table, not memory.

## Guardrail
A metric trend that improves by *weakening a gate* is a process defect,
not a result. If a metric moves, check the gate configuration diff first.
