# MW-I02 isolated acceptance stopped before setup

14 October 2026. The exact event timestamps below come from preserved receipts/logs.

## Result

**Functional Reliability: BLOCKED for this candidate.** No authenticated or persistence test ran. Earlier bounded functional PASS is preserved.

**Prototype Visual Fidelity: BLOCKED.** No new authenticated screenshot was captured; synthetic preparation screenshots remain separately labeled.

Owner authorized one isolated run. Attempt `1791990258731-a83f6120297c` stopped at the required recovery-copy check before database setup. No retry is authorized or performed.

## Passed evidence

Candidate: `.env.checkpoint-tools/mw-i02-candidates/1791972967348-1bde82ed9b19`.

- Source`233b7683766467d61b105730f41e08386977ede7bf9f9b93e5528651b7cc7d08` and seal`37e394b160449b848b64ddb3cd1914a67ce33061782893e0339c07a83268cb06` matched before execution;45,710 files/3,400 contained links verified.
- Windows Medium Mandatory Level; Node24.19.0/pnpm11.19.0 verified.
- Reusable native preflight exited0. Its source/harness readiness again passed806 checks.
- Live identity/ownership/executable/parent/PID/listener/port-exclusion checks passed. PostgreSQL was **already running**; `startedByRun:false`.
- Independent read-only SQL at`2026-10-14T15:06:04.503Z` verified system`7693570241708228348`, directory`D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`, host`127.0.0.1`, port`45434`, and exact target`sense_mw_i02_validation_20261009_test` absent.
- Acceptance ports59542/59543 were free. The native preflight's final PASS timestamp is`2026-10-14T15:06:04.5374395Z`.

## Exact failure and cause

The additional required recovery check invoked the sealed `verify-recovery-copy.mjs` from the candidate working directory. It exited1 at line9:

```text
AssertionError: Run from the repository root.
actual:   d:\app\sensestudios work management app\.env.checkpoint-tools\mw-i02-candidates\1791972967348-1bde82ed9b19
expected: d:\app\sensestudios work management app
```

The verifier intentionally anchors the retained cluster, recovery copy and cold-copy manifests to the original workspace. The operator supplied the copied workspace as CWD. The failure occurred before reading/verifying recovery-copy contents: **it is not evidence that the recovery hash changed**.

This is an operator/harness integration defect, not a demonstrated application or database defect. The stopped-cluster path also calls this verifier from the copied CWD, so isolated conditional-start preparation missed the same compatibility invariant. The806 checks did not exercise this full call-site/CWD combination. Offline readiness did not establish live cluster safety or complete operator compatibility.

Before execution, review also corrected documentation examples to include mandatory`-AttemptId` and setup`--authorization`, and clarified that native preflight owns the conditional single startup. The sealed harness was not modified, and no second startup command was issued.

## Operations and cleanup disposition

| Operation | Actual result |
|---|---|
| PostgreSQL startup/restart/stop | None; initially running cluster left running |
| Disposable database setup/create/migrations | Not invoked |
| Task/Review/parity integration | Not run |
| Authenticated Playwright | Not run |
| Acceptance API/frontend/browser processes | Not launched |
| Session/passkey/business data mutation | None by this attempt |
| Database deletion/cleanup | Not needed or invoked; no created database or setup manifest |
| Catalog preservation measurement | No before/after setup catalog snapshot exists because setup never ran; no catalog write was performed |
| Preview59442/59443 | No process/configuration/data mutation by this attempt |

The actual authorization receipt and attempt metadata are retained. Previous manifests, the frozen copy, recovery copy, successful functional results and screenshots are preserved. The run has stopped; the existing database absence result is a timed observation, not a claim about later concurrent activity.

## Exact preserved evidence

Within the candidate's `.env.checkpoint-tools/`:

- `mw-i02-owner-authorization-20261014T150302-isolated.json` — actual Owner reply and approved scope.
- `mw-i02-approved-attempt-20261014T150302.json` — unique attempt and verified source/seal.
- `mw-i02-live-preflight-1791990258731-a83f6120297c.log` — successful native/live SQL guard evidence.
- `mw-i02-live-recovery-verification-1791990258731-a83f6120297c.json` — actual failed invocation output; despite its suffix this is the preserved error text.

Current frozen frontend/API preparation remains363 API/463 web tests and passing typecheck/lint/build. Historical19 frontend baseline failures remain separately recorded. This attempt demonstrates a new operator integration gap and no new application regression; it does not validate the candidate's business workflows.

## Follow-up boundary

Prepare a narrow correction to the recovery-verifier call-site working-directory contract and inertly exercise the exact running/stopped invocation sequence before another request. Preserve the original absolute data/recovery locations, all hash/identity/reparse checks, and the frozen evidence. Do not edit this accepted seal silently or treat a missing guard as PASS.

A sealed-source change would require a newly identified candidate and applicable fresh authorization. This attempt does not authorize retry, another setup, startup, browser test, or completion. MW-I02 remains IN PROGRESS; MW-I03 is excluded.
