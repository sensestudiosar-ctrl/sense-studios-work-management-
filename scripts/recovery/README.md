# Isolated native recovery acceptance

This is the Owner-authorized local PostgreSQL18.6 alternative to the GitHub/Docker fixture job. It never sets `GITHUB_ACTIONS`, resumes an old cluster, resets fixture rows, migrates retained data, or stops an unrelated process. It requires Node24.19.0 and pnpm11.19.0 at the installed paths in `native-acceptance.mjs`.

Read-only inspection prints the current source hash and a new run identifier. It invokes version commands only; no cluster/database/server lifecycle occurs:

```powershell
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs inspect
```

After final source review, use the returned runId/hash. The lifecycle flag records existing Owner authorization and is not a substitute for it:

```powershell
$env:SENSE_RECOVERY_ACCEPTANCE_APPROVED = '2026-10-21:sense-recovery-fresh-119'
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs prepare <runId> --purpose=api --reviewed-source=<sourceHash>
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs check <runId>
```

Preparation refuses existing directories/names/listeners and creates two fresh clusters bound to actual IPv4 loopback58440/58441. All data/evidence is under `.env.consolidation-20261021/acceptance/<runId>/`. It creates a migration-only pristine template, all21 ordinary suite databases and three dedicated parity/receipt/browser databases. Exactly119 migration names/checksums are checked before cloning and on every target. The parity fixture alone receives a synthetic Organization/Owner; the main browser target remains unseeded.

The run also creates a private `bin/pnpm.cmd` shim pointing to the checked Node/pnpmCLI paths and prepends that directory for owned commands, so nested package scripts keep the required pnpm version.

The generated administrator owns schema/migrations. Tests connect as the nonprivileged `sense_app_runtime` role. Disposable-only metadata reads permit exact system/OID/directory checks. S22 alone receives the existing test-only trigger-ownership exception; no global write permission is relaxed.

Run explicit stages only after their scope is approved. `api-all` is the typecheck/lint/API-unit/web-unit/build/runtime/NAS-mock/PostgreSQL/receipt sequence; it is equivalent coverage to those normal gate commands plus additional recovery checks. It is not a literal `pnpm verify` invocation, and browser acceptance is a separate pristine stage:

```powershell
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs run <runId> --stage=api-all
# Alternatively use quality, postgres, or receipts separately, each at most once.
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs stop <runId>
```

For browser checks, inspect again after source is stable and allocate a new runId with `--purpose=browser`. The earlier API-run clusters must already be safely stopped; their data/evidence remains preserved. Never reuse a committed API fixture for passkey bootstrap:

```powershell
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs prepare <newRunId> --purpose=browser --reviewed-source=<sourceHash>
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs run <newRunId> --stage=e2e
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs run <newRunId> --stage=bounded-browser
& 'C:/Program Files/nodejs/node.exe' scripts/recovery/native-acceptance.mjs stop <newRunId>
```

E2E uses the existing desktop/mobile projects, production previews on58430/58431 and58324/58323, local fake accounting58432, strict new-server ownership, one worker and no retries. The dedicated four-width Agent1 browser acceptance uses58652/58653 and its own database/storage; old59749/59751/59752/59753 targets are never opened. Build the exact source first, since browser API and AUT helpers use `apps/api/dist` and web production previews use `apps/web/dist`.

Outputs per run:

- `manifest.json`: public non-secret source/cluster/database identity, migration checksums, ownership and phase.
- `private.json`, `environment.test`: generated credentials and exact environment; never print or commit these.
- `reports/`: redacted command logs, structured test reports/counts, provision evidence and start/completion markers.
- `postgres/main/data`, `postgres/s14/data`: new data directories, preserved after stop.
- `files/`, `screenshots/`, `agent1-browser/`: isolated storage and browser evidence.

The compatibility environment `.env.s27-tools/s27-fresh-<timestamp>_<12hex>.test` is also generated with identical values because existing suite guards independently read it. S18 and S27 screenshots remain in their mandated `.env.s18-tools/runs/recovery-<runId>/screenshots` and `.env.s27-tools/runs/recovery-<runId>/screenshots` locations. S19–S26 screenshot variables point under the new run. The test-only output substitutions preserve historical defaults and keep accepted screenshot evidence intact during the recovery run.

Every stage checks the current canonical source against its original pin and verifies live identities/checksums before tests. Source drift fails; it does not repin automatically. Repeating a destructive fixture stage is refused through exclusive start markers. A failure requires classification and a new reviewed run, never fixture deletion. Stop ignores source drift, verifies the exact owned cluster, and preserves databases; it cannot run while the owned runner lock exists. A stale lock requires explicit operator diagnosis, never blind removal.

Inert safety checks (no database/server):

```powershell
& 'C:/Program Files/nodejs/node.exe' --test scripts/recovery/native-acceptance.test.mjs
& 'C:/Program Files/nodejs/node.exe' node_modules/eslint/bin/eslint.js scripts/recovery
```

NativePG18 tests do not claim DockerPG17, hostedCI, NAS/offsite restoration, actual phones, ordinary staff pilot, actual-project R-104/R-105, production readiness or reboot acceptance. Immutable release/supervisor/cache acceptance is separately required by the recovery plan.
