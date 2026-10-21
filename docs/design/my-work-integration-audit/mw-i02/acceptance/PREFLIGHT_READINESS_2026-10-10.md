# MW-I02 reusable preflight readiness — 2026-10-10

## Root cause, reproduced without PostgreSQL

PowerShell's simplified `Where-Object PID -eq [int]$mwPidFile[0]` invocation did not evaluate the cast/index expression as the intended integer comparison. An inert object whose PID is35672 produces0matches with that expression and1match after explicit parsing and a script-block predicate. The earlier displayed Windows evidence did not establish an actual cluster mismatch. No application defect was demonstrated.

Corrected implementation:

```powershell
$mwPidText = ([string]$Observation.PidLines[0]).Trim()
$mwExpectedPid = 0
$mwPidParsed = [int]::TryParse($mwPidText, [ref]$mwExpectedPid)
# Invalid/nonpositive input fails before process matching.
$mwMain = @($Observation.Processes | Where-Object { $_.ProcessId -eq $mwExpectedPid })
```

## Files changed

- `.env.checkpoint-tools/mw-i02-acceptance/preflight.ps1` — new preserved preflight; pure guard evaluator and explicitly selected `-Live` read-only observation adapter. No startup/setup/database mutation commands.
- `.env.checkpoint-tools/mw-i02-acceptance/preflight.tests.ps1` — new inert fixture and full-script/plan parser validation.
- `.env.checkpoint-tools/mw-i02-acceptance/readiness.mjs` — runs inert operator tests before source readiness can pass; includes PowerShell hashes in source fingerprint.
- `FINAL_CONSOLIDATED_ACCEPTANCE_PLAN_2026-10-10.md` — replaces hand-built operator command with the preserved script and explicit nonzero-exit stop.
- Readiness bindings/results and current-state/status documentation updated; accepted frontend, historical manifests/reports and frontend test logs preserved.

## Guard coverage and results

- Entire preflight script parser: PASS, zero errors.
- Complete proposed PowerShell execution block parser: PASS, zero errors; block was not executed.
- Inert operator suite:44/44 PASS,0failures.
- Source and inert readiness:54checks PASS, exit0.
- Six accepted frontend hashes match. Existing45/45 affected frontend tests, typecheck/lint/build evidence retained; no application changes and no redundant frontend rerun.

Inert cases cover valid identity; malformed/blank/overflow/mismatched PID; wrong or unavailable owner/executable/command/directory/port/system/running state; unavailable or ambiguous process information; missing/not-ready PID file; wrong/duplicate listener and listener owner/address; occupied API port; competing directory owner; parent PID/unavailable parent; missing process creation identity; quoted/unquoted/missing/duplicate command arguments. The valid parent fixture uses the exact previously recorded cmd.exe launch command with quoted PostgreSQL path and redirects. An unsupported pg_ctl -o parent format fails closed; this narrowly scoped preflight does not claim general launch-format support. Unavailable information stops with overall FAIL and an explicit error rather than PASS. Results contain named guard states; external observation failures return stage/error and exit1.

Live-only guards retain Medium context, pinned tools, current-source readiness, running pg_ctl status, disk system identifier, exact PID file/directory/address/port, process executable/command/owner/parent, sole expected listener, free API/web ports and independent READ ONLY live SQL system/directory/endpoint/target absence. Live Windows/SQL adapters were inspected but not invoked; inert PASS does not assert current environment readiness or authenticated acceptance.

## Execution boundary

No live PostgreSQL command, process/listener query, SQL connection, application launch, database setup or authenticated browser was executed during this correction. No PostgreSQL start/stop/restart or environment/security change. Current cluster state and disposable-target absence are intentionally not claimed.

One consolidated authorization is required before invoking `preflight.ps1 -Live` and the existing one-setup/task/browser/independent-Review/manifest-cleanup sequence. Stop on any preflight mismatch; no retry or fallback. Leave retained PostgreSQL running. Functional Reliability remains prior accepted bounded PASS; current-source full-shell Prototype Visual Fidelity remains BLOCKED pending fresh evidence. MW-I02 IN PROGRESS; MW-I03 not started.

Models: GPT-6.1 Sol context intake and independent review; GPT-6 Luna bounded inert fixture tests; parent preflight/readiness/plan implementation.

