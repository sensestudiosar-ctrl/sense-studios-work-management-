-- CreateEnum
CREATE TYPE "EmployeeState" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXITED');

-- CreateEnum
CREATE TYPE "PermissionScopeKind" AS ENUM ('ORGANIZATION', 'BRANCH', 'TEAM', 'SELF');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "OrganizationEventType" AS ENUM ('ORGANIZATION_CREATED', 'BRANCH_CREATED', 'BRANCH_UPDATED', 'TEAM_CREATED', 'TEAM_UPDATED', 'JOB_ROLE_CREATED', 'JOB_ROLE_UPDATED', 'EMPLOYEE_CREATED', 'EMPLOYEE_MEMBERSHIP_CHANGED', 'EMPLOYEE_JOB_ROLES_CHANGED', 'EMPLOYEE_SUSPENDED', 'ROLE_PERMISSION_CHANGED', 'EMPLOYEE_PERMISSION_CHANGED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "singletonKey" SMALLINT NOT NULL DEFAULT 1,
    "name" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "employeeCode" VARCHAR(64),
    "homeBranchId" UUID NOT NULL,
    "homeTeamId" UUID NOT NULL,
    "reportsToId" UUID,
    "state" "EmployeeState" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" DATE NOT NULL,
    "suspendedAt" TIMESTAMPTZ(3),
    "exitedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_membership_history" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "reportsToId" UUID,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(3),
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,

    CONSTRAINT "employee_membership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_job_role_assignments" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobRoleId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(3),
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,

    CONSTRAINT "employee_job_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionKey" VARCHAR(160) NOT NULL,
    "scopeKind" "PermissionScopeKind" NOT NULL,
    "branchId" UUID,
    "teamId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedById" UUID,
    "revocationReason" VARCHAR(1000),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_permission_overrides" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "permissionKey" VARCHAR(160) NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "scopeKind" "PermissionScopeKind" NOT NULL,
    "branchId" UUID,
    "teamId" UUID,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "revokedById" UUID,
    "revocationReason" VARCHAR(1000),

    CONSTRAINT "employee_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventType" "OrganizationEventType" NOT NULL,
    "actorId" UUID NOT NULL,
    "subjectId" UUID,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(1000),
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "organization_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_singletonKey_key" ON "organizations"("singletonKey");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organizationId_name_key" ON "branches"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_id_organizationId_key" ON "branches"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_branchId_name_key" ON "teams"("branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_branchId_organizationId_key" ON "teams"("id", "branchId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "job_roles_organizationId_name_key" ON "job_roles"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "job_roles_id_organizationId_key" ON "job_roles"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_accountId_key" ON "employees"("accountId");

-- CreateIndex
CREATE INDEX "employees_organizationId_homeBranchId_homeTeamId_state_idx" ON "employees"("organizationId", "homeBranchId", "homeTeamId", "state");

-- CreateIndex
CREATE INDEX "employees_reportsToId_state_idx" ON "employees"("reportsToId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organizationId_employeeCode_key" ON "employees"("organizationId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_id_organizationId_key" ON "employees"("id", "organizationId");

-- CreateIndex
CREATE INDEX "employee_membership_history_employeeId_effectiveFrom_idx" ON "employee_membership_history"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "employee_membership_history_organizationId_branchId_teamId__idx" ON "employee_membership_history"("organizationId", "branchId", "teamId", "effectiveTo");

-- CreateIndex
CREATE INDEX "employee_job_role_assignments_employeeId_effectiveFrom_idx" ON "employee_job_role_assignments"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "employee_job_role_assignments_organizationId_jobRoleId_effe_idx" ON "employee_job_role_assignments"("organizationId", "jobRoleId", "effectiveTo");

-- CreateIndex
CREATE INDEX "role_permissions_permissionKey_scopeKind_idx" ON "role_permissions"("permissionKey", "scopeKind");

-- CreateIndex
CREATE INDEX "employee_permission_overrides_employeeId_permissionKey_expi_idx" ON "employee_permission_overrides"("employeeId", "permissionKey", "expiresAt");

-- CreateIndex
CREATE INDEX "employee_permission_overrides_permissionKey_scopeKind_idx" ON "employee_permission_overrides"("permissionKey", "scopeKind");

-- CreateIndex
CREATE INDEX "organization_events_organizationId_occurredAt_idx" ON "organization_events"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "organization_events_actorId_occurredAt_idx" ON "organization_events"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "organization_events_subjectId_occurredAt_idx" ON "organization_events"("subjectId", "occurredAt");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_homeBranchId_organizationId_fkey" FOREIGN KEY ("homeBranchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_homeTeamId_homeBranchId_organizationId_fkey" FOREIGN KEY ("homeTeamId", "homeBranchId", "organizationId") REFERENCES "teams"("id", "branchId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportsToId_organizationId_fkey" FOREIGN KEY ("reportsToId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_membership_history" ADD CONSTRAINT "employee_membership_history_employeeId_organizationId_fkey" FOREIGN KEY ("employeeId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_membership_history" ADD CONSTRAINT "employee_membership_history_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_membership_history" ADD CONSTRAINT "employee_membership_history_teamId_branchId_organizationId_fkey" FOREIGN KEY ("teamId", "branchId", "organizationId") REFERENCES "teams"("id", "branchId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_membership_history" ADD CONSTRAINT "employee_membership_history_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_job_role_assignments" ADD CONSTRAINT "employee_job_role_assignments_employeeId_organizationId_fkey" FOREIGN KEY ("employeeId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_job_role_assignments" ADD CONSTRAINT "employee_job_role_assignments_jobRoleId_organizationId_fkey" FOREIGN KEY ("jobRoleId", "organizationId") REFERENCES "job_roles"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_job_role_assignments" ADD CONSTRAINT "employee_job_role_assignments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_organizationId_fkey" FOREIGN KEY ("roleId", "organizationId") REFERENCES "job_roles"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_teamId_branchId_organizationId_fkey" FOREIGN KEY ("teamId", "branchId", "organizationId") REFERENCES "teams"("id", "branchId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_employeeId_organizationId_fkey" FOREIGN KEY ("employeeId", "organizationId") REFERENCES "employees"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_teamId_branchId_organization_fkey" FOREIGN KEY ("teamId", "branchId", "organizationId") REFERENCES "teams"("id", "branchId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_events" ADD CONSTRAINT "organization_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_events" ADD CONSTRAINT "organization_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- C-001 fixes a single application organization and excludes Brand/Department tiers.
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_singleton_check" CHECK ("singletonKey" = 1);
ALTER TABLE "employees" ADD CONSTRAINT "employees_not_self_reporting_check" CHECK ("reportsToId" IS NULL OR "reportsToId" <> "id");
ALTER TABLE "employee_membership_history" ADD CONSTRAINT "employee_membership_history_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
CREATE UNIQUE INDEX "employee_membership_one_current_key" ON "employee_membership_history"("employeeId") WHERE "effectiveTo" IS NULL;
ALTER TABLE "employee_job_role_assignments" ADD CONSTRAINT "employee_job_role_assignments_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
CREATE UNIQUE INDEX "employee_job_role_one_current_key" ON "employee_job_role_assignments"("employeeId", "jobRoleId") WHERE "effectiveTo" IS NULL;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_scope_check" CHECK (
  ("scopeKind" IN ('ORGANIZATION', 'SELF') AND "branchId" IS NULL AND "teamId" IS NULL) OR
  ("scopeKind" = 'BRANCH' AND "branchId" IS NOT NULL AND "teamId" IS NULL) OR
  ("scopeKind" = 'TEAM' AND "branchId" IS NOT NULL AND "teamId" IS NOT NULL)
);
ALTER TABLE "employee_permission_overrides" ADD CONSTRAINT "employee_permission_overrides_scope_check" CHECK (
  ("scopeKind" IN ('ORGANIZATION', 'SELF') AND "branchId" IS NULL AND "teamId" IS NULL) OR
  ("scopeKind" = 'BRANCH' AND "branchId" IS NOT NULL AND "teamId" IS NULL) OR
  ("scopeKind" = 'TEAM' AND "branchId" IS NOT NULL AND "teamId" IS NOT NULL)
);
CREATE UNIQUE INDEX "role_permissions_org_key" ON "role_permissions"("roleId", "permissionKey") WHERE "scopeKind" = 'ORGANIZATION' AND "revokedAt" IS NULL;
CREATE UNIQUE INDEX "role_permissions_self_key" ON "role_permissions"("roleId", "permissionKey") WHERE "scopeKind" = 'SELF' AND "revokedAt" IS NULL;
CREATE UNIQUE INDEX "role_permissions_branch_key" ON "role_permissions"("roleId", "permissionKey", "branchId") WHERE "scopeKind" = 'BRANCH' AND "revokedAt" IS NULL;
CREATE UNIQUE INDEX "role_permissions_team_key" ON "role_permissions"("roleId", "permissionKey", "teamId") WHERE "scopeKind" = 'TEAM' AND "revokedAt" IS NULL;
CREATE INDEX "employee_permission_overrides_employeeId_revokedAt_idx" ON "employee_permission_overrides"("employeeId", "revokedAt");

-- S03 keeps membership and access-change evidence immutable until AUD is introduced in S04.
CREATE FUNCTION "reject_organization_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'organization events are append-only';
END;
$$;
CREATE TRIGGER "organization_events_append_only" BEFORE UPDATE OR DELETE ON "organization_events" FOR EACH ROW EXECUTE FUNCTION "reject_organization_event_mutation"();

CREATE FUNCTION "enforce_employee_reporting_scope"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  manager_branch uuid;
  manager_team uuid;
  invalid_subordinate boolean;
  reporting_cycle boolean;
BEGIN
  IF NEW."reportsToId" IS NOT NULL THEN
    SELECT "homeBranchId", "homeTeamId" INTO manager_branch, manager_team
    FROM "employees" WHERE "id" = NEW."reportsToId" AND "organizationId" = NEW."organizationId";
    IF manager_branch IS NULL OR manager_branch <> NEW."homeBranchId" OR manager_team <> NEW."homeTeamId" THEN
      RAISE EXCEPTION 'reporting manager must belong to the employee home team';
    END IF;

    WITH RECURSIVE manager_chain("id", "reportsToId", "path", "cycle") AS (
      SELECT employee."id", employee."reportsToId", ARRAY[employee."id"], false
      FROM "employees" employee
      WHERE employee."id" = NEW."reportsToId" AND employee."organizationId" = NEW."organizationId"
      UNION ALL
      SELECT parent."id", parent."reportsToId", chain."path" || parent."id", parent."id" = ANY(chain."path")
      FROM "employees" parent
      JOIN manager_chain chain ON parent."id" = chain."reportsToId" AND parent."organizationId" = NEW."organizationId"
      WHERE NOT chain."cycle"
    )
    SELECT COALESCE(bool_or("id" = NEW."id" OR "cycle"), false) INTO reporting_cycle FROM manager_chain;
    IF reporting_cycle THEN
      RAISE EXCEPTION 'reporting relationship would create a cycle';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM "employees" subordinate
    WHERE subordinate."reportsToId" = NEW."id"
      AND (subordinate."organizationId" <> NEW."organizationId"
        OR subordinate."homeBranchId" <> NEW."homeBranchId"
        OR subordinate."homeTeamId" <> NEW."homeTeamId")
  ) INTO invalid_subordinate;
  IF invalid_subordinate THEN
    RAISE EXCEPTION 'employee cannot move outside a direct report home team';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "employees_reporting_scope_guard"
BEFORE INSERT OR UPDATE ON "employees"
FOR EACH ROW EXECUTE FUNCTION "enforce_employee_reporting_scope"();

CREATE FUNCTION "require_active_staff_identity_for_employee"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  identity_kind "AccountKind";
  identity_state "AccountState";
BEGIN
  SELECT "kind", "state" INTO identity_kind, identity_state FROM "accounts" WHERE "id" = NEW."accountId";
  IF identity_kind IS DISTINCT FROM 'STAFF'::"AccountKind" OR identity_state IS DISTINCT FROM 'ACTIVE'::"AccountState" THEN
    RAISE EXCEPTION 'employee must be linked to an active Staff identity';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "employees_active_staff_identity_guard"
BEFORE INSERT OR UPDATE OF "accountId" ON "employees"
FOR EACH ROW EXECUTE FUNCTION "require_active_staff_identity_for_employee"();
