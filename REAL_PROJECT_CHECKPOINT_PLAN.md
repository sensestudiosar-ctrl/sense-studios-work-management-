# Actual-project checkpoint before S27

## Later Owner decision — 2026-10-07

The Owner expressly waived the actual R-104/R-105 checkpoint as a prerequisite to **bounded local S27 implementation**. This supersedes the earlier sequencing restriction only. The test-server demonstration remains synthetic; actual operational checkpoint status remains unverified and cannot be claimed complete. S27 may be accepted only for its bounded local scope after its own gates. The Owner also authorized S18 integration; see IMPLEMENTATION_PLAN.md.

Status: AUTHORIZED SYNTHETIC TEST-SERVER DEMONSTRATION COMPLETE; REAL CHECKPOINT NOT VERIFIED, 2026-10-07. See [S27_TEST_SERVER_DEMONSTRATION_REPORT.md](<D:/app/sensestudios work management app/S27_TEST_SERVER_DEMONSTRATION_REPORT.md>) for final desktop/mobile, persistence and Sol review evidence. S27 remains DEFERRED.

The replacement Owner instructions now control: S27 remains DEFERRED until the real R-104/R-105 checkpoint, fixture acceptance does not satisfy it, and no AI implementation starts. The authorized named test-server demonstration is COMPLETE and its evidence is retained separately. Earlier bounded S27 design decisions are historical future scope, not a test-only exception to this latest requirement.

The Owner selected **Complete the real-project checkpoint before implementing AI.** This governs S27 sequencing; AI implementation is deferred. S18 remains excluded. Current local development/staging acceptance establishes implemented capability but does not establish actual operational use.

The Owner subsequently authorized: **YOU CAN CREATE A PROJECT OF YOUR OWN AND ACCES THE APP IN TEST SERVER.** Create named fresh demonstration projects in the dedicated test environment and exercise the application workflows. This removes the need to wait for a supplied project/access location for that demonstration. Label records, photos/documents, actor identities and decisions as demonstration evidence; do not describe simulated client/site/procurement events as actual operations. Report test-server proof separately from the literal actual-operational R-104/R-105 gate. AI implementation remains deferred during this proof.

## Exact source gates

Source: [APPROVED_REQUIREMENTS.md, section 104](<D:/app/sensestudios work management app/requirements/APPROVED_REQUIREMENTS.md:2731>) and [section 105](<D:/app/sensestudios work management app/requirements/APPROVED_REQUIREMENTS.md:2741>), mapped to R-104 and R-105 by REQUIREMENTS_TRACE.md. The quotations below preserve the approved gate wording.

R-104: Before advanced analytics or AI, prove: “One actual Design project can run from project creation through tasks, internal review, corrections, client review, client approval, final drawing issue and handover entirely inside the application.”

R-105: Then prove: “One actual Turnkey project can continue from approved design through BOQ/material workflow, procurement coordination, factory/site execution, manpower, progress updates, quality checks, snags and final handover.” Only after these flows are trustworthy should advanced predictive intelligence become a priority.

The source does not require inventing a second unrelated project if an actual Turnkey project provides the complete design and execution evidence; its project type and implemented workflow must still match ordinary domain rules. Do not change project type or retrospectively invent work to simplify the checkpoint.

## Current evidence and missing input

CURRENT_STATE.md and S20_COMPLETION_REPORT.md explicitly say actual-project R-105 remains unverified. S14/S19/S20 and later completion reports demonstrate fixture/local-staging capabilities and retained audit/security evidence. Repository searches found no named actual project checkpoint evidence register. This is not proof that no actual project exists in an external operational environment.

For literal actual-operational acceptance, named actual projects and operational evidence remain necessary. The currently authorized next action is instead fresh test-server demonstration. Do not place passwords, tokens, client-sensitive documents or raw native share URLs in this evidence document. Existing authenticated sessions or explicitly supplied secure configuration can be used; no test database substitutes for actual records.

## Authorized test-server execution brief

The settled demonstration uses the fresh isolated database `sense_checkpoint_demo_20261006_a7c9_test` on PostgreSQL18 at `127.0.0.1:57434`, verified at migration109. Preserve the accepted source106/source109 and populated upgrade targets; do not reset them. The current additive preview targets API58440 and web `http://localhost:58441`, with the separate contained NAS root `.env.checkpoint-tools/nas-demo-20261007`. Application identity was verified by matching short-lived synthetic sessions through both direct API and web proxy; generic health readiness alone does not prove the datasource. Before workflow execution, require a short-lived synthetic session from the exact demo database to match its expected account through both direct API and web proxy; revoke only that diagnostic session afterward. Read credentials internally without printing them. Leave unidentified earlier servers untouched and stop only captured owned startup processes when necessary. Earlier API58224/web58223 attempts are historical evidence, not the current execution target.

Each attempt creates one uniquely suffixed `S27 prerequisite DEMO Turnkey` project using ordinary project commands. Its existing TURNKEY type covers the complete Design review/approval/issue chain and subsequent Turnkey/site execution without changing project type or borrowing another project's approved revision. Prepare clearly labelled test Owner, assigned Project Lead, worker, independent reviewer/verifier, separate cost/procurement decision-maker and isolated CLIENT persona. Setup identity/session fixtures may follow existing test-only conventions; business transitions must use authorized API/UI commands, not SQL updates to simulate approval or completion. Retain named projects and evidence after the demonstration. This synthetic proof remains separate from the unverified actual-operational R-104/R-105 gate and does not release S27 from DEFERRED status.

Workflow references are `tests/e2e/review.spec.ts`, `client-review-staff.spec.ts` and `client-portal.spec.ts` for exact revision/internal correction and isolated client OTP/passkey review/approval; `turnkey.spec.ts` for distinct requester/approver BOQ/cost/procurement/factory workflow; and `site.spec.ts` for responsible-person daily report, manpower/package progress, independent failed-repair/pass/separate closure and site handover. Existing tests supply components, not a single connected checkpoint: ensure exact approved design/release evidence feeds the demonstrated Turnkey project and preserve its complete evidence chain.

Record project IDs, actor-role IDs, exact revision/task/review/approval/release/report/snag/handover identities and screenshots. Verify persisted refresh plus critical denied self-approval/self-verification and access boundaries. Report any gap between separate site handover and ordinary project final handover; neither should be silently equated. Complete documentation review before treating this demonstration as proof of implemented end-to-end capability.

If the selected real project has not yet reached a required milestone, preserve its current state and record the unmet milestone. Do not fabricate corrections/snags, approve client documents on a client's behalf, mark physical work complete, invent manpower/procurement evidence or force handover merely to satisfy this plan. Required human decisions stay with authorized domain actors.

## Evidence register to complete after identification

| Gate | Actual record/evidence required | Current status |
| --- | --- | --- |
| Identity and provenance | Named real project ID, owning Branch, actual client, project type, accountable lead, operational environment and authorized reviewer | Not supplied |
| R-104 project creation/tasks | Project creation/scope/template evidence and actual assigned tasks with retained history | Unverified |
| R-104 internal review/corrections | Exact real revision/task submission, independent internal review and real correction round/history | Unverified |
| R-104 client review/approval | Exact CLIENT-scoped review package, actual human client decision/passkey approval and retained identity/revision evidence | Unverified |
| R-104 final issue/handover | Exact approved drawing issue/transmittal and ordinary Design handover gate evidence | Unverified |
| R-105 approved design/BOQ/material | Exact approved design/release, actual BOQ, material selections and retained release identity | Unverified |
| R-105 procurement/factory | Actual human cost/procurement decisions and operational procurement/factory progress | Unverified |
| R-105 site/manpower/progress | Real package/responsible-person records, manpower observations, confirmed daily reports and actual progress | Unverified |
| R-105 quality/snags | Real quality evidence, fixer/verifier independence, repair/pass history and separate authorized closure | Unverified |
| R-105 final handover | Ordinary site/project final handover with actual passed prerequisites and retained approver/time | Unverified |

For every row, record scoped IDs, exact versions, relevant audit/event/approval/transmittal IDs, actor role, timestamp, authorized evidence location and review result. Record gaps separately from implemented defects. Screenshots support inspection but do not substitute for persisted records or actual human decisions. Do not copy unauthorized content into a shared report.

## Execution and acceptance

1. Inspect the identified real environment read-only first. Confirm project provenance, current schema/API and actor/session scope without exposing credentials. Preserve original data and take only existing authorized backup/preservation measures; do not reset or migrate an unspecified environment.
2. Trace each checkpoint requirement through current owning service/UI and exact retained evidence. Review current branch assignment, client item isolation, Confidential grants, immutable revision/approval history and ordinary handover preconditions.
3. Classify gaps: absent real operational milestone, unavailable access/input, documentation gap, environment problem or reproducible implementation defect. Fix authorized meaningful defects only after reproduction/root cause; preserve unrelated work and use focused regression checks.
4. Execute outstanding genuine workflow steps only under established authorization and using actual evidence. Formal client approval, procurement commitment, project decisions and final handover remain their ordinary actor workflows; assistant preparation does not grant their authority.
5. Review persisted refresh and appropriate desktop/mobile operational flows; verify exact source/evidence continuity. Existing local tests are supplementary, never labelled actual-project execution.
6. Exact GPT-6.1 Sol reviews the completed evidence register against R-104/R-105 and existing permission/approval rules. Mark a gate met only when every required actual record is verified; otherwise report remaining milestones and concrete responsible inputs. No production deployment/NAS/offsite backup/restore/hosted CI claim follows automatically.

Sol owns requirement interpretation, security and final acceptance. Luna may prepare settled evidence-document structure or narrow tooling after inputs are known. Actual intake/preparation used exact GPT-6.1 Sol; no implementation or runtime checkpoint check is claimed by this document.
