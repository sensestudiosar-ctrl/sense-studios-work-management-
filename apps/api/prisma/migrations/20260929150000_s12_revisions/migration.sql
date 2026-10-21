-- CreateEnum
CREATE TYPE "RevisionSeries" AS ENUM ('R', 'CR');

-- CreateEnum
CREATE TYPE "RevisionState" AS ENUM ('WORKING', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'ISSUED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RevisionApprovalKind" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateTable
CREATE TABLE "drawing_records" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "documentNumber" VARCHAR(80) NOT NULL,
    "normalizedNumber" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "clientApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drawing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_revisions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "drawingId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "blobId" UUID NOT NULL,
    "series" "RevisionSeries" NOT NULL,
    "number" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "state" "RevisionState" NOT NULL DEFAULT 'WORKING',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "sha256" CHAR(64) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_approval_facts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "kind" "RevisionApprovalKind" NOT NULL,
    "auditEventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_approval_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_state_changes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "fromState" "RevisionState" NOT NULL,
    "toState" "RevisionState" NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,

    CONSTRAINT "revision_state_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_transmittals" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "purpose" VARCHAR(1000) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectClosedAt" TIMESTAMPTZ(3),
    "retainUntil" TIMESTAMPTZ(3),
    "ownerNoticeAt" TIMESTAMPTZ(3),
    "holdPlacedAt" TIMESTAMPTZ(3),
    "holdReason" VARCHAR(1000),
    "backupExpiresAt" TIMESTAMPTZ(3),
    "deletionProof" JSONB,

    CONSTRAINT "drawing_transmittals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transmittal_items" (
    "clientApprovalRequired" BOOLEAN NOT NULL,
    "transmittalId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sha256" CHAR(64) NOT NULL,

    CONSTRAINT "transmittal_items_pkey" PRIMARY KEY ("transmittalId","revisionId")
);

-- CreateTable
CREATE TABLE "transmittal_recipients" (
    "transmittalId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "acknowledgementRequired" BOOLEAN NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(3),
    "note" VARCHAR(1000),

    CONSTRAINT "transmittal_recipients_pkey" PRIMARY KEY ("transmittalId","accountId")
);

-- CreateTable
CREATE TABLE "drawing_client_review_selections" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "drawingId" UUID NOT NULL,
    "drawingVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drawing_client_review_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drawing_records_id_organizationId_projectId_key" ON "drawing_records"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_records_projectId_normalizedNumber_key" ON "drawing_records"("projectId", "normalizedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_blobId_key" ON "document_revisions"("blobId");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_id_organizationId_projectId_key" ON "document_revisions"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_drawingId_series_number_key" ON "document_revisions"("drawingId", "series", "number");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_drawingId_ordinal_key" ON "document_revisions"("drawingId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "revision_approval_facts_auditEventId_key" ON "revision_approval_facts"("auditEventId");

-- CreateIndex
CREATE UNIQUE INDEX "revision_approval_facts_revisionId_kind_key" ON "revision_approval_facts"("revisionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "revision_state_changes_eventId_key" ON "revision_state_changes"("eventId");

-- CreateIndex
CREATE INDEX "revision_state_changes_revisionId_occurredAt_idx" ON "revision_state_changes"("revisionId", "occurredAt");

-- CreateIndex
CREATE INDEX "drawing_transmittals_organizationId_projectId_issuedAt_idx" ON "drawing_transmittals"("organizationId", "projectId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_transmittals_id_organizationId_projectId_key" ON "drawing_transmittals"("id", "organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_client_review_selections_drawingId_key" ON "drawing_client_review_selections"("drawingId");

-- AddForeignKey
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_drawingId_organizationId_projectId_fkey" FOREIGN KEY ("drawingId", "organizationId", "projectId") REFERENCES "drawing_records"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_approval_facts" ADD CONSTRAINT "revision_approval_facts_revisionId_organizationId_projectI_fkey" FOREIGN KEY ("revisionId", "organizationId", "projectId") REFERENCES "document_revisions"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_state_changes" ADD CONSTRAINT "revision_state_changes_revisionId_organizationId_projectId_fkey" FOREIGN KEY ("revisionId", "organizationId", "projectId") REFERENCES "document_revisions"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmittal_items" ADD CONSTRAINT "transmittal_items_transmittalId_organizationId_projectId_fkey" FOREIGN KEY ("transmittalId", "organizationId", "projectId") REFERENCES "drawing_transmittals"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmittal_recipients" ADD CONSTRAINT "transmittal_recipients_transmittalId_organizationId_projec_fkey" FOREIGN KEY ("transmittalId", "organizationId", "projectId") REFERENCES "drawing_transmittals"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_client_review_selections" ADD CONSTRAINT "drawing_client_review_selections_drawingId_organizationId__fkey" FOREIGN KEY ("drawingId", "organizationId", "projectId") REFERENCES "drawing_records"("id", "organizationId", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- S12 reviewed integrity additions: project/actor scope, canonical evidence and append-only identities.
ALTER TABLE "drawing_records" ADD CONSTRAINT "drawing_project_fk" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "drawing_records" ADD CONSTRAINT "drawing_creator_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "drawing_records" ADD CONSTRAINT "drawing_shape" CHECK (length(btrim("documentNumber")) BETWEEN 1 AND 80 AND "normalizedNumber"=lower(btrim("documentNumber")) AND length(btrim("title")) BETWEEN 1 AND 160 AND "version">0);
ALTER TABLE "document_revisions" ADD CONSTRAINT "revision_file_fk" FOREIGN KEY ("fileId","organizationId") REFERENCES "documents"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "document_revisions" ADD CONSTRAINT "revision_blob_fk" FOREIGN KEY ("blobId","organizationId") REFERENCES "file_blob_metadata"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "document_revisions" ADD CONSTRAINT "revision_creator_fk" FOREIGN KEY ("createdById") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "document_revisions" ADD CONSTRAINT "revision_shape" CHECK ("number">=CASE WHEN "series"='R' THEN 0 ELSE 1 END AND "ordinal">=0 AND "sha256" ~ '^[0-9a-f]{64}$' AND length(btrim("reason")) BETWEEN 3 AND 1000 AND (NOT "isCurrent" OR "state" IN ('APPROVED','ISSUED')));
CREATE UNIQUE INDEX "revision_one_current" ON "document_revisions"("drawingId") WHERE "isCurrent";
ALTER TABLE "revision_approval_facts" ADD CONSTRAINT "revision_approval_audit_fk" FOREIGN KEY ("auditEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT;
ALTER TABLE "revision_state_changes" ADD CONSTRAINT "revision_change_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "revision_state_changes" ADD CONSTRAINT "revision_change_event_fk" FOREIGN KEY ("eventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT;
ALTER TABLE "revision_state_changes" ADD CONSTRAINT "revision_change_shape" CHECK ("fromState"<>"toState" AND length(btrim("reason")) BETWEEN 3 AND 1000);
ALTER TABLE "drawing_transmittals" ADD CONSTRAINT "transmittal_project_fk" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "drawing_transmittals" ADD CONSTRAINT "transmittal_sender_fk" FOREIGN KEY ("senderId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "drawing_transmittals" ADD CONSTRAINT "transmittal_shape" CHECK (length(btrim("purpose")) BETWEEN 3 AND 1000 AND length(btrim("reason")) BETWEEN 3 AND 1000 AND (("projectClosedAt" IS NULL AND "retainUntil" IS NULL) OR "retainUntil"="projectClosedAt"+interval '10 years') AND (("holdPlacedAt" IS NULL)=("holdReason" IS NULL)));
ALTER TABLE "transmittal_items" ADD CONSTRAINT "transmittal_revision_fk" FOREIGN KEY ("revisionId","organizationId","projectId") REFERENCES "document_revisions"("id","organizationId","projectId") ON DELETE RESTRICT;
ALTER TABLE "transmittal_recipients" ADD CONSTRAINT "transmittal_recipient_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "transmittal_recipients" ADD CONSTRAINT "transmittal_recipient_shape" CHECK (("acknowledgedAt" IS NULL)=("note" IS NULL));
ALTER TABLE "drawing_client_review_selections" ADD CONSTRAINT "drawing_selection_actor_fk" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "drawing_client_review_selections" ADD CONSTRAINT "drawing_selection_shape" CHECK ("drawingVersion">1 AND length(btrim("reason")) BETWEEN 3 AND 1000);

CREATE FUNCTION "guard_s12_drawing"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Drawing history cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."version"<>1 OR NEW."clientApprovalRequired" THEN RAISE EXCEPTION 'Drawing begins with unselected client review and version one'; END IF;
  ELSE
    IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."documentNumber",NEW."normalizedNumber",NEW."title",NEW."createdById",NEW."createdAt") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."documentNumber",OLD."normalizedNumber",OLD."title",OLD."createdById",OLD."createdAt") OR NEW."version"<>OLD."version"+1 OR OLD."clientApprovalRequired" AND NOT NEW."clientApprovalRequired" THEN RAISE EXCEPTION 'Drawing identity and selected client gate cannot be rewritten'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "drawing_identity_guard" BEFORE INSERT OR UPDATE OR DELETE ON "drawing_records" FOR EACH ROW EXECUTE FUNCTION "guard_s12_drawing"();

CREATE FUNCTION "guard_s12_revision"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE max_number INTEGER; max_ordinal INTEGER;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revision evidence cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    PERFORM 1 FROM "drawing_records" WHERE "id"=NEW."drawingId" FOR UPDATE;
    SELECT max("number") INTO max_number FROM "document_revisions" WHERE "drawingId"=NEW."drawingId" AND "series"=NEW."series";
    SELECT max("ordinal") INTO max_ordinal FROM "document_revisions" WHERE "drawingId"=NEW."drawingId";
    IF NEW."state"<>'WORKING' OR NEW."isCurrent" OR NEW."number"<>coalesce(max_number,CASE WHEN NEW."series"='R' THEN -1 ELSE 0 END)+1 OR NEW."ordinal"<>coalesce(max_ordinal,-1)+1 THEN RAISE EXCEPTION 'Revision must begin Working with consecutive series and ordinal'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "file_blob_metadata" b JOIN "documents" d ON d."id"=b."documentId" AND d."organizationId"=b."organizationId" WHERE b."id"=NEW."blobId" AND d."id"=NEW."fileId" AND d."organizationId"=NEW."organizationId" AND d."projectId"=NEW."projectId" AND b."sha256"=NEW."sha256") THEN RAISE EXCEPTION 'Revision file/blob/checksum must match exact project'; END IF;
  ELSE
    IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."drawingId",NEW."fileId",NEW."blobId",NEW."series",NEW."number",NEW."ordinal",NEW."sha256",NEW."reason",NEW."createdById",NEW."createdAt") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."drawingId",OLD."fileId",OLD."blobId",OLD."series",OLD."number",OLD."ordinal",OLD."sha256",OLD."reason",OLD."createdById",OLD."createdAt") THEN RAISE EXCEPTION 'Revision identity/content evidence is immutable'; END IF;
    IF NOT ((OLD."state"='WORKING' AND NEW."state"='SUBMITTED') OR (OLD."state"='SUBMITTED' AND NEW."state" IN ('REVIEWED','APPROVED')) OR (OLD."state"='REVIEWED' AND NEW."state"='APPROVED') OR (OLD."state"='APPROVED' AND NEW."state" IN ('ISSUED','SUPERSEDED')) OR (OLD."state"='ISSUED' AND NEW."state"='SUPERSEDED')) THEN RAISE EXCEPTION 'Invalid revision lifecycle transition'; END IF;
    IF NEW."state"='SUPERSEDED' AND (NOT OLD."isCurrent" OR NEW."isCurrent") OR NEW."state"='APPROVED' AND NOT NEW."isCurrent" OR NEW."state"='ISSUED' AND NOT NEW."isCurrent" THEN RAISE EXCEPTION 'Invalid current revision transition'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "revision_identity_guard" BEFORE INSERT OR UPDATE OR DELETE ON "document_revisions" FOR EACH ROW EXECUTE FUNCTION "guard_s12_revision"();

CREATE FUNCTION "s12_exact_evidence"(audit_id UUID, revision_id UUID, event_key TEXT) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM "audit_events" a JOIN "document_revisions" r ON r."id"=revision_id JOIN "accounts" actor ON actor."id"=a."actorId" WHERE a."id"=audit_id AND a."organizationId"=r."organizationId" AND a."eventKey"=event_key AND a."actorId" IS NOT NULL AND length(btrim(a."reason")) BETWEEN 3 AND 1000 AND a."actorSnapshot"->>'accountId'=a."actorId"::text AND a."after"->>'projectId'=r."projectId"::text AND a."after"->>'drawingId'=r."drawingId"::text AND a."after"->>'revisionId'=r."id"::text AND a."after"->>'blobId'=r."blobId"::text AND a."after"->>'sha256'=r."sha256" AND "s11_canonical_delivery"(a."id"))
$$;
CREATE FUNCTION "check_s12_approval"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT "s12_exact_evidence"(NEW."auditEventId",NEW."revisionId",CASE WHEN NEW."kind"='INTERNAL' THEN 'review.approved' ELSE 'client.approved' END) THEN RAISE EXCEPTION 'Approval requires canonical exact downstream evidence'; END IF;
 IF NEW."kind"='CLIENT' AND NOT EXISTS(SELECT 1 FROM "revision_approval_facts" internal JOIN "audit_events" ia ON ia."id"=internal."auditEventId" JOIN "audit_events" ca ON ca."id"=NEW."auditEventId" WHERE internal."revisionId"=NEW."revisionId" AND internal."kind"='INTERNAL' AND ca."occurredAt">=ia."occurredAt") THEN RAISE EXCEPTION 'Client approval follows exact internal approval'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "approval_exact_evidence" AFTER INSERT ON "revision_approval_facts" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_approval"();

CREATE FUNCTION "check_s12_revision_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."eventKey"='revision.created' AND a."subjectId"=NEW."id"::text AND a."actorId"=NEW."createdById" AND a."reason"=NEW."reason" AND "s12_exact_evidence"(a."id",NEW."id",'revision.created') AND a."after"->>'series'=NEW."series"::text AND a."after"->>'number'=NEW."number"::text AND a."after"->>'ordinal'=NEW."ordinal"::text) THEN RAISE EXCEPTION 'Revision creation requires canonical evidence'; END IF;
 ELSE
  event_key:=CASE NEW."state" WHEN 'APPROVED' THEN 'document.approved' WHEN 'ISSUED' THEN 'document.issued' WHEN 'SUPERSEDED' THEN 'document.superseded' ELSE 'revision.state_changed' END;
  IF NOT EXISTS(SELECT 1 FROM "revision_state_changes" h JOIN "domain_events" e ON e."id"=h."eventId" JOIN "audit_events" a ON a."id"::text=e."payload"->>'auditEventId' WHERE h."revisionId"=NEW."id" AND h."fromState"=OLD."state" AND h."toState"=NEW."state" AND h."actorId"=a."actorId" AND h."reason"=a."reason" AND a."before"->>'state'=OLD."state"::text AND a."after"->>'state'=NEW."state"::text AND a."after"->>'isCurrent'=NEW."isCurrent"::text AND "s12_exact_evidence"(a."id",NEW."id",event_key)) THEN RAISE EXCEPTION 'Revision transition requires immutable canonical history'; END IF;
  IF NEW."state"='APPROVED' AND NOT EXISTS(SELECT 1 FROM "revision_approval_facts" WHERE "revisionId"=NEW."id" AND "kind"='INTERNAL') THEN RAISE EXCEPTION 'Approval transition requires internal fact'; END IF;
  IF NEW."state"='SUPERSEDED' AND NOT EXISTS(SELECT 1 FROM "document_revisions" WHERE "drawingId"=NEW."drawingId" AND "isCurrent" AND "ordinal">NEW."ordinal") THEN RAISE EXCEPTION 'Supersession requires newer approved current'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "revision_canonical_evidence" AFTER INSERT OR UPDATE ON "document_revisions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_revision_evidence"();

CREATE FUNCTION "check_s12_drawing_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM "document_revisions" r WHERE r."drawingId"=NEW."id" AND r."series"='R' AND r."number"=0 AND r."ordinal"=0 AND r."createdById"=NEW."createdById") THEN RAISE EXCEPTION 'Drawing creation requires exact initial R0'; END IF;
 IF TG_OP='UPDATE' AND NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."after"->>'drawingId'=NEW."id"::text AND a."after"->>'drawingVersion'=NEW."version"::text AND "s11_canonical_delivery"(a."id")) AND NOT EXISTS(SELECT 1 FROM "drawing_client_review_selections" s WHERE s."drawingId"=NEW."id" AND s."drawingVersion"=NEW."version") THEN RAISE EXCEPTION 'Drawing version requires canonical mutation'; END IF;
 IF NEW."clientApprovalRequired" AND NOT EXISTS(SELECT 1 FROM "drawing_client_review_selections" WHERE "drawingId"=NEW."id") THEN RAISE EXCEPTION 'Client review requires explicit management selection'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "drawing_canonical_evidence" AFTER INSERT OR UPDATE ON "drawing_records" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_drawing_evidence"();
CREATE FUNCTION "check_s12_selection"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "drawing_records" d JOIN "audit_events" a ON a."subjectId"=d."id"::text WHERE d."id"=NEW."drawingId" AND d."clientApprovalRequired" AND a."organizationId"=NEW."organizationId" AND a."eventKey"='drawing.client_review_selected' AND a."actorId"=NEW."actorId" AND a."reason"=NEW."reason" AND a."after"->>'projectId'=NEW."projectId"::text AND a."after"->>'drawingVersion'=NEW."drawingVersion"::text AND a."after"->>'clientApprovalRequired'='true' AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Management client selection requires canonical evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "drawing_selection_canonical" AFTER INSERT ON "drawing_client_review_selections" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_selection"();

CREATE FUNCTION "guard_s12_transmittal"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Transmittal cannot be deleted'; END IF;
 IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."senderId",NEW."purpose",NEW."reason",NEW."issuedAt") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."senderId",OLD."purpose",OLD."reason",OLD."issuedAt") THEN RAISE EXCEPTION 'Transmittal issue evidence is immutable'; END IF;
 IF OLD."projectClosedAt" IS NOT NULL AND ROW(NEW."projectClosedAt",NEW."retainUntil") IS DISTINCT FROM ROW(OLD."projectClosedAt",OLD."retainUntil") THEN RAISE EXCEPTION 'Transmittal retention clock cannot be reset'; END IF;
 IF NEW."projectClosedAt" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED') AND "occurredAt"=NEW."projectClosedAt") THEN RAISE EXCEPTION 'Retention clock requires actual project completion'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "transmittal_identity_guard" BEFORE UPDATE OR DELETE ON "drawing_transmittals" FOR EACH ROW EXECUTE FUNCTION "guard_s12_transmittal"();
CREATE FUNCTION "guard_s12_recipient"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Issue recipient evidence cannot be deleted'; END IF;
 IF TG_OP='UPDATE' AND (ROW(NEW."transmittalId",NEW."accountId",NEW."organizationId",NEW."projectId",NEW."acknowledgementRequired") IS DISTINCT FROM ROW(OLD."transmittalId",OLD."accountId",OLD."organizationId",OLD."projectId",OLD."acknowledgementRequired") OR OLD."acknowledgedAt" IS NOT NULL OR NEW."acknowledgedAt" IS NULL) THEN RAISE EXCEPTION 'Recipient acknowledgement is append-only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "recipient_identity_guard" BEFORE UPDATE OR DELETE ON "transmittal_recipients" FOR EACH ROW EXECUTE FUNCTION "guard_s12_recipient"();
CREATE FUNCTION "check_s12_issue"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE issue_row "drawing_transmittals"%ROWTYPE; item_count INTEGER;
BEGIN
 IF TG_TABLE_NAME='drawing_transmittals' THEN issue_row:=NEW; ELSE SELECT * INTO issue_row FROM "drawing_transmittals" WHERE "id"=NEW."transmittalId"; END IF;
 SELECT count(*) INTO item_count FROM "transmittal_items" WHERE "transmittalId"=issue_row."id";
 IF item_count=0 OR NOT EXISTS(SELECT 1 FROM "transmittal_recipients" WHERE "transmittalId"=issue_row."id") THEN RAISE EXCEPTION 'Issue requires exact items and named recipients'; END IF;
 IF EXISTS(SELECT 1 FROM "transmittal_items" i JOIN "document_revisions" r ON r."id"=i."revisionId" JOIN "drawing_records" d ON d."id"=r."drawingId" WHERE i."transmittalId"=issue_row."id" AND (i."sha256"<>r."sha256" OR NOT EXISTS(SELECT 1 FROM "revision_approval_facts" WHERE "revisionId"=r."id" AND "kind"='INTERNAL') OR i."clientApprovalRequired" AND NOT EXISTS(SELECT 1 FROM "revision_approval_facts" WHERE "revisionId"=r."id" AND "kind"='CLIENT') OR NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."eventKey"='document.issued' AND a."actorId"=issue_row."senderId" AND a."reason"=issue_row."reason" AND a."after"->>'transmittalId'=issue_row."id"::text AND a."after"->>'purpose'=issue_row."purpose" AND "s12_exact_evidence"(a."id",r."id",'document.issued')))) THEN RAISE EXCEPTION 'Issue requires exact approval and canonical issue evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "transmittal_canonical_issue" AFTER INSERT ON "drawing_transmittals" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_issue"();
CREATE CONSTRAINT TRIGGER "transmittal_item_canonical_issue" AFTER INSERT ON "transmittal_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_issue"();
CREATE CONSTRAINT TRIGGER "transmittal_recipient_canonical_issue" AFTER INSERT ON "transmittal_recipients" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_issue"();
CREATE FUNCTION "check_s12_ack"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"='transmittal.acknowledged' AND a."subjectId"=NEW."transmittalId"::text AND a."actorId"=NEW."accountId" AND a."after"->>'accountId'=NEW."accountId"::text AND (a."after"->>'acknowledgedAt')::timestamptz=NEW."acknowledgedAt" AND a."after"->>'note'=NEW."note" AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Acknowledgement requires exact recipient canonical evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "acknowledgement_canonical_evidence" AFTER UPDATE ON "transmittal_recipients" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_ack"();

CREATE FUNCTION "anchor_s12_project_retention"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed_at TIMESTAMPTZ(3);
BEGIN
 IF NEW."toStatus" NOT IN ('COMPLETED','CANCELLED') THEN RETURN NULL; END IF;
 SELECT min("occurredAt") INTO closed_at FROM "project_status_changes" WHERE "projectId"=NEW."projectId" AND "toStatus" IN ('COMPLETED','CANCELLED');
 UPDATE "drawing_transmittals" SET "projectClosedAt"=closed_at,"retainUntil"=closed_at+interval '10 years' WHERE "projectId"=NEW."projectId" AND "projectClosedAt" IS NULL;
 UPDATE "file_retention_records" f SET "projectClosedAt"=closed_at,"retainUntil"=closed_at+interval '10 years' FROM "file_blob_metadata" b JOIN "documents" d ON d."id"=b."documentId" WHERE f."blobId"=b."id" AND d."projectId"=NEW."projectId" AND f."retentionClass" IN ('ISSUED_DRAWING','CLIENT_APPROVAL_EVIDENCE') AND f."projectClosedAt" IS NULL;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "project_close_drawing_retention" AFTER INSERT ON "project_status_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "anchor_s12_project_retention"();

CREATE TRIGGER "approval_facts_immutable" BEFORE UPDATE OR DELETE ON "revision_approval_facts" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "revision_changes_immutable" BEFORE UPDATE OR DELETE ON "revision_state_changes" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "transmittal_items_immutable" BEFORE UPDATE OR DELETE ON "transmittal_items" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
CREATE TRIGGER "drawing_selections_immutable" BEFORE UPDATE OR DELETE ON "drawing_client_review_selections" FOR EACH ROW EXECUTE FUNCTION "guard_s11_immutable_evidence"();
REVOKE UPDATE, DELETE, TRUNCATE ON "revision_approval_facts", "revision_state_changes", "transmittal_items", "drawing_client_review_selections" FROM sense_app_runtime;
REVOKE DELETE, TRUNCATE ON "drawing_records", "document_revisions", "drawing_transmittals", "transmittal_recipients" FROM sense_app_runtime;
DO $$
DECLARE previous_definition TEXT;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO previous_definition FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF previous_definition IS NULL OR left(previous_definition,6)<>'CHECK ' THEN RAISE EXCEPTION 'Expected event catalogue missing'; END IF;
 ALTER TABLE "domain_events" DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE 'ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_eventName_catalogue_check" ' || left(previous_definition,length(previous_definition)-1) || ' OR "eventName" IN (''revision.state_changed'',''drawing.client_review_selected'',''transmittal.acknowledged''))';
END $$;


CREATE FUNCTION "guard_s12_approval_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_row "document_revisions"%ROWTYPE;
BEGIN
 SELECT * INTO revision_row FROM "document_revisions" WHERE "id"=NEW."revisionId";
 IF NEW."kind"='INTERNAL' AND revision_row."state" NOT IN ('SUBMITTED','REVIEWED') THEN RAISE EXCEPTION 'Internal approval requires submitted reviewed revision'; END IF;
 IF NEW."kind"='CLIENT' AND (NOT revision_row."isCurrent" OR revision_row."state" NOT IN ('APPROVED','ISSUED') OR NOT EXISTS(SELECT 1 FROM "revision_approval_facts" WHERE "revisionId"=NEW."revisionId" AND "kind"='INTERNAL')) THEN RAISE EXCEPTION 'Client approval requires current exact internal approval first'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "approval_order_guard" BEFORE INSERT ON "revision_approval_facts" FOR EACH ROW EXECUTE FUNCTION "guard_s12_approval_insert"();
CREATE FUNCTION "check_s12_history"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audit_row "audit_events"%ROWTYPE; source_id UUID; event_key TEXT;
BEGIN
 SELECT a.* INTO audit_row FROM "domain_events" e JOIN "audit_events" a ON a."id"::text=e."payload"->>'auditEventId' WHERE e."id"=NEW."eventId";
 event_key:=CASE NEW."toState" WHEN 'APPROVED' THEN 'document.approved' WHEN 'ISSUED' THEN 'document.issued' WHEN 'SUPERSEDED' THEN 'document.superseded' ELSE 'revision.state_changed' END;
 IF NOT "s12_exact_evidence"(audit_row."id",NEW."revisionId",event_key) OR audit_row."actorId"<>NEW."actorId" OR audit_row."reason"<>NEW."reason" OR audit_row."before"->>'state'<>NEW."fromState"::text OR audit_row."after"->>'state'<>NEW."toState"::text THEN RAISE EXCEPTION 'Revision history requires exact transition canonical evidence'; END IF;
 IF NEW."toState" IN ('SUBMITTED','REVIEWED') THEN
  source_id:=(audit_row."after"->>'sourceAuditEventId')::uuid;
  IF source_id IS NULL OR NOT "s12_exact_evidence"(source_id,NEW."revisionId",CASE NEW."toState" WHEN 'SUBMITTED' THEN 'review.requested' ELSE 'review.correction_requested' END) THEN RAISE EXCEPTION 'Review transition requires exact downstream source'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "revision_history_canonical" AFTER INSERT ON "revision_state_changes" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_history"();
CREATE FUNCTION "guard_s12_issue_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "projects" p JOIN "accounts" a ON a."id"=NEW."senderId" WHERE p."id"=NEW."projectId" AND p."organizationId"=NEW."organizationId" AND p."status"='ACTIVE' AND a."state"='ACTIVE') THEN RAISE EXCEPTION 'Formal issue requires Active project and actor'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "transmittal_active_guard" BEFORE INSERT ON "drawing_transmittals" FOR EACH ROW EXECUTE FUNCTION "guard_s12_issue_insert"();
CREATE FUNCTION "guard_s12_item_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "document_revisions" r JOIN "drawing_records" d ON d."id"=r."drawingId" WHERE r."id"=NEW."revisionId" AND r."isCurrent" AND r."state" IN ('APPROVED','ISSUED') AND r."sha256"=NEW."sha256" AND NEW."clientApprovalRequired"=(d."clientApprovalRequired" OR r."series"='CR')) THEN RAISE EXCEPTION 'Issue item requires current approved exact content and client gate snapshot'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "transmittal_current_item_guard" BEFORE INSERT ON "transmittal_items" FOR EACH ROW EXECUTE FUNCTION "guard_s12_item_insert"();
CREATE FUNCTION "check_s12_issue_recipients"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "transmittal_items" i JOIN "audit_events" a ON a."after"->>'transmittalId'=NEW."transmittalId"::text AND a."subjectId"=i."revisionId"::text WHERE i."transmittalId"=NEW."transmittalId" AND a."eventKey"='document.issued' AND "s11_canonical_delivery"(a."id") AND a."after"->'recipientAccountIds' @> to_jsonb(ARRAY[NEW."accountId"::text]) AND jsonb_array_length(a."after"->'recipientAccountIds')=(SELECT count(*) FROM "transmittal_recipients" WHERE "transmittalId"=NEW."transmittalId")) THEN RAISE EXCEPTION 'Issue recipient set must match exact canonical issue'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "issue_named_recipients_evidence" AFTER INSERT ON "transmittal_recipients" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s12_issue_recipients"();
