# S14 Client portal and exact approval — progress history

## Current status — COMPLETE, 2026-10-01

S14 is COMPLETE for authorized development/local staging. All three Owner decisions are implemented. Final `pnpm verify` exited 0 with typecheck/lint/build, 154 API unit, 82 web unit, 170 integration and 27 desktop/mobile browser cases; six optional S12 cases were skipped. All 69 migrations passed fresh and populated S13 upgrade preservation. Final visual refinement passed lint, web build and four S14 browser cases. Sol 6.1 reviewed high-risk decisions/security; Luna 6 handled bounded implementation/testing/docs. See S14_COMPLETION_REPORT.md for the acceptance record and production limits.

## Historical checkpoints — superseded by current completion
## Continuation verification — 2026-10-01

All three Owner choices are settled. Review/access/files/handover/cancellation implementation is present through 69 migrations, with exact task/revision locks, immutable evidence, current actor/item authority, post-wait expiry and latest-correction checks. Scoped Additional approval is verified after an authorized review start; final approval remains Primary-only. A proposal to broaden Pending decisions was rejected by automatic approval review and was not applied; the consumer retains IN_REVIEW as its decision precondition.

Current checks: application/package/script/test lint and repository typecheck passed; 154 API unit and 79 web unit tests passed. Dedicated S14 PostgreSQL scope/review suites passed 11 cases, with the separate identity suite previously passing 10. Desktop/mobile real WebAuthn item/final approval, reload and revocation passed. Production builds passed. Fresh 69-migration deployment and retained populated S13 upgrade preserve the prior 86-table digest `99F286FB72C154E6928F95647D2DD7AA5B0D446755A32CDD18D832A7AFC44B31`. Whole-slice acceptance remains underway, including staff browser, final regression and scope/documentation review; separate docs/ui/v1 mockup lint defects remain outside the S14 source changes. Later slices remain unauthorized.

Status: IN PROGRESS. Owner authorization received on 2026-09-30. The client identity and Owner-managed access foundation is implemented and verified. Client review/decision flows, cancellation integration, formal external issue, and whole-S14 acceptance remain in progress.

## Prepared

- Read the approved source sections R-031–R-034, R-075–R-076, and R-104, along with C-002 Q5/Q7, C-008, and C-013–C-015.
- Expanded S14 requirements into sub-IDs in S14_SPEC.md, aligned with the existing plan mapping and current trace status.
- Recorded dependencies on S05, S09, S11–S13, the slice boundaries, acceptance gates, and a proportional verification plan.
- Recorded the settled Primary Client appointment/replacement policy, the remaining correction-assignment decision, and separate design proposals.
- Implemented portal identity, isolated client sessions, client passkey enrollment, Owner-only Primary Client management, and reasoned/versioned grant expiry and revocation with immutable evidence.
- Verified fresh and S13-upgrade migration paths, the portal database/API acceptance, controller HTTP security contract, UI tests, and targeted quality checks; evidence is recorded below.

## Settled Owner decisions

Only the Owner may appoint or replace the project's Primary Client; each action requires a reason and audit record. The Primary Client retains final overall client approval; any additional-client approval delegation is limited to specified items under C-002 Q5.

Client-review revisions (CR) may be independent files and must pass their own internal review before client approval. Current implementation extends exact-file review to CR; three review-database tests passed for independent-file identity, hashes and client-review gate binding. Client decision and full-slice acceptance remain pending.

## Open Owner decisions

1. Whether a correction resulting from a client-review revision (CR) may be assigned only by the Owner or also by the Project Lead / explicitly granted Team Leader.

Other recorded details—one review item per exact drawing/task submission, reuse of S13 annotation conventions, typed signature consent with passkey proof and bounded IP/user-agent evidence, and private PDF/image reference blobs—remain proposals for design review, not requirements. Routine details can be resolved within the approved requirements and architecture; obtain Owner input for any unresolved material workflow, ownership, access, or approval-evidence choice.

## Next work and limits

Resolve the open correction-assignment decision before implementing that flow. Remaining work includes additional-client invitation/item grants, client review and decisions, cancellation withdrawals and retained-read-only access, exact S12 issue integration, and the Design-project journey through handover. Keep S15 galleries/publication, S21 consultant/vendor portals, S23 scoring, and production gates outside S14.

## Verification evidence and limits

- The complete 59-migration chain deployed fresh and to the populated S13 baseline on isolated PostgreSQL 18.6. `db:validate` and `db:migrate:status` passed. The old-column snapshot helper found exact matches across all 86 tables (SHA-256 `99F286FB72C154E6928F95647D2DD7AA5B0D446755A32CDD18D832A7AFC44B31`).
- Ten identity/access PostgreSQL tests passed. A separate three-test review-database suite passed for independent CR file identity, hashes and client-review gate binding. Sixteen portal identity unit tests, eight controller HTTP tests and five focused UI tests passed within broader runs.
- Final pinned Node 24.19.0 / pnpm 11.19.0 `pnpm verify` exited 0: 154 API unit, 74 web unit, 152 API integration and 25 serial Playwright tests passed, along with typecheck, lint and production builds. Six optional S12 integration cases were skipped because the optional database was not configured.
- Desktop and mobile portal authentication journeys passed, including virtual-authenticator UV passkey enrollment, session isolation, reload and revocation. Reviewed desktop/mobile signed-in screenshots showed readable wrapped email, stacked mobile controls and no overflow. No real external email delivery was configured; OTP tests used hash-controlled fixtures.
- Earlier runs exposed harness issues: a reused database retained an Organization singleton, a web test had one temporary expected-label mismatch, a mobile fixture attempted to create a duplicate Owner, and two parallel task refreshes selected a different newest task after switching back to Owner. The label and fixture issues were corrected; task assertions remained unchanged. Serial browser execution passed.
- Sol 6.1 security review found no blocking issue in the identity/access foundation. The private step-up helper is not a public or completed approval flow; exact-grant locking and commit-failure handling must be reviewed with future approval consumers.
- After verification, the temporary PostgreSQL test services and API/Vite test servers were stopped; test databases and data were retained. No production deployment was performed.
- A database trigger defect that accessed `NEW.sessionId` on tables without that field was reproduced and fixed in migration `20261001040000_s14_portal_identity_guard_fix`. PostgreSQL adapter timestamp reads were also corrected to UTC after a 5.5-hour offset was reproduced on the Asia/Calcutta host; the exact-expiry check passed.

The whole S14 slice remains IN PROGRESS. Client invitations/item grants, client review and approval, cancellation/read-stream integration and Design handover remain unimplemented. The only unresolved Owner decision is who may assign a correction resulting from CR. Production mail/CI/NAS gates remain outside this local verification.
