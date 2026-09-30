# S12 progress report — 2026-09-29

Historical progress checkpoint, superseded by S12_COMPLETION_REPORT.md. S12 is COMPLETE for development/local staging; S13 and later remain unauthorized.

## Routing and scope

The Owner requested approximately 70% Luna / 30% Sol task allocation. Sol owns requirement interpretation, important decisions, schema, permissions, difficult debugging and final review. Luna owns bounded general implementation, UI and tests within settled interfaces. Actual models in this work: gpt-6-sol (design/backend/security) and gpt-6-luna (UI/controller/browser tests), plus the coordinating GPT-6 agent. This is a task-allocation target, not measured token accounting.

S12 requirements R-030, R-037 and R-038 cover immutable R/CR revision identity, retained history, exact approved-current supersession and transmittal/acknowledgement evidence. Formal issue remains gated on S13 internal review approval and, when required, S14 exact client approval. No public approval bypass or S13/S14 implementation is authorized by this slice.

## Baseline and preservation evidence

- Node 24.19.0 and pnpm 11.19.0 confirmed. `pnpm install --frozen-lockfile` passed before S12 changes.
- Existing isolated temporary PostgreSQL 18 cluster confirmed live on loopback port 55444. Production-like data was not reset.
- Fresh `sense_s12_baseline_test` applied all 41 accepted S11 migrations. Prisma migration status reported current before S12 schema changes.
- Baseline `pnpm test` exited 0: 128 API unit tests (23 suites), 64 web unit tests (8 files) and 120 PostgreSQL/API tests (26 suites). These prove the pre-S12 baseline only.
- Independent baseline clone `sense_s12_upgrade_test` captured 70 prior tables / 22 rows.
- Stronger independent clone `sense_s12_populated_upgrade_test` from accepted `sense_s11_checkout_test` captured all 70 prior tables / 661 existing rows, including two documents and two file blobs. All 44 migrations were applied, and the preservation checker confirmed all 70 old-table row counts and old-column digests unchanged.
- `scripts/check-s12-upgrade-preservation.mjs` records ordered old-column digests and counts; it rejects non-loopback/non-test targets and existing destination databases. Prior source data is unchanged.
- Existing passkey diagnostic changes and Vite config are preserved; their baseline hashes are recorded in an ignored local file.

## Verified S12 work and remaining gates

- Register, immutable R0/R1/CR1 identities, one-way management client-review selection, exact downstream evidence ports, approved-current supersession, internal transmittal/acknowledgement, retention anchors and responsive UI are implemented. S13/S14 approval producers remain future slices; S12 issue is dormant without their canonical evidence.
- Fresh admin-owned UTC PostgreSQL test database applied all 44 migrations. Dedicated runtime-role database S12 integration journey passed: missing S13 issue has no transmittal, exact approval promotes, issue/acknowledgement/reissue persist, R1 supersedes R0, selected drawing waits for S14, and historical issue remains.
- Isolated desktop and mobile Chromium S12 browser journeys each passed for real upload checksums, R0/R1/CR1, selected client review, reload and responsive width.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` passed. On a clean UTC database, `pnpm test` passed 128 API unit, 64 web unit and 128 PostgreSQL/API integration tests.
- The first broad test run on a populated fixture database failed on the pre-existing one-Owner uniqueness assumption. The first fresh database had Asia/Calcutta timezone, causing pre-existing UTC assertion and exact acknowledgement timestamp failures. Both are test-environment conditions; the clean UTC run passed. A transmittal nested-create Prisma error found by the new journey was fixed before the passing runs.

Those remaining local acceptance checks later passed; see S12_COMPLETION_REPORT.md for final evidence. Production NAS, hosted CI, Compose, encrypted offsite backup/key custody and production restore remain separate gates.

## Owner clarification — client review selection

The Owner answered: "no only required drawings will be sent for cliet review by team lead or owner". Client review is selected for required drawings by the Team Lead or Owner, rather than imposed on every drawing or controlled by ordinary staff at creation. S12 records this one-way management selection as explicit evidence; actual client review submission/decision remains S14.

The Owner confirmed that the ten-year retention clock starts when a project becomes Completed or Cancelled. Later archiving or closeout work keeps that original closure date. The anchor and guards are implemented; both transition cases still require focused verification. No purge or production retention certification is claimed.

The Owner confirmed that internal approval makes a replacement current and supersedes the prior revision. For selected drawings, client approval is a separate gate before formal issue. This explicitly settles the S12 current-version interpretation.
