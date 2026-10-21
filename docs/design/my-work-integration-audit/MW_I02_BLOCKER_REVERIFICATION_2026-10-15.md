# MW-I02 blocker re-verification — two sealed-harness defects, not a data problem

15 October 2026. **Read-only investigation. No PostgreSQL startup, no database creation, no
migration, no authenticated run, no harness edit that survived.** The retained preview and the
retained cluster were not touched.

## Result

**Functional Reliability: still BLOCKED**, but the reason is now precisely known and much
narrower than the previous record implied. It is **not** a data-integrity failure and **not** a
missing business capability.

Two independent defects in the **sealed acceptance harness** stop the run before setup. Both were
reproduced in this session.

## Defect 1 — the recovery verifier cannot be reached on the live path (resolved by state)

`verify-recovery-copy.mjs` line 8–9 hardcodes the original workspace root and asserts
`process.cwd()` equals it:

```js
const root = resolve('D:/app/sensestudios work management app');
assert.equal(resolve(process.cwd()).toLowerCase(), root.toLowerCase(), 'Run from the repository root.');
```

Every other acceptance script resolves its root from `process.cwd()` (`setup.mjs:15`,
`readiness-parity-20261013.mjs:9`) and `preflight.ps1:238-239` derives and enforces the *candidate*
root. Only this one script anchors to the original workspace — because the retained cluster and
recovery copy physically live there. The two contracts are mutually exclusive, which is what
stopped attempt `1791990258731-a83f6120297c`.

**This was the previous blocker.** It is not currently reachable: the only call site is
`preflight.ps1:229`, inside `Invoke-MwStoppedSafety`, which is called only at line 262 inside
`if ($mwServerState -eq 'stopped')`. The retained cluster is **running** (verified this session,
PID 24128), so the stopped-cluster branch is skipped and the verifier never executes. The defect
is therefore **latent, not active** — it returns if a future run finds the cluster stopped.

The correct repair is subtle and is documented under "Verified fixes" below: the data paths must
stay pinned to the original workspace, and only the CWD assertion is removed. Deriving the root
from the script's own location is wrong and fails on test, because the retained data is
deliberately absent from candidate trees.

**The underlying data concern is now disproven, not merely deferred.** Running the verifier from
the original root — one of the two contexts it accepts — returns PASS:

```json
{"state":"PASS","source":"...pg-demo-20261006-a7c9",
 "recoveryCopy":"...mw-i02-pg-recovery-copy-20261010",
 "systemIdentifier":"7693570241708228348",
 "copyContentManifestHash":"87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007",
 "filesVerified":4673,"directoriesVerified":30,"reparsePoints":0,"readOnly":true}
```

The approved hash `87d3ade8…` still matches, 4,673 files and 30 directories verify, and there are
zero reparse points. The stop record's caution — "not evidence that the recovery hash changed" — is
now positively resolved: **the hash has not changed.** A latent version of Defect 1 remains for any
future stopped-cluster run.

## Defect 2 — the pinned-pnpm path does not exist (NEW, currently fatal)

`readiness-parity-20261013.mjs:16` and `preflight.ps1:25` both pin pnpm to:

```
C:/Users/HI/AppData/Local/node/corepack/v1/pnpm/11.19.0/bin/pnpm.cjs
```

That file **does not exist**. `.../corepack/v1/pnpm/` is empty — no version is cached at all.
pnpm 11.19.0 *is* installed and correct, at `C:/Users/HI/AppData/Roaming/npm/pnpm` (verified,
reports `11.19.0`), consistent with the native dependency recovery on 2026-10-14.

Unlike Defect 1, this one is **fatal on every path, including the running-cluster path**:
`preflight.ps1:244` checks pnpm before the server-state branch, and line 246 runs the readiness
script, which asserts the same pin. Reproduced this session from the candidate root:

```text
AssertionError [ERR_ASSERTION]: Pinned pnpm11.19.0
    at check (.../readiness-parity-20261013.mjs:14:58)
```

This is why the 806-check offline readiness result could not be reproduced here. It was not
recorded in the stop report, so the next approval must not be spent rediscovering it.

## Verified environment state (read-only, this session)

| Check | Result |
|---|---|
| Retained cluster `pg_ctl status` | **running**, PID 24128, `-h 127.0.0.1 -p 45434` |
| Recovery-copy verifier from original root | **PASS**, 4,673 files / 30 dirs, 0 reparse, hash matches |
| Acceptance ports 59542 / 59543 | **0 listeners** |
| Preview 59442 / 59443 | listening (59442 PID 3304, 59443 PID 14128) — untouched |
| Pinned Node | `v24.19.0` |
| pnpm on PATH | `11.19.0` at `C:/Users/HI/AppData/Roaming/npm/pnpm` |
| Corepack pnpm cache | **empty** — pinned path missing |
| Candidate harness vs original harness | byte-identical (md5) for preflight, setup, check-absence, readiness |
| Candidate `verify-recovery-copy.mjs` | byte-identical to original (`e302d103…`), so Defect 1 reproduces there |
| Candidate dependency store | **present** — `node_modules/.pnpm` 1,074 packages; API 363/363, web 463/463 both pass |
| Three edited harness files, both trees | restored to sealed md5 `e302d103` / `90e9b0f0` / `1f030035` |

## Why this was not fixed in place

Both defective scripts are inside the **748-file sealed candidate inventory**
(`candidate-source.json` lists `readiness-parity-20261013.mjs` and `verify-recovery-copy.mjs`
alongside every other acceptance script). Editing either invalidates the seal and the recorded
source fingerprint `233b7683…`, which the stop report says requires "a newly identified candidate
and applicable fresh authorization."

Both fixes were implemented and verified this session, then **fully reverted**. Both trees are back
to their as-frozen bytes:

| File | Restored md5 | State |
|---|---|---|
| `verify-recovery-copy.mjs` | `e302d103…` | pristine |
| `readiness-parity-20261013.mjs` | `90e9b0f0…` | pristine |
| `preflight.ps1` | `1f030035…` | pristine |

No sealed artifact remains modified.

## Verified fixes (implemented, tested, then reverted)

Both fixes were applied in the live tree **and** copied into the candidate, and both were proven
correct before the revert.

### Fix for Defect 2 — multi-path pnpm resolution

`readiness-parity-20261013.mjs` tries the original corepack path first, then falls back to the npm
shim's real entry point. The shim at `Roaming/npm/pnpm` is a shell script, so `node <shim>` does
**not** work; the invocable target is `Roaming/npm/node_modules/pnpm/bin/pnpm.mjs` (verified,
reports `11.19.0`). `preflight.ps1` got the same fallback via a `PnpmFallback` key plus a matching
call-site change.

**Proof it works:** with the fix, the readiness run advanced from its line-16 pnpm assertion to
line 29 (`requireCandidateIsolation`), i.e. the pnpm check passed. It then failed at the
**isolation/seal check — correctly detecting this very file's changed hash**. That is the seal
working as designed: it caught an unauthorized edit.

```
+ actual   'readiness-parity-20261013.mjs': '837eca9535…'
- expected 'readiness-parity-20261013.mjs': '02c89a493a…'
    at verifyIsolatedInputs (…/candidate-isolation.mjs:51:10)
```

### Fix for Defect 1 — drop the CWD assertion, keep absolute data paths

The first attempt derived `root` from the script's own location. That is **wrong** and was rejected
on test: the retained cluster, recovery copy and evidence live in the original workspace and are
deliberately *not* copied into any candidate, so a location-derived root points at directories that
do not exist:

```
ENOENT … \mw-i02-candidates\1791972967348-1bde82ed9b19\.env.checkpoint-tools\mw-i02-copy-evidence-…\summary.json
```

The correct fix keeps `root` pinned to the absolute original workspace and removes **only** the
CWD equality assertion. The data paths are absolute and CWD-independent, so they remain the binding
guard; the assertion was the sole thing forcing the operator to `cd` into the original tree, which
contradicts the documented candidate-root workflow.

**Proof it works:** run from the candidate root — the exact failure point of attempt
`1791990258731-a83f6120297c`:

```json
{"state":"PASS","source":"…\\pg-demo-20261006-a7c9",
 "copyContentManifestHash":"87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007",
 "systemIdentifier":"7693570241708228348",
 "filesVerified":4673,"directoriesVerified":30,"reparsePoints":0,"readOnly":true}
```

It also still passes from the original root, so both call contexts work.

## Re-seal feasibility — established

The earlier claim that the candidate lacked a usable `node_modules` was **wrong**; a top-level
listing was misleading. The candidate does carry a full dependency store, and both suites run there:

- `node_modules/.pnpm` holds 1,074 packages; `apps/api/node_modules` and `apps/web/node_modules` exist
- API unit tests: **363/363, 57 suites pass**
- Web unit tests: **463/463, 46 files pass**

These match the sealed figures exactly, so the fixes introduce **no** application regression. The
web suite must be run with `apps/web` as the working directory (its parity test reads
`process.cwd()/src/my-work/my-work-parity.css`); running it from the candidate root produces a
spurious ENOENT, which is a harness invocation artifact, not a defect.

A re-seal is therefore feasible in principle. It was not performed because
`freeze-my-work-candidate.mjs` refuses to overwrite an existing seal (`flag: 'wx'`) and its own
message requires "a distinct evidence location" — meaning a **new candidate tree**, which is an
875 MB copy operation over preserved evidence and needs Owner direction.

## What unblocks it

**Option A — restore the pinned pnpm location (no seal change, smallest).** Place `pnpm.cjs` at the
pinned corepack path so the existing seal verifies unchanged. Defect 1 stays latent but is
unreachable while the cluster is running. Requires approval because it mutates the host toolchain
outside the repository.

**Option B — apply the two verified fixes and re-seal into a new candidate (recommended).** Both
fixes are already written and proven above; they need a fresh candidate identity, re-seal and
fresh authorization. This repairs the actual defects and removes the latent stopped-cluster failure.

Option B is recommended: the fixes are tested, the application is unaffected, and fresh authorization
already has to cover a new candidate.

## Boundary

No startup, setup, migration, authenticated test, browser run or cleanup was performed. No preview
or retained data was modified. No sealed artifact remains changed — all three edited files are
restored to their recorded md5 in both trees. MW-I02 remains IN PROGRESS; Functional Reliability and
Prototype Visual Fidelity both remain **BLOCKED**. MW-I03 is excluded. This document does not grant
the authorization that an approved run still requires.
