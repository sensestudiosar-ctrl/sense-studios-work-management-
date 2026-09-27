CREATE TYPE "ApprovalRequestState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ApprovalDecisionOutcome" AS ENUM ('APPROVED', 'REJECTED');

CREATE TABLE "approval_requests" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "typeKey" VARCHAR(120) NOT NULL,
  "sourceType" VARCHAR(100) NOT NULL,
  "sourceId" VARCHAR(200) NOT NULL,
  "sourceGeneration" INTEGER NOT NULL DEFAULT 1,
  "requesterId" UUID NOT NULL,
  "approverId" UUID NOT NULL,
  "approvalLevel" VARCHAR(80) NOT NULL,
  "state" "ApprovalRequestState" NOT NULL DEFAULT 'PENDING',
  "reason" VARCHAR(1000) NOT NULL,
  "comment" VARCHAR(2000),
  "context" JSONB NOT NULL,
  "evidence" JSONB,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3),
  "resolvedAt" TIMESTAMPTZ(3),
  "delegationAccountId" UUID,
  "delegationIssuedById" UUID,
  "delegationReason" VARCHAR(1000),
  "delegatedAt" TIMESTAMPTZ(3),
  "delegationExpiresAt" TIMESTAMPTZ(3),
  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_requests_id_organizationId_key" UNIQUE ("id", "organizationId"),
  CONSTRAINT "approval_requests_source_key" UNIQUE ("organizationId", "typeKey", "sourceType", "sourceId", "sourceGeneration"),
  CONSTRAINT "approval_requests_generation_check" CHECK ("sourceGeneration" > 0),
  CONSTRAINT "approval_requests_resolved_check" CHECK (("state" = 'PENDING' AND "resolvedAt" IS NULL) OR ("state" <> 'PENDING' AND "resolvedAt" IS NOT NULL)),
  CONSTRAINT "approval_requests_delegation_check" CHECK (("delegationAccountId" IS NULL AND "delegationIssuedById" IS NULL AND "delegationReason" IS NULL AND "delegatedAt" IS NULL AND "delegationExpiresAt" IS NULL) OR ("delegationAccountId" IS NOT NULL AND "delegationIssuedById" IS NOT NULL AND "delegationReason" IS NOT NULL AND "delegatedAt" IS NOT NULL AND "delegationExpiresAt" IS NOT NULL AND "delegationExpiresAt" > "delegatedAt"))
);

CREATE INDEX "approval_requests_organizationId_state_requestedAt_id_idx" ON "approval_requests"("organizationId", "state", "requestedAt", "id");
CREATE INDEX "approval_requests_approverId_state_requestedAt_id_idx" ON "approval_requests"("approverId", "state", "requestedAt", "id");
CREATE INDEX "approval_requests_delegationAccountId_state_requestedAt_id_idx" ON "approval_requests"("delegationAccountId", "state", "requestedAt", "id");

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_delegationAccountId_fkey" FOREIGN KEY ("delegationAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_delegationIssuedById_fkey" FOREIGN KEY ("delegationIssuedById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "approval_decisions" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "outcome" "ApprovalDecisionOutcome" NOT NULL,
  "deciderId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "comment" VARCHAR(2000),
  "evidence" JSONB,
  "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_decisions_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "approval_decisions_requestId_organizationId_key" UNIQUE ("requestId", "organizationId")
);

CREATE INDEX "approval_decisions_organizationId_decidedAt_idx" ON "approval_decisions"("organizationId", "decidedAt");
CREATE INDEX "approval_decisions_deciderId_decidedAt_idx" ON "approval_decisions"("deciderId", "decidedAt");
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_request_org_fkey" FOREIGN KEY ("requestId", "organizationId") REFERENCES "approval_requests"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_deciderId_fkey" FOREIGN KEY ("deciderId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Staff identities are organization members. Owners are organization-wide actors.
CREATE FUNCTION "check_approval_actor_organization"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor_id UUID;
  org_id UUID;
  actor_kind "AccountKind";
  actor_org UUID;
BEGIN
  IF TG_TABLE_NAME = 'approval_requests' THEN
    org_id := NEW."organizationId";
    FOREACH actor_id IN ARRAY ARRAY[NEW."requesterId", NEW."approverId", NEW."delegationAccountId", NEW."delegationIssuedById"] LOOP
      IF actor_id IS NULL THEN CONTINUE; END IF;
      SELECT a."kind", e."organizationId" INTO actor_kind, actor_org
      FROM "accounts" a LEFT JOIN "employees" e ON e."accountId" = a."id" WHERE a."id" = actor_id;
      IF actor_kind IS NULL OR (actor_kind = 'STAFF' AND actor_org IS DISTINCT FROM org_id) THEN
        RAISE EXCEPTION 'Approval actor must belong to the request organization';
      END IF;
    END LOOP;
  ELSE
    org_id := NEW."organizationId";
    SELECT a."kind", e."organizationId" INTO actor_kind, actor_org
    FROM "accounts" a LEFT JOIN "employees" e ON e."accountId" = a."id" WHERE a."id" = NEW."deciderId";
    IF actor_kind IS NULL OR (actor_kind = 'STAFF' AND actor_org IS DISTINCT FROM org_id) THEN
      RAISE EXCEPTION 'Approval decider must belong to the request organization';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "approval_requests_actor_organization" BEFORE INSERT OR UPDATE OF "organizationId", "requesterId", "approverId", "delegationAccountId", "delegationIssuedById" ON "approval_requests" FOR EACH ROW EXECUTE FUNCTION "check_approval_actor_organization"();
CREATE TRIGGER "approval_decisions_actor_organization" BEFORE INSERT OR UPDATE OF "organizationId", "deciderId" ON "approval_decisions" FOR EACH ROW EXECUTE FUNCTION "check_approval_actor_organization"();

-- Decision evidence is append-only, and the request projection must agree at commit.
CREATE FUNCTION "reject_approval_decision_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Approval decisions are append-only';
END $$;
CREATE TRIGGER "approval_decisions_immutable" BEFORE UPDATE OR DELETE ON "approval_decisions" FOR EACH ROW EXECUTE FUNCTION "reject_approval_decision_mutation"();

CREATE FUNCTION "reject_approval_reopen"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."state" <> 'PENDING' AND NEW."state" IS DISTINCT FROM OLD."state" THEN
    RAISE EXCEPTION 'Resolved approvals cannot be reopened or changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "approval_requests_terminal_state" BEFORE UPDATE OF "state" ON "approval_requests" FOR EACH ROW EXECUTE FUNCTION "reject_approval_reopen"();

CREATE FUNCTION "check_approval_resolution"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  request_id UUID;
  request_state "ApprovalRequestState";
  decision_outcome "ApprovalDecisionOutcome";
BEGIN
  IF TG_TABLE_NAME = 'approval_requests' THEN
    request_id := COALESCE(NEW."id", OLD."id");
  ELSE
    request_id := COALESCE(NEW."requestId", OLD."requestId");
  END IF;
  SELECT r."state", d."outcome" INTO request_state, decision_outcome
  FROM "approval_requests" r LEFT JOIN "approval_decisions" d ON d."requestId" = r."id"
  WHERE r."id" = request_id;
  IF request_state IS NULL THEN RETURN NULL; END IF;
  IF request_state = 'PENDING' AND decision_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Pending approval cannot have a decision';
  END IF;
  IF request_state IN ('APPROVED', 'REJECTED') AND decision_outcome::text IS DISTINCT FROM request_state::text THEN
    RAISE EXCEPTION 'Resolved approval requires matching decision evidence';
  END IF;
  IF request_state = 'WITHDRAWN' AND decision_outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Withdrawn approval cannot have a decision';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "approval_request_resolution_consistency" AFTER INSERT OR UPDATE ON "approval_requests" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_approval_resolution"();
CREATE CONSTRAINT TRIGGER "approval_decision_resolution_consistency" AFTER INSERT ON "approval_decisions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_approval_resolution"();

-- S05 lifecycle events are persisted through the same versioned event catalogue.
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
  'task.created', 'task.assigned', 'task.started', 'task.waiting', 'task.overdue', 'task.completed', 'task.deadline_changed',
  'review.requested', 'review.started', 'review.correction_requested', 'review.approved',
  'client.review_requested', 'client.revision_requested', 'client.approved',
  'document.uploaded', 'revision.created', 'document.approved', 'document.issued', 'document.superseded',
  'time.started', 'time.logged', 'time.changed', 'leave.requested', 'leave.approved', 'attendance.checked_in',
  'employee_performance.changed', 'project_health.changed', 'capacity.threshold_exceeded',
  'approval.requested', 'approval.delegated', 'approval.withdrawn', 'approval.decided'
));
