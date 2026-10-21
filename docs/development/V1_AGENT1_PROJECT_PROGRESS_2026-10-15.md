# Agent 1 — task creation and Project Tasks/People

Date: 15 October 2026. Status: **IN PROGRESS** under the Owner's explicit Agent 1 goal. This agent owns D/G, then E, with H for its screens. Slice C and the other agent's People/Settings/notifications/navigation work remain separate. Scope/requirements and acceptance are recorded in IMPLEMENTATION_PLAN.md under V1-05B/V1-07A.

## Implemented source in this batch

- Project Tasks embeds the canonical TaskWorkspace rather than linking to a second page. The list uses the existing authorized `all` scope narrowed to the selected project; this does not expand backend access. Project context cannot be removed through the filter/composer. Ordinary creation defaults to PROJECT and uses the already implemented current participant read and owning create command. Held/completed/cancelled/archived context disables ordinary creation; backend commands remain authoritative if state changes after a read.
- Embedded task URL keys use `projectTask…` (including projectTaskId/Q/Sort/Offset). Project q/sort/offset/projectSection/projectId remain independent. Returning to Projects clears task-only state and restores project list context. The initial project page offset is now actually sent on the first list read. A task detail response outside the selected project is rejected rather than displayed.
- Project People groups the current lead/contributors and reuses existing reasoned/versioned appointment/assignment/removal commands. Those controls remain Owner-only under current APIs, even when a response includes broader management hints. This is project membership, distinct from the other agent's organization People tab.
- Selecting a project focuses its workspace and retains a Back to projects path. The directory/create panel remains available on return. Legacy non-list-first ProjectWorkspace callers retain their combined layout.
- Dirty task/create drafts and pending creates guard project tabs, directory/filter/context changes, browser Back, workspace links and refresh. Confirmed discard closes the owned form; declined leave keeps it. Project command reasons are shown only on relevant project-action sections, rather than beside task creation's separate reason.
- Confirmed ordinary/capacity-acknowledged list-first creation now opens its returned ID through one URL-driven load. The previous explicit second detail load could clear the first rendered result; regression coverage asserts one detail read. The synchronous pending-submit guard is retained. Durable backend idempotency remains separate work and is not claimed here.
- Scoped project CSS fixes inherited absolute-position task-row overlap, long lead/contributor text wrapping and compact-toolbar collisions. No global token, navigation, application router or authorization-evaluator files were changed by this batch. Dedicated synthetic HTML/TSX fixtures use mock reads and reject every write.

## Verification and defects encountered

Evidence directory: `.artifacts/v1/20261015-agent1-project/` (ignored). Before snapshots preserve the owned files as found; unrelated dirty work was not reset, staged or discarded.

- Initial sandbox test run passed four tests but could not load two suites because Vitest temporary modules disappeared (ENOENT). Host runs use the same mocked tests; no database is involved.
- First host run:19passed/3failed. Two new task-detail fixtures omitted required collaborators, causing render failure; fixture data was corrected. One older lead test still clicked the moved action in Overview; it now opens People before asserting the same command/version/reason. No assertions/timeouts were weakened.
- Next focused run:22passed. Added Back/directory/link/unload guard regressions; subsequent focused run:24passed. Typecheck identified unsupported `exact` options on Testing Library role queries; string role names already match exactly, so the invalid options were removed.
- First full frontend run:515passed/1failed. The failure exposed duplicate post-create reads and transient task detail clearing. The owning load path was corrected. A later full frontend run passed518/518 tests across52files. Final exact-source checks after the last presentation refinements are recorded below when finished.
- Browser capture initially found a390px People overflow. Wrapping only the contributor row was insufficient: computed geometry showed the lead paragraph still overflowing. Both are now contained. Visual inspection then found an inherited absolute-position queue button overlapping its people control despite no horizontal overflow. Scoped CSS and added per-row containment/non-overlap assertions corrected this.
- Latest synthetic browser run:32captures/8denied-write draft-preservation interactions at1440×900,1024×900,390×844,320×740 for Owner/Staff Tasks, detail, composer and People. All asserted no page overflow/page errors and no row overlap. Selected desktop Tasks, mobile People and narrow composer captures were visually inspected. This is internal layout/component evidence, not authenticated visual/demo acceptance or independent review.
- Web typecheck, scoped ESLint and web build passed during implementation; existing large-bundle/ineffective-dynamic-import warnings remain. Final affected/current-source checks follow below.

### Final source boundary

Final current-source full frontend run passed **518/518 tests across52files**, zero failed/pending (`web-current2.json`). Affected task/project tests passed **88/88**. Final web typecheck and scoped ESLint passed after the final test correction; web build passed for the unchanged production code. Scoped diff whitespace checks passed. Existing Vite large-bundle/import warnings and the synthetic fixture's classic-JSX warning remain.

The preceding final run passed517/failed1: the unchanged previous-task child-projection test tried to optionally resolve a deferred callback before its request effect installed it. It passed isolated. The test now explicitly waits for the resolver, resolves within React act, and retains every existing old-child absence/new-projection assertion. No timeout or assertion was weakened. The subsequent affected and full runs passed.

Source helper **586files**, hash `9489e4cfc65a4085541ab469c5b5eb117da7ea3a6d33763bcdc7f2ee42a38050`, **118migration directories**, matched before/after the final full run. `source-receipt.json` records owned-file hashes and actual gates. The browser32capture/8interaction run corresponds to source `5fa5f591d02793505768412258e29f01be25b89e11176b161d7ab2f46a1967e3`; replacing only the final synchronized test with its preserved before-copy reproduces that hash. Production/UI source therefore matches the inspected captures. This remains mocked layout evidence, not authenticated acceptance.

Temporary synthetic fixture listener59745 was stopped; host probe returned ECONNREFUSED. No retained/canonical listener was changed.

## Remaining work and acceptance boundary

D/G are not COMPLETE: durable create-outcome/idempotency design, remaining project creation/lifecycle/recovery refinements and real persistence/concurrency/current-resource/authenticated acceptance remain. Existing parent/subtask/review/cancellation invariants were not changed or operationally accepted by these mock tests. The non-project review workflow decision remains pending, and no new workflow was invented. Slice E contract/query/search work follows this bounded integration batch. Returned UI demos and final pilot readiness remain governed by the main V1 plan.

No migration, database lifecycle operation, retained-data write, canonical runtime restart, stopped MW-I02 acceptance retry, production deployment, commit or push occurred. Actual routing: current Codex agent only; no delegated/model-specific independent acceptance. Agent 1 goal remains ACTIVE. The next query work is bounded by `V1_AGENT1_QUERY_CONTRACT_2026-10-15.md`; that contract is design only, with no new query implementation yet.
