# Research, approved assets and reuse ledger

25 October 2026 · Research informs the proposal; external product features are not promised Sense functionality.

## Existing Sense work — precedence and reuse

| Existing asset | Evidence of status | Reuse / boundary |
|---|---|---|
| `docs/design/APPROVAL_2026-10-08.md` | Owner approved Foundation v0.1 direction | Cream/pine/gold, semantic tokens, evidence/action strip and state contracts; approval does not authorize every roadmap implementation |
| `docs/design/01-repository-ux-baseline.md` through `06-validation-and-approval.md` | Prior research/proposal set | Reuse vocabulary, component/state and journey contracts; update stale route/acceptance assumptions using current source |
| `docs/design/tokens.proposed.json` | Explicit proposal JSON | Compare against current computed styles; do not treat as a runtime import or accepted token migration |
| `demos/Sense_Studios_Codex_Dashboard_V10_Handoff/` | Owner selected V10; current status/deployment records | Primary dashboard composition, restrained palette, factual evidence, mobile bar; use existing `apps/web` implementation |
| `docs/development/SHARED_SHELL_STAGING_2026-10-24.md` | Accepted matched release 70b047cd | Reuse deployed global header/title/gutters, pine nav, responsive shell. Do not restart shell styling from scratch |
| `docs/ui/DASHBOARD_SHELL_APP_WIDE_2026-10-24.md` and shell consistency/marked-feedback reports | Frontend stages later incorporated into deployed shell | Reuse decisions and verification caveats; distinguish historical stage from final deployment |
| `docs/design/my-work-prototype/` and `my-work-review/` | Isolated synthetic artifact; historical acceptance boundary documented | Compare states and reusable layout; current My Work implementation and latest acceptance take precedence |
| `docs/design/my-work-integration-audit/` | Extensive mapping/needs-action/queue evidence | Reuse canonical source identities, filter/save/display contracts and action continuity; do not import unsupported prototype behavior |
| `docs/development/MY_WORK_MANAGEMENT_SCOPES_2026-10-23.md` | Accepted bounded management scope | Preserve existing All teams/Team/Employee drill-down; no need to invent a new team dashboard API |
| `docs/development/TASKS_CLARITY_COMPLETION_2026-10-23.md` | Accepted Tasks clarity release | Preserve recent row/action/filter improvements; density recommendations are a further proposal, not a claim those fixes failed |
| `docs/design/TASK_CREATION_AGENT_HANDOFF_2026-10-23.md`, task UI reference plans, `docs/v1-demo/task-creation-completed-demo.html` | Task demo/handoff assets with separate exact acceptance boundaries | Map any selected design to TaskCreateDialog/shared fields/creation-options. V15/current checkout changes are not automatically accepted/deployed |
| `docs/ui/UX_CAPABILITY_HOME_MAP_2026-10-07.md`, operation parity ledger/audits and `docs/ui/v1/` | Prior capability and prototype inventories | Reuse as parity checklists. Historical prototype visibility is not production permissions |
| `docs/ui/UX_UI_FLOW_IMPROVEMENT_PLAN_2026-10-17.md`, login reference/flow documents | Planning and research, including proposed client passwords | Reuse entry clarity/recovery states. Excluded client-password schema/API work is not adopted |
| `docs/development/TASK_REVIEW_ROUTING_COMPLETION_2026-10-23.md` | Owner-accepted additive task-review migration 120 | Preserve immutable requirements, mandatory evidence, independent approval, authorized delivery and exact Confirmed drawings |
| `docs/ui/UI_UX_REVIEW_2026-10-22.md` and `UX_22_IMPLEMENTATION_2026-10-22.md` | Findings followed by accepted bounded fixes | Avoid relisting fixed defects without reproducing them on deployed source |
| `docs/ui/master-plan/` and older low-fidelity app/demo files | Historical exploration | References only until current route/action/permission mapping and exact approval are established |

Do not promote an experimental preview, overwrite prior approvals or claim a historical screenshot is current. All proposals must be implemented within existing `apps/web` routes/components after review.

## Established product comparisons

Primary product documentation was checked in this session. Adaptations below are design inferences, not statements that Sense already has those capabilities.

| Product / source | Supported pattern | Sense adaptation | Explicit limit |
|---|---|---|---|
| [Linear Custom Views](https://linear.app/docs/custom-views), [Filters](https://linear.app/docs/filters) | Reusable views over issues/projects, filtering and view/detail access | Current Task views over canonical task IDs, concise row hierarchy and retained context | Do not promise cross-module query/search or import Linear's issue workflow |
| [Asana navigation](https://help.asana.com/s/article/navigating-asana?language=en_US) | Sidebar-oriented work/project navigation and creation entry | Distinguish My Work from Projects and cross-project queues; contextual create | No new portfolios/goals/AI features or Asana permission model |
| [monday.com workspaces](https://support.monday.com/hc/en-us/articles/360010785460-Getting-started-with-workspaces) | Grouped hierarchy and discoverable navigation of workspaces/content | Group existing Sense destinations to reduce initial choice burden | Sense organizational hierarchy remains Organization → Branch → Team → Employee; no new workspace entity |
| [Programa Client Dashboard](https://help.programa.com.au/en/articles/7040000-what-is-the-client-dashboard), [feature description](https://programa.design/features/client-dashboard-for-designers-and-architects) | Project information and shared documents/schedules in a client-facing home | Project-first portal, clear approved/shared evidence and progress | No new schedule/pricing-sharing API; existing grants, final signatures and private/public separation stay |

## Live Refero research

- Style query: `editorial cream architecture studio software restrained typography` returned architectural marketing/portfolio references. Full Studio Emmerer UUID `631b7cff-eb82-4962-9c72-e8fd2d3c1632` conflicts with its preview on light/dark treatment and prescribes a different marketing identity. **Rejected as primary operational style.** Do not silently average its black/white/photographic direction into Sense.
- Screen query: `Linear project issue list detail sidebar`. Useful task-list preview: [Linear task list](https://refero.design/pages/ab6ce0f5-7d32-4e4e-bdd4-d47a817c1d3e); metadata describes stable sidebar, filter toolbar, list and selection patterns.
- Screen query: `Asana my tasks project detail`. Useful [Asana list reference](https://refero.design/pages/710ba770-eda6-4228-b17a-b15830f973ec); descriptive metadata supports hierarchy/navigation comparison.
- Screen query: `Monday board workspace sidebar`. Useful [monday.com My Work reference](https://refero.design/pages/5937fb0f-9033-4584-846d-933d54d8239b); compare grouped work hierarchy, not its dark/blue palette.
- Search previews/full style were inspected as textual research. Raw competitor screen pixels and full multi-step competitor flows were not comprehensively evaluated in this session. Do not claim a complete competitor usability study.

Raw tool research is saved in `research-evidence.json`. Refero search can return off-brand results; references were selected by actual returned product identity. Primary product documentation supports the comparisons independently.

## ui-ux-pro-max use

The explicitly requested local skill was read. Its navigation UX search surfaced sticky navigation, keyboard navigation and a typography result; the heading result was not used as proof of progressive disclosure. A narrower `progressive disclosure forms` retry was run. The product-wide `enterprise project operations` query returned a marketing Hero + Features + CTA pattern and unrelated colors; it was rejected for this existing operational SaaS. The existing approved Sense system is the foundation.

The first Python alias failed; the bundled Python runtime executed the searches. Skills are guidance, not authority to change permissions, workflows or requirements. Accessibility/touch/focus/layout/error principles inform proposed acceptance; they are not a claim that every current control passed testing.

## Decision ledger

| Decision | Source | Scope / reason |
|---|---|---|
| Preserve warm shell and typography | Owner approval + deployed 70b047cd + current captures | Existing visual target; no new brand exploration needed |
| Project-centered operational context | Existing eight-section Project + live repeated selection + Programa project-home pattern | Reduce context rebuilding without new persistence |
| Task list/detail continuity | Existing canonical TaskWorkspace + Linear view pattern | Improve scanning and return navigation using existing objects |
| Distinguish personal work/project/management views | Live Owner empty personal queue + Asana navigation pattern | Scope clarity rather than a new permission model |
| Group navigation, retain specialist queues | Existing desktop/More + monday hierarchy pattern | Reduce exposed siblings; retain cross-project specialists |
| Keep five mobile destinations initially | Accepted V10/current deployed shell + missing non-Owner study | Avoid unsupported role-default choices |
| Separate setup from routine viewing | Live Project/Performance/Automation/Site forms + user goal | Progressive disclosure of existing actions, not removal of fields |
| Reject new content search / universal approval UI | Actual PageFinder scope + immutable domain contracts | No supported universal query or decision model |
| Exact evidence/action strip | Existing approved Foundation + review routing120 | Explain which record/version/actor/state without merging gates |
