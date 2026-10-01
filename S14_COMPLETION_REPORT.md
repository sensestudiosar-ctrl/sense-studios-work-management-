# S14 Client portal and exact approval — completion report

Status: COMPLETE for authorized development/local staging on 2026-10-01. The required full repository gate passed. Scope is authorized development/local staging; no production deployment is included.

## Owner decisions and delivered scope

The Owner authorized S14 on 2026-09-30 and settled all material choices: Owner alone appoints/replaces the Primary Client with a reason and audit history; independent CR files must receive their own exact internal review; correction assignment belongs to Owner, the current assigned Project Lead or an explicitly authorized Team Leader.

| Requirements | Implemented and verified behavior |
| --- | --- |
| R-024/S14.a, R-032.a–b | Persisted exact review packages/items; explicit review start; view, comment, normalized page annotations, private PDF/image references, request revision, approve/reject, partial outcomes and permission-controlled download. Previous submissions and decisions remain immutable. |
| R-033.a–d, C-002 Q5 | Owner-controlled Primary identity; Primary invitation of Additional Clients; separately versioned item view/comment/review/approve/download grants; invitations confer no implicit item access. Delegated item approval does not transfer final overall approval. |
| R-034.a–b, R-104 | Isolated CLIENT OTP/session/passkey identity; typed signature and consent with fresh exact-binding, one-use UV WebAuthn proof; account/item/revision/time/comments/IP/device evidence. Internal identity cannot substitute for a client decision. |
| R-031.a–c | Immutable audited Preference / New Requirement or Employee Work Error classification. Every CR requires classification before approval. No S23 performance formula or negative score for preference changes is introduced. |
| R-024/S14.a correction | Scoped normal correction tasks; completed correction precedes original task resume; later drawing work uses a new exact internal review and client submission. Retained older corrections cannot satisfy a newer request. |
| R-037/S14.a, R-039/S14.a | Item approval creates no CLIENT revision fact. Primary final approval checks all current exact items and creates immutable final batch plus canonical exact facts for S12 formal issue. Task completion remains blocked before final approval. |
| R-075/S14.a | Persisted Design checkpoint: internal R0 → client correction → completed correction → internal exact R1 → client item/final approval → named client transmittal → scoped handover/acknowledgement → delivery completion. |
| C-013–C-015 | Atomic pending-review withdrawal on cancellation and individual future client end times. Cancelled access exposes earlier issued scoped PDF/images and the client's own approval history; new decisions, comments, references, invitations and acknowledgements are denied. Expiry/revocation are checked on each request and after relevant lock/storage waits. |

Client routes use separate portal cookies, strict Origin/CSRF checks, no-store responses and backend project/item authorization. References use a private NAS adapter with signature, MIME, size and checksum checks; raw storage identifiers are absent from portal DTOs. Exact document streams enforce download grants and view-only flags. Ten-year approval retention derives from the earliest Completed/Cancelled project transition and cannot be changed afterward.

## Verification evidence

Pinned tools: Node 24.19.0, pnpm 11.19.0 and isolated PostgreSQL 18.6.

| Check | Result |
| --- | --- |
| Fresh migration deploy | All 69 migrations applied to dedicated fresh databases, including `sense_s13_s14_verify_20261001_accepted_test`. |
| Populated S13 upgrade | All 69 migrations applied; ordered old-column snapshots across 86 existing tables match exactly. SHA-256: `99F286FB72C154E6928F95647D2DD7AA5B0D446755A32CDD18D832A7AFC44B31`. |
| Prisma `db:validate`, `db:migrate:status` | Valid schema; all 69 migrations current. |
| Final `pnpm verify` | Exit 0. Typecheck, repository lint, production API/web/PWA builds, 154 API unit, 82 web unit, 170 integration and 27 serial desktop/mobile Playwright checks passed. |
| Optional integration cases | Six optional S12 cases skipped because `S12_DATABASE_URL` was not configured. S14 scope, identity, review, exact issue and handover suites ran against dedicated databases; no S14 acceptance test was skipped. |
| Focused scope regression | 14 PostgreSQL cases passed, including actual grant/item lock waits across absolute/idle session deadlines, revocation/ID tampering, delegated approval isolation, audit rollback, cancellation and changed exact task content. |
| Retention guard check | Dedicated PostgreSQL block confirmed closed final approvals match earliest closure + ten years and rejected an attempted retention mutation. |
| Real passkey browser | Desktop/mobile UV enrollment, exact item approval, Primary final approval, reload, client isolation/revocation and staff completion of the approved task passed. No external mail was sent; OTP fixtures were hash-controlled. |
| Design handover database checkpoint | Real PostgreSQL and private file persistence completed internal/correction/client/final/issue/ack/cancellation flow. This database scenario mocks the private proof verifier; separate browser coverage performs real cryptographic WebAuthn. |
| Visual verification | Desktop/mobile portal approval and staff screenshots inspected; wrapping, stacked controls and horizontal overflow checks passed. Final hover-label contrast fix passed repository lint, web production build and all four S14 desktop/mobile journeys; selected-label contrast is asserted at >= 4.5:1. |

Ignored local evidence logs: `.env.s14-tools/s14-accepted-migrate.log`, `s14-accepted-verify.log`, `s14-final-ui-lint.log`, `s14-final-ui-build.log`, `s14-final-ui-e2e.log`; final browser screenshots are under `test-results`. Controlled test connection files remain untracked.

## Defects found and resolved

Real WebAuthn exposed an incorrect SQL credential column name in the private verifier; it now locks `credentialId`. Staff review listing now covers all authorized branches and pagination. Correction UI now unwraps the task DTO, uses ordinary task transitions for the correction and the original task version for resume. Staff project selection ignores stale asynchronous responses and hides actions until matching details load. Final task completion is exposed only after Primary batch approval and uses the guarded consumer.

Sol security review reproduced session expiry during grant/item waits. Post-wait session/scope checks were added to affected consumers, and actual-lock PostgreSQL regressions passed. The final read-only review found no remaining S14 blocker. Decision consumers retain IN_REVIEW as their precondition; a proposed Pending-state relaxation was rejected by automatic approval review and was not applied.

Repository lint initially failed on the separately developed UI mockup's extracted JavaScript context and two equivalent literal-space regexes. Scoped ESLint bindings now represent the enclosing HTML IIFE, preserving `no-undef` and `no-unused-vars`; regex quantifiers preserve behavior. Concurrent UI design work was preserved. One existing session-refresh unit test failed intermittently on an intermediate run, then passed on rerun and in the final full gate. Windows database-fixture/server warnings and a web bundle-size advisory did not fail the gates.

## Model routing, boundaries and cleanup

GPT-6.1 Sol handled schema/migration design, permission and exact-evidence reasoning, concurrency/security review and final acceptance review. GPT-6 Luna handled bounded identity/review/UI/testing and documentation work under settled contracts. These are the models actually configured for delegated work; no measured 70/30 allocation or model switch is claimed.

S15 publication/gallery management, S21 consultant/vendor portals and S23 scoring remain unauthorized. Production NAS/ingress, mail deliverability, encrypted offsite backup/key custody and production restore remain deployment gates. Hosted CI/Compose were not rerun for S14. No commit, push, merge or deployment was performed. Temporary acceptance services are stopped after final checks; databases and fixture data are retained.