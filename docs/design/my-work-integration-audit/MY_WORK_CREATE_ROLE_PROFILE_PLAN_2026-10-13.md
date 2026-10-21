# Create task role profile and demo parity — plan, 13 October 2026

Owner selected **Prepare backend role-profile plan first**. This document proposes a bounded implementation; it authorizes no backend/schema/data operation. No application code, tests, live requests or database operations were performed. Context/schema/permission interpretation used GPT-6.1 Sol.

Reference: supplied Sense_Studios_My_Work_Final_Demo.html, SHA256 F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8; openCreateTask, profiles and refineTaskForm. Requirements: R-018–R-024, R-006/R-079/R-080/R-092, R-027–R-029 and C-023/C-024. MW-I02 remains IN PROGRESS; no MW-I03.

## Source finding

Current Account session exposes OWNER/STAFF only. Task setup returns actorEmployeeId, authorized projects/planItems/employees and canAssign. Employee has no Site/Designer/Leader classification. JobRole has configurable name/description/active plus permissions; EmployeeJobRoleAssignment links organization-scoped employee/role with effective dates. There is no stable machine-readable creation persona.

Site access is project-specific permission plus explicit assignment in site.service.ts:87–111. Workforce SITE records and attendance mode identify a configured location/attendance event, not a permanent employee persona. Reporting-tree membership, project leadership, site-responsible appointments and task.assign capability similarly do not define a universal job category. Therefore none is a sound Site Employee detector. Role labels, emails and retained fixture IDs must not be interpreted as categories.

## Recommended explicit source of presentation identity

Propose an optional **creationPresentation** classification on configurable JobRole: EMPLOYEE, LEADER or SITE; null means unclassified. Owner account remains OWNER from canonical account kind. This classification is an Owner-configured presentation hint, never an authorization grant or new organizational tier/membership rule. Existing role membership remains unchanged.

This recommendation requires one reviewed additive nullable schema field and Owner-only, reasoned/audited role configuration through the existing organization workflow. No automatic role-name mapping or backfill; existing roles remain null. A migration number must be selected from the actual migration tip when authorized, rather than assuming a number now. Existing 115 migrations and retained data remain untouched during planning.

Alternative requiring a decision: a dedicated employee presentation preference would add another source of identity and configuration workflow. Do not introduce that alternative silently. The role classification above reuses existing assignments while avoiding title inference.

## Additive setup contract

Extend GET /api/v1/tasks/setup with:

```ts
creationProfile: {
  version: 1;
  variant: "OWNER" | "EMPLOYEE" | "LEADER" | "SITE";
  resolution: "ACCOUNT_KIND" | "CONFIGURED_ROLE" | "GENERIC_FALLBACK" | "AMBIGUOUS";
}
```

All existing response fields and canAssign semantics remain unchanged. Return only the signed-in actor's hint; do not return other employees' roles, permission grants or classification lists. Reuse activeActor, organization isolation and the exact canonical active-role-assignment selection used by authorization.service.ts (currently effectiveTo:null and active JobRole); do not invent different effectiveFrom treatment in this feature. Any correction of temporal membership semantics is separate scope.

Resolve OWNER by account kind. For active STAFF, collect distinct non-null classifications from their current canonical role assignments. One distinct classification selects that variant. Zero selects EMPLOYEE/GENERIC_FALLBACK. Conflicting classifications select EMPLOYEE/AMBIGUOUS. Multiple roles sharing the same classification are unambiguous. Suspended/exited/nonmember identities retain existing denial. Never prioritize Site over Leader or infer a variant from canAssign.

This conservative conflict policy is proposed for explicit Owner confirmation. No precedence is settled merely by this plan. Unrecognized/missing profile in older servers falls back to generic Employee presentation; known Owner account can retain Owner presentation. Invalid profile never enables fields or operations.

## Frontend contract and canonical creation mapping

TaskWorkspace receives the typed hint from setup; an extracted create modal receives variant, resolution, existing canAssign/actorEmployeeId, authorized setup options and existing form handlers. Owner/Leader sections begin expanded; Employee/Site begin compact. Native modal, backdrop/Escape/dirty confirmation, fixed footer and progressive sections follow the demo. Continue reveals required fields before submit; hidden required inputs must not cause inaccessible validation. Errors and overload acknowledgements stay inside the active modal.

| Variant | Demo presentation | Canonical constraints |
| --- | --- | --- |
| OWNER | Create or delegate task; expanded assignment | Existing eligible owner selection; Owner without employee cannot self-create. |
| EMPLOYEE | Create my work; compact optional planning | Existing self-owner rules; show assignment controls only with canAssign. Do not promise private visibility. |
| LEADER | Assign and review work; expanded planning | Hint alone grants nothing. Without canAssign, use self-task controls and truthful explanatory copy. No reviewer appointment at creation. |
| SITE | Create site work; compact planning | SITE task requires authorized project. Photos/snags/reports are separate workflows, not new task enums or automatic submissions. |

Preserve title/type/priority/Target/project/plan item/description/tags/checklist/start/estimated hours, permitted collaborators/owner and required reason. Keep exact POST /api/v1/tasks payload, CSRF, server validation and capacity-warning protocol. Target is not renamed to a universal due/committed date. Four canonical priorities and current TaskType enums remain authoritative.

Presets may suggest ordinary title/description and an existing valid type after explicit selection. Do not map Drawing/Review/Approval/Site snag to invented enums or generate reviews/decisions/site records. Reviewer selection, create-time attachments/reminders/private visibility/recording/dependencies/subtasks lack this create contract and remain disclosed gaps. Review evidence and decisions continue through their existing authorized workflows. New subtask decisions in MY_WORK_ACTIONABLE_QUEUE_GAP_REPORT_2026-10-13.md remain separate implementation scope.

Owner My Work creation entry point stays unchanged: an Owner without employee is directed to Tasks. This plan does not approve replacing that policy or bypassing creation eligibility. Existing Tasks/legacy callers must remain compatible; apply modal presentation only to separately approved callers.

## Proposed files and phases

1. Owner decides role classification storage/configuration authority, conflict fallback and exact implementation scope. Record decisions before code.
2. Backend: apps/api/prisma/schema.prisma and one additive migration; organization.controller.ts/service.ts and existing organization event/audit conventions for optional role hint; task.service.ts setup resolution; task.controller.ts only if response typing requires it. Reuse authorization.service.ts selection without permission changes.
3. Frontend: task.tsx Setup type/form extraction and a create-task-modal component/styles; app.tsx only if approved entry-point wiring requires it. Preserve current account/session shape and existing creation handlers.
4. Verify focused persistence/security and UI behavior, then applicable pinned gates and explicitly approved live acceptance. No environment lifecycle operation follows implicitly from this plan.

## Acceptance and risks

Backend cases: old null roles unchanged; rename-independent hints; same-organization current assignment only; inactive role/revoked membership/exited staff; repeated same hint versus conflicting hints; Owner precedence; no inference from site permission/reporting/fixture identity; mutation Owner-only with reason/audit; non-Owner and cross-organization ID tampering denied; classification grants no task/site/review authority. Verify migration upgrade preserves existing columns/rows and existing clients ignore additive response.

UI cases: four variants using authoritative hints; generic/ambiguous/missing profile fallback; canAssign independent of variant; employee-less Owner behavior; valid SITE project selection; complete canonical payload/required reason; progressive native validation; modal focus/dirty close and error/capacity paths; 1440/1024/390/320 geometry; unchanged non-target callers. Task submission, review, dates and audit retain existing integration coverage. Do not claim full-suite or authenticated acceptance before running it.

Primary risk is treating presentation identity as authority or silently classifying existing configurable roles. Nullable opt-in storage and conservative fallback prevent automatic reclassification; actual role configuration remains an explicit Owner operation. Approval is required before implementing the proposed backend/schema/configuration slice.
