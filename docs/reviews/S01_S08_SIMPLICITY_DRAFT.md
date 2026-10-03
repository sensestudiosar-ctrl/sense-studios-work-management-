# S01–S08 user-experience simplicity audit draft

Read-only review of the named web surfaces against the settled S01–S08 scope. This is a draft for Owner review, not an authorization to change behavior or requirements. No tests were run.

## Findings

### S01 — Runtime health and backups (R091, R093, R099–R102)

**No evidenced unnecessary item in the reviewed user-facing surfaces.** The named components expose no runtime health/backup dashboard. The retention UI does require a backup disposition and run reference before acknowledging a notice ([audit-retention.tsx:163](../../apps/web/src/audit-retention.tsx#L163)); that evidence is a required safeguard, not clutter. The operations-facing health/backup workflow is outside the named screens, so this review has no basis to recommend simplifying it.

### S02 — Passkey identity (R005.a–b, R007, R076 internal, C-008)

**No evidenced unnecessary item.** Sign-in asks for a work email and offers one passkey action, with a conditional browser support note ([app.tsx:161](../../apps/web/src/app.tsx#L161), [app.tsx:166](../../apps/web/src/app.tsx#L166), [app.tsx:178](../../apps/web/src/app.tsx#L178), [app.tsx:182](../../apps/web/src/app.tsx#L182)). The email identifies the account and the passkey is the approved authentication method; neither is an unnecessary duplicate step. Recovery and enrollment distinctions should remain because they represent separate authorized flows.

### S03 — Organization and scoped grants (R004–R009, C-001/002/023/024)

**Finding — permission setup asks Owners to enter implementation keys.** An Owner granting a role permission must type a raw key such as `projects.read`, and an employee override similarly asks for a key such as `task.review` ([app.tsx:682](../../apps/web/src/app.tsx#L682), [app.tsx:683](../../apps/web/src/app.tsx#L683), [app.tsx:791](../../apps/web/src/app.tsx#L791), [app.tsx:792](../../apps/web/src/app.tsx#L792)).

- **Scenario:** an Owner configuring a role or an employee’s access has to know the permission catalogue’s internal naming convention before granting the intended capability.
- **Recommendation:** present available permissions by plain-language capability and group, with the key shown only in an optional detail view. Keep scope, branch/team selection, effect, expiry, and reason controls; they communicate required authority boundaries.
- **Severity:** Medium. **Confidence:** High.

### S04 — Notices and audit (R058.a–c, R079–080, R095, C-003/009)

**Finding — the audit result card exposes raw identifiers and serialized actor data in its main view.** Each result shows `subjectId`, a JSON-rendered actor snapshot, event IDs, and linked correction IDs directly ([audit-retention.tsx:201](../../apps/web/src/audit-retention.tsx#L201), [audit-retention.tsx:202](../../apps/web/src/audit-retention.tsx#L202), [audit-retention.tsx:204](../../apps/web/src/audit-retention.tsx#L204), [audit-retention.tsx:205](../../apps/web/src/audit-retention.tsx#L205)).

- **Scenario:** an Owner searching for a change sees technical payload and opaque identifiers before the human-readable event, actor, and subject context they need to recognize it.
- **Recommendation:** keep the evidence available but put raw IDs and serialized snapshots in a collapsed “Technical details” disclosure; show a readable actor/subject label in the result summary when available. Do not remove immutable evidence or correction links.
- **Severity:** Low. **Confidence:** High.

### S05 — Shared approvals (R096–097)

**Finding — approval cards display an additional raw type key beside the decision summary.** The card already shows its title, summary, subject, requester, and reason, then displays `item.typeKey` as a separate badge ([approval-queue.tsx:115](../../apps/web/src/approval-queue.tsx#L115), [approval-queue.tsx:116](../../apps/web/src/approval-queue.tsx#L116), [approval-queue.tsx:117](../../apps/web/src/approval-queue.tsx#L117), [approval-queue.tsx:118](../../apps/web/src/approval-queue.tsx#L118), [approval-queue.tsx:121](../../apps/web/src/approval-queue.tsx#L121)).

- **Scenario:** an approver scanning “Needs your attention” sees a machine-style discriminator that adds little after the human title and summary identify the request.
- **Recommendation:** replace the raw key with a short human-readable request category, or move it into technical details if it is needed for support.
- **Severity:** Low. **Confidence:** Medium-high.

### S06 — CRM (R010.a–d, C-017–019)

**No evidenced unnecessary item.** The visible actions and forms map to the approved lead, client, interaction, source, and reasoned stage-history workflows. The creation reason and transition reason are attached to auditable business changes; source and shared-client administration are separately disclosed as management sections ([crm.tsx:62](../../apps/web/src/crm.tsx#L62), [crm.tsx:63](../../apps/web/src/crm.tsx#L63), [crm.tsx:65](../../apps/web/src/crm.tsx#L65), [crm.tsx:66](../../apps/web/src/crm.tsx#L66), [crm.tsx:68](../../apps/web/src/crm.tsx#L68)). No duplicate step or removable safeguard was evidenced in the reviewed code.

### S07 — Projects (R011–013, R016)

**Finding — project status enums are rendered as raw uppercase codes.** List cards and project detail print `item.status` / `detail.project.status` directly ([project.tsx:156](../../apps/web/src/project.tsx#L156), [project.tsx:158](../../apps/web/src/project.tsx#L158)); this produces labels such as `ON_HOLD` rather than ordinary status wording.

- **Scenario:** staff scanning the branch’s projects or opening a project must mentally translate the stored status code.
- **Recommendation:** format statuses consistently as readable labels such as “On hold” and “Cancelled”, retaining the same state and transition controls.
- **Severity:** Low. **Confidence:** High.

### S08 — Immutable template stages and milestones (R014–017)

**Finding — template authors enter both internal keys and visible names for every stage and milestone.** Each row has separate “key” and “name” text inputs ([project-template.tsx:110](../../apps/web/src/project-template.tsx#L110), [project-template.tsx:111](../../apps/web/src/project-template.tsx#L111), [project-template.tsx:112](../../apps/web/src/project-template.tsx#L112), [project-template.tsx:113](../../apps/web/src/project-template.tsx#L113)).

- **Scenario:** an Owner or authorized template manager creating a template must invent and maintain a technical identifier as well as the label staff will actually use.
- **Recommendation:** generate a stable key when a row is created or from its initial label, and keep manual key editing behind an advanced option. Preserve stable keys in persisted versions and project instances so existing references remain valid.
- **Severity:** Medium. **Confidence:** Medium-high.

## Scope and limits

This audit reviewed `apps/web/src/app.tsx`, `notifications.tsx`, `audit-retention.tsx`, `approval-queue.tsx`, `crm.tsx`, `project.tsx`, and `project-template.tsx`, plus focused S02–S08 specifications where relevant. No S01 specification file was present at repository root; the supplied S01 requirement scope was used. The review did not inspect or change backend behavior, permissions, data, or requirements. Proposed interface changes need separate implementation and acceptance review.
