# S23 Performance, project health and delay — authorized, 2026-10-05

Status: **COMPLETE for development/local staging, 2026-10-05** under the Owner's 2026-10-05 instruction to start and complete S23. Earlier S23-unauthorized wording is superseded only for S23. S18 remains unresolved/excluded; S24–S27 remain unauthorized. Final full gates/source/security/calculation/visual acceptance passed; see S23_COMPLETION_REPORT.md and S23_ACCEPTANCE_REVIEW.md.

Approved sources: current Owner instruction; requirements/APPROVED_REQUIREMENTS.md R-061–R-067 and R-006/R-092; requirements/CLARIFICATIONS.md C-005/C-002 Q12; approved architecture checkpoint 2e46805; relevant product/domain/database/permission/workflow/testing sources. Exact numerical policies are Owner setup data. No score may appear before explicit Owner entry and approval; test-only fictional values never activate real organizational policy.

## Requirement expansion

- R-061.a–c: one combined employee score with separate configurable role-group formulas; quality matters more than raw speed, attendance has relatively low weight and estimated-versus-actual efficiency only lightly affects the score; possible components use only real available evidence.
- R-062.a–b: exclude approved external delay from employee penalties and use the approved revised deadline for external-cause extensions; preserve original dates, reason/approval and exclusions.
- R-063.a–d: current score/trend and evidence-backed change explanations; strengths/weaknesses/repeated mistakes/improvement actions/development goals; own score/team average/relative position without named employee rankings; preserve exact formulas/inputs for every historical result. SOP/training suggestions remain explicitly unavailable without S18 sources.
- R-064.a–b: a separate Team Leader management score from personally controlled management actions and current permitted team/project scope; never automatically transfer every employee error to the leader. The listed management components are considered inputs, subject to real availability and approved policy.
- R-065.a–b: weekly/monthly/quarterly/annual cycles with persisted metrics, manager comments, employee acknowledgement, goals and development actions; retain history and approved authority.
- R-066.a–b: distinct Design/Turnkey health formulas and On Track/At Risk/Delayed/Critical thresholds; real schedule/milestone/delay/workload/review/pending-decision/scope-impact evidence.
- R-067.a–b: Internal Team/Client/Consultant/Vendor/Factory/Procurement/Material/Site Condition/Approval/Scope Change/Other cause-duration-source splits with correction history and no inferred causation from arbitrary text.
- C-005.a–c/C-002 Q12: separate role-group employee and Design/Turnkey health policies; initial Owner setup/approval before scores; prospectively versioned formulas/weights/thresholds/exclusions/effective dates, preserving previously published results.

Cross-cutting R-006/R-092, R-079/R-080 and C-001/C-002/C-003/C-009/C-010/C-011/C-023/C-024 retain backend scope, original evidence, canonical audit/events and immediate access-loss rules.

## Settled Owner decisions — 2026-10-05

The Owner approved the proposed boundaries: configure and approve role groups, metric formulas, weights and thresholds before any score; missing required evidence is insufficient evidence; delay exclusions use Owner-reviewed cause, duration and source record; Team Leaders use current team/project scope; review finalization is Owner-only; S18-dependent metrics remain unavailable. These decisions are explicit scope/authority approval, not approval of fictional fixture values.

Formula definitions include explicitly reviewable normalization and missing-input behavior. No active default weights/thresholds/role mapping exists. Arbitrary Waiting reasons/responsible-party descriptions never establish structured attribution automatically. Delay units/source linkage and arithmetic must be visible for Owner review; overlapping periods cannot silently inflate totals. Own employee acknowledgement does not change score or formalize a cycle.

## Scope and dependencies

PER owns policy setup/approval, explicit dated role-group assignment, real-source evidence, immutable employee/leader score snapshots, explanations/trends and cycles. HLT owns project health snapshots and structured delay attribution/corrections. In scope: existing operational-source read boundaries, approved formula calculation, scoped management and responsive persisted UI with unconfigured/insufficient-evidence states.

S13/S16/S17/S19/S20 are completed and integrated. S03/S04/S05/S07/S09–S14 supply authorization, audit/events, dates/extensions and review evidence. IMPLEMENTATION_PLAN.md's historical S16–S20 range includes S18 but does not authorize its integration. R-061 says possible components and R-064 says consider; available grounded formulas may operate without fabricated S18 inputs. Owner explicitly accepted unavailable skill/training/SOP measures. S21/S22 and all retained original work/data are preserved.

Out of scope: S18 start/integration; S24 general dashboards/reminders/reports/exports; S25–S27 integrations/automation/AI; production deployment; invented policy numbers; compensation/assignment/approval changes; automatic blame or skill upgrades; historical score rewriting; portal employee-performance access.

## Persistence and authority

Policies retain exact definition/effective date/Owner approval; edits create new versions. Snapshots freeze source IDs/versions/values, selected policy/version, period, exclusions, component arithmetic/result and explanations. Missing approved policy or required evidence cannot persist a numeric score. Published historical results remain unchanged after future edits. Delay correction appends reasoned replacement evidence. Cycles retain comments/goals/actions and own acknowledgement; only Owner finalizes.

Internal session/CSRF plus explicit performance grants and target scope are enforced at each request. Project assignment alone confers no employee-performance authority. Employees see own score and anonymous permitted average only; named rankings require current management authority. Source evidence details and aggregates must respect current source access/Confidential policy. CLIENT/EXTERNAL identities cannot access internal performance.

Mutation/history/receipt/audit/domain event/outbox commit atomically. Current sessions/grants/subject scope are rechecked after lock waits. SQL constraints/triggers protect immutable approved policy and snapshots. Schema/API/calculation design remains Sol-owned; bounded plumbing/UI/tests use settled Luna handoffs.

## Acceptance and test plan

1. Reviewed additive migration, Prisma validation/client generation, fresh dedicated targets and retained populated S22 upgrade with unchanged original-table column/count/digest snapshots. Exact database name/instance guards reject postgres/template/admin targets. The S22 unintended local postgres migration remains separately disclosed and unchanged.
2. Formula tests: explicit Owner normalization/weights, no-policy gate, missing evidence, role-group/leader/Design/Turnkey separation, effective dates, external-delay exclusions, approved revised deadlines, quality versus speed, no transferred leader blame, deterministic cause totals. Numerical fixture policies are clearly test-only.
3. PostgreSQL/API tests: own/management/project scopes, ID tampering/cross-branch/portal denial, explicit deny/revocation/session expiry after lock wait, source redaction, SQL immutability, historical preservation, concurrent publication/replay and atomic rollback.
4. Persisted desktop/mobile journeys: unconfigured/insufficient evidence, Owner setup/approval, existing-source results, changes/evidence/delay splits, anonymous averages/management ranking restriction, cycle comments/goals/own acknowledgement/Owner finalization, refresh and access loss. Sol inspects final canonical captures.
5. Pinned Node 24.19.0/pnpm 11.19.0 frozen install, generation/schema/migration checks, relevant unit/integration/browser tests and final full pnpm verify typecheck/lint/unit/PostgreSQL/build/desktop-mobile gates. Record exact outcomes and failed attempts; no unrun check is a pass.
6. Update source-of-truth/status/domain/permission/workflow/testing docs and final completion report only after applicable acceptance and Sol review. Production NAS/offsite/key custody/restore, hosted deployment/CI, actual-project R-105 and S18 conflict remain separate limits.

Actual context intake/interpretation: exact gpt-6.1-sol. Report subsequent actual dispatches and verification without inventing allocation ratios or model telemetry.
