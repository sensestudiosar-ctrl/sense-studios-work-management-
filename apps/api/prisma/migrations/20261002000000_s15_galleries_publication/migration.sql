-- Additive S15 records. No existing rows or approved evidence are rewritten.
CREATE TYPE "PortfolioPublicationState" AS ENUM ('DRAFT','PUBLISHED','WITHDRAWN');
CREATE TYPE "PublicationGrantAction" AS ENUM ('PUBLISHED','WITHDRAWN');
CREATE TABLE "gallery_entries" (
 "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
 "itemId" UUID NOT NULL, "label" VARCHAR(160) NOT NULL,
 "createdById" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "reason" VARCHAR(1000) NOT NULL CHECK(length(trim("reason"))>=3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("projectId","itemId"),
 FOREIGN KEY("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
 FOREIGN KEY("itemId","organizationId","projectId") REFERENCES "client_review_items"("id","organizationId","projectId") ON DELETE RESTRICT
);
CREATE INDEX "gallery_entries_organizationId_projectId_createdAt_idx" ON "gallery_entries"("organizationId","projectId","createdAt");
CREATE TABLE "portfolio_publications" (
 "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
 "sourceFileId" UUID NOT NULL, "sourceBlobId" UUID NOT NULL,
 "title" VARCHAR(160) NOT NULL CHECK(length(trim("title"))>0),
 "altText" VARCHAR(500) NOT NULL CHECK(length(trim("altText"))>0),
 "storageKey" UUID NOT NULL UNIQUE, "sha256" CHAR(64) NOT NULL CHECK("sha256" ~ '^[a-f0-9]{64}$'),
 "mime" VARCHAR(160) NOT NULL CHECK("mime"='image/png'), "size" INTEGER NOT NULL CHECK("size">0 AND "size"<=8388608),
 "createdById" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "reason" VARCHAR(1000) NOT NULL CHECK(length(trim("reason"))>=3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "state" "PortfolioPublicationState" NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
 "publishedAt" TIMESTAMPTZ(3), "withdrawnAt" TIMESTAMPTZ(3),
 UNIQUE("id","organizationId","projectId"),
 FOREIGN KEY("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
 FOREIGN KEY("sourceFileId","organizationId") REFERENCES "documents"("id","organizationId") ON DELETE RESTRICT,
 FOREIGN KEY("sourceBlobId","organizationId") REFERENCES "file_blob_metadata"("id","organizationId") ON DELETE RESTRICT,
 CHECK(("state"='DRAFT' AND "version"=1 AND "publishedAt" IS NULL AND "withdrawnAt" IS NULL)
 OR ("state"='PUBLISHED' AND "version"=2 AND "publishedAt" IS NOT NULL AND "withdrawnAt" IS NULL)
 OR ("state"='WITHDRAWN' AND "version"=3 AND "publishedAt" IS NOT NULL AND "withdrawnAt">="publishedAt"))
);
CREATE INDEX "portfolio_publications_state_publishedAt_id_idx" ON "portfolio_publications"("state","publishedAt","id");
CREATE INDEX "portfolio_publications_organizationId_projectId_createdAt_idx" ON "portfolio_publications"("organizationId","projectId","createdAt");
CREATE TABLE "publication_grants" (
 "id" UUID PRIMARY KEY, "publicationId" UUID NOT NULL, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
 "actorId" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "action" "PublicationGrantAction" NOT NULL,
 "reason" VARCHAR(1000) NOT NULL CHECK(length(trim("reason"))>=3),
 "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "fromVersion" INTEGER NOT NULL, "toVersion" INTEGER NOT NULL,
 "eventId" UUID NOT NULL UNIQUE REFERENCES "domain_events"("id") ON DELETE RESTRICT,
 UNIQUE("publicationId","toVersion"),
 FOREIGN KEY("publicationId","organizationId","projectId") REFERENCES "portfolio_publications"("id","organizationId","projectId") ON DELETE RESTRICT,
 CHECK(("action"='PUBLISHED' AND "fromVersion"=1 AND "toVersion"=2) OR ("action"='WITHDRAWN' AND "fromVersion"=2 AND "toVersion"=3))
);
CREATE INDEX "publication_grants_organizationId_projectId_occurredAt_idx" ON "publication_grants"("organizationId","projectId","occurredAt");

CREATE FUNCTION s15_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'S15 evidence is immutable'; END $$;
CREATE TRIGGER s15_gallery_immutable BEFORE UPDATE OR DELETE ON "gallery_entries" FOR EACH ROW EXECUTE FUNCTION s15_immutable();
CREATE TRIGGER s15_grant_immutable BEFORE UPDATE OR DELETE ON "publication_grants" FOR EACH ROW EXECUTE FUNCTION s15_immutable();

CREATE FUNCTION s15_publication_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'S15 publication evidence is retained'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','version','publishedAt','withdrawnAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','publishedAt','withdrawnAt'])
 OR NOT ((OLD."state"='DRAFT' AND NEW."state"='PUBLISHED' AND NEW."version"=OLD."version"+1)
 OR (OLD."state"='PUBLISHED' AND NEW."state"='WITHDRAWN' AND NEW."version"=OLD."version"+1 AND NEW."publishedAt"=OLD."publishedAt"))
 THEN RAISE EXCEPTION 'Invalid S15 publication transition or content mutation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s15_publication_transition BEFORE UPDATE OR DELETE ON "portfolio_publications" FOR EACH ROW EXECUTE FUNCTION s15_publication_transition();

CREATE FUNCTION s15_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_doc RECORD; source_blob RECORD; folder RECORD; folder_id UUID; depth INTEGER:=0;
BEGIN
 IF TG_OP='INSERT' AND (NEW."state"<>'DRAFT' OR NEW."version"<>1) THEN RAISE EXCEPTION 'New portfolio requires draft preparation'; END IF;
 SELECT * INTO source_doc FROM "documents" WHERE "id"=NEW."sourceFileId" AND "organizationId"=NEW."organizationId" AND "projectId"=NEW."projectId";
 SELECT * INTO source_blob FROM "file_blob_metadata" WHERE "id"=NEW."sourceBlobId" AND "documentId"=NEW."sourceFileId" AND "organizationId"=NEW."organizationId";
 IF source_doc IS NULL OR source_blob IS NULL OR source_blob."storageKey"=NEW."storageKey" THEN RAISE EXCEPTION 'Invalid S15 distinct derivative source'; END IF;
 IF TG_OP='INSERT' OR NEW."state"='PUBLISHED' THEN
  IF source_doc."confidential" THEN RAISE EXCEPTION 'Confidential sources cannot be published'; END IF;
  folder_id:=source_doc."folderId";
  WHILE folder_id IS NOT NULL LOOP
   depth:=depth+1;
   SELECT * INTO folder FROM "document_folders" WHERE "id"=folder_id AND "organizationId"=NEW."organizationId" AND "projectId"=NEW."projectId";
   IF folder IS NULL OR depth>20 OR folder."confidential" THEN RAISE EXCEPTION 'Confidential or invalid source ancestor'; END IF;
   folder_id:=folder."parentId";
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s15_source_guard BEFORE INSERT OR UPDATE ON "portfolio_publications" FOR EACH ROW EXECUTE FUNCTION s15_source_guard();

CREATE FUNCTION s15_canonical_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_event TEXT; actor UUID; evidence UUID; subject_id TEXT; expected_reason TEXT; expected_subject TEXT;
BEGIN
 IF TG_TABLE_NAME='publication_grants' THEN subject_id:=NEW."publicationId"::text; ELSE subject_id:=NEW."id"::text; END IF;
 expected_subject:=CASE WHEN TG_TABLE_NAME='gallery_entries' THEN 'gallery_entry' ELSE 'portfolio_publication' END;
 IF TG_TABLE_NAME='gallery_entries' THEN expected_event:='gallery.entry_added'; actor:=NEW."createdById";
 ELSIF TG_TABLE_NAME='portfolio_publications' AND TG_OP='INSERT' THEN expected_event:='portfolio.prepared'; actor:=NEW."createdById";
 ELSIF TG_TABLE_NAME='portfolio_publications' THEN
  expected_event:=CASE WHEN NEW."state"='PUBLISHED' THEN 'portfolio.published' ELSE 'portfolio.withdrawn' END;
  SELECT "actorId","eventId","reason" INTO actor,evidence,expected_reason FROM "publication_grants" WHERE "publicationId"=NEW."id" AND "toVersion"=NEW."version" AND "action"::text=NEW."state"::text;
 ELSE
  expected_event:=CASE WHEN NEW."action"='PUBLISHED' THEN 'portfolio.published' ELSE 'portfolio.withdrawn' END; actor:=NEW."actorId"; evidence:=NEW."eventId";
 END IF;
 IF expected_reason IS NULL THEN expected_reason:=NEW."reason"; END IF;
 IF TG_TABLE_NAME='publication_grants' AND NOT EXISTS(SELECT 1 FROM "portfolio_publications" WHERE "id"=NEW."publicationId" AND "version"=NEW."toVersion" AND "state"::text=NEW."action"::text) THEN RAISE EXCEPTION 'Grant must match current publication transition'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "accounts" WHERE "id"=actor AND "kind"='OWNER' AND "state"='ACTIVE') THEN RAISE EXCEPTION 'Owner authority required for S15'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM "domain_events" e JOIN "audit_events" a ON a."id"=(e."payload"->>'auditEventId')::uuid
  JOIN "outbox_deliveries" o ON o."eventId"=e."id"
  WHERE e."eventName"=expected_event AND e."organizationId"=NEW."organizationId" AND e."actorId"=actor
  AND e."subjectId"=subject_id
  AND e."subjectType"=expected_subject AND (evidence IS NULL OR e."id"=evidence)
  AND a."eventKey"=expected_event AND a."actorId"=actor AND a."organizationId"=NEW."organizationId"
  AND a."subjectType"=expected_subject AND a."subjectId"=subject_id
  AND a."reason"=expected_reason AND a."after"->>'projectId'=NEW."projectId"::text
 ) THEN RAISE EXCEPTION 'S15 canonical audit/event/outbox evidence required'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s15_gallery_evidence AFTER INSERT ON "gallery_entries" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s15_canonical_evidence();
CREATE CONSTRAINT TRIGGER s15_publication_evidence AFTER INSERT OR UPDATE ON "portfolio_publications" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s15_canonical_evidence();
CREATE CONSTRAINT TRIGGER s15_grant_evidence AFTER INSERT ON "publication_grants" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s15_canonical_evidence();
