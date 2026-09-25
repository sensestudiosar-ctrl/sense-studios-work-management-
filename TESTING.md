# Testing architecture — planned, no tests or tooling installed

Current repository contains only planning documentation and the approved requirements source. There are no application build, type-check, lint or test commands; no checks are claimed to pass.

## Planned layers and gates

| Layer | What it must prove |
| --- | --- |
| Unit | State transition tables, permission predicates, January–December Branch leave credit/proration/carry-forward/expiry calculations, revision numbering, role-group and Design/Turnkey scoring formulas, delay attribution, idempotency and validation. |
| Database/integration | Foreign keys, uniqueness, branch/project ownership, one active lead and task owner, immutable evidence within approved retention, policy expiry/hold constraints, transactions/outbox, concurrent timer/approval/revision writes, rollback and migration safety. Use isolated PostgreSQL fixtures. |
| API/authorization | Real server request tests for allowed/denied actions, ID tampering, cross-branch Owner-granted versus unassigned access, Owner-approved project transfer and Owner-only project cancellation, client PDF/image and vendor/consultant CAD isolation, external email-code login, passkey-only formal client approval, confidential file streaming, revocation and forced logout. |
| Storage/integration | NAS adapter against a temporary test share/fixture; file-specific native MinisCloud link issuance/cancellation/expiry evidence, retention expiry/Owner notice/legal-hold simulation, upload interruption, checksum, orphan reconciliation, no path traversal, no raw path disclosure; accounting/calendar retries and dedupe. |
| E2E | Critical real-user journeys in browser with persisted data and refresh. Cover desktop and mobile viewport, loading/empty/error states, permission changes, portal roles and downloads. |
| PWA/offline | IndexedDB local IDs, interrupted/replayed sync, conflict display, unsupported browser fallback, no duplicate site reports/photos. Test offline/online transitions in supported browsers. |
| Security/recovery | Dependency/secret scanning, upload validation, passkey enrollment/loss/recovery, email-code rate limit/expiry, session/CSRF behavior, encrypted offsite database-and-file backup/restore drill within the one-day loss target, audit tamper checks, startup/health and migration rehearsal. |

Use the cheapest reliable test layer. Meaningful defects should get a regression test after root cause is found. Tests must not be weakened to pass. Each implementation slice runs targeted tests plus proportional surrounding checks; release gates include type check, lint, production build and critical E2E. Verify actual commands when tooling is installed; do not invent command results.

## Critical E2E journeys

1. Owner creates branch, team, grants and employee; employee sees only assigned cross-branch work; revoked access fails after refresh and direct API retry.
2. Won lead converts to Design project with one Project Lead and template stages/tasks; scope change preserves baseline. Project Lead cancellation request cannot change state; Owner cancellation from Draft/Active/On Hold requires reason and retains evidence.
3. Employee self-task versus manager assignment, dependency warning, waiting reason, extension request, approved deadline reason/audit.
4. Design project: task submission → internal review → correction → new revision/round → client CR-series item review/partial approval with passkey-backed signature after internal R-series review → final issue/transmittal/handover; old revision remains traceable.
5. NAS upload/download permission: large chunked upload, forbidden direct path/ID, confidential view-only, superseded revision warning.
6. Time timer/manual entry/correction with reason, then accounting export retry without duplicate.
7. Branch-specific January–December leave credit, new-hire/transfer calendar-day proration, five-day carry-forward/expiry and leave approval reduce capacity and flag critical tasks; site attendance captures only on-duty evidence.
8. Turnkey project through BOQ/material/procurement coordination, factory/site progress, manpower, daily report, snag reopen/verify, handover.
9. Portal isolation for primary/additional client, consultant and vendor/factory; item-only delegated client approval, Primary Client final authority, client PDF/image restriction and Owner-controlled vendor/consultant native CAD share expiry/revocation.
10. Site PWA offline draft/photo/snag sync after reconnection, conflict surfaced, duplicate replay ignored.
11. Performance and project-health score changes show underlying evidence; external delay does not penalize employee; management-only rankings stay hidden from employees/portals.
12. Human rejects high-impact automation/AI suggestion; no underlying assignment/deadline/client communication changes.

## Test data and status

Fixtures must span at least two branches, two projects and multiple actor types, with distinct confidential files and a cross-branch assignment. Use deterministic clocks for reminders/time zones and explicit causal event IDs for notifications. No test runner exists yet, so all planned checks are NOT RUN. Future commands will be recorded in AGENTS.md and here after implementation approval.
