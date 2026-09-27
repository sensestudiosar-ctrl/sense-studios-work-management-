-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'MEETING_DISCUSSION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "crm_sources" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crm_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "contactName" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(64),
    "sourceId" UUID NOT NULL,
    "clientId" UUID,
    "priorLostLeadId" UUID,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "outcomeAt" TIMESTAMPTZ(3),
    "lostReason" VARCHAR(1000),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_stage_changes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "fromStage" "LeadStage",
    "toStage" "LeadStage" NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "skippedStages" "LeadStage"[],
    "reason" VARCHAR(1000),
    "actorId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadVersion" INTEGER NOT NULL,

    CONSTRAINT "lead_stage_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "actorId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_sources_organizationId_name_key" ON "crm_sources"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_sources_id_organizationId_key" ON "crm_sources"("id", "organizationId");

-- CreateIndex
CREATE INDEX "clients_organizationId_name_id_idx" ON "clients"("organizationId", "name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_id_organizationId_key" ON "clients"("id", "organizationId");

-- CreateIndex
CREATE INDEX "client_contacts_clientId_idx" ON "client_contacts"("clientId");

-- CreateIndex
CREATE INDEX "leads_organizationId_branchId_stage_createdAt_id_idx" ON "leads"("organizationId", "branchId", "stage", "createdAt", "id");

-- CreateIndex
CREATE INDEX "leads_clientId_branchId_idx" ON "leads"("clientId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_organizationId_key" ON "leads"("id", "organizationId");

-- CreateIndex
CREATE INDEX "lead_stage_changes_leadId_occurredAt_id_idx" ON "lead_stage_changes"("leadId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_stage_changes_leadId_leadVersion_key" ON "lead_stage_changes"("leadId", "leadVersion");

-- CreateIndex
CREATE INDEX "lead_activities_leadId_occurredAt_id_idx" ON "lead_activities"("leadId", "occurredAt", "id");

-- AddForeignKey
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "clients"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branchId_organizationId_fkey" FOREIGN KEY ("branchId", "organizationId") REFERENCES "branches"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_sourceId_organizationId_fkey" FOREIGN KEY ("sourceId", "organizationId") REFERENCES "crm_sources"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "clients"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_priorLostLeadId_organizationId_fkey" FOREIGN KEY ("priorLostLeadId", "organizationId") REFERENCES "leads"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_leadId_organizationId_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "leads"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_organizationId_fkey" FOREIGN KEY ("leadId", "organizationId") REFERENCES "leads"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CRM invariants supplement the generated relational schema.
ALTER TABLE "clients" ADD CONSTRAINT "clients_version_positive" CHECK ("version" > 0);
ALTER TABLE "leads" ADD CONSTRAINT "leads_version_positive" CHECK ("version" > 0);
ALTER TABLE "leads" ADD CONSTRAINT "leads_outcome_consistency" CHECK (
 ("stage" IN ('WON','LOST') AND "outcomeAt" IS NOT NULL) OR
 ("stage" NOT IN ('WON','LOST') AND "outcomeAt" IS NULL));
ALTER TABLE "leads" ADD CONSTRAINT "leads_lost_reason" CHECK (
 ("stage" = 'LOST' AND "lostReason" IS NOT NULL AND length(btrim("lostReason")) >= 3) OR
 ("stage" <> 'LOST' AND "lostReason" IS NULL));
ALTER TABLE "lead_stage_changes" ALTER COLUMN "skippedStages" SET NOT NULL;
ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_shape" CHECK (
 "leadVersion" > 0 AND "direction" IN ('CREATED','FORWARD','BACKWARD','LOST') AND
 (("direction"='CREATED' AND "fromStage" IS NULL AND "toStage"='NEW' AND "leadVersion"=1) OR
 ("direction"<>'CREATED' AND "fromStage" IS NOT NULL AND "fromStage"<>"toStage")));
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_kind" CHECK ("kind" IN ('NOTE','CALL','MEETING','PROPOSAL','OTHER'));

CREATE FUNCTION "protect_crm_lead"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior_stage "LeadStage";
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Lead history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD."stage" IN ('WON','LOST') THEN RAISE EXCEPTION 'Terminal leads cannot change'; END IF;
  IF ROW(NEW."organizationId",NEW."branchId",NEW."priorLostLeadId",NEW."sourceId",NEW."clientId",NEW."createdById",NEW."createdAt") IS DISTINCT FROM
     ROW(OLD."organizationId",OLD."branchId",OLD."priorLostLeadId",OLD."sourceId",OLD."clientId",OLD."createdById",OLD."createdAt") THEN
   RAISE EXCEPTION 'Lead ownership and provenance are immutable';
  END IF;
  IF NEW."version" <> OLD."version"+1 THEN RAISE EXCEPTION 'Lead version must advance once'; END IF;
 ELSE
  IF NEW."stage" <> 'NEW' OR NEW."version" <> 1 THEN RAISE EXCEPTION 'Leads begin New'; END IF;
  IF NEW."priorLostLeadId" IS NOT NULL THEN
   SELECT "stage" INTO prior_stage FROM "leads" WHERE "id"=NEW."priorLostLeadId" AND "organizationId"=NEW."organizationId" FOR SHARE;
   IF prior_stage IS DISTINCT FROM 'LOST'::"LeadStage" THEN RAISE EXCEPTION 'Returning lead must link to Lost'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "leads_protect" BEFORE INSERT OR UPDATE OR DELETE ON "leads" FOR EACH ROW EXECUTE FUNCTION "protect_crm_lead"();

CREATE FUNCTION "reject_crm_evidence_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'CRM evidence is append-only'; END $$;
CREATE TRIGGER "lead_stage_changes_immutable" BEFORE UPDATE OR DELETE ON "lead_stage_changes" FOR EACH ROW EXECUTE FUNCTION "reject_crm_evidence_mutation"();
CREATE TRIGGER "lead_activities_immutable" BEFORE UPDATE OR DELETE ON "lead_activities" FOR EACH ROW EXECUTE FUNCTION "reject_crm_evidence_mutation"();

CREATE FUNCTION "check_crm_stage_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id UUID; current_stage "LeadStage"; evidence_stage "LeadStage"; current_version INTEGER; evidence_version INTEGER;
BEGIN
 IF TG_TABLE_NAME='leads' THEN target_id:=NEW."id"; ELSE target_id:=NEW."leadId"; END IF;
 SELECT "stage","version" INTO current_stage,current_version FROM "leads" WHERE "id"=target_id;
 SELECT "toStage","leadVersion" INTO evidence_stage,evidence_version FROM "lead_stage_changes" WHERE "leadId"=target_id ORDER BY "leadVersion" DESC LIMIT 1;
 IF evidence_stage IS DISTINCT FROM current_stage OR evidence_version > current_version THEN RAISE EXCEPTION 'Lead state requires matching stage evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "leads_stage_evidence" AFTER INSERT OR UPDATE OF "stage" ON "leads" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_crm_stage_evidence"();
CREATE CONSTRAINT TRIGGER "lead_changes_stage_evidence" AFTER INSERT ON "lead_stage_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_crm_stage_evidence"();

INSERT INTO "crm_sources" ("id","organizationId","name","builtIn","updatedAt")
 SELECT gen_random_uuid(), o."id", s.name, true, CURRENT_TIMESTAMP FROM "organizations" o CROSS JOIN (VALUES ('Referral'),('Website'),('Manual')) s(name)
 ON CONFLICT ("organizationId","name") DO NOTHING;
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
  'crm.lead.created','crm.lead.updated','crm.lead.stage_changed','crm.lead.activity_recorded','crm.client.created','crm.client.updated','crm.source.created','crm.source.updated',
  'approval.requested', 'approval.delegated', 'approval.withdrawn', 'approval.decided'
));


CREATE FUNCTION "check_crm_actor_organization"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_id UUID; actor_kind "AccountKind"; actor_org UUID;
BEGIN
 IF TG_TABLE_NAME='leads' THEN actor_id:=NEW."createdById"; ELSE actor_id:=NEW."actorId"; END IF;
 SELECT a."kind", e."organizationId" INTO actor_kind,actor_org FROM "accounts" a LEFT JOIN "employees" e ON e."accountId"=a."id" WHERE a."id"=actor_id;
 IF actor_kind IS NULL OR (actor_kind='STAFF' AND actor_org IS DISTINCT FROM NEW."organizationId") THEN RAISE EXCEPTION 'CRM actor must belong to organization'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "leads_actor_organization" BEFORE INSERT ON "leads" FOR EACH ROW EXECUTE FUNCTION "check_crm_actor_organization"();
CREATE TRIGGER "lead_changes_actor_organization" BEFORE INSERT ON "lead_stage_changes" FOR EACH ROW EXECUTE FUNCTION "check_crm_actor_organization"();
CREATE TRIGGER "lead_activities_actor_organization" BEFORE INSERT ON "lead_activities" FOR EACH ROW EXECUTE FUNCTION "check_crm_actor_organization"();

CREATE FUNCTION "protect_crm_customer_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CRM customer records cannot be deleted'; END IF;
 IF NEW."id"<>OLD."id" OR NEW."organizationId"<>OLD."organizationId" THEN RAISE EXCEPTION 'CRM customer identity cannot change'; END IF;
 IF TG_TABLE_NAME='client_contacts' THEN
  IF NEW."clientId"<>OLD."clientId" THEN RAISE EXCEPTION 'Client contact cannot move between customers'; END IF;
 ELSE
  IF NEW."version"<>OLD."version"+1 THEN RAISE EXCEPTION 'Client version must advance once'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "clients_protect" BEFORE UPDATE OR DELETE ON "clients" FOR EACH ROW EXECUTE FUNCTION "protect_crm_customer_identity"();
CREATE TRIGGER "client_contacts_protect" BEFORE UPDATE OR DELETE ON "client_contacts" FOR EACH ROW EXECUTE FUNCTION "protect_crm_customer_identity"();
