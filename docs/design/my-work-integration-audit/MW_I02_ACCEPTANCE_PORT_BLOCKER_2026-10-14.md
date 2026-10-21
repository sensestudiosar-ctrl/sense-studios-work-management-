# MW-I02 current candidate — acceptance port blocker

14 October2026. **No state-changing MW-I02 acceptance command was executed.**

The Owner approved one run for candidate5805a24d2695354180d72367d6676b65dc6bae8e6f3d821e979ba86df16b9887. Before live execution, complete native source review found the preflight still called historical readiness and used fixed startup paths. Current native wiring is corrected, parsed and independently source-reviewed:78 inert cases pass (71 retained plus seven new); current readiness passes792.

## Read-only environment evidence

- pg_ctl status: retained cluster is running, PID29136, exact PostgreSQL18 executable/data directory and127.0.0.1:45434 command.
- Live READ ONLY maintenance SQL: system7693570241708228348, exact retained directory,45434, disposable sense_mw_i02_validation_20261009_test **absent**. Evidence `.env.checkpoint-tools/mw-findings-readonly-live-absence-20261014.json`.
- API59442 is owned by PID8616, `.env.checkpoint-tools/retained-server-20261014/api/main.js` with its loopback hook.
- Web59443 is owned by PID33072, `.env.checkpoint-tools/retained-server-20261014/web-complete.mjs`.
- The current [retained-server report](../../operations/RETAINED_SERVER_RESTORE_2026-10-14.md) identifies these as the separately authorized original115 preview preserving50 tasks/five staff/Owner passkeys. It is an isolated historical runtime and does not include the current118 candidate.

The fixed-port MW-I02 precondition fails. Neither process is owned by a new MW-I02 manifest, and the acceptance authorization does not permit stopping the retained preview or choosing fallback ports. No PostgreSQL start/stop, database setup, fixture write, authenticated browser attempt or cleanup/drop was performed for this acceptance. The existing preview remains available.

## Concurrent source evidence

Fingerprint comparison also caught a concurrent app.tsx invalid logout setter. TypeScript reproduced TS2552; a new frontend regression reproduced failure to reach the normal sign-in route. Removing only the unavailable setter preserves the existing session-ended notification and CSRF logout. The focused regression and independent Sol source review pass; final full source reruns are recorded in the findings report. This is a new concurrent source defect, separate from historical baseline failures and from the environment blocker.

## Historical decision request — superseded by Owner selection below

Preserve the retained preview while preparing a separately approved API/web port pair for acceptance, or authorize a bounded pause and restoration of those exact preview processes. **No alternative ports, process termination or restoration is executed or implied here.**

After that choice, update all harness assertions together, run parser/inert/source checks, freeze the actual source, and request one combined bounded acceptance authorization for that exact environment. Reuse the retained PostgreSQL45434 cluster and absent MW-I02 target; no new cluster/database name, reseed or production access is proposed.

Functional Reliability and Prototype Visual Fidelity for the new candidate remain **BLOCKED** pending real persistence/authenticated evidence. Prior bounded functional PASS remains preserved. MW-I02 IN PROGRESS; no MW-I03.

## Owner decision and completed preparation

Owner selected keeping the preview and preparing separate ports. API59542/web59543 are now consistently pinned; timestamped listener/IPv4/IPv6 exclusion checks pass. Explicit retained-port rejection tests and pre-start required-port exclusion checks pass. Final source readiness800/800, native86/86, binding57/57, API359 and frontend453, typecheck/lint/build PASS. Candidate752761cbc613f382a4abcfdc58bd209e5cc1b18ec166ba5d7de7eb94e8f722b2 requires one fresh execution approval; no acceptance operation has been launched. See MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md. The05:30 listener snapshot has preview PIDs8764/27808; earlier PID8616/33072 evidence above is historical. No preview service was changed by this preparation.
