-- Canonical delivery is necessary but does not itself confer business authority.
CREATE FUNCTION "check_s14_review_transition_actor"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT; audit_row "audit_events"%ROWTYPE; owner_cancellation BOOLEAN; allowed BOOLEAN;
BEGIN
 event_key:=CASE WHEN TG_OP='INSERT' THEN 'client.review_sent' WHEN NEW."status"::text='WITHDRAWN' THEN 'client.review_withdrawn' WHEN TG_TABLE_NAME='client_review_packages' THEN 'client.final_approved' WHEN NEW."status"::text='IN_REVIEW' THEN 'client.review_started' ELSE 'client.item_decided' END;
 allowed:=false;
 FOR audit_row IN SELECT a.* FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key AND a."after"->>'version'=NEW."version"::text AND (
  TG_TABLE_NAME='client_review_packages' AND a."subjectId"=NEW."id"::text AND a."after"->>'packageId'=NEW."id"::text OR
  TG_TABLE_NAME='client_review_items' AND a."after"->>'itemId'=NEW."id"::text
 ) LOOP
  IF NOT "s14_canonical_audit"(audit_row."id",NEW."organizationId",NEW."projectId",audit_row."actorId",event_key,audit_row."subjectId"::uuid) THEN CONTINUE; END IF;
  owner_cancellation:=EXISTS(SELECT 1 FROM "accounts" a JOIN "projects" p ON p."id"=NEW."projectId" WHERE a."id"=audit_row."actorId" AND a."kind"='OWNER' AND a."state"='ACTIVE' AND p."organizationId"=NEW."organizationId" AND p."status"='CANCELLED');
  IF event_key='client.review_sent' THEN
   allowed:="s14_internal_authority"(audit_row."actorId",NEW."projectId",'client.review_manage',true) AND (
    TG_TABLE_NAME='client_review_packages' AND audit_row."actorId"=(to_jsonb(NEW)->>'createdById')::uuid OR
    TG_TABLE_NAME='client_review_items' AND EXISTS(SELECT 1 FROM "client_review_packages" p WHERE p."id"=(to_jsonb(NEW)->>'packageId')::uuid AND p."createdById"=audit_row."actorId")
   );
  ELSIF event_key='client.review_started' THEN
   allowed:="s14_client_item_authority"(audit_row."actorId",NEW."id",'review');
  ELSIF event_key='client.item_decided' THEN
   allowed:=EXISTS(SELECT 1 FROM "client_item_decisions" d WHERE d."itemId"=NEW."id" AND d."accountId"=audit_row."actorId" AND d."auditEventId"=audit_row."id" AND d."kind"::text=NEW."status"::text) AND "s14_client_item_authority"(audit_row."actorId",NEW."id",CASE WHEN NEW."status"::text='APPROVED' THEN 'approve' ELSE 'review' END);
  ELSIF event_key='client.review_withdrawn' THEN
   allowed:=owner_cancellation OR "s14_internal_authority"(audit_row."actorId",NEW."projectId",'client.review_manage',true);
  ELSE
   allowed:=EXISTS(SELECT 1 FROM "client_final_approvals" f WHERE f."packageId"=NEW."id" AND f."accountId"=audit_row."actorId");
  END IF;
  IF allowed THEN RETURN NULL; END IF;
 END LOOP;
 RAISE EXCEPTION 'Client review transition requires current exact actor authority';
END $$;
CREATE CONSTRAINT TRIGGER "s14_package_transition_actor" AFTER INSERT OR UPDATE ON "client_review_packages" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_review_transition_actor"();
CREATE CONSTRAINT TRIGGER "s14_item_transition_actor" AFTER INSERT OR UPDATE ON "client_review_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_review_transition_actor"();
