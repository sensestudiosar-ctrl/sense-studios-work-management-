# MW-I02 exact-target harness safety review

10 October 2026. Actual reviewer: GPT-6.1 Sol. Latest Owner instruction authorizes only the new disposable `sense_mw_i02_validation_20261009_test` on `127.0.0.1:57434`; earlier pending-approval wording is superseded. No database operation was performed by this review.

Initial draft review: **NOT YET PASSED**. Setup, cleanup, absence check, integration runner, browser runner and Playwright configuration were inspected. Exact target naming, ports59442/59443,116 migrations, pinned Node24.19.0/pnpm11.19.0, setup environment allowlist, run-local NAS/tmp, marker/OID/system identifier/catalog checks, exact process creation/command/executable checks, synthetic-session revocation and target-only drop are bounded correctly. Cleanup refuses uncertain ownership or remaining connections, preserves other catalog entries and removes run-local private files. It does not fingerprint unrelated database contents.

Required before provisioning:

- Assert the post-create maintenance connection identity, system identifier and start time against the pre-create identity before migration.
- Make the read-only absence checker fail when the exact target exists.
- Persist each spawned PID immediately before awaiting process identity capture, so partial startup retains reviewable ownership evidence.
- Verify live target name/address/port/system identifier/OID before both integration stages and before the browser runner; saved manifest fields alone do not prove that a same-named target still belongs to this run.

Task/recurrence fixtures use the exact target before normal bootstrap and must leave accounts/organizations/sessions empty. Persistent Review integration runs only after authenticated browser acceptance. No reset, Owner deletion, replacement database or arbitrary target deletion is authorized. Browser authentication and final acceptance coverage are separate from this safety review. Both real-application and exact-prototype visual gates must be submitted to the Owner before COMPLETE; MW-I03 remains excluded.

## Provisioning review after hardening

**PASS for exact-target provisioning and cleanup source safety.** Reread confirms all four required guards were added: post-create identity equality precedes migration; absence fails closed; spawned PIDs and known launch arguments are saved before identity waits; both integration stages and browser runner verify live target system identifier and OID before dependent writes. A missing `createRequire` import in the browser runner was returned to Luna for mechanical repair before browser execution; it does not affect setup/cleanup provisioning.

Reviewed SHA-256:

- `setup.mjs`: `6A68390CCDAD5494DE27023C350F98906B9E972B384CDA1EA5736E41345114D7`
- `cleanup.mjs`: `E444A84AF60B6C451537052A33432302B86063EE9C9B266159FEEDB280515F99`

Root may run the read-only absence check and, only if the exact target is absent and instance/port checks pass, execute this reviewed setup. Any unexpected existing target or identity change stops work. Runtime execution, successful migration, authentication, persistence and cleanup results remain unverified by this source review. If startup identity capture fails, the saved PID is evidence for manual ownership review; incomplete identity deliberately prevents automatic process termination/drop.

Final runner reread: the missing import is repaired and the misleading unused absence environment copy removed. Source safety review **PASS** for the five reviewed scripts. Additional SHA-256: `run-tests.mjs` = `3F9338126242D4157DA6565FE31E1740783654DD0012C077A12E6B6C46274FEB`; `run-task-integration.mjs` = `043DF9DBD9E8947A16B8ACA504ADED724B2EFD2A482A29275EB05275D436CD91`; `check-absence.mjs` = `6365A017B8244EA93E06FD81AC27779F4F297B1D2AE088D5B1ED25F156331BF6`.

Latest Owner clarification: the deliverable is the repository's real `/my-work` frontend using its existing components and API. Original prototype is a reference only; temporary harnesses are validation tools, never substitute deliverables. This safety PASS does not establish UI acceptance or authorize MW-I03.
