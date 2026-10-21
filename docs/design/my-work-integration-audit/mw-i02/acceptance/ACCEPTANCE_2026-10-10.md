# MW-I02 — authenticated acceptance submitted for Owner review

10 October 2026. This dated result supersedes the earlier ECONNREFUSED reports while preserving their history. MW-I02 remains **IN PROGRESS, awaiting Owner acceptance**. MW-I01 remains accepted COMPLETE for bounded local validation. MW-I03 was not started.

| Gate | Result | Boundary |
|---|---|---|
| Functional Reliability | PASS | Bounded MW-I02 authenticated local application acceptance; not whole-repository or production readiness. |
| Prototype Visual Fidelity | PASS for bounded MW-I02, with disclosed adaptations | Sol inspected actual/reference images at all four widths. This is not whole-prototype parity; small-mobile and shared-shell differences below remain for Owner review. |

## Existing application and changes

The deliverable is the existing repository and **`/my-work`** route, using `MyWorkRoute` in `apps/web/src/app.tsx`, existing `TaskWorkspace`, `MyWorkPhaseSummary`, `MyWorkAttention`, `ApprovalQueue` and `WorkspaceLayout`. No second app, duplicate My Work route or demo replaces these components. Sign into the normal running application and choose My Work, or append `/my-work` to its origin. The temporary acceptance frontend at localhost:59443 and API at127.0.0.1:59442 were stopped during cleanup and are no longer a live preview.

Existing MW-I02 production changes include `app.tsx`, `task.tsx/.css/.test.tsx`, `my-work-attention.tsx/.css/.test.tsx` and `approval-queue.tsx/.test.tsx`. This acceptance continuation refined `task.tsx`, `task.css`, `my-work-attention.tsx/.css/.test.tsx`: white semantic phase cards, personal-only row density, compact header/filter controls, mobile horizontal summary strip, full-width card placement, and focus scrolling. The existing shared Tasks breakpoint was preserved. The final browser-reproduced focus defect was fixed with nearest scrolling only when the summary strip overflows. All task APIs, canonical priorities/states, persistence, authorization and workflow handlers remain intact. No backend/schema changes were made.

## Actual authenticated verification

The ordinary authentication flow provisioned synthetic Owner, Team Leader, Designer and Site Employee identities in the specifically authorized disposable database. These are real application sessions and persisted tasks, not mocked component screenshots.

| Scenario | Result |
|---|---|
| Owner | Authenticated; employee-less personal scope truthfully empty, organization task management remains available through existing Tasks. |
| Team Leader | Authenticated populated queue; authorized task management and existing views retained. |
| Designer | Authoritative personal totals over a paginated queue; phase drill-down, Clear, Back, filters, task commands and stale-version checks passed. |
| Site Employee | Authenticated populated personal queue and permission isolation passed. |
| Views and commands | List, cards, Kanban and timeline; creation mandatory validation, updates, supported transitions, review/correction presentation, selection and pagination passed. |
| Access | Unauthorized task access/actions rejected; primary ownership and collaborator membership remain distinct from reviewer/approval inbox membership. |
| Independent sources | Real empty results; controlled loading,503 stale/error,403 denied and recovery checks passed. Controlled-response captures are labeled supplemental and do not prove a real server outage. |
| Responsive/keyboard | 1440,1024,390,320; no document horizontal overflow across28 reference pairs; Tab reaches the last mobile summary card and scrolls its full bounds into view. Focus, touch controls and existing detail navigation verified. |

Final real-browser log: [authenticated-final9-20261010.log](evidence/authenticated-final9-20261010.log), one integrated journey passed in28.1s. Earlier failed acceptance attempts exposed test-harness issues (fixture coverage, strict locators, sanitized denied wording and route-removal identity), plus the real mobile focus-scroll defect now fixed. Failed logs remain preserved; they are not represented as passing runs.

PostgreSQL integration:26 task/recurrence tests across2 suites plus3 review tests passed against the exact disposable target. Final affected frontend tests:47/47 across3 files; frontend typecheck, lint and affected production build exited0. See `final9-*-20261010.log`. Full web suite previously in this continuation:227 passed,19 failed, with the exact same19 baseline failure names and two existing Dashboard unhandled errors; [baseline comparison](BASELINE_COMPARISON.md). No whole-repository `pnpm verify` pass is claimed. Initial accidental use of global pnpm11.25 was rejected by engine checks; successful final checks used pinned Node24.19.0/pnpm11.19.0.

## Visual comparison and limitations

[Open the28-pair comparison gallery](COMPARISON.html). It links unchanged approved prototype PNGs, retained before captures, final full-application captures and viewport companions. Prototype source SHA256 remains `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. Refero research provenance remains the existing foundation ledger; no replacement reference or new prototype was introduced.

Personal queue first-task Y improved from935 to671 at390 and970 to671 at320, and from816 to681 at1440. Desktop representative row height is77px. Canonical-field responsive rows remain taller at1024/mobile because full state, owner, priority and both dates are preserved. At390 the first title is visible; at320 the queue heading is visible and the task row falls below the initial viewport, so users scroll to reach it. Selected phase adds truthful count/Clear guidance and therefore more height. These are disclosed adaptations, not a claim that every first task is above the fold.

The 320px capture establishes that task content is below the initial viewport. It does not show a task row permanently covered during scrolling. The shared mobile workspace reserves `3.7rem` bottom padding for the fixed navigation (`workspace-navigation.css`), and the document remains vertically scrollable; this is a first-content-position issue. No scoped change to navigation or task rendering is justified from this evidence. A post-scroll browser screenshot was not captured before the authorized validation database was cleaned, so this conclusion is based on the existing scrollable layout and its reserved bottom inset, not a new post-scroll runtime check.

| Remaining difference | Owning boundary |
|---|---|
| Global header/sidebar/mobile navigation proportions | Record for bounded MW-I01 visual remediation and MW-I09 cross-screen acceptance; no unrelated shell redesign here. |
| Tall responsive rows with all canonical fields | Bounded MW-I01 remediation proposal; preserve accepted functionality. |
| Prototype date groups, saved-view interactions, team/organization screens | Existing MW-I03–MW-I08 plans, each requiring its own authorization; final parity MW-I09. |
| Needs-action/overdue aggregates absent from supported exact sources | Retain supported phase totals and uncounted truthful navigation; no fabricated counts or predicates. |
| Owner personal zero differs from populated prototype sample | Contract-correct adaptation: account has no active employee identity. No fake personal membership/count. |
| Prototype simplified statuses, priorities and undated samples | Existing canonical contracts prevail; no fabricated undated tasks. |

## Cold copy, startup and exact cleanup

[Recovery evidence](RECOVERY_EVIDENCE_2026-10-10.md) records stopped-cluster guards,4673 files/120778450 bytes/30 directories and full relative-path/size/SHA256 comparison. GPT-6.1 Sol independently rehashed source and copy before startup. The private recovery copy remains at `.env.checkpoint-tools/mw-i02-pg-recovery-copy-20261010`, never started, deleted, overwritten, published or committed. A restore rehearsal was not performed.

The ONE authorized original-cluster startup succeeded with ordinary PostgreSQL recovery. Live directory/system identifier7693570241708228348 and127.0.0.1:57434 were independently verified before database creation. No initialization, reset, forced recovery, manual PID removal or cluster configuration change occurred.

Exact executed validation commands, from the repository root:

```powershell
node .env.checkpoint-tools/mw-i02-acceptance/check-absence.mjs
node .env.checkpoint-tools/mw-i02-acceptance/setup.mjs
node .env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs .env.checkpoint-tools/mw-i02-acceptance/runs/1791624844012-9bf01ed458fe/manifest.json --stage tasks
node .env.checkpoint-tools/mw-i02-acceptance/run-tests.mjs .env.checkpoint-tools/mw-i02-acceptance/runs/1791624844012-9bf01ed458fe/manifest.json
node .env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs .env.checkpoint-tools/mw-i02-acceptance/runs/1791624844012-9bf01ed458fe/manifest.json --stage review
node .env.checkpoint-tools/mw-i02-acceptance/cleanup.mjs .env.checkpoint-tools/mw-i02-acceptance/runs/1791624844012-9bf01ed458fe/manifest.json
node .env.checkpoint-tools/mw-i02-acceptance/check-absence.mjs
```

Setup recorded exact `createdb.exe -h127.0.0.1 -p57434 -U sense_demo -w sense_mw_i02_validation_20261009_test` arguments and existing migration deploy mechanism;116 migrations applied only to the new target. Cleanup guarded host/port/system identifier, run marker, database OID, process creation identity and before/after catalog.68 synthetic sessions revoked/expired, zero active sessions remain; only run-owned API/web processes stopped. Exact `dropdb.exe -h127.0.0.1 -p57434 -U sense_demo -w sense_mw_i02_validation_20261009_test` executed successfully. Other database catalog matched the before snapshot. Private run auth/environment files removed. [Cleanup log](exact-cleanup-20261010.log), [independent read-only absence check](post-cleanup-absence-20261010.log) at15:43:48 IST. Original cluster remains running and recovery copy retained.

## Review and stop

Actual models used: GPT-6.1 Sol for context, recovery-copy independent verification, safety and scoped visual review; GPT-6 Luna for bounded presentation, harness and documentation work. The Luna focus regression test was written before its agent hit account limits and is included in47 passing focused tests. Final optional agent followups hit account limits; root completed the browser checks, cleanup, evidence-link verification and report without claiming those followups ran. The real browser regression provides focus-scroll acceptance evidence.

Submit bounded MW-I02 for Owner review with the deviations above. Do not mark COMPLETE automatically; do not begin MW-I03.


