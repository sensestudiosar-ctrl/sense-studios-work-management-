# Independent Dashboard source reads

8 October 2026. Owner-authorized UX gap closure, G09. **API implemented; current-tree verification pending.** This is an additive read contract under R-073.a–e/R-074.a–b and the existing R-006/R-092/R-079/R-080/R-095 identity, scope and evidence rules. It does not change accepted source workflows or S24/S26 snapshot/run contracts.

## Contract

`GET /api/v1/dashboard/sources/:source` accepts exactly `tasks`, `decisions`, `health`, `performance`, `workload`, `site`, or `training`. Unknown selectors fail schema validation. Every request uses the existing internal cookie session, Owner-readiness gate, current account/employee/session checks and `Cache-Control: no-store`.

The response is `{source,today,readCompletedAt,sections}`. The decisions source additionally returns `{decisions:{items,nextCursor}}`; it retains typed approval evidence and existing command authority. Sections use the existing Dashboard row shape. Empty authorized sets return empty rows/sections, distinct from a failed request. Training may additionally state that one owning source is unavailable while returning factual evidence from other currently authorized sources.

`today` is the organization-local date used for that request. `readCompletedAt` is the server time after the selected authorized reads complete. It is a read timestamp, **not** a source modification timestamp, guaranteed freshness interval, historical evidence generation time or instruction to cache evidence after permission loss.

| Selector | Existing owning reads | Returned sections |
|---|---|---|
| tasks | TaskService.list across complete authorized pages | attention, today, priority, reviews, waiting |
| decisions | ApprovalService.attention across complete authorized pages | decisions envelope; no task/source authority inferred |
| health | PerformanceService.context/project | health, with permitted persisted snapshot provenance |
| performance | PerformanceService.context/employee | performance, with accepted employee/leader snapshot facts |
| workload | PerformanceService.context employee labels plus WorkforceService.list mine/managed | workload |
| site | SiteService.projects/detail | one project context section per authorized site project |
| training | SkillsService.setup/reportEvidence, TrainingService.reportEvidence, LibraryService.reportEvidence | factual training/improvement, with source-unavailable messages |

Each response is built in its own authorization transaction through `transactionalReadPorts`; the selected group executes only its listed dependencies. Source and field checks remain with owning services, and account/session authority is rechecked before returning. Unexpected failures abort that selected response. No authorization grant, manifest exception, business mutation, new policy, or synthetic recommendation is added.

The existing aggregate `GET /dashboard` retains its complete composition. Scheduled summaries, immutable report snapshots, fixed reports, saved report manifests and S26 runs retain their existing contracts; this route is for live Dashboard composition. Separate source requests do not represent one atomic cross-source snapshot and must not be combined into an official total or frozen evidence claim.

## Frontend handoff

Load the seven source groups independently. A group may show loading, an actual response, an empty authorized set, or its request failure while other groups remain usable. Clear that group's prior evidence when refresh starts or fails; older evidence must not stay visible after a denied request or access change. Use an explicit retry for each failed group. An actual `readCompletedAt` can be labeled “Read at”; do not label it “Source updated” or fabricate an age/stale threshold.

Keep attention/priority predicates exactly as the existing service supplies them. Fixture stale/partial selectors and “next recommended work” ranking are not source contracts. A promised source freshness policy or business recommendation still requires an approved freshness/ranking policy; honest independent loading/error behavior does not depend on that choice.

## Acceptance still required

### Frontend implementation update — 8 October 2026

`dashboard.tsx` now fans out the seven source requests on its own, renders each group's loading/empty/error/success state independently, and offers per-source retry. Starting a refresh or receiving an error clears only that source's previous rows; a per-source request sequence prevents an older response from replacing the latest retry result. Successful source reads show the actual `readCompletedAt` as “Read at.” Report/summary/reminder/schedule supporting-data loading and their APIs remain separate. The implementation is **IN PROGRESS / unverified**.

Focused controller/service coverage should verify selector validation, no-store/session/Owner-readiness, selected-source isolation when unrelated sources fail, unchanged aggregate sections, and current field/session/source revocation. Browser acceptance should show independent success/failure/loading/retry, clear denied evidence, and no invented freshness or ranking. Full current-tree typecheck/lint/build and applicable regression gates remain pending. No tests were run for this increment; `git diff --check` passed on the changed API files.

Actual routing: GPT-6.1 Sol audited accepted S24/S26 boundaries and implemented the selected-source contract. This does not extend earlier S18/S27 acceptance to these subsequent edits or claim actual-project/production acceptance.
