# 05 — Release gates, change policy and feature proposals

## Approved right now

- V15-RC1 is the visual/UX candidate. Implement in existing React component(s), connect to current API as documented, and retain one app version.
- Main assignee display name **Assign to**, ordered avatars, first person main where eligible, remaining eligible collaborators, no separate Collaborators section.
- Inline subtasks vs checklist, tags always available, dates/effort, selected-colour priority, inline review routing; clear post-create Files and Discussion.
- Existing create endpoint and reviewRequirement enum, authorized setup/creation-options, capacity/idempotency and subtask versioning.
- Current UI/backend business logic remains unchanged except approved appearance/interaction.

## Feature proposals needing separate backend assessment / explicit approval

### P1 — Named internal and client reviewer IDs

**UI intention:** After choosing Internal or Internal + Client, select actual reviewer(s) inline; show internal → client approval path.

**Current gap:** Source handoff does not document a named reviewer ID field in strict `POST /tasks` contract.

**Backend design work to scope separately:**
1. Current eligible reviewer read API and org/branch/project permission rules.
2. Explicit, typed create fields and validation for eligible internal reviewer and client primary/designated approver, with cross-role delegation rules.
3. Persistence, immutability, audit events, notification routing, review version and approval lineage.
4. Sequential internal-first/client-last delivery, retries, revoked access and escalations.
5. Unit/integration/e2e tests for unauthorized choices and data migration *only after approval*.

**Production policy until ready:** Keep actual `reviewRequirement` selector, disable/hide the named reviewer picker as unsupported; never claim a name was assigned. Owner chooses if/when to authorize backend change.

### P2 — Recurrence frequency/interval/weekday scheduling

**UI intention:** Selecting RECURRING reveals daily/weekly/monthly frequency, interval and weekdays inline.

**Current gap:** Existing known `type: RECURRING` does not document saving scheduling parameters on parent create.

**Backend work to scope separately:** schedule schema/contract, timezone, start/stop dates, DST behaviour, occurrence generation, reassignment/review inheritance rules, versioning, task cancellation/edit lifecycle, duplicate prevention, audit, and integration tests.

**Production policy until ready:** Do not persist an imaginary schedule. Gate settings, explain unsupported status and collect Owner decision. Existing RECURRING type must not be advertised as a fully configured recurring series unless backend supports it.

### P3 — Session draft persistence

The candidate uses browser `sessionStorage` with synthetic data. This is **not** authorization to store real tasks in browser storage. Reuse existing safe in-memory draft first. If retention is requested, approve account/organization isolation, storage expiration, session change purge, shared-device privacy and security treatment before enabling.

### P4 — Photos and workload hints

Avatar initials are sufficient. Profile photos should only use existing authorized media endpoint with permissions, fallback and caching policy. Workload/capacity badges should reflect real server data; never make up hours, availability or workloads. Capacity 409 and explicit acknowledgment must remain authoritative.

## Non-negotiable guardrails

- No new role privileges because a user is labeled Owner, Team Leader, Employee or Site in the UI. Server options are authoritative.
- No bypass of project closeout, internal review or client authorization; no new past-date prohibition.
- No additional create keys accepted by the frontend that server would reject.
- No direct DB writes, retained migrations/seeding, background server deployments or silent schema evolution.
- No duplicated UI or backend instance. Match deployed commit with expected staging branch and keep rollback strategy.

## Recommended acceptance order

1. Engineer implements approved visual and all *currently supported* real API workflows.
2. QA proves functional integration, version/branch correctness, and error recovery.
3. Product tests actual staff task creation, signs off appearance and flow.
4. Owner explicitly decides named reviewer and recurrence extension priorities.
5. After separate backend approval and rollout plans, activate those feature flags with real contracts.
6. Release owner explicitly authorizes canonical staging then production rollout; report commit and test evidence.

## Agent completion report format

```md
# Task creation implementation report
- Repository root:
- Working branch / commit:
- Running local app / commit verified:
- Canonical composer files changed:
- Existing backend/API files changed (if any, why and approval reference):
- UI entry points verified:
- Screenshot comparisons: [paths and outcome]
- API trace examples with secrets redacted:
- Real tests: [command, result, log]
- Role/authorization and partial failure cases:
- Named reviewer/frequency feature gates:
- Open release blockers:
- Rollback procedure:
- Suggested next action:
```
