# S07 Project ownership and scope

**Status:** COMPLETE for development/local staging on 2026-09-28. Owner authorized starting S07 on 2026-09-27. S08 and later remain unauthorized. See S07_COMPLETION_REPORT.md for verification.

## Approved requirements and slice boundary

- R-011.a: Design and Turnkey are delivery types; service scopes remain separate.
- R-012.a: A project may have multiple initial service scopes.
- R-012.b: Later scope awards use a formal approved Project Scope Change; the original baseline remains available.
- R-013.a: Every Active project has exactly one accountable Project Lead; other employees may contribute through assignment and grants.
- R-016.a: Draft → Active; Active ↔ On Hold with reasons; Active → Completed → Archived, subject to applicable gates and retained history.
- R-016.b/C-010.a: Only the Owner may make Draft/Active/On Hold → Cancelled after a reasoned request or Owner initiative. Effective cancellation stays unavailable until S09 can atomically stop unfinished tasks and dependent access rules are ready.
- C-002 Q2: Owning Branch changes only through a formal Owner-approved transfer with history and recalculated access.
- C-002 Q15: Only the Owner grants cross-branch employee project access.
- C-024.a: Active Project Lead exit holds the project and removes the former lead's authority in the atomic exit transaction; an eligible Owner-appointed replacement is required before resume. Full employee exit remains gated on S09's task handling under C-023.

Dependencies: S03 organization/authorization, S04 audit/events, S05 approvals, S06 Won lead provenance. The governing source is `requirements/APPROVED_REQUIREMENTS.md` and addenda C-001–C-024.

In scope: persisted branch-owned projects, delivery type and baseline scopes, accountable lead history, explicit project assignments, current-authority API, creation/read UI, reasoned lifecycle, formal scope changes, Owner branch transfer, cancellation request and fail-closed final cancellation contract, and C-024 project hold/replacement primitive. Out of scope: S08 templates/stages/milestones; S09 tasks and effective cancellation/exit; S11+ documents, external portals and native CAD links; client approvals and customer notifications.

The first bounded implementation unit is a pure project lifecycle evaluator. It performs no persistence, authorization, approval, audit or HTTP operation. The service must recheck current permissions and applicable gates inside the transaction before persisting a transition with history and canonical audit/outbox evidence.

## S07A first vertical increment

Owner-only Draft creation and read are the first persisted increment. `Project` stores one owning Branch, Design/Turnkey delivery type, optional shared Client, optional unique Won Lead, status/version, optional current lead and optional named scope-change approver. `ProjectScope` stores immutable baseline scope rows; `ProjectStatusChange` starts with Draft evidence. Direct projects may select a shared Client. Won conversions must use a Won lead in the owning Branch, inherit its Client, and retain the Won stage-change ID in API provenance. The reviewed migration enforces composite organization references, one project per Won lead, Draft initial state, at least one baseline scope, append-only baseline/status history, positive versions and fail-closed effective cancellation.

S07A exposes strict Owner-only setup, Branch-filtered list, detail and create endpoints with current session, CSRF/origin enforcement for writes, and atomic canonical audit/event/outbox writes. This is an intentional first increment, not S07 completion: staff project assignment, lifecycle persistence, formal scope-change approvals, branch transfer, lead assignment/replacement, cancellation requests and responsive project UI still belong to S07.

## Owner decisions — 2026-09-27

- A project may be created directly or from a Won lead. One Won lead may produce at most one project. A converted project retains the exact Won-stage provenance; direct projects have no invented lead linkage.
- Formal scope changes use a named active approver configured by the Owner for each project. No scope change takes effect while the policy is absent. The requester cannot approve their own request. The request and decision use S05's persisted approval engine, with current authority rechecked at decision time.

## Acceptance and test plan

The Owner further decided on 2026-09-28 that Branch transfer revokes every contributor whose home Branch differs from the destination until explicit Owner regrant; only the Owner may confirm Active → Completed before S08, with a delivery reason; and an unavailable named scope approver is replaced only after the Owner withdraws the pending request with a reason. The requester can submit again. Scope request history remains intact.

1. Migration applies to a fresh dedicated PostgreSQL database and upgrades an S06 database without changing existing account, lead, approval or audit records. Composite organization/branch references, one current lead for Active projects, version checks, and append-only evidence prevent ID tampering and silent overwrite.
2. Backend grants are deny-by-default and evaluated on the persisted project/owning Branch. Cross-branch assignment and transfer are Owner-only, audited and do not reveal unrelated Branch projects. Guessed IDs and stale versions are denied.
3. Scope changes preserve the original baseline and append approved revisions. Project Lead assignment/history and transfer history remain visible only to authorized actors.
4. Draft/Active/On Hold/Completed/Archived transitions obey the approved state machine. Effective cancellation and full employee exit remain fail-closed until their dependent atomic workflows are implemented.
5. API and UI cover loading, empty, denied, conflict/retry, persistence after refresh and responsive desktop/mobile behavior.
6. Run Prisma validation/generation/migration on dedicated databases, typecheck, lint, unit/API/database tests, production builds and desktop/mobile browser checks before marking S07 COMPLETE.
