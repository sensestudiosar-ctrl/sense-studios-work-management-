# S19 Turnkey BOQ, cost, materials, procurement and factory operations — implementation scope

Status: **COMPLETE for development/local staging — 2026-10-03.** Owner authorized S19 on 2026-10-03. Approved sources are `requirements/APPROVED_REQUIREMENTS.md`, approved clarifications C-001–C-024, architecture checkpoint 2e46805, the current Owner instruction, and the S19 entry in `IMPLEMENTATION_PLAN.md`. S19_COMPLETION_REPORT.md records final acceptance and production limits.

## Requirement sub-IDs

- R-015.a: S08 owns the already approved default project order. S19 does not redefine it.
- R-015.b: Keep Turnkey operational records separate from accounting and financial-system responsibilities; do not duplicate accounting workflows.
- R-015.c: Immutable project BOQ lines and exact approved design/checksum snapshots, with separately stored prices.
- R-015.d: Named, independent human cost/procurement approvals through the shared S05 engine and queue (R-096–R-097).
- R-015.e: Select one material description per approved BOQ line before procurement approval; selections become fixed after that request. Inventory and automatic allocation remain outside S19.
- R-015.f: Persist reasoned operational procurement progress and exact release/approval history without accounting duplication.
- R-015.g: Persist reasoned factory progress after procurement completes, tied to fixed released inputs.

These sub-IDs expand the S19 portion of R-015. Cross-cutting requirements are C-002 Q4 cost visibility, R-006/R-092 authorization, and R-079/R-080 audit/retained evidence. S20 owns site/quality/snags/handover and the whole R-105 checkpoint.

## Scope and dependencies

S19 covers operational Turnkey BOQ, cost approval, material, procurement and factory workflows, with responsive staff screens and applicable views. Dependencies are S07, S11–S14 and S05; they are COMPLETE for development/local staging. S08 supplies the default order under R-015.a. S16–S18 are not dependencies. Keep each operation tied to its owning project branch and enforce explicit cross-branch assignment/grants under R-006 and R-092. Preserve the exact approved design revision(s) used as production inputs; do not silently substitute later uploads or revisions.

### Owner-settled policy — 2026-10-03

- Cost and procurement approvals may be made by the Owner or an explicitly authorized Team Leader assigned to the project. A requester may not approve their own request.
- Clients may view only cost information explicitly shared with them after approval. Client cost viewing does not confer approval or decision authority.
- Once design/BOQ inputs are released to production, they remain fixed. Replacing those production inputs requires an explicit change request and reapproval before replacement.
- C-002 Q4's cost VIEW access for the Owner and expressly granted Team Leaders/clients remains view access only; it does not grant decision authority.

## In scope and out of scope

In scope: real persistence for the approved operational workflows; human cost/procurement approval; controlled exposure of cost information; material/procurement/factory status and retained evidence; exact approved production inputs; audit/event/decision-queue integration as required by shared S05/S04 services; and responsive desktop/mobile presentation.

Out of scope: accounting ledgers, invoices, GST, payroll or financial-system duplication; S16–S18; S20 and later site execution; external vendor/factory portals (S21); offline site capture (S22); and unspecified implementation details until Sol resolves them against architecture and approved requirements.

## Sol implementation design — 2026-10-03

`TurnkeyRelease` owns immutable design/BOQ snapshots, selected materials, typed approval bindings and operational progress. `TurnkeyPrice` stores immutable prices separately. `TurnkeyHistory` links each release version to canonical audit/domain-event/outbox evidence; `TurnkeyCostShare` records explicit Owner-controlled client cost-view grants. Composite foreign keys enforce project/organization identity. Database guards enforce snapshots, valid transitions/version increments, exact design approval evidence, immutable history/prices and atomic approved replacement. Existing records are not rewritten or reset.

Only Active Turnkey projects accept writes. Other project states retain permitted internal history and block S19 delivery commands. Every request checks current project assignment, explicit cross-branch authority, active account/employee, `project.view` and action grants against the project's current branch. Internal HTTP commands recheck their session after lock waits. Staff management is permission-defined: cost viewers/approvers need current assignment and effective `project.manage` plus `employee.manage`, with `turnkey.cost_view` and the specific approval grant. Job-role names/titles confer no authority. Operational viewing uses `turnkey.view`; commands use `turnkey.manage`. Eligible approvers are discovered with the same predicates and rechecked at decision time.

DOC's public production-input validator checks one current APPROVED/ISSUED exact revision per selected drawing, project identity, file/Confidential authorization and INTERNAL approval; CLIENT approval is also required for selected client-review drawings or CR. Eligibility is rechecked at creation, request and approval. A plan item named Design Approval supplies no formal evidence.

The release lifecycle is `DRAFT → COST_PENDING → COST_APPROVED → PROCUREMENT_PENDING → RELEASED`. Rejection produces retained terminal `COST_REJECTED` or `PROCUREMENT_REJECTED`; a revised proposal is a new draft. Materials cover every approved BOQ line before the procurement request and remain fixed thereafter. Procurement and factory each advance `NOT_STARTED → IN_PROGRESS → COMPLETED`; factory needs completed procurement. Every progress command retains actor/reason/time. Released design/BOQ inputs stay fixed when a later design revision becomes current. Replacing them requires a new proposal naming the prior release and change reason, the entire approval sequence, then atomic replacement linkage. Old inputs/history remain; progress on the replaced release stops. Concurrent replacement attempts fail rather than overwrite.

Quantity and unit price use decimal strings of up to twelve integer and four fractional digits. Exact scaled-integer multiplication/addition preserves up to eight fractional digits without binary floating-point or rounding. A three-letter currency label accompanies protected cost data. The total is the exact BOQ extension sum; tax, discounts, invoices, payments, currency conversion and accounting export remain outside S19.

Ordinary staff receive operational quantities/materials/gate/progress status; prices, currency, cost decision bindings/actors/reasons and financial change notes are omitted. Structured audit/outbox/queue payloads contain no prices/totals; queue cards are redacted and visible only to authorized cost viewers. No new reminder/email recipient policy is introduced: S04 provides events/outbox, S05 the decision queue, and broad reminders/summaries remain S24.

Only the Owner shares/revokes approved immutable cost snapshots for current project clients. GET `/api/v1/client-portal/projects/:id/costs` uses the isolated S14 client cookie and rechecks exact share plus current portal grant/session/expiry. Cancelled projects deny this read, preserving C-013's issued-file/own-approval-history-only scope. Client viewing confers no approval authority. Staff `/turnkey` consumes scoped project/release/capability reads and versioned commands from `/api/v1/turnkey`; writes require authentication, same-origin CSRF and strict validation, and reads use no-store. Responsive loading/empty/error/denied/conflict states are verified by UI acceptance. S21 external portals, S20 site work, inventory and accounting are not introduced.

## Acceptance and proportional verification plan

The following acceptance criteria passed. Final sequential `pnpm verify` exited 0 with typecheck, lint, 160 API unit tests, 94 web unit tests, 182 PostgreSQL integration tests and 31 desktop/mobile browser cases, plus production builds. Sol reviewed the permission/schema boundaries and final desktop/mobile captures; retained-data preservation passed across 104 original tables. Exact evidence and earlier failed-run classifications are in S19_COMPLETION_REPORT.md.

1. Fresh-install and upgrade migrations preserve existing organization, project and document data; operational records persist across refresh and remain linked to the owning project/branch.
2. BOQ and release records resolve to the exact approved design inputs. Later uploads, guessed revision IDs or stale selections cannot silently replace released production inputs. A change request and reapproval are required before a replacement takes effect.
3. Only the Owner or explicitly authorized assigned Team Leader can approve; requester self-approval and client approval are denied. Clients see only explicitly shared approved cost details. Verify cost redaction across API responses, events, audit payloads and shared decision queue, including unauthorized identities and guessed IDs.
4. Verify cross-branch access, grant revocation, approval races/concurrent updates and transaction rollback. Failed operations leave neither partial operational changes nor misleading audit/outbox/approval evidence.
5. Verify material, procurement and factory lifecycle behavior and evidence against the Sol-approved transitions, including loading, empty, error, denied and stale/concurrent UI states on desktop and mobile.
6. Run the required repository quality gates: `pnpm verify` (typecheck, lint, unit/API tests, production build, desktop/mobile Playwright checks) with an appropriate dedicated test database. Record exact commands, results, environment limitations and unrelated confirmed defects. Do not claim unrun checks or completion.
