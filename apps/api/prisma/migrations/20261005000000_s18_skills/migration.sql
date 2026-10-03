-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateTable
CREATE TABLE "skill_catalogue" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "createdById" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_ratings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentChangeId" UUID NOT NULL,

    CONSTRAINT "skill_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_rating_changes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ratingId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "fromLevel" "SkillLevel",
    "toLevel" "SkillLevel" NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "approvalRequestId" UUID,
    "trainingSourceId" UUID,
    "eventId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_rating_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_change_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "skillId" UUID,
    "proposedSkillName" VARCHAR(120),
    "requestedLevel" "SkillLevel" NOT NULL,
    "expectedRatingVersion" INTEGER NOT NULL,
    "requestedById" UUID NOT NULL,
    "approvalRequestId" UUID NOT NULL,
    "trainingSourceId" UUID,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_receipts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "commandId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_catalogue_eventId_key" ON "skill_catalogue"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_catalogue_id_organizationId_key" ON "skill_catalogue"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_catalogue_organizationId_normalizedName_key" ON "skill_catalogue"("organizationId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "skill_ratings_currentChangeId_key" ON "skill_ratings"("currentChangeId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_ratings_id_organizationId_key" ON "skill_ratings"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_ratings_employeeId_skillId_key" ON "skill_ratings"("employeeId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_rating_changes_approvalRequestId_key" ON "skill_rating_changes"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_rating_changes_eventId_key" ON "skill_rating_changes"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_rating_changes_ratingId_version_key" ON "skill_rating_changes"("ratingId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "skill_rating_changes_id_organizationId_key" ON "skill_rating_changes"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_change_requests_approvalRequestId_key" ON "skill_change_requests"("approvalRequestId");

-- CreateIndex
CREATE INDEX "skill_change_requests_organizationId_employeeId_idx" ON "skill_change_requests"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_change_requests_id_organizationId_key" ON "skill_change_requests"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_receipts_actorId_commandId_key" ON "skill_receipts"("actorId", "commandId");

-- Additive S18 ownership and exact immutable rating evidence. Existing rows untouched.
ALTER TABLE skill_catalogue ADD FOREIGN KEY ("organizationId") REFERENCES organizations(id), ADD FOREIGN KEY ("createdById") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (length(btrim(name)) BETWEEN 1 AND 120 AND "normalizedName"=lower(btrim(name)));
ALTER TABLE skill_ratings ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId"), ADD FOREIGN KEY ("skillId","organizationId") REFERENCES skill_catalogue(id,"organizationId"), ADD CHECK (version>0), ADD FOREIGN KEY ("currentChangeId","organizationId") REFERENCES skill_rating_changes(id,"organizationId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE skill_rating_changes ADD FOREIGN KEY ("ratingId","organizationId") REFERENCES skill_ratings(id,"organizationId") DEFERRABLE INITIALLY DEFERRED, ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("approvalRequestId","organizationId") REFERENCES approval_requests(id,"organizationId"), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (version>0 AND length(btrim(reason)) BETWEEN 3 AND 1000 AND ((version=1)=("fromLevel" IS NULL)));
ALTER TABLE skill_change_requests ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId"), ADD FOREIGN KEY ("skillId","organizationId") REFERENCES skill_catalogue(id,"organizationId"), ADD FOREIGN KEY ("requestedById") REFERENCES accounts(id), ADD FOREIGN KEY ("approvalRequestId","organizationId") REFERENCES approval_requests(id,"organizationId") DEFERRABLE INITIALLY DEFERRED, ADD CHECK (("skillId" IS NOT NULL)<>("proposedSkillName" IS NOT NULL) AND "expectedRatingVersion">=0 AND length(btrim(reason)) BETWEEN 3 AND 1000 AND ("proposedSkillName" IS NULL OR length(btrim("proposedSkillName")) BETWEEN 1 AND 120));
ALTER TABLE skill_receipts ADD FOREIGN KEY ("organizationId") REFERENCES organizations(id), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD CHECK ("payloadHash" ~ '^[0-9a-f]{64}$' AND jsonb_typeof(result)='object');

CREATE FUNCTION s18_immutable_skill_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'S18 skill evidence is immutable'; END $$;
CREATE TRIGGER s18_catalogue_immutable BEFORE UPDATE OR DELETE ON skill_catalogue FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_changes_immutable BEFORE UPDATE OR DELETE ON skill_rating_changes FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_requests_immutable BEFORE UPDATE OR DELETE ON skill_change_requests FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_receipts_immutable BEFORE UPDATE OR DELETE ON skill_receipts FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();

CREATE FUNCTION s18_rating_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Official rating history must remain'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."employeeId"<>OLD."employeeId" OR NEW."skillId"<>OLD."skillId" OR NEW.version<>OLD.version+1 OR NEW."currentChangeId"=OLD."currentChangeId" THEN RAISE EXCEPTION 'Rating identity/version violation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s18_rating_identity BEFORE UPDATE OR DELETE ON skill_ratings FOR EACH ROW EXECUTE FUNCTION s18_rating_identity();

CREATE FUNCTION s18_skill_event(event_id uuid, organization_id uuid, actor_id uuid, event_name text, subject_type text, subject_id uuid) RETURNS audit_events LANGUAGE plpgsql AS $$ DECLARE e domain_events; a audit_events; BEGIN
 SELECT * INTO e FROM domain_events WHERE id=event_id;
 SELECT * INTO a FROM audit_events WHERE id=(e.payload->>'auditEventId')::uuid;
 IF e.id IS NULL OR a.id IS NULL OR e."eventName" IS DISTINCT FROM event_name OR e."organizationId" IS DISTINCT FROM organization_id OR e."actorId" IS DISTINCT FROM actor_id OR e."subjectType" IS DISTINCT FROM subject_type OR e."subjectId" IS DISTINCT FROM subject_id::text OR a."eventKey" IS DISTINCT FROM e."eventName" OR a."organizationId" IS DISTINCT FROM e."organizationId" OR a."actorId" IS DISTINCT FROM e."actorId" OR a."subjectId" IS DISTINCT FROM e."subjectId" OR a."subjectType" IS DISTINCT FROM e."subjectType" OR NOT EXISTS(SELECT 1 FROM outbox_deliveries WHERE "eventId"=e.id AND consumer='NTF') THEN RAISE EXCEPTION 'Skill transition requires canonical exact audit/event/outbox'; END IF;
 RETURN a;
END $$;

CREATE FUNCTION s18_catalogue_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."createdById",'skill.catalogue_created','skill_catalogue',NEW.id);
 IF a.after->>'name' IS DISTINCT FROM NEW.name OR a.after->>'normalizedName' IS DISTINCT FROM NEW."normalizedName" THEN RAISE EXCEPTION 'Skill catalogue evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_catalogue_evidence AFTER INSERT ON skill_catalogue DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_catalogue_evidence();

CREATE FUNCTION s18_rating_change_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; r skill_ratings; prev skill_rating_changes; q skill_change_requests; decision approval_decisions; approval approval_requests; BEGIN
 SELECT * INTO r FROM skill_ratings WHERE id=NEW."ratingId";
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'skill.rating_changed','skill_rating',NEW."ratingId");
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'employeeId' IS DISTINCT FROM r."employeeId"::text OR a.after->>'skillId' IS DISTINCT FROM r."skillId"::text OR (a.after->>'version')::int IS DISTINCT FROM NEW.version OR a.after->>'toLevel' IS DISTINCT FROM NEW."toLevel"::text OR a.after->>'fromLevel' IS DISTINCT FROM NEW."fromLevel"::text OR a.after->>'approvalRequestId' IS DISTINCT FROM NEW."approvalRequestId"::text OR a.after->>'trainingSourceId' IS DISTINCT FROM NEW."trainingSourceId"::text THEN RAISE EXCEPTION 'Official rating exact evidence mismatch'; END IF;
 IF NEW.version>1 THEN
  SELECT * INTO prev FROM skill_rating_changes WHERE "ratingId"=NEW."ratingId" AND version=NEW.version-1;
  IF prev.id IS NULL OR prev."toLevel" IS DISTINCT FROM NEW."fromLevel" THEN RAISE EXCEPTION 'Rating history sequence mismatch'; END IF;
 END IF;
 IF NEW."approvalRequestId" IS NULL THEN
  IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."actorId" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'Direct official rating requires Owner'; END IF;
 ELSE
  SELECT * INTO q FROM skill_change_requests WHERE "approvalRequestId"=NEW."approvalRequestId";
  SELECT * INTO approval FROM approval_requests WHERE id=NEW."approvalRequestId";
  SELECT * INTO decision FROM approval_decisions WHERE "requestId"=NEW."approvalRequestId";
  IF q.id IS NULL OR approval."typeKey" IS DISTINCT FROM 'skill.change' OR approval.state<>'APPROVED' OR decision.outcome<>'APPROVED' OR decision."deciderId" IS DISTINCT FROM NEW."actorId" OR q."employeeId" IS DISTINCT FROM r."employeeId" OR q."requestedLevel" IS DISTINCT FROM NEW."toLevel" OR q."expectedRatingVersion" IS DISTINCT FROM NEW.version-1 OR q."trainingSourceId" IS DISTINCT FROM NEW."trainingSourceId" OR (q."skillId" IS NOT NULL AND q."skillId" IS DISTINCT FROM r."skillId") OR (q."proposedSkillName" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM skill_catalogue WHERE id=r."skillId" AND "normalizedName"=lower(btrim(q."proposedSkillName")))) THEN RAISE EXCEPTION 'Skill rating lacks exact approved request'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_rating_change_evidence AFTER INSERT ON skill_rating_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_rating_change_evidence();

CREATE FUNCTION s18_rating_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r skill_ratings; BEGIN
 SELECT * INTO r FROM skill_ratings WHERE id=NEW.id;
 IF NOT EXISTS(SELECT 1 FROM skill_rating_changes c WHERE c.id=r."currentChangeId" AND c."ratingId"=r.id AND c."organizationId"=r."organizationId" AND c.version=r.version AND c."toLevel"=r.level) OR EXISTS(SELECT 1 FROM skill_rating_changes c WHERE c."ratingId"=r.id AND c.version>r.version) THEN RAISE EXCEPTION 'Rating head lacks exact latest immutable change'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_rating_head_evidence AFTER INSERT OR UPDATE ON skill_ratings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_rating_head_evidence();

CREATE FUNCTION s18_skill_request_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE p approval_requests; e domain_events; a audit_events; BEGIN
 SELECT * INTO p FROM approval_requests WHERE id=NEW."approvalRequestId";
 IF p."typeKey" IS DISTINCT FROM 'skill.change' OR p."sourceType" IS DISTINCT FROM 'skill_change_request' OR p."sourceId" IS DISTINCT FROM NEW.id::text OR p."requesterId" IS DISTINCT FROM NEW."requestedById" OR p.reason IS DISTINCT FROM NEW.reason THEN RAISE EXCEPTION 'Skill request approval identity mismatch'; END IF;
 SELECT * INTO e FROM domain_events WHERE "eventName"='skill.change_requested' AND "subjectId"=NEW.id::text AND "organizationId"=NEW."organizationId";
 a:=s18_skill_event(e.id,NEW."organizationId",NEW."requestedById",'skill.change_requested','skill_change_request',NEW.id);
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'employeeId' IS DISTINCT FROM NEW."employeeId"::text OR a.after->>'requestedLevel' IS DISTINCT FROM NEW."requestedLevel"::text OR a.after->>'approvalRequestId' IS DISTINCT FROM NEW."approvalRequestId"::text OR (a.after->>'expectedRatingVersion')::int IS DISTINCT FROM NEW."expectedRatingVersion" THEN RAISE EXCEPTION 'Skill request audit mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_skill_request_evidence AFTER INSERT ON skill_change_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_skill_request_evidence();

DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Canonical event catalogue missing'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''skill.catalogue_created'',''skill.change_requested'',''skill.rating_changed''))',prior);
END $$;
GRANT SELECT,INSERT ON skill_catalogue,skill_rating_changes,skill_change_requests,skill_receipts TO sense_app_runtime;
GRANT SELECT,INSERT,UPDATE ON skill_ratings TO sense_app_runtime;
