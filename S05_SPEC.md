# S05 Shared approvals and decision queue

**Status:** Owner authorized S05 on 2026-09-27. COMPLETE for development/local staging; see S05_COMPLETION_REPORT.md.

## Requirement slice

- **R-096.a Request:** retain request identity, type, requester, approver/level, status, reason, comment, evidence, expiration and delegation details.
- **R-096.b Decision policy:** each registered type owns approver and transition rules; prevent self-approval or bypass where policy forbids it and retain immutable decision/audit evidence.
- **R-097.a Shared queue:** one permission-filtered view of pending management actions across registered types.
- **R-097.b Resolution:** each pending item appears once and resolves once.

## Scope and dependencies

**In scope:** reusable persisted requests and immutable decisions; internal typed handler contract for request/decision policy; expiry/delegation checks; atomic decision + handler callback + audit + outbox; one paginated `Needs Your Attention` read model and responsive Owner/Team Lead view with loading, empty, error and denied states.

**Out of scope:** leave, deadline, skill, deletion, scope-change, client-review, procurement, reassignment and automation business workflows. Their owning slices register typed handlers later. No project/task/client business state transitions are enabled by S05.

**Dependencies:** S03 ORG/ACC and S04 AUD/EVT/NTF (complete for development/local staging). Use existing session, authorization, audit and transactional outbox services. The decision queue is a projection, never a second source of business truth.

## Sol design

- No public generic request-creation or decision endpoint. Owning modules create and decide through an internal service and a server-registered handler; the client cannot choose a type, approver, level, permission, or callback.
- A handler owns approver resolution, permitted viewers/deciders, self-decision policy, evidence/comment requirements, expiry behavior, delegation eligibility and the owning-domain command. A handler callback uses the shared transaction so approval evidence, domain mutation, audit and outbox commit or roll back together.
- The queue is read-only. It returns only pending requests that the current account may view under current authorization and handler policy. Owner/Team Lead visibility is policy- and scope-checked; job title alone grants nothing. An empty queue is valid until later slices register producers.
- The service locks and rechecks a request before deciding, enforces current handler eligibility and expiration, writes one immutable decision, and rejects duplicate resolution. Delegation is explicit, scoped to one request, expiring and audited; it cannot widen business access.
- Persist safe typed identifiers, reason/comment and bounded evidence metadata. Never store secrets, NAS paths, unrestricted file content or client-supplied executable policy in queue payloads.

### Persistence/API contract

- `ApprovalRequest` is the current pending/resolved projection: organization, stable type key, source type/id and generation (for source-level dedupe), requester, assigned approver and approval level, state (`PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`), required reason, bounded display/context JSON, requested/expiry/resolution timestamps and current one-request delegation fields. Index by organization/state/creation and approver/state/creation. Dedupe by organization + type + source key.
- `ApprovalDecision` is append-only evidence with a unique request ID, outcome (`APPROVED` or `REJECTED`), decider, reason/comment, bounded evidence metadata and decision time. Do not overwrite decision rows; one unique decision per request prevents double resolution. Withdrawals are owning-module actions and use the audit trail without manufacturing an approval decision.
- `GET /api/v1/approvals/attention?cursor=&limit=` is the only S05 public route. It returns a paginated list of currently pending, non-expired items visible under a registered type policy. No generic POST/PATCH routes are added. Internal service methods create, delegate, withdraw and decide under an owning module's transaction.
- Queue cards use a safe type-policy projection (title, short summary, subject label, reason, requester label, level and due time), not arbitrary JSON rendered as HTML. No handler registered means no actionable row.
- Every S05 lifecycle change writes a canonical audit event plus a safe domain event and the existing outbox record in the same transaction. Queue reads never create/resolve a request and repeated reads do not duplicate cards.

## Acceptance and verification plan

- Fresh migration succeeds and existing S01–S04 rows remain intact; constraints bind request, requester, approver and decision to the same organization and prevent invalid resolution states.
- Unit checks cover handler-specific approver/level rules, self-approval denial where configured, expiry, delegation bounds, denied bypass and single resolution.
- PostgreSQL integration checks prove concurrent decisions resolve once and handler failure rolls back the decision, domain mutation, audit and outbox.
- API checks cover eligible and ineligible approvers/viewers, unauthorized Team Leaders, guessed/cross-organization IDs, stale/revoked access and server-side queue filtering.
- UI checks cover loading/empty/error/denied states, no duplicate pending item, detail presentation, and mobile/responsive behavior.
- Acceptance passed on a fresh PostgreSQL database: migration chain, targeted and full local unit/integration suites, typecheck, lint, production builds, and desktop/mobile browser checks. Exact evidence and execution limitations are in S05_COMPLETION_REPORT.md.

## Delivery split

- **Sol:** architecture, requirement interpretation, UI, documentation and final acceptance review.
- **Luna:** implemented migration/schema, internal service, typed handler boundary, queue API and audit/outbox wiring, limited to this spec. Sol reviewed and completed acceptance.
