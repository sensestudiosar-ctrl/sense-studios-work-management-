# S27 test-server workflow demonstration

**Status:** Authorized synthetic test-server demonstration COMPLETE and Sol reviewed. S27 remains **DEFERRED** until the actual-project R-104/R-105 checkpoint is met.  
**Date:** 2026-10-07  
**Classification:** Synthetic test-server demonstration; not actual-project acceptance.

## Scope and limits

The Owner authorized creating a project of our own and accessing the test server to demonstrate the connected workflow. This report records that demonstration separately from actual operational project use. The demonstration used synthetic actors, project records, design material, client approval, procurement, factory and site evidence in a dedicated test database. It does not claim that any client, procurement, factory or site event occurred in real operations.

No S27 application code or migration was implemented. This workflow does not meet R-104 or R-105 for an actual Design or Turnkey project, does not release S27 from DEFERRED status, and is not a substitute for the real-project checkpoint. S18 remains excluded. The full repository `pnpm verify` was not run as part of this demonstration.

## Environment and execution

The completed run used the dedicated PostgreSQL 18 database `sense_checkpoint_demo_20261006_a7c9_test` at `127.0.0.1:57434`, verified at migration 109. The additive preview used API port 58440 and web origin `http://localhost:58441`, with the separate contained NAS at `.env.checkpoint-tools/nas-demo-20261007`. Before the workflow, the synthetic session was confirmed to match the demo database identity through both the direct API and web proxy; both returned HTTP 200.

The final refreshed run was `checkpoint-both-1791351987804`: Playwright exited 0 with 2 passed projects, no skips or retries. Desktop completed in 32.0 seconds, mobile in 35.9 seconds, and the total run took 1.2 minutes. The test used one worker and exercised the same connected workflow in both browser contexts. All six capture-state horizontal-overflow assertions passed in each context. The guarded read-only persisted-evidence helper also exited 0 and verified both projects.

The two project records were read from the run manifests; only project identifiers are listed here.

| Browser project | Synthetic application project | Delivery type | Final status |
| --- | --- | --- | --- |
| Desktop | `S27 prerequisite DEMO Turnkey e89d32d7` (`a323d0e0-733a-407e-947c-27686af2100d`) | TURNKEY | COMPLETED |
| Mobile | `S27 prerequisite DEMO Turnkey d43d1414` (`10a5423f-c397-4e1f-a060-c37a1aef66db`) | TURNKEY | COMPLETED |

## Demonstrated workflow

1. **Project setup:** Created a separately named synthetic TURNKEY project for each browser run, assigned a Project Lead and configured distinct synthetic staff/client identities for the demonstration. Subsequent business transitions used the application workflows.
2. **Design creation and internal review:** Registered a synthetic drawing and initial revision, created its linked task, attempted a prohibited self-approval, assigned an independent reviewer, recorded requested corrections, and submitted and approved the corrected revision.
3. **Client review and design handover:** Shared the exact approved revision with a synthetic Primary Client, recorded final electronic approval with passkey verification, issued the formal transmittal, and recorded the client’s separate acknowledgement.
4. **Turnkey commercial and production flow:** Created a price-backed BOQ/release from the approved design, used distinct request and approval roles for procurement commitment, and recorded procurement and factory progress through completion.
5. **Site execution and quality evidence:** Appointed the responsible person, created the site package and daily work/manpower record, attached synthetic site-photo evidence, recorded package progress and quality checks, and completed the snag correction, independent verification and closure flow.
6. **Separate handovers and project completion:** Recorded site handover separately from client design handover, verified the persisted site/project evidence and audit events, then completed the project through its ordinary status workflow. The manifests and screenshots confirm the final rendered states in desktop and mobile.

The demonstration covers the application workflows associated with project delivery type and accountability (R-011, R-013), Turnkey workflow (R-015), Design workflow (R-014), and site reporting/progress/quality/snags (R-068–R-070), plus the two checkpoint statements R-104/R-105. Those latter statements require actual operational evidence; this synthetic run does not satisfy them.

## Retained evidence and preservation

The runner summary, Playwright log, two manifests and `persisted-evidence.json` are retained under `.env.checkpoint-tools/runs/checkpoint-both-1791351987804/`. Exact evidence links: [desktop manifest](<D:/app/sensestudios work management app/.env.checkpoint-tools/runs/checkpoint-both-1791351987804/s27-prerequisite-checkpoint-desktop.json>), [mobile manifest](<D:/app/sensestudios work management app/.env.checkpoint-tools/runs/checkpoint-both-1791351987804/s27-prerequisite-checkpoint-mobile.json>) and [read-only persistence verification](<D:/app/sensestudios work management app/.env.checkpoint-tools/runs/checkpoint-both-1791351987804/persisted-evidence.json>). The run contains twelve captures: design register, client final approval, Turnkey release, site workspace, site handover and completed project for each context. Sol inspected all twelve refreshed captures; issued/approved/released/completed states are rendered, the prior Saving/Loading transients are gone, and responsive layouts show no visible page clipping. Very long full-page site images require zoom to read fine text; persistence verification supplies the exact facts.

The read-only verification establishes same-checksum corrected revision → issued transmittal → acknowledged client recipient → released design input continuity; confirmed reports by the named responsible person; completed/PASSED packages; FAILED then PASSED repair attempts with distinct fixer/verifier; closure against the latest passed attempt; and separate confirmed site handover snapshots before project completion. All ten exact Owner/staff fixture sessions from the final two manifests were revoked. Negative self-review and fixer self-verification assertions remained enforced. The manifests retain audit IDs, actor IDs and timestamps.

| Evidence | Desktop | Mobile |
| --- | --- | --- |
| Issued corrected revision | `33ae9249-5b34-441e-9aca-64d28071d8bf` | `1d17c298-3cb3-484f-9983-35690fd17568` |
| Released production input | `8eb30af3-6b83-4eef-b3af-42a125244a7a` | `76b32268-bb4a-471d-b033-57c560e8c11a` |
| Confirmed daily report | `fc31109a-8d52-4d23-b74d-b3880db13b73` | `a75e3ee6-35fc-49e0-9dad-2fe6559e7f16` |
| Separate confirmed site handover | `915b87c5-78a0-40e0-97a9-c707ef2ade63` | `4027a9f8-4e90-4578-a501-78165bc23d44` |

No reset, drop or reinitialization was performed for this run. The accepted S26 source and other retained test targets were not used as write targets. This task changed documentation and ignored demonstration tooling only; no application code, schema or migration changed. Full `pnpm verify`, production NAS, deployment, hosted CI and actual operational use were not verified by this task. Actual routing used GPT-6.1 Sol for interpretation/security/debugging/final review and GPT-6 Luna for bounded tooling/scenario/report preparation.

## Earlier attempts and remaining work

Earlier attempts encountered test-harness selector mismatches and preview-readiness failures. Those attempts did not establish application defects and are excluded from the passing result. The final run above passed on both configured projects against the separately verified database identity.

The authorized synthetic demonstration is complete. The literal actual-project R-104/R-105 checkpoint remains unverified and requires a named actual operational project and its authorized evidence. Until that separate gate is satisfied, S27 implementation remains deferred. Earlier passing run `checkpoint-both-1791351774787` is retained as history; the refreshed final run above is the acceptance evidence.
