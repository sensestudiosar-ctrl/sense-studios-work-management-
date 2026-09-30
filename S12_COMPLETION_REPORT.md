# S12 completion report — revisions and formal issue

**Status: COMPLETE for the Owner-authorized development/local-staging scope, 2026-09-29.** S13 and later remain unauthorized. Formal issue is intentionally blocked until S13 supplies exact internal approval evidence; selected drawings and CR revisions additionally wait for S14 exact client approval. This report does not claim those later workflows are implemented.

## Implemented behavior

- R-030: project-scoped drawing register with immutable checksum-bound S11 file/blob revisions. R0 starts the internal R series; R1 and CR1 allocate separately with a cross-series ordinal, reason, actor, time and retained history. Stale concurrent appends reject without duplicate labels.
- R-037: private exact-evidence ports for future S13/S14 producers, internal approval promotion to one current revision, atomic supersession of the former current revision, visible “Superseded — Do Not Use,” and no public state/approval bypass. The Owner clarified that client approval gates formal issue, not current promotion.
- Management selection: drawings start without client-review requirement. The Owner or assigned staff holding the explicit scoped `document.client_review_select` grant may select a required drawing once with reason and history. CR revisions always need exact client approval before formal issue. Actual client submission/decision remains S14.
- R-038: exact approved-current formal issue creates an immutable transmittal with sender, named internal recipients, purpose, item/revision/checksum, time, client-gate snapshot and optional required acknowledgement. A named recipient acknowledges with actor/time/reason evidence; later reissue preserves earlier transmittals.
- C-003/C-009: issued drawing blob and transmittal retention anchors at the first effective Completed or Cancelled project transition for ten years. Later archive does not reset the clock. Metadata for notice, holds, backup expiry and deletion proof is present; purge is not implemented.
- Backend project assignment, branch, permission and exact S11 Confidential-file checks apply to reads, streams, appends, issue and acknowledgement. Responsive drawing register includes loading, empty, error, denial, current, superseded and issue-blocker states.

## Verification

- Node 24.19.0, pnpm 11.19.0; frozen-lockfile install and Prisma generation/validation were successful.
- Three additive S12 migrations brought a fresh UTC PostgreSQL 18 test database to 44/44 migrations; `db:migrate:status` reported current. A populated S11 upgrade clone preserved old-column digests and row counts for all 70 prior tables (661 prior rows, including two documents and blobs).
- The final `pnpm verify` exited 0 on an isolated UTC database with a prepared local NAS root: 128 API unit, 64 web unit, 132 API/PostgreSQL integration and 21 desktop/mobile Playwright tests, plus typecheck, lint and production build. `git diff --check` exited 0.
- Additional runtime-role S12 database acceptance tests passed after the full run: R0/R1/CR1 and downstream evidence journey, exact issue/acknowledgement/reissue and history, stale concurrent append, Completed and Cancelled clocks with non-resetting archive, unassigned/cross-project denial, immutable SQL guards, mismatched approval rejection, direct fabricated issue rejection and no partial audit/domain/outbox/transmittal on blocked issue.
- Isolated S12 desktop and mobile browser journeys passed against real uploaded file checksums, client-review selection, refresh, retained stream and responsive width. The full 21-test browser gate also passed.

## Review findings and limits

The tests caught and the implementation fixed a Prisma nested-create error in transmittal persistence, an API/UI minimum-purpose mismatch, and a missing base responsive stylesheet that allowed mobile form overlap. The Playwright web-server command now passes the requested Vite port correctly. Initial broad-test failures came from reusing a populated fixture database, a non-UTC test database and a missing local NAS root; a fresh UTC database and prepared mount passed the complete gate.

The private downstream evidence fixture in tests is not a production approval workflow. Production NAS validation, encrypted offsite backup and key custody, hosted CI, Compose recovery, legal/contract retention validation and production restore remain release gates; none is claimed here. Unrelated pre-existing passkey diagnostic files and Vite configuration work were preserved.

Model routing used gpt-6-sol for backend/schema/security design and review, gpt-6-luna for bounded UI/controller/browser/documentation work, and the coordinating GPT-6 agent for acceptance and defect fixes. The Owner’s 70% Luna / 30% Sol preference is a task-routing target, not measured token usage.
