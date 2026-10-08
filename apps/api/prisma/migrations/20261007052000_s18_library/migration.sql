-- CreateTable
CREATE TABLE "library_records" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "audience" VARCHAR(20) NOT NULL,
    "branchId" UUID,
    "teamId" UUID,
    "createdById" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_versions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_publications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "approvalRequestId" UUID,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_files" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "bytes" BIGINT NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_acknowledgements" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_references" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "taskId" UUID,
    "templateVersionId" UUID,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_receipts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "commandId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_records_organizationId_kind_audience_branchId_teamI_idx" ON "library_records"("organizationId", "kind", "audience", "branchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "library_records_id_organizationId_key" ON "library_records"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "library_versions_eventId_key" ON "library_versions"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "library_versions_id_organizationId_key" ON "library_versions"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "library_versions_recordId_version_key" ON "library_versions"("recordId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "library_publications_versionId_key" ON "library_publications"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "library_publications_approvalRequestId_key" ON "library_publications"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "library_publications_eventId_key" ON "library_publications"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "library_publications_id_organizationId_key" ON "library_publications"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "library_files_storageKey_key" ON "library_files"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_files_eventId_key" ON "library_files"("eventId");

-- CreateIndex
CREATE INDEX "library_files_recordId_idx" ON "library_files"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "library_files_id_organizationId_key" ON "library_files"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "library_acknowledgements_eventId_key" ON "library_acknowledgements"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "library_acknowledgements_versionId_employeeId_key" ON "library_acknowledgements"("versionId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "library_references_eventId_key" ON "library_references"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_receipts_actorId_commandId_key" ON "learning_receipts"("actorId", "commandId");

-- Private audience identity and immutable library evidence; no prior table data rewritten.
ALTER TABLE library_records ADD FOREIGN KEY ("organizationId") REFERENCES organizations(id), ADD FOREIGN KEY ("createdById") REFERENCES accounts(id), ADD FOREIGN KEY ("branchId","organizationId") REFERENCES branches(id,"organizationId"), ADD FOREIGN KEY ("teamId","branchId","organizationId") REFERENCES teams(id,"branchId","organizationId"), ADD CHECK (kind IN ('SOP','KNOWLEDGE','MODULE') AND version>0 AND length(btrim(title)) BETWEEN 1 AND 160 AND length(btrim(category)) BETWEEN 1 AND 80), ADD CHECK ((audience='ORGANIZATION' AND "branchId" IS NULL AND "teamId" IS NULL) OR (audience='BRANCH' AND "branchId" IS NOT NULL AND "teamId" IS NULL) OR (audience='TEAM' AND "branchId" IS NOT NULL AND "teamId" IS NOT NULL));
ALTER TABLE library_versions ADD FOREIGN KEY ("recordId","organizationId") REFERENCES library_records(id,"organizationId"), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (version>0 AND jsonb_typeof(content)='object' AND length(btrim(reason)) BETWEEN 3 AND 1000);
ALTER TABLE library_records ADD FOREIGN KEY ("publishedVersionId","organizationId") REFERENCES library_versions(id,"organizationId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE library_publications ADD FOREIGN KEY ("recordId","organizationId") REFERENCES library_records(id,"organizationId"), ADD FOREIGN KEY ("versionId","organizationId") REFERENCES library_versions(id,"organizationId"), ADD FOREIGN KEY ("approvalRequestId","organizationId") REFERENCES approval_requests(id,"organizationId"), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (length(btrim(reason)) BETWEEN 3 AND 1000);
ALTER TABLE library_files ADD FOREIGN KEY ("recordId","organizationId") REFERENCES library_records(id,"organizationId"), ADD FOREIGN KEY ("uploadedById") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (bytes>0 AND checksum ~ '^[0-9a-f]{64}$' AND length(btrim(name)) BETWEEN 1 AND 160);
ALTER TABLE library_acknowledgements ADD FOREIGN KEY ("versionId","organizationId") REFERENCES library_versions(id,"organizationId"), ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId"), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE library_references ADD FOREIGN KEY ("versionId","organizationId") REFERENCES library_versions(id,"organizationId"), ADD FOREIGN KEY ("taskId","organizationId") REFERENCES tasks(id,"organizationId"), ADD FOREIGN KEY ("templateVersionId","organizationId") REFERENCES project_template_versions(id,"organizationId"), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (("taskId" IS NOT NULL)<>("templateVersionId" IS NOT NULL) AND length(btrim(reason)) BETWEEN 3 AND 1000);
ALTER TABLE learning_receipts ADD FOREIGN KEY ("organizationId") REFERENCES organizations(id), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD CHECK ("payloadHash" ~ '^[0-9a-f]{64}$' AND jsonb_typeof(result)='object');

CREATE TRIGGER s18_library_versions_immutable BEFORE UPDATE OR DELETE ON library_versions FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_library_publications_immutable BEFORE UPDATE OR DELETE ON library_publications FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_library_files_immutable BEFORE UPDATE OR DELETE ON library_files FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_library_acknowledgements_immutable BEFORE UPDATE OR DELETE ON library_acknowledgements FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_library_references_immutable BEFORE UPDATE OR DELETE ON library_references FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_learning_receipts_immutable BEFORE UPDATE OR DELETE ON learning_receipts FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();

CREATE FUNCTION s18_library_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Library history must remain'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW.kind<>OLD.kind OR NEW.audience<>OLD.audience OR NEW."branchId" IS DISTINCT FROM OLD."branchId" OR NEW."teamId" IS DISTINCT FROM OLD."teamId" OR NEW."createdById"<>OLD."createdById" OR NEW."createdAt"<>OLD."createdAt" OR NEW.title<>OLD.title OR NEW.category<>OLD.category OR NEW.version NOT IN (OLD.version,OLD.version+1) THEN RAISE EXCEPTION 'Library fixed audience/identity/version violation'; END IF;
 IF NEW.version=OLD.version AND NEW."publishedVersionId" IS NOT DISTINCT FROM OLD."publishedVersionId" THEN RAISE EXCEPTION 'Library update requires new version or publication'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s18_library_identity BEFORE UPDATE OR DELETE ON library_records FOR EACH ROW EXECUTE FUNCTION s18_library_identity();

CREATE FUNCTION s18_library_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."teamId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM teams WHERE id=NEW."teamId" AND "branchId"=NEW."branchId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Library Team/Branch mismatch'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s18_library_scope BEFORE INSERT ON library_records FOR EACH ROW EXECUTE FUNCTION s18_library_scope();

CREATE FUNCTION s18_library_version_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; r library_records; BEGIN
 SELECT * INTO r FROM library_records WHERE id=NEW."recordId";
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'library.version_created','library_record',NEW."recordId");
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'versionId' IS DISTINCT FROM NEW.id::text OR (a.after->>'version')::int IS DISTINCT FROM NEW.version OR a.after->'content' IS DISTINCT FROM NEW.content OR (a.after->>'acknowledgementRequired')::boolean IS DISTINCT FROM NEW."acknowledgementRequired" OR a.after->>'kind' IS DISTINCT FROM r.kind OR (NEW.version>1 AND NOT EXISTS(SELECT 1 FROM library_versions WHERE "recordId"=NEW."recordId" AND version=NEW.version-1)) THEN RAISE EXCEPTION 'Library exact content/version evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_version_evidence AFTER INSERT ON library_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_version_evidence();

CREATE FUNCTION s18_library_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r library_records; BEGIN
 SELECT * INTO r FROM library_records WHERE id=NEW.id;
 IF NOT EXISTS(SELECT 1 FROM library_versions WHERE "recordId"=r.id AND "organizationId"=r."organizationId" AND version=r.version) OR EXISTS(SELECT 1 FROM library_versions WHERE "recordId"=r.id AND version>r.version) THEN RAISE EXCEPTION 'Library head lacks exact latest version'; END IF;
 IF r."publishedVersionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM library_publications p JOIN library_versions v ON v.id=p."versionId" WHERE p."recordId"=r.id AND p."versionId"=r."publishedVersionId" AND v."recordId"=r.id) THEN RAISE EXCEPTION 'Library published pointer requires exact publication'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_head_evidence AFTER INSERT OR UPDATE ON library_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_head_evidence();

CREATE FUNCTION s18_library_publication_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'library.published','library_record',NEW."recordId");
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'publicationId' IS DISTINCT FROM NEW.id::text OR a.after->>'versionId' IS DISTINCT FROM NEW."versionId"::text OR a.after->>'approvalRequestId' IS DISTINCT FROM NEW."approvalRequestId"::text OR NOT EXISTS(SELECT 1 FROM library_versions WHERE id=NEW."versionId" AND "recordId"=NEW."recordId") THEN RAISE EXCEPTION 'Library exact publication mismatch'; END IF;
 -- Author/approver independence is completed by a later reviewed guard after Owner decision.
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_publication_evidence AFTER INSERT ON library_publications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_publication_evidence();

CREATE FUNCTION s18_library_file_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."uploadedById",'library.file_uploaded','library_file',NEW.id);
 IF a.after->>'recordId' IS DISTINCT FROM NEW."recordId"::text OR a.after->>'checksum' IS DISTINCT FROM NEW.checksum OR (a.after->>'bytes')::bigint IS DISTINCT FROM NEW.bytes OR a.after->>'mime' IS DISTINCT FROM NEW.mime OR a.after->>'name' IS DISTINCT FROM NEW.name THEN RAISE EXCEPTION 'Library file metadata evidence mismatch'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_file_evidence AFTER INSERT ON library_files DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_file_evidence();

CREATE FUNCTION s18_library_ack_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; actor uuid; BEGIN
 SELECT "accountId" INTO actor FROM employees WHERE id=NEW."employeeId";
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",actor,'library.acknowledged','library_version',NEW."versionId");
 IF a.after->>'employeeId' IS DISTINCT FROM NEW."employeeId"::text OR NOT EXISTS(SELECT 1 FROM library_versions v JOIN library_publications p ON p."versionId"=v.id WHERE v.id=NEW."versionId" AND v."acknowledgementRequired") THEN RAISE EXCEPTION 'Acknowledgement requires exact important published version'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_ack_evidence AFTER INSERT ON library_acknowledgements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_ack_evidence();

CREATE FUNCTION s18_library_reference_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'library.referenced','library_reference',NEW.id);
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'versionId' IS DISTINCT FROM NEW."versionId"::text OR a.after->>'taskId' IS DISTINCT FROM NEW."taskId"::text OR a.after->>'templateVersionId' IS DISTINCT FROM NEW."templateVersionId"::text OR NOT EXISTS(SELECT 1 FROM library_versions v JOIN library_records r ON r.id=v."recordId" JOIN library_publications p ON p."versionId"=v.id WHERE v.id=NEW."versionId" AND r.kind='SOP') THEN RAISE EXCEPTION 'Reference requires exact published SOP evidence'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_reference_evidence AFTER INSERT ON library_references DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_reference_evidence();

DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Canonical event catalogue missing'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''library.version_created'',''library.published'',''library.file_uploaded'',''library.acknowledged'',''library.referenced''))',prior);
END $$;
GRANT SELECT,INSERT ON library_versions,library_publications,library_files,library_acknowledgements,library_references,learning_receipts TO sense_app_runtime;
GRANT SELECT,INSERT,UPDATE ON library_records TO sense_app_runtime;
