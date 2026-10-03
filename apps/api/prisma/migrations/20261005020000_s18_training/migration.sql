-- CreateTable
CREATE TABLE "training_assignments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "moduleVersionId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "reviewerAccountId" UUID,
    "state" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignment_changes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" VARCHAR(30) NOT NULL,
    "data" JSONB NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_assignment_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_attempts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "kind" VARCHAR(25) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_assignments_organizationId_employeeId_state_idx" ON "training_assignments"("organizationId", "employeeId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_id_organizationId_key" ON "training_assignments"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignment_changes_eventId_key" ON "training_assignment_changes"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignment_changes_assignmentId_version_key" ON "training_assignment_changes"("assignmentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "training_attempts_eventId_key" ON "training_attempts"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "training_attempts_assignmentId_sequence_key" ON "training_attempts"("assignmentId", "sequence");

-- Forward S18 content/head binding hardening, after immutable applied migrations87/88.
CREATE FUNCTION s18_library_content_references() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE block jsonb; BEGIN
 IF jsonb_typeof(NEW.content->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Library content requires blocks'; END IF;
 FOR block IN SELECT value FROM jsonb_array_elements(NEW.content->'blocks') LOOP
  IF block->>'type' IN ('IMAGE','PDF','VIDEO','FILE','TEMPLATE') AND NOT EXISTS(SELECT 1 FROM library_files WHERE id=(block->>'fileId')::uuid AND "recordId"=NEW."recordId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Library media must belong to exact record'; END IF;
  IF block->>'type'='SOP' AND NOT EXISTS(SELECT 1 FROM library_versions v JOIN library_records r ON r.id=v."recordId" JOIN library_publications p ON p."versionId"=v.id WHERE v.id=(block->>'versionId')::uuid AND v."organizationId"=NEW."organizationId" AND r.kind='SOP') THEN RAISE EXCEPTION 'Module SOP must reference exact published SOP'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_content_references AFTER INSERT ON library_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_content_references();

CREATE FUNCTION s18_library_latest_publication() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r library_records; current_version int; BEGIN
 SELECT * INTO r FROM library_records WHERE id=NEW.id;
 IF r."publishedVersionId" IS NOT NULL THEN
  SELECT version INTO current_version FROM library_versions WHERE id=r."publishedVersionId";
  IF EXISTS(SELECT 1 FROM library_publications p JOIN library_versions v ON v.id=p."versionId" WHERE p."recordId"=r.id AND v.version>current_version) THEN RAISE EXCEPTION 'Library current publication cannot revert historical versions'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_latest_publication AFTER INSERT OR UPDATE ON library_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_latest_publication();

ALTER TABLE training_assignments ADD FOREIGN KEY ("employeeId","organizationId") REFERENCES employees(id,"organizationId"), ADD FOREIGN KEY ("moduleVersionId","organizationId") REFERENCES library_versions(id,"organizationId"), ADD FOREIGN KEY ("assignedById") REFERENCES accounts(id), ADD FOREIGN KEY ("reviewerAccountId") REFERENCES accounts(id), ADD CHECK (version>0 AND state IN ('ASSIGNED','SUBMITTED','CHANGES_REQUIRED','COMPLETED') AND jsonb_typeof(data)='object');
ALTER TABLE training_assignment_changes ADD FOREIGN KEY ("assignmentId","organizationId") REFERENCES training_assignments(id,"organizationId"), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (version>0 AND state IN ('ASSIGNED','SUBMITTED','CHANGES_REQUIRED','COMPLETED') AND jsonb_typeof(data)='object' AND length(btrim(reason)) BETWEEN 3 AND 1000);
ALTER TABLE training_attempts ADD FOREIGN KEY ("assignmentId","organizationId") REFERENCES training_assignments(id,"organizationId"), ADD FOREIGN KEY ("actorId") REFERENCES accounts(id), ADD FOREIGN KEY ("eventId") REFERENCES domain_events(id) DEFERRABLE INITIALLY DEFERRED, ADD CHECK (sequence>0 AND kind IN ('SUBMISSION','ASSESSMENT','EFFECTIVENESS') AND jsonb_typeof(payload)='object' AND length(btrim(reason)) BETWEEN 3 AND 1000);
ALTER TABLE skill_change_requests ADD FOREIGN KEY ("trainingSourceId","organizationId") REFERENCES training_assignments(id,"organizationId");
ALTER TABLE skill_rating_changes ADD FOREIGN KEY ("trainingSourceId","organizationId") REFERENCES training_assignments(id,"organizationId");
CREATE TRIGGER s18_training_changes_immutable BEFORE UPDATE OR DELETE ON training_assignment_changes FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();
CREATE TRIGGER s18_training_attempts_immutable BEFORE UPDATE OR DELETE ON training_attempts FOR EACH ROW EXECUTE FUNCTION s18_immutable_skill_evidence();

CREATE FUNCTION s18_training_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Training assignment history must remain'; END IF;
 IF NEW.id<>OLD.id OR NEW."organizationId"<>OLD."organizationId" OR NEW."employeeId"<>OLD."employeeId" OR NEW."moduleVersionId"<>OLD."moduleVersionId" OR NEW."assignedById"<>OLD."assignedById" OR NEW."createdAt"<>OLD."createdAt" OR NEW."reviewerAccountId" IS DISTINCT FROM OLD."reviewerAccountId" OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Training assignment immutable identity/version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER s18_training_identity BEFORE UPDATE OR DELETE ON training_assignments FOR EACH ROW EXECUTE FUNCTION s18_training_identity();

CREATE FUNCTION s18_training_version_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'training.changed','training_assignment',NEW."assignmentId");
 IF a.reason IS DISTINCT FROM NEW.reason OR (a.after->>'version')::int IS DISTINCT FROM NEW.version OR a.after->>'state' IS DISTINCT FROM NEW.state OR a.after->'data' IS DISTINCT FROM NEW.data OR (NEW.version>1 AND NOT EXISTS(SELECT 1 FROM training_assignment_changes WHERE "assignmentId"=NEW."assignmentId" AND version=NEW.version-1)) THEN RAISE EXCEPTION 'Training exact version evidence mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_training_version_evidence AFTER INSERT ON training_assignment_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_training_version_evidence();

CREATE FUNCTION s18_training_head_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r training_assignments; BEGIN
 SELECT * INTO r FROM training_assignments WHERE id=NEW.id;
 IF NOT EXISTS(SELECT 1 FROM training_assignment_changes c WHERE c."assignmentId"=r.id AND c."organizationId"=r."organizationId" AND c.version=r.version AND c.state=r.state AND c.data=r.data) OR EXISTS(SELECT 1 FROM training_assignment_changes c WHERE c."assignmentId"=r.id AND c.version>r.version) THEN RAISE EXCEPTION 'Training head lacks exact latest version'; END IF;
 IF NOT EXISTS(SELECT 1 FROM library_versions v JOIN library_records l ON l.id=v."recordId" JOIN library_publications p ON p."versionId"=v.id WHERE v.id=r."moduleVersionId" AND l.kind='MODULE') THEN RAISE EXCEPTION 'Training requires exact activated module'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_training_head_evidence AFTER INSERT OR UPDATE ON training_assignments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_training_head_evidence();

CREATE FUNCTION s18_training_attempt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; BEGIN
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'training.attempt_recorded','training_assignment',NEW."assignmentId");
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'attemptId' IS DISTINCT FROM NEW.id::text OR a.after->>'kind' IS DISTINCT FROM NEW.kind OR (a.after->>'sequence')::int IS DISTINCT FROM NEW.sequence OR a.after->'payload' IS DISTINCT FROM NEW.payload OR (NEW.sequence>1 AND NOT EXISTS(SELECT 1 FROM training_attempts WHERE "assignmentId"=NEW."assignmentId" AND sequence=NEW.sequence-1)) THEN RAISE EXCEPTION 'Training attempt exact evidence mismatch'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_training_attempt_evidence AFTER INSERT ON training_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_training_attempt_evidence();

CREATE FUNCTION s18_skill_training_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."trainingSourceId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM training_assignments t WHERE t.id=NEW."trainingSourceId" AND t."organizationId"=NEW."organizationId" AND t.state='COMPLETED' AND t."employeeId"=NEW."employeeId") THEN RAISE EXCEPTION 'Skill recommendation requires own completed exact training'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER s18_skill_training_source BEFORE INSERT ON skill_change_requests FOR EACH ROW EXECUTE FUNCTION s18_skill_training_source();

DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Canonical event catalogue missing'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''training.changed'',''training.attempt_recorded''))',prior);
END $$;
GRANT SELECT,INSERT ON training_assignment_changes,training_attempts TO sense_app_runtime;
GRANT SELECT,INSERT,UPDATE ON training_assignments TO sense_app_runtime;
-- Completion/assessor and SOP/knowledge author independence guards remain pending Owner policy.
