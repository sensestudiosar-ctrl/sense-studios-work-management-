-- CreateTable
CREATE TABLE "turnkey_releases" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    "designs" JSONB NOT NULL,
    "lines" JSONB NOT NULL,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "currency" CHAR(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacesReleaseId" UUID,
    "replacedById" UUID,
    "changeReason" VARCHAR(1000),
    "costApproverId" UUID,
    "costApprovalId" UUID,
    "procurementApproverId" UUID,
    "procurementApprovalId" UUID,
    "procurementStatus" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
    "factoryStatus" VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT "turnkey_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnkey_prices" (
    "releaseId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "prices" JSONB NOT NULL,

    CONSTRAINT "turnkey_prices_pkey" PRIMARY KEY ("releaseId")
);

-- CreateTable
CREATE TABLE "turnkey_history" (
    "id" UUID NOT NULL,
    "releaseId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "eventName" VARCHAR(120) NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,
    "releaseVersion" INTEGER NOT NULL,

    CONSTRAINT "turnkey_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnkey_cost_shares" (
    "id" UUID NOT NULL,
    "releaseId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "turnkey_cost_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_releases_replacedById_key" ON "turnkey_releases"("replacedById");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_releases_costApprovalId_key" ON "turnkey_releases"("costApprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_releases_procurementApprovalId_key" ON "turnkey_releases"("procurementApprovalId");

-- CreateIndex
CREATE INDEX "turnkey_releases_organizationId_projectId_createdAt_idx" ON "turnkey_releases"("organizationId", "projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_releases_id_organizationId_projectId_key" ON "turnkey_releases"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_history_eventId_key" ON "turnkey_history"("eventId");

-- CreateIndex
CREATE INDEX "turnkey_history_organizationId_projectId_occurredAt_idx" ON "turnkey_history"("organizationId", "projectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_history_releaseId_releaseVersion_key" ON "turnkey_history"("releaseId", "releaseVersion");

-- CreateIndex
CREATE UNIQUE INDEX "turnkey_cost_shares_releaseId_accountId_key" ON "turnkey_cost_shares"("releaseId", "accountId");

-- Additive S19 constraints. Existing rows/tables are not rewritten.
ALTER TABLE "turnkey_releases"
 ADD CONSTRAINT "turnkey_release_project_fk" FOREIGN KEY ("projectId", "organizationId") REFERENCES "projects"("id", "organizationId") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_release_creator_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_release_previous_fk" FOREIGN KEY ("replacesReleaseId", "organizationId", "projectId") REFERENCES "turnkey_releases"("id", "organizationId", "projectId") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_release_next_fk" FOREIGN KEY ("replacedById", "organizationId", "projectId") REFERENCES "turnkey_releases"("id", "organizationId", "projectId") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_cost_approval_fk" FOREIGN KEY ("costApprovalId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_procurement_approval_fk" FOREIGN KEY ("procurementApprovalId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_release_valid" CHECK ("version">0 AND "state" IN ('DRAFT','COST_PENDING','COST_APPROVED','COST_REJECTED','PROCUREMENT_PENDING','PROCUREMENT_REJECTED','RELEASED') AND "currency" ~ '^[A-Z]{3}$' AND length(trim("reason")) BETWEEN 3 AND 1000 AND jsonb_typeof("designs")='array' AND jsonb_array_length("designs") BETWEEN 1 AND 50 AND jsonb_typeof("lines")='array' AND jsonb_array_length("lines") BETWEEN 1 AND 100 AND jsonb_typeof("materials")='array' AND "procurementStatus" IN ('NOT_STARTED','IN_PROGRESS','COMPLETED') AND "factoryStatus" IN ('NOT_STARTED','IN_PROGRESS','COMPLETED') AND (("replacesReleaseId" IS NULL AND "changeReason" IS NULL) OR ("replacesReleaseId" IS NOT NULL AND length(trim("changeReason")) BETWEEN 3 AND 1000)));
ALTER TABLE "turnkey_prices" ADD CONSTRAINT "turnkey_prices_release_fk" FOREIGN KEY ("releaseId", "organizationId", "projectId") REFERENCES "turnkey_releases"("id", "organizationId", "projectId") ON DELETE RESTRICT;
ALTER TABLE "turnkey_history"
 ADD CONSTRAINT "turnkey_history_release_fk" FOREIGN KEY ("releaseId", "organizationId", "projectId") REFERENCES "turnkey_releases"("id", "organizationId", "projectId") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_history_event_fk" FOREIGN KEY ("eventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_history_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "turnkey_cost_shares"
 ADD CONSTRAINT "turnkey_share_release_fk" FOREIGN KEY ("releaseId", "organizationId", "projectId") REFERENCES "turnkey_releases"("id", "organizationId", "projectId") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_share_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
 ADD CONSTRAINT "turnkey_share_creator_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;

CREATE FUNCTION s19_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S19 retained evidence is immutable'; END $$;
CREATE TRIGGER s19_prices_immutable BEFORE UPDATE OR DELETE ON "turnkey_prices" FOR EACH ROW EXECUTE FUNCTION s19_immutable();
CREATE TRIGGER s19_history_immutable BEFORE UPDATE OR DELETE ON "turnkey_history" FOR EACH ROW EXECUTE FUNCTION s19_immutable();
CREATE TRIGGER s19_release_retained BEFORE DELETE ON "turnkey_releases" FOR EACH ROW EXECUTE FUNCTION s19_immutable();
CREATE TRIGGER s19_share_retained BEFORE DELETE ON "turnkey_cost_shares" FOR EACH ROW EXECUTE FUNCTION s19_immutable();

CREATE FUNCTION s19_release_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE design jsonb; request_row "approval_requests"%ROWTYPE; prior "turnkey_releases"%ROWTYPE; line jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "projects" WHERE "id"=NEW."projectId" AND "organizationId"=NEW."organizationId" AND "deliveryType"='TURNKEY' AND "status"='ACTIVE') THEN RAISE EXCEPTION 'S19 requires an Active Turnkey project'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW."state"<>'DRAFT' OR NEW."version"<>1 OR NEW."costApprovalId" IS NOT NULL OR NEW."procurementApprovalId" IS NOT NULL OR NEW."replacedById" IS NOT NULL OR NEW."procurementStatus"<>'NOT_STARTED' OR NEW."factoryStatus"<>'NOT_STARTED' THEN RAISE EXCEPTION 'Invalid new S19 release'; END IF;
 ELSE
  IF NEW."id"<>OLD."id" OR NEW."organizationId"<>OLD."organizationId" OR NEW."projectId"<>OLD."projectId" OR NEW."createdById"<>OLD."createdById" OR NEW."createdAt"<>OLD."createdAt" OR NEW."reason"<>OLD."reason" OR NEW."designs"<>OLD."designs" OR NEW."lines"<>OLD."lines" OR NEW."currency"<>OLD."currency" OR NEW."replacesReleaseId" IS DISTINCT FROM OLD."replacesReleaseId" OR NEW."changeReason" IS DISTINCT FROM OLD."changeReason" OR NEW."version"<>OLD."version"+1 THEN RAISE EXCEPTION 'S19 input snapshot is immutable and versioned'; END IF;
  IF NEW."state"<>OLD."state" AND NOT ((OLD."state"='DRAFT' AND NEW."state"='COST_PENDING') OR (OLD."state"='COST_PENDING' AND NEW."state" IN ('COST_APPROVED','COST_REJECTED')) OR (OLD."state"='COST_APPROVED' AND NEW."state"='PROCUREMENT_PENDING') OR (OLD."state"='PROCUREMENT_PENDING' AND NEW."state" IN ('RELEASED','PROCUREMENT_REJECTED'))) THEN RAISE EXCEPTION 'Invalid S19 state transition'; END IF;
  IF NEW."materials"<>OLD."materials" AND NOT (OLD."state"='COST_APPROVED' AND NEW."state"='COST_APPROVED') THEN RAISE EXCEPTION 'S19 materials are fixed after procurement request'; END IF;
  IF OLD."costApprovalId" IS NOT NULL AND (NEW."costApprovalId" IS DISTINCT FROM OLD."costApprovalId" OR NEW."costApproverId" IS DISTINCT FROM OLD."costApproverId") THEN RAISE EXCEPTION 'S19 cost approval binding is immutable'; END IF;
  IF OLD."procurementApprovalId" IS NOT NULL AND (NEW."procurementApprovalId" IS DISTINCT FROM OLD."procurementApprovalId" OR NEW."procurementApproverId" IS DISTINCT FROM OLD."procurementApproverId") THEN RAISE EXCEPTION 'S19 procurement approval binding is immutable'; END IF;
  IF OLD."replacedById" IS NOT NULL AND NEW."replacedById" IS DISTINCT FROM OLD."replacedById" THEN RAISE EXCEPTION 'S19 replacement evidence is immutable'; END IF;
  IF NEW."procurementStatus"<>OLD."procurementStatus" OR NEW."factoryStatus"<>OLD."factoryStatus" THEN
   IF OLD."state"<>'RELEASED' OR OLD."replacedById" IS NOT NULL THEN RAISE EXCEPTION 'S19 progress needs current released inputs'; END IF;
   IF NEW."procurementStatus"<>OLD."procurementStatus" AND NOT ((OLD."procurementStatus"='NOT_STARTED' AND NEW."procurementStatus"='IN_PROGRESS') OR (OLD."procurementStatus"='IN_PROGRESS' AND NEW."procurementStatus"='COMPLETED')) THEN RAISE EXCEPTION 'Invalid procurement transition'; END IF;
   IF NEW."factoryStatus"<>OLD."factoryStatus" AND NOT (NEW."procurementStatus"='COMPLETED' AND ((OLD."factoryStatus"='NOT_STARTED' AND NEW."factoryStatus"='IN_PROGRESS') OR (OLD."factoryStatus"='IN_PROGRESS' AND NEW."factoryStatus"='COMPLETED'))) THEN RAISE EXCEPTION 'Invalid factory transition'; END IF;
  END IF;
 END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(NEW."lines") LOOP
  IF NOT (line ?& ARRAY['key','description','quantity','unit']) OR line->>'quantity' !~ '^\d{1,12}(\.\d{1,4})?$' OR (line->>'quantity')::numeric<=0 OR line - ARRAY['key','description','quantity','unit']::text[] <> '{}'::jsonb THEN RAISE EXCEPTION 'Invalid operational BOQ line'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'key') FROM jsonb_array_elements(NEW."lines"))<>jsonb_array_length(NEW."lines") THEN RAISE EXCEPTION 'Duplicate BOQ key'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(NEW."materials") LOOP
  IF NOT (line ?& ARRAY['lineKey','material']) OR line - ARRAY['lineKey','material']::text[] <> '{}'::jsonb OR length(trim(line->>'material'))<2 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW."lines") boq WHERE boq->>'key'=line->>'lineKey') THEN RAISE EXCEPTION 'Invalid S19 operational material'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'lineKey') FROM jsonb_array_elements(NEW."materials"))<>jsonb_array_length(NEW."materials") THEN RAISE EXCEPTION 'Duplicate S19 material key'; END IF;
 IF (SELECT count(DISTINCT value->>'drawingId') FROM jsonb_array_elements(NEW."designs"))<>jsonb_array_length(NEW."designs") THEN RAISE EXCEPTION 'Distinct S19 design documents required'; END IF;
 IF TG_OP='INSERT' OR (NEW."state" IS DISTINCT FROM OLD."state" AND NEW."state" NOT IN ('COST_REJECTED','PROCUREMENT_REJECTED')) THEN
  FOR design IN SELECT value FROM jsonb_array_elements(NEW."designs") LOOP
   IF NOT EXISTS (SELECT 1 FROM "document_revisions" r JOIN "drawing_records" d ON d."id"=r."drawingId" WHERE r."id"=(design->>'revisionId')::uuid AND r."projectId"=NEW."projectId" AND r."organizationId"=NEW."organizationId" AND r."drawingId"=(design->>'drawingId')::uuid AND r."sha256"=design->>'sha256' AND r."isCurrent" AND r."state" IN ('APPROVED','ISSUED') AND EXISTS (SELECT 1 FROM "revision_approval_facts" f WHERE f."revisionId"=r."id" AND f."kind"='INTERNAL') AND (NOT d."clientApprovalRequired" AND r."series"<>'CR' OR EXISTS (SELECT 1 FROM "revision_approval_facts" f WHERE f."revisionId"=r."id" AND f."kind"='CLIENT'))) THEN RAISE EXCEPTION 'S19 exact current approved design required'; END IF;
  END LOOP;
 END IF;
 IF NEW."state"<>'DRAFT' THEN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id"=NEW."costApprovalId";
  IF NOT FOUND OR request_row."sourceId"<>NEW."id"::text OR request_row."organizationId"<>NEW."organizationId" OR request_row."typeKey"<>'turnkey.cost' OR request_row."approverId"<>NEW."costApproverId" OR request_row."requesterId"=request_row."approverId" OR (NEW."state"='COST_PENDING' AND request_row."state"<>'PENDING') OR (NEW."state"='COST_REJECTED' AND request_row."state"<>'REJECTED') OR (NEW."state" NOT IN ('COST_PENDING','COST_REJECTED') AND request_row."state"<>'APPROVED') THEN RAISE EXCEPTION 'S19 exact cost request/decision required'; END IF;
 END IF;
 IF NEW."state" IN ('PROCUREMENT_PENDING','PROCUREMENT_REJECTED','RELEASED') THEN
  SELECT * INTO request_row FROM "approval_requests" WHERE "id"=NEW."procurementApprovalId";
  IF NOT FOUND OR request_row."sourceId"<>NEW."id"::text OR request_row."organizationId"<>NEW."organizationId" OR request_row."typeKey"<>'turnkey.procurement' OR request_row."approverId"<>NEW."procurementApproverId" OR request_row."requesterId"=request_row."approverId" OR (NEW."state"='PROCUREMENT_PENDING' AND request_row."state"<>'PENDING') OR (NEW."state"='PROCUREMENT_REJECTED' AND request_row."state"<>'REJECTED') OR (NEW."state"='RELEASED' AND request_row."state"<>'APPROVED') OR jsonb_array_length(NEW."materials")<>jsonb_array_length(NEW."lines") THEN RAISE EXCEPTION 'S19 exact procurement request/decision/materials required'; END IF;
 END IF;
 IF NEW."replacedById" IS NOT NULL THEN
  SELECT * INTO prior FROM "turnkey_releases" WHERE "id"=NEW."replacedById";
  IF NOT FOUND OR prior."replacesReleaseId"<>NEW."id" OR prior."projectId"<>NEW."projectId" THEN RAISE EXCEPTION 'S19 replacement needs explicit change request'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s19_release_guard BEFORE INSERT OR UPDATE ON "turnkey_releases" FOR EACH ROW EXECUTE FUNCTION s19_release_guard();

CREATE FUNCTION s19_prices_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE release_row "turnkey_releases"%ROWTYPE; price jsonb;
BEGIN
 SELECT * INTO release_row FROM "turnkey_releases" WHERE "id"=NEW."releaseId";
 IF NOT FOUND OR jsonb_typeof(NEW."prices")<>'array' OR jsonb_array_length(NEW."prices")<>jsonb_array_length(release_row."lines") OR (SELECT count(DISTINCT value->>'key') FROM jsonb_array_elements(NEW."prices"))<>jsonb_array_length(NEW."prices") THEN RAISE EXCEPTION 'S19 matching immutable prices required'; END IF;
 FOR price IN SELECT value FROM jsonb_array_elements(NEW."prices") LOOP
  IF NOT (price ?& ARRAY['key','unitPrice']) OR price - ARRAY['key','unitPrice']::text[] <> '{}'::jsonb OR price->>'unitPrice' !~ '^\d{1,12}(\.\d{1,4})?$' OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(release_row."lines") line WHERE line->>'key'=price->>'key') THEN RAISE EXCEPTION 'Invalid S19 price'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER s19_prices_guard BEFORE INSERT ON "turnkey_prices" FOR EACH ROW EXECUTE FUNCTION s19_prices_guard();

CREATE FUNCTION s19_share_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW."id",NEW."releaseId",NEW."organizationId",NEW."projectId",NEW."accountId",NEW."createdById",NEW."reason",NEW."createdAt") IS DISTINCT FROM ROW(OLD."id",OLD."releaseId",OLD."organizationId",OLD."projectId",OLD."accountId",OLD."createdById",OLD."reason",OLD."createdAt") THEN RAISE EXCEPTION 'S19 share identity is immutable'; END IF;
 IF NOT EXISTS (SELECT 1 FROM "accounts" WHERE "id"=NEW."createdById" AND "kind"='OWNER') OR NOT EXISTS (SELECT 1 FROM "accounts" WHERE "id"=NEW."accountId" AND "kind"='CLIENT') OR NOT EXISTS (SELECT 1 FROM "turnkey_releases" WHERE "id"=NEW."releaseId" AND "state" IN ('COST_APPROVED','PROCUREMENT_PENDING','PROCUREMENT_REJECTED','RELEASED')) THEN RAISE EXCEPTION 'S19 Owner-approved cost share required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s19_share_guard BEFORE INSERT OR UPDATE ON "turnkey_cost_shares" FOR EACH ROW EXECUTE FUNCTION s19_share_guard();

CREATE FUNCTION s19_release_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_row "turnkey_releases"%ROWTYPE;
BEGIN
 SELECT * INTO current_row FROM "turnkey_releases" WHERE "id"=NEW."id";
 IF NOT EXISTS (SELECT 1 FROM "turnkey_history" h JOIN "domain_events" e ON e."id"=h."eventId" JOIN "audit_events" a ON a."id"=(e."payload"->>'auditEventId')::uuid WHERE h."releaseId"=NEW."id" AND h."releaseVersion"=NEW."version" AND h."organizationId"=NEW."organizationId" AND e."subjectId"=NEW."id"::text AND e."eventName"=h."eventName" AND a."eventKey"=h."eventName" AND a."actorId"=h."actorId" AND a."subjectId"=NEW."id"::text AND (a."after"->>'version')::integer=NEW."version") OR NOT EXISTS (SELECT 1 FROM "turnkey_prices" WHERE "releaseId"=NEW."id") THEN RAISE EXCEPTION 'S19 canonical audit/history/prices required'; END IF;
 IF current_row."replacedById" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "turnkey_releases" WHERE "id"=current_row."replacedById" AND "state"='RELEASED' AND "replacesReleaseId"=current_row."id") THEN RAISE EXCEPTION 'S19 replacement requires approved release'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER s19_release_evidence AFTER INSERT OR UPDATE ON "turnkey_releases" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s19_release_evidence();

-- Preserve the entire existing persisted event catalogue and add S19 names.
DO $$
DECLARE prior_expression TEXT;
BEGIN
 SELECT pg_get_expr(conbin, conrelid) INTO prior_expression FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check' AND contype='c';
 IF prior_expression IS NULL THEN RAISE EXCEPTION 'Existing event catalogue constraint required'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''turnkey.release_created'',''turnkey.release_replaced'',''turnkey.cost_requested'',''turnkey.cost_decided'',''turnkey.materials_selected'',''turnkey.procurement_requested'',''turnkey.procurement_decided'',''turnkey.progress_changed'',''turnkey.cost_shared''))',prior_expression);
END $$;
