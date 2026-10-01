# S13 completion report — internal review and correction

**Status: COMPLETE for the Owner-authorized development/local-staging scope, 2026-09-30.** S13_SPEC.md records scope and Owner decisions. S14 and later remain unauthorized.

## Implemented behavior

- R-027.a–b: linked project tasks enforce configured internal review before completion. A Project Lead or granted manager assigns an eligible named reviewer. Commands recheck active identity, project assignment, branch access, the separate review grant, current ownership and exact file access; self-review is denied.
- R-028.a–b: immutable task snapshots, exact R-series revision/blob/checksum references, submissions, rounds, comments, structured PDF/image annotations and uploaded markup preserve every submission. Exact R approval promotes through the private S12 port and atomically supersedes the former current revision. Selected drawings and CR issue still require S14 exact client approval.
- R-029.a–b: Minor, Moderate, Major and Critical severity and Owner-configurable categories retain historical labels. Corrections create a separately owned task, with a link to the parent review. Completion permits a new submission/round while prior evidence remains intact.
- R-024/S13.a: dedicated commands own internal review transitions. Ordinary completion and substantive task edits cannot bypass approval. Stale/concurrent decisions, forged IDs, revoked grants, project holds/cancellation and Confidential-file access fail closed; audit/domain/outbox evidence is atomic.
- Owner policies: reasoned escalation creates a mandatory in-app alert to the active assigned Lead with Owner fallback and delivery-time access checks. After owner exit/reassignment, a manager withdraws an open round with reason before replacement submission. Terminal correction/approval recovery preserves evidence; unchanged approved scope can complete, while changed scope requires a new round. Reviewer priority changes require management/assignment authority; committed dates additionally require `task.deadline_change`, with planning history preserved.
- Responsive inbox/workspace provides assignment, submission, history, comments/markup, decisions, correction assignment, escalation, withdrawal, authorized planning and completion controls, including loading/empty/error/denial states. The Owner selected structured annotations and markup files for S13.

## Verification

- Actual tools: Node 24.19.0 and pnpm 11.19.0. Prisma generation/validation passed.
- Seven S13 migrations brought fresh UTC PostgreSQL 18 databases to 51/51 migrations; migration status reports current. All seven also applied to the populated S12 upgrade rehearsal. The initial three-migration upgrade preserved normalized pre-S13 business rows with identical SHA-256 `BCF39D48E0616C3E0814D0B8709A4BE436838DE8F5B12F0AE7B2369CDA56BFEC`; the remaining enum/evidence/guard migrations subsequently applied successfully.
- Final `pnpm verify` exited 0 using a fresh general database and a separate dedicated S13 database: typecheck, lint, 136 API unit, 69 web unit, 133 API/PostgreSQL integration tests, production build and 19 Playwright tests passed. Six optional S12 integration cases skipped because `S12_DATABASE_URL` was unset. Four S11/S12 browser cases skipped in that invocation because `NAS_ROOT` was unset; all four passed in a separate isolated-storage run. Thus all 23 browser cases passed across the full and supplemental runs.
- Final focused S13 PostgreSQL suite passed 2/2, covering exact R0/R1 approval/issue gates, correction loops, immutable/SQL evidence guards, tampering, rollback, concurrency, revoked grants, reviewer independence, Confidential denial, escalation/planning permissions, withdrawal and terminal exit recovery. Controller/API and notification delivery tests pass in the full gate.
- S13 desktop/mobile Playwright passed in full and focused runs, including correction assignment/refresh, escalation reason/actor/Lead recipient, mandatory in-app notification and preserved history.

## Findings and limits

Review/tests found and fixed task-edit approval bypass, Confidential correction-comment leakage, terminal reviewer attribution mutation, incorrect UI planning routes, incomplete withdrawal visibility and exit recovery gaps. Regression coverage verifies those paths. The multi-step S13 PostgreSQL case now has a 30-second timeout after exceeding Jest's 5-second default under full-suite load. An existing authentication assertion now waits for asynchronous follow-up requests.

Broad runs against reused fixture databases failed singleton constraints; the final fresh run passed. An optional S12 acknowledgement case failed on both the S12-only baseline and after S13 on PostgreSQL 18, independently of S13, and remains a recorded pre-existing defect. Production build succeeds with a roughly 504 kB chunk-size warning.

Production NAS validation, encrypted offsite backup/key custody, hosted CI, Compose recovery, legal/contract retention validation and production restore remain release gates. No production deployment is claimed. Existing passkey diagnostic files and Vite configuration work were preserved.

Models actually used: gpt-6.1-sol for security, notification delivery and final state/permission/recovery review; gpt-6-luna for bounded controller/API/UI/browser/documentation work; coordinating Sol-level reasoning for requirements, schema, integration and acceptance. The 70% Luna / 30% Sol preference guided task allocation and is not measured token usage.
