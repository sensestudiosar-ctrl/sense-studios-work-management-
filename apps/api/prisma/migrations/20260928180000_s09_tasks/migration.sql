CREATE TYPE "TaskType" AS ENUM ('PROJECT','NON_PROJECT','RECURRING','CORRECTION','SITE','TRAINING_PRACTICAL','CLOSEOUT');
CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','WAITING','SUBMITTED_INTERNAL_REVIEW','IN_INTERNAL_REVIEW','CORRECTIONS_REQUIRED','INTERNAL_APPROVED','SUBMITTED_CLIENT_REVIEW','IN_CLIENT_REVIEW','CLIENT_REVISION_REQUIRED','CLIENT_APPROVED','COMPLETED','STOPPED_DUE_TO_PROJECT_CANCELLATION');
CREATE TYPE "TaskReviewRequirement" AS ENUM ('NONE','INTERNAL','CLIENT','BOTH');

ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_id_organizationId_key" UNIQUE ("id","organizationId");

CREATE TABLE "tasks" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "projectId" UUID,
 "title" VARCHAR(160) NOT NULL, "description" VARCHAR(2000), "type" "TaskType" NOT NULL,
 "priority" "TaskPriority" NOT NULL, "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
 "reviewRequirement" "TaskReviewRequirement" NOT NULL DEFAULT 'NONE', "version" INTEGER NOT NULL DEFAULT 1,
 "targetDate" DATE NOT NULL, "startDate" DATE, "estimatedHours" DECIMAL(8,2),
 "primaryOwnerEmployeeId" UUID NOT NULL, "createdById" UUID NOT NULL,
 "requiresReassignment" BOOLEAN NOT NULL DEFAULT false, "waitingPreviousStatus" "TaskStatus",
 "waitingReason" VARCHAR(1000), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"), CONSTRAINT "tasks_id_organizationId_key" UNIQUE ("id","organizationId"),
 CONSTRAINT "tasks_version_check" CHECK ("version">0),
 CONSTRAINT "tasks_date_check" CHECK ("startDate" IS NULL OR "targetDate">="startDate"),
 CONSTRAINT "tasks_estimated_hours_check" CHECK ("estimatedHours" IS NULL OR "estimatedHours">=0),
 CONSTRAINT "tasks_closeout_link_check" CHECK ("type" <> 'CLOSEOUT' OR "projectId" IS NOT NULL),
 CONSTRAINT "tasks_waiting_reassignment_check" CHECK (("requiresReassignment" AND "status"='WAITING' AND "waitingPreviousStatus" IS NOT NULL AND "waitingReason" IS NOT NULL AND length(trim("waitingReason"))>0) OR (NOT "requiresReassignment" AND "waitingPreviousStatus" IS NULL AND "waitingReason" IS NULL)),
 CONSTRAINT "tasks_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "tasks_project_fkey" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "tasks_owner_fkey" FOREIGN KEY ("primaryOwnerEmployeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "tasks_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "tasks_owner_status_target_idx" ON "tasks"("organizationId","primaryOwnerEmployeeId","status","targetDate","id");
CREATE INDEX "tasks_project_status_target_idx" ON "tasks"("organizationId","projectId","status","targetDate","id");

CREATE TABLE "task_collaborators" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "taskId" UUID NOT NULL,
 "employeeId" UUID NOT NULL, "estimatedHours" DECIMAL(8,2), "addedById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "task_collaborators_pkey" PRIMARY KEY ("id"), CONSTRAINT "task_collaborators_taskId_employeeId_key" UNIQUE ("taskId","employeeId"),
 CONSTRAINT "task_collaborators_estimate_check" CHECK ("estimatedHours" IS NULL OR "estimatedHours">=0),
 CONSTRAINT "task_collaborators_task_fkey" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_collaborators_employee_fkey" FOREIGN KEY ("employeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_collaborators_adder_fkey" FOREIGN KEY ("addedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "task_collaborators_org_employee_idx" ON "task_collaborators"("organizationId","employeeId");

CREATE TABLE "task_owner_changes" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "taskId" UUID NOT NULL,
 "oldOwnerEmployeeId" UUID, "newOwnerEmployeeId" UUID NOT NULL, "actorId" UUID NOT NULL,
 "reason" VARCHAR(1000) NOT NULL, "taskVersion" INTEGER NOT NULL, "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "task_owner_changes_pkey" PRIMARY KEY ("id"), CONSTRAINT "task_owner_changes_taskId_taskVersion_key" UNIQUE ("taskId","taskVersion"),
 CONSTRAINT "task_owner_changes_task_fkey" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_owner_changes_old_fkey" FOREIGN KEY ("oldOwnerEmployeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_owner_changes_new_fkey" FOREIGN KEY ("newOwnerEmployeeId","organizationId") REFERENCES "employees"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_owner_changes_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "task_owner_changes_org_task_time_idx" ON "task_owner_changes"("organizationId","taskId","occurredAt");

CREATE TABLE "task_status_changes" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "taskId" UUID NOT NULL,
 "fromStatus" "TaskStatus", "toStatus" "TaskStatus" NOT NULL, "actorId" UUID NOT NULL,
 "reason" VARCHAR(1000), "taskVersion" INTEGER NOT NULL, "previousStatus" "TaskStatus",
 "projectStatusChangeId" UUID, "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "task_status_changes_pkey" PRIMARY KEY ("id"), CONSTRAINT "task_status_changes_taskId_taskVersion_key" UNIQUE ("taskId","taskVersion"),
 CONSTRAINT "task_status_changes_task_fkey" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_status_changes_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_status_changes_project_change_fkey" FOREIGN KEY ("projectStatusChangeId","organizationId") REFERENCES "project_status_changes"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "task_status_changes_org_task_time_idx" ON "task_status_changes"("organizationId","taskId","occurredAt");

CREATE TABLE "task_closeout_approvals" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "organizationId" UUID NOT NULL, "taskId" UUID NOT NULL,
 "approverId" UUID NOT NULL, "reason" VARCHAR(1000) NOT NULL, "workScope" VARCHAR(2000) NOT NULL,
 "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMPTZ(3), "revokedById" UUID, "revocationReason" VARCHAR(1000),
 CONSTRAINT "task_closeout_approvals_pkey" PRIMARY KEY ("id"), CONSTRAINT "task_closeout_approvals_taskId_key" UNIQUE ("taskId"),
 CONSTRAINT "task_closeout_approvals_taskId_organizationId_key" UNIQUE ("taskId","organizationId"),
 CONSTRAINT "task_closeout_approvals_task_fkey" FOREIGN KEY ("taskId","organizationId") REFERENCES "tasks"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_closeout_approvals_approver_fkey" FOREIGN KEY ("approverId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_closeout_approvals_revoker_fkey" FOREIGN KEY ("revokedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "task_closeout_approvals_revocation_check" CHECK (("revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL) OR ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND length(trim("revocationReason"))>0))
);

CREATE FUNCTION "guard_s09_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S09 history is append-only'; END $$;
CREATE TRIGGER "task_owner_changes_append_only" BEFORE UPDATE OR DELETE ON "task_owner_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s09_append_only"();
CREATE TRIGGER "task_status_changes_append_only" BEFORE UPDATE OR DELETE ON "task_status_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s09_append_only"();
CREATE FUNCTION "guard_s09_closeout_approval"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'S09 closeout approvals cannot be deleted'; END IF;
 IF OLD."revokedAt" IS NOT NULL OR NEW."revokedAt" IS NULL THEN RAISE EXCEPTION 'Only one-way closeout revocation is permitted'; END IF;
 IF (to_jsonb(NEW)-ARRAY['revokedAt','revokedById','revocationReason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revokedAt','revokedById','revocationReason']) THEN RAISE EXCEPTION 'Closeout approval core is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "task_closeout_approval_append_only" BEFORE UPDATE OR DELETE ON "task_closeout_approvals" FOR EACH ROW EXECUTE FUNCTION "guard_s09_closeout_approval"();

ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ("eventName" IN (
  'template.version_created',
  'project.template_applied',
  'project.plan_item_completed',
  'project.gate_overridden',
  'organization.created',
  'organization.branch.created',
  'organization.branch.updated',
  'organization.team.created',
  'organization.team.updated',
  'organization.job_role.created',
  'organization.job_role.updated',
  'organization.employee.created',
  'organization.employee.membership_changed',
  'organization.employee.job_roles_changed',
  'organization.employee.suspended',
  'authorization.role_permission.changed',
  'authorization.employee_permission.changed',
  'audit.corrected',
  'audit.retention.notice_interval.updated',
  'audit.retention.hold.placed',
  'audit.retention.hold.released',
  'audit.retention.notice.acknowledged',
  'project.created',
  'project.activated',
  'project.on_hold',
  'project.scope_changed',
  'project.completed',
  'project.archived',
  'project.assignment_changed',
  'project.lead_changed',
  'project.transferred',
  'project.scope_policy_changed',
  'project.scope_requested',
  'project.cancellation_requested',
  'task.created',
  'task.assigned',
  'task.started',
  'task.waiting',
  'task.overdue',
  'task.completed',
  'task.deadline_changed',
  'review.requested',
  'review.started',
  'review.correction_requested',
  'review.approved',
  'client.review_requested',
  'client.revision_requested',
  'client.approved',
  'document.uploaded',
  'revision.created',
  'document.approved',
  'document.issued',
  'document.superseded',
  'time.started',
  'time.logged',
  'time.changed',
  'leave.requested',
  'leave.approved',
  'attendance.checked_in',
  'employee_performance.changed',
  'project_health.changed',
  'capacity.threshold_exceeded',
  'approval.requested',
  'approval.delegated',
  'approval.withdrawn',
  'approval.decided',
  'crm.lead.created',
  'crm.lead.updated',
  'crm.lead.stage_changed',
  'crm.lead.activity_recorded',
  'crm.client.created',
  'crm.client.updated',
  'crm.source.created',
  'crm.source.updated',
  'organization.employee.exited',
  'project.cancelled',
  'task.updated',
  'task.stopped',
  'task.closeout_approved'
));

