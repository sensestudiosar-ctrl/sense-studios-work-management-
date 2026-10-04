# S20 settled staff API/UI handoff — 2026-10-03

Implementation started after combined S16/S17/S19 dependency acceptance. The routes and service below are implemented in `apps/api/src/site.controller.ts` and `apps/api/src/site.service.ts`; this file remains the settled API reference. S20 is COMPLETE for development/local staging: full `pnpm verify`, focused API tests, desktop/mobile journeys, retained-data preservation, and Sol source/security/visual review passed. Actual-project R-105 and production gates remain separate. Approved IDs and Owner decisions: S20_SPEC.md. No S18/S21+ scope is included.

Base `/api/v1/site`; staff route `/site`. Internal session authentication, no-store reads, same-origin CSRF writes, strict input validation, reason 3–1000 characters. Mutation input `expectedVersion` is the current project site workspace version (0 when absent), serialized under a workspace/project lock. Every successful mutation advances that workspace version. Refresh detail after success or HTTP409; do not silently replay stale edits.

## Access and actors

Current explicit project assignment/cross-branch authority plus `project.view` and `site.view` are required for staff. Site operators additionally need `site.work` to record operational evidence. Owner or current assigned Project Lead may manage; other Team Leaders need `site.manage`, `project.manage`, `employee.manage` and current project access. Titles alone grant nothing. Responsible-person appointment never grants access. Only the named responsible person confirms daily reports, retaining current progress snapshots as validation evidence without a new per-package approval workflow. The current named snag verifier gets only that snag action and must retain ordinary project/site access; no broad verification grant or closure authority follows appointment. Every delivery mutation requires Active Turnkey state and rechecks current identity/session/grants after lock waits.

## Read contract

`GET /projects` → `{items:[{id,title,status,branchName}]}` for currently accessible Turnkey projects.

`GET /projects/:id` →

- `project:{id,title,status}`, `version:number`, `today:YYYY-MM-DD`, `tomorrow:YYYY-MM-DD` using organization timezone.
- `responsible:{accountId,label}|null`, `people:[{accountId,label,canWork}]` filtered to active people who already have current site/project access; management selection never grants membership.
- `capabilities:{manage,work,confirm,handover}` after current backend checks. These only guide presentation.
- `packages:[{id,version,state:"OPEN"|"COMPLETED",data:{title,date,tomorrowPlan,plannedPercent,actualPercent,plannedQuantity,actualQuantity,unit,qualityStatus:"PENDING"|"PASSED"|"FAILED",materialStatus,blockers,critical:boolean,releaseId?:string,photoEvidence:[]}}]`.
- `manpower:[{id,version,state:"RECORDED",data:{date,trade,count,employeeAccountIds:[],note}}]`.
- `reports:[{id,version,state:"DRAFT"|"CONFIRMED",data:{date,workCompleted,manpower:[{trade,count}],materialsReceived,photoEvidence:[],issues,delayCauses,tomorrowPlan,supersedesReportId?:string,confirmedBy?:string,confirmedAt?:string}}]`.
- `snags:[{id,version,state:"OPEN"|"ASSIGNED"|"IN_PROGRESS"|"READY_FOR_VERIFICATION"|"VERIFIED"|"CLOSED",data:{title,description,packageId?:string,fixerAccountId?:string,verifierAccountId?:string,repairGeneration:number,repairNote?:string,photoEvidence:[],latestVerificationId?:string,closedBy?:string,closedAt?:string},capabilities:{assign,start,ready,appointVerifier,verify,close},attempts:[{id,outcome:"PASSED"|"FAILED",repairGeneration,fixerAccountId,verifierAccountId,note,photoEvidence:[],occurredAt}],history:[]}]`.
- `handovers:[{id,data:{note,decidedBy,decidedAt,packages:[{id,version}],snags:[{id,version,verificationId}],reportIds:[]}}]` and retained chronological `history` with eventName/actorId/reason/time, exact before/after versions and safe labels.
- `materials:[{releaseId,state,lines,materials,procurementStatus,factoryStatus}]` from a new nonfinancial Turnkey public service port; no prices/currency/cost approval reasons/bindings.
- `workforce:{attendance:[{accountId,label,state:"OPEN"|"CLOSED",mode:"SITE"|"OFFICE"|"REMOTE",provisional:boolean}],count:number}` from a narrow public project/date Workforce port. Include only active assigned staff with current project/site scope and relevant attendance; no leave, health, precise location, QR, selfies, capacity policies or unrelated employee data. Daily manual trade counts remain distinct operational evidence, not an attendance replacement.

Photo evidence is `{documentId,blobId,sha256,name,mimeType}` for currently authorized immutable DOC files. Inaccessible references retain safe hidden-evidence indication but no file identity/name/hash/stream capability. Use existing authorized document streams; never raw NAS paths/URLs. New evidence selections must be scoped and reauthorized in backend.

The implemented detail serializer converts database `Date` values to ISO-8601 strings and rechecks each evidence reference through the current DocumentService file/folder grant boundary, including Confidential ancestry. Evidence selection and reveal serialize against concurrent revocation by locking the relevant file/folder and grant rows inside the site transaction. Site progress completion/status and factual quality are separate: managers explicitly complete packages, and later operator progress may still record actual percentage/quantity, quality, materials and blockers without rewriting the completion decision.

## Commands

Every command includes `expectedVersion,reason`; dates must be valid calendar dates. Decimal percentages/quantities are explicit strings, bounded in backend (percent 0–100; quantity nonnegative, at most twelve integer/four fractional digits). Planned/actual percentages and quantities are independently reported facts; no automatic conversion/financial calculation is introduced.

- `POST /projects/:id/responsible`: `{accountId,...common}`; management appoints/replaces one eligible current person with reason/history.
- `POST /projects/:id/packages`: `{title,date,tomorrowPlan,plannedPercent,plannedQuantity,unit,critical,releaseId?:uuid,...common}`; management. Optional exact released S19 input association is immutable; no new factory-completion prerequisite. Direct site work need not bind factory production.
- `POST /packages/:id/progress`: `{actualPercent,actualQuantity,qualityStatus,materialStatus,blockers,tomorrowPlan,photoIds:uuid[],...common}`; operator. Prior progress remains in history.
- `POST /packages/:id/complete`: common; management makes explicit package-completion decision. Completion is not inferred from a percentage. Handover separately requires quality PASSED.
- `POST /projects/:id/manpower`: `{date,trade,count,employeeAccountIds:uuid[],note,...common}`; operator. Names optional; named staff must already have project access. Counts/trades remain factual site evidence without payroll/capacity calculation.
- `POST /projects/:id/reports`: `{date,workCompleted,manpower:[{trade,count}],materialsReceived,photoIds:uuid[],issues,delayCauses,tomorrowPlan,supersedesReportId?:uuid,...common}`; operator creates a complete new draft. Superseding a confirmed report creates a new record; it never rewrites the prior confirmed snapshot.
- `POST /reports/:id/confirm`: common; current named responsible only. Confirmed body is immutable and retains confirmer/time plus exact current package-progress snapshots.
- `POST /projects/:id/snags`: `{title,description,packageId?:uuid,photoIds:uuid[],...common}`; operator creates OPEN snag.
- `POST /snags/:id/assign`: `{fixerAccountId,...common}`; management, OPEN→ASSIGNED. Reassignment before Ready retains old fixer/history and requires a reason; it cannot erase repair/check evidence. Named eligible fixer must differ from appointed verifier.
- `POST /snags/:id/start`: common; current named fixer only, ASSIGNED→IN_PROGRESS.
- `POST /snags/:id/ready`: `{note,photoIds:uuid[],...common}`; current fixer only, IN_PROGRESS→READY_FOR_VERIFICATION, records actual fixer and advances repair generation.
- `POST /snags/:id/verifier`: `{verifierAccountId,...common}`; management names/reassigns a current eligible verifier, distinct from fixer. No changes after VERIFIED/CLOSED; prior appointment history remains.
- `POST /snags/:id/verify`: `{outcome:"PASSED"|"FAILED",note,photoIds:uuid[],...common}`; only current named verifier, different from actual fixer, for current READY repair. Immutable attempt binds exact fixer/verifier/repair generation. Pass→VERIFIED; fail→same snag IN_PROGRESS.
- `POST /snags/:id/close`: common; separate management command only when current latest attempt passed for the exact current repair/verifier. Retains closer/time/verification reference; verifier-only closure is denied. A manager holding verifier authority may separately close.
- `POST /projects/:id/handover`: `{note,...common}`; management. Requires at least one current package, all packages COMPLETED with quality PASSED and all snags CLOSED. Daily reports remain retained context, not an extra handover gate. Retains exact gate snapshots. Does not grant client acceptance or change project completion automatically.

## Persistence/security handoff

Implemented additive models are `SiteWorkspace` (one/project, responsible person and aggregate version), `SiteRecord` (scoped PACKAGE/MANPOWER/REPORT/SNAG/HANDOVER head), `SiteHistory` (append-only exact snapshots tied to canonical event), and `SiteVerificationAttempt` (append-only exact repair/outcome/person/evidence). There is no online command-replay receipt. Composite project/organization references, version guards, immutable identity, allowed states, current passed verification binding, fixer/verifier inequality and canonical audit/outbox evidence are enforced by the migration chain. The final history insertion constraint validates scoped subject/version identity, exact snapshot, event actor/subject/name, matching audit evidence and `NTF` outbox delivery; canonical audit `after` may contain the exact snapshot or its SHA-256 with project/version. Migrations are `20261005000000_s20_site`, `20261005010000_s20_evidence_and_quality`, and `20261005020000_s20_canonical_history`; applied definitions were not rewritten.

## Bounded Luna UI/testing scope

Keep existing app routes intact; add site navigation/workspace with project selection, today's work/tomorrow plan, manpower/attendance distinction, progress/quality/material/blocker/critical cards, report draft and confirmation, named snag actions with retained attempts, and explicit handover evidence. Semantic labels/alerts/status, CSRF, stale-project-fetch epoch, no-store reads, expectedVersion, refresh after mutation, actionable403/409, loading/empty states, mobile no overflow. Do not treat capability visibility as authorization. Tests cover all R068/R069/R070/C020/C021 clauses and persistence/refresh/permission/conflict/privacy across desktop/mobile. Escalate contract/business ambiguity to Sol.
