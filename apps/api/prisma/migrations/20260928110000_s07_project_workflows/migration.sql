-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "wonStageChangeId" UUID;

-- AlterTable
ALTER TABLE "project_scopes" ADD COLUMN     "scopeChangeId" UUID;

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "crossBranchAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" UUID NOT NULL,
    "grantReason" VARCHAR(1000) NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedById" UUID,
    "revocationReason" VARCHAR(1000),

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_lead_changes" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "oldEmployeeId" UUID,
    "newEmployeeId" UUID,
    "projectVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_lead_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_branch_transfers" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fromBranchId" UUID NOT NULL,
    "toBranchId" UUID NOT NULL,
    "projectVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_branch_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_scope_changes" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "requesterId" UUID NOT NULL,
    "requestReason" VARCHAR(1000) NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalId" UUID,

    CONSTRAINT "project_scope_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_scope_policy_changes" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "oldApproverId" UUID,
    "newApproverId" UUID NOT NULL,
    "projectVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_scope_policy_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_cancellation_requests" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_assignments_projectId_revokedAt_employeeId_idx" ON "project_assignments"("projectId", "revokedAt", "employeeId");

-- CreateIndex
CREATE INDEX "project_assignments_employeeId_revokedAt_idx" ON "project_assignments"("employeeId", "revokedAt");

-- CreateIndex
CREATE INDEX "project_lead_changes_projectId_occurredAt_id_idx" ON "project_lead_changes"("projectId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_lead_changes_projectId_projectVersion_key" ON "project_lead_changes"("projectId", "projectVersion");

-- CreateIndex
CREATE INDEX "project_branch_transfers_projectId_occurredAt_id_idx" ON "project_branch_transfers"("projectId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_branch_transfers_projectId_projectVersion_key" ON "project_branch_transfers"("projectId", "projectVersion");

-- CreateIndex
CREATE UNIQUE INDEX "project_scope_changes_approvalId_key" ON "project_scope_changes"("approvalId");

-- CreateIndex
CREATE INDEX "project_scope_changes_projectId_requestedAt_id_idx" ON "project_scope_changes"("projectId", "requestedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_scope_policy_changes_projectId_projectVersion_key" ON "project_scope_policy_changes"("projectId", "projectVersion");

-- CreateIndex
CREATE INDEX "project_cancellation_requests_projectId_requestedAt_id_idx" ON "project_cancellation_requests"("projectId", "requestedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_scopes_scopeChangeId_key" ON "project_scopes"("scopeChangeId");

-- AddForeignKey
ALTER TABLE "project_scopes" ADD CONSTRAINT "project_scopes_scopeChangeId_fkey" FOREIGN KEY ("scopeChangeId") REFERENCES "project_scope_changes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lead_changes" ADD CONSTRAINT "project_lead_changes_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_branch_transfers" ADD CONSTRAINT "project_branch_transfers_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_scope_changes" ADD CONSTRAINT "project_scope_changes_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_scope_policy_changes" ADD CONSTRAINT "project_scope_policy_changes_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cancellation_requests" ADD CONSTRAINT "project_cancellation_requests_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep exact conversion provenance, including records created by the S07A checkpoint.
ALTER TABLE "projects" DISABLE TRIGGER "projects_protect_s07";
UPDATE "projects" p SET "wonStageChangeId" = (SELECT lsc."id" FROM "lead_stage_changes" lsc
  WHERE lsc."leadId" = p."wonLeadId" AND lsc."organizationId" = p."organizationId" AND lsc."toStage" = 'WON'
  ORDER BY lsc."occurredAt", lsc."id" LIMIT 1)
WHERE p."wonLeadId" IS NOT NULL;
ALTER TABLE "projects" ENABLE TRIGGER "projects_protect_s07";
ALTER TABLE "projects" ADD CONSTRAINT "projects_won_stage_shape" CHECK (("wonLeadId" IS NULL) = ("wonStageChangeId" IS NULL));
ALTER TABLE "projects" ADD CONSTRAINT "projects_wonStageChangeId_fkey" FOREIGN KEY ("wonStageChangeId") REFERENCES "lead_stage_changes"("id") ON DELETE RESTRICT;

-- Every reference to a person or approval is backed by a real row.
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_employeeId_organizationId_fkey" FOREIGN KEY ("employeeId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT;
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_lead_changes" ADD CONSTRAINT "project_lead_changes_oldEmployeeId_fkey" FOREIGN KEY ("oldEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT;
ALTER TABLE "project_lead_changes" ADD CONSTRAINT "project_lead_changes_newEmployeeId_fkey" FOREIGN KEY ("newEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT;
ALTER TABLE "project_lead_changes" ADD CONSTRAINT "project_lead_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_branch_transfers" ADD CONSTRAINT "project_branch_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT;
ALTER TABLE "project_branch_transfers" ADD CONSTRAINT "project_branch_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT;
ALTER TABLE "project_branch_transfers" ADD CONSTRAINT "project_branch_transfers_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_scope_changes" ADD CONSTRAINT "project_scope_changes_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_scope_changes" ADD CONSTRAINT "project_scope_changes_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT;
ALTER TABLE "project_scope_policy_changes" ADD CONSTRAINT "project_scope_policy_changes_oldApproverId_fkey" FOREIGN KEY ("oldApproverId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_scope_policy_changes" ADD CONSTRAINT "project_scope_policy_changes_newApproverId_fkey" FOREIGN KEY ("newApproverId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_scope_policy_changes" ADD CONSTRAINT "project_scope_policy_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "project_cancellation_requests" ADD CONSTRAINT "project_cancellation_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "accounts"("id") ON DELETE RESTRICT;

CREATE UNIQUE INDEX "project_assignments_one_active_employee" ON "project_assignments"("projectId", "employeeId") WHERE "revokedAt" IS NULL;
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_revocation_shape" CHECK (("revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL) OR ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND length(btrim("revocationReason")) >= 3));
ALTER TABLE "project_scopes" ADD CONSTRAINT "project_scopes_origin_shape" CHECK (("baseline" = true AND "scopeChangeId" IS NULL) OR ("baseline" = false AND "scopeChangeId" IS NOT NULL));
ALTER TABLE "project_scope_changes" ADD CONSTRAINT "project_scope_changes_name_shape" CHECK (length("name") BETWEEN 2 AND 120 AND "name" = btrim("name") AND "normalizedName" = lower("name"));

-- S07 keeps effective cancellation disabled until the S09 task/access operation exists.
CREATE OR REPLACE FUNCTION "protect_project_s07"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Projects cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'DRAFT' OR NEW."version" <> 1 THEN RAISE EXCEPTION 'Projects begin Draft at version 1'; END IF;
    IF NEW."wonLeadId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "leads" l JOIN "lead_stage_changes" s ON s."id" = NEW."wonStageChangeId" AND s."leadId" = l."id" AND s."toStage" = 'WON'
      WHERE l."id" = NEW."wonLeadId" AND l."organizationId" = NEW."organizationId" AND l."branchId" = NEW."branchId"
        AND l."clientId" IS NOT DISTINCT FROM NEW."clientId" AND l."stage" = 'WON') THEN
      RAISE EXCEPTION 'Project conversion requires exact Won evidence in the owning Branch';
    END IF;
  ELSE
    IF ROW(NEW."organizationId", NEW."clientId", NEW."wonLeadId", NEW."wonStageChangeId", NEW."deliveryType", NEW."createdById", NEW."createdAt") IS DISTINCT FROM
       ROW(OLD."organizationId", OLD."clientId", OLD."wonLeadId", OLD."wonStageChangeId", OLD."deliveryType", OLD."createdById", OLD."createdAt") THEN
      RAISE EXCEPTION 'Project identity and provenance are immutable';
    END IF;
    IF OLD."status" IN ('ARCHIVED', 'CANCELLED') THEN RAISE EXCEPTION 'Terminal projects cannot change'; END IF;
    IF NEW."status" = 'CANCELLED' THEN RAISE EXCEPTION 'Effective cancellation requires S09 task-stop workflow'; END IF;
    IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Project version must advance once'; END IF;
    IF NEW."branchId" IS DISTINCT FROM OLD."branchId" AND NOT EXISTS (
      SELECT 1 FROM "branches" WHERE "id" = NEW."branchId" AND "organizationId" = NEW."organizationId" AND "active" = true) THEN
      RAISE EXCEPTION 'Transfer requires an active Branch in the same organization';
    END IF;
    IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
      OLD."status" = 'DRAFT' AND NEW."status" = 'ACTIVE' OR
      OLD."status" = 'ACTIVE' AND NEW."status" IN ('ON_HOLD','COMPLETED') OR
      OLD."status" = 'ON_HOLD' AND NEW."status" = 'ACTIVE' OR
      OLD."status" = 'COMPLETED' AND NEW."status" = 'ARCHIVED') THEN
      RAISE EXCEPTION 'Invalid project status transition';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "protect_project_assignment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE home_branch UUID; person_state "EmployeeState"; actor_kind "AccountKind";
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Project assignments cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."revokedAt" IS NOT NULL OR ROW(NEW."projectId",NEW."organizationId",NEW."employeeId",NEW."crossBranchAuthorized",NEW."grantedById",NEW."grantReason",NEW."grantedAt") IS DISTINCT FROM
       ROW(OLD."projectId",OLD."organizationId",OLD."employeeId",OLD."crossBranchAuthorized",OLD."grantedById",OLD."grantReason",OLD."grantedAt") THEN
      RAISE EXCEPTION 'Project assignment history is immutable';
    END IF;
    RETURN NEW;
  END IF;
  SELECT "homeBranchId", "state" INTO home_branch, person_state FROM "employees" WHERE "id" = NEW."employeeId" AND "organizationId" = NEW."organizationId";
  IF person_state IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Only active employees may be assigned'; END IF;
  IF home_branch IS DISTINCT FROM (SELECT "branchId" FROM "projects" WHERE "id" = NEW."projectId") THEN
    SELECT "kind" INTO actor_kind FROM "accounts" WHERE "id" = NEW."grantedById";
    IF NOT NEW."crossBranchAuthorized" OR actor_kind IS DISTINCT FROM 'OWNER' THEN RAISE EXCEPTION 'Cross-Branch assignment requires Owner grant'; END IF;
  ELSIF NEW."crossBranchAuthorized" THEN RAISE EXCEPTION 'Same-Branch assignment cannot claim cross-Branch authority'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "project_assignments_protect" BEFORE INSERT OR UPDATE OR DELETE ON "project_assignments" FOR EACH ROW EXECUTE FUNCTION "protect_project_assignment"();

CREATE FUNCTION "reject_project_history_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Project decision history is append-only'; END $$;
CREATE TRIGGER "project_lead_changes_immutable" BEFORE UPDATE OR DELETE ON "project_lead_changes" FOR EACH ROW EXECUTE FUNCTION "reject_project_history_mutation"();
CREATE TRIGGER "project_branch_transfers_immutable" BEFORE UPDATE OR DELETE ON "project_branch_transfers" FOR EACH ROW EXECUTE FUNCTION "reject_project_history_mutation"();
CREATE TRIGGER "project_scope_policy_changes_immutable" BEFORE UPDATE OR DELETE ON "project_scope_policy_changes" FOR EACH ROW EXECUTE FUNCTION "reject_project_history_mutation"();
CREATE TRIGGER "project_cancellation_requests_immutable" BEFORE UPDATE OR DELETE ON "project_cancellation_requests" FOR EACH ROW EXECUTE FUNCTION "reject_project_history_mutation"();
CREATE FUNCTION "protect_project_scope_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Scope change requests cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND (OLD."approvalId" IS NOT NULL OR ROW(NEW."id",NEW."projectId",NEW."organizationId",NEW."name",NEW."normalizedName",NEW."requesterId",NEW."requestReason",NEW."requestedAt") IS DISTINCT FROM
    ROW(OLD."id",OLD."projectId",OLD."organizationId",OLD."name",OLD."normalizedName",OLD."requesterId",OLD."requestReason",OLD."requestedAt")) THEN
    RAISE EXCEPTION 'Scope change request is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "project_scope_changes_protect" BEFORE UPDATE OR DELETE ON "project_scope_changes" FOR EACH ROW EXECUTE FUNCTION "protect_project_scope_change"();

ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'organization.created',
  'organization.branch.created', 'organization.branch.updated',
  'organization.team.created', 'organization.team.updated',
  'organization.job_role.created', 'organization.job_role.updated',
  'organization.employee.created', 'organization.employee.membership_changed',
  'organization.employee.job_roles_changed', 'organization.employee.suspended',
  'authorization.role_permission.changed', 'authorization.employee_permission.changed',
  'audit.corrected', 'audit.retention.notice_interval.updated', 'audit.retention.hold.placed',
  'audit.retention.hold.released', 'audit.retention.notice.acknowledged',
  'project.created', 'project.activated', 'project.on_hold', 'project.scope_changed', 'project.completed',
  'project.archived', 'project.assignment_changed', 'project.lead_changed', 'project.transferred',
  'project.scope_policy_changed', 'project.scope_requested', 'project.cancellation_requested',
  'task.created', 'task.assigned', 'task.started', 'task.waiting', 'task.overdue', 'task.completed', 'task.deadline_changed',
  'review.requested', 'review.started', 'review.correction_requested', 'review.approved',
  'client.review_requested', 'client.revision_requested', 'client.approved',
  'document.uploaded', 'revision.created', 'document.approved', 'document.issued', 'document.superseded',
  'time.started', 'time.logged', 'time.changed', 'leave.requested', 'leave.approved', 'attendance.checked_in',
  'employee_performance.changed', 'project_health.changed', 'capacity.threshold_exceeded',
  'crm.lead.created','crm.lead.updated','crm.lead.stage_changed','crm.lead.activity_recorded','crm.client.created','crm.client.updated','crm.source.created','crm.source.updated',
  'approval.requested', 'approval.delegated', 'approval.withdrawn', 'approval.decided'
));
