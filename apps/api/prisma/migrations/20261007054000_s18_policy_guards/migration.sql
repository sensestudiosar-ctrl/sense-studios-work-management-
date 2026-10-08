-- C026/C027 Owner-approved publication independence and named training completion.
CREATE FUNCTION s18_library_publication_policy() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r library_records; v library_versions; p approval_requests; d approval_decisions; BEGIN
 SELECT * INTO r FROM library_records WHERE id=NEW."recordId";
 SELECT * INTO v FROM library_versions WHERE id=NEW."versionId";
 IF r.kind IN ('SOP','KNOWLEDGE') THEN
  IF NEW."approvalRequestId" IS NULL THEN
   IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW."actorId" AND kind='OWNER' AND state='ACTIVE') THEN RAISE EXCEPTION 'Direct SOP/knowledge publication requires Owner'; END IF;
  ELSE
   SELECT * INTO p FROM approval_requests WHERE id=NEW."approvalRequestId";
   SELECT * INTO d FROM approval_decisions WHERE "requestId"=p.id;
   IF p."typeKey" IS DISTINCT FROM 'library.publish' OR p."sourceType" IS DISTINCT FROM 'library_version' OR p."sourceId" IS DISTINCT FROM v.id::text OR p."organizationId" IS DISTINCT FROM NEW."organizationId" OR p.state<>'APPROVED' OR d.outcome<>'APPROVED' OR d."deciderId" IS DISTINCT FROM NEW."actorId" OR p."approverId" IS DISTINCT FROM NEW."actorId" OR p."requesterId"=NEW."actorId" OR v."actorId"=NEW."actorId" OR p.context->>'recordId' IS DISTINCT FROM r.id::text OR p.context->>'versionId' IS DISTINCT FROM v.id::text THEN RAISE EXCEPTION 'Publication requires exact independent authorized approval'; END IF;
  END IF;
 ELSE
  IF r.kind<>'MODULE' OR NEW."approvalRequestId" IS NOT NULL THEN RAISE EXCEPTION 'Module activation is distinct management action'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_library_publication_policy AFTER INSERT ON library_publications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_library_publication_policy();

CREATE FUNCTION s18_training_completion_policy() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE t training_assignments; learner uuid; prev training_assignment_changes; attempt training_attempts; BEGIN
 SELECT * INTO t FROM training_assignments WHERE id=NEW."assignmentId";
 SELECT "accountId" INTO learner FROM employees WHERE id=t."employeeId";
 IF t."reviewerAccountId" IS NULL OR t."reviewerAccountId"=learner THEN RAISE EXCEPTION 'Training requires named independent reviewer'; END IF;
 IF NEW.version=1 THEN
  IF NEW.state<>'ASSIGNED' OR NEW."actorId"<>t."assignedById" THEN RAISE EXCEPTION 'New training starts assigned with exact author'; END IF;
 ELSE
  SELECT * INTO prev FROM training_assignment_changes WHERE "assignmentId"=t.id AND version=NEW.version-1;
  IF NEW.state='SUBMITTED' THEN
   SELECT * INTO attempt FROM training_attempts WHERE "assignmentId"=t.id AND kind='SUBMISSION' ORDER BY sequence DESC LIMIT 1;
   IF prev.state NOT IN ('ASSIGNED','CHANGES_REQUIRED') OR NEW."actorId"<>learner OR attempt."actorId" IS DISTINCT FROM learner OR (attempt.payload->>'assignmentVersion')::int IS DISTINCT FROM NEW.version THEN RAISE EXCEPTION 'Training submission requires current trainee and immutable exact-version attempt'; END IF;
  ELSIF NEW.state IN ('COMPLETED','CHANGES_REQUIRED') THEN
   SELECT * INTO attempt FROM training_attempts WHERE "assignmentId"=t.id AND kind='ASSESSMENT' ORDER BY sequence DESC LIMIT 1;
   IF prev.state<>'SUBMITTED' OR NEW."actorId"<>t."reviewerAccountId" OR attempt."actorId" IS DISTINCT FROM t."reviewerAccountId" OR (attempt.payload->>'assignmentVersion')::int IS DISTINCT FROM NEW.version OR attempt.payload->>'outcome' IS DISTINCT FROM (CASE WHEN NEW.state='COMPLETED' THEN 'PASSED' ELSE 'CHANGES_REQUIRED' END) OR length(btrim(coalesce(attempt.payload->>'observation','')))<3 THEN RAISE EXCEPTION 'Completion requires named reviewer exact-version assessment against authored criteria'; END IF;
  ELSE RAISE EXCEPTION 'Training transition unavailable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_training_completion_policy AFTER INSERT ON training_assignment_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_training_completion_policy();

CREATE FUNCTION s18_training_attempt_policy() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE t training_assignments; learner uuid; BEGIN
 SELECT * INTO t FROM training_assignments WHERE id=NEW."assignmentId";
 SELECT "accountId" INTO learner FROM employees WHERE id=t."employeeId";
 IF NEW.kind='SUBMISSION' AND NEW."actorId"<>learner THEN RAISE EXCEPTION 'Only trainee submits training evidence'; END IF;
 IF NEW.kind='ASSESSMENT' AND NEW."actorId" IS DISTINCT FROM t."reviewerAccountId" THEN RAISE EXCEPTION 'Only named reviewer assesses'; END IF;
 IF NEW.kind='EFFECTIVENESS' AND (t.state<>'COMPLETED' OR NEW.payload->>'date' IS NULL OR length(btrim(coalesce(NEW.payload->>'observation','')))<3) THEN RAISE EXCEPTION 'Effectiveness requires dated completed-training observation'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s18_training_attempt_policy AFTER INSERT ON training_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s18_training_attempt_policy();

DO $$ DECLARE prior text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO prior FROM pg_constraint WHERE conrelid='domain_events'::regclass AND conname='domain_events_eventName_catalogue_check';
 IF prior IS NULL THEN RAISE EXCEPTION 'Canonical event catalogue missing'; END IF;
 ALTER TABLE domain_events DROP CONSTRAINT "domain_events_eventName_catalogue_check";
 EXECUTE format('ALTER TABLE domain_events ADD CONSTRAINT "domain_events_eventName_catalogue_check" CHECK ((%s) OR "eventName" IN (''library.publish_requested''))',prior);
END $$;
