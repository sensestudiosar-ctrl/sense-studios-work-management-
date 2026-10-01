-- Canonical evidence is checked at commit; permissions and active state at write time.
CREATE FUNCTION "s14_canonical_audit"(audit_id UUID,org_id UUID,project_id UUID,actor_id UUID,event_key TEXT,subject_id UUID) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."id"=audit_id AND a."organizationId"=org_id AND a."actorId"=actor_id AND a."eventKey"=event_key AND a."subjectId"=subject_id::text AND a."after"->>'projectId'=project_id::text AND a."actorSnapshot"->>'accountId'=actor_id::text AND length(btrim(a."reason")) BETWEEN 3 AND 1000 AND "s11_canonical_delivery"(a."id"))
$$;

CREATE FUNCTION "s14_branch_permission"(employee_id UUID,org_id UUID,branch_id UUID,permission_key TEXT) RETURNS boolean LANGUAGE sql VOLATILE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM "employee_permission_overrides" o JOIN "employees" e ON e."id"=employee_id WHERE o."employeeId"=e."id" AND o."organizationId"=org_id AND o."permissionKey"=permission_key AND o."revokedAt" IS NULL AND (o."expiresAt" IS NULL OR o."expiresAt">clock_timestamp()) AND o."effect"='DENY' AND (o."scopeKind"='ORGANIZATION' OR o."scopeKind"='BRANCH' AND o."branchId"=branch_id AND e."homeBranchId"=branch_id)) AND (
 EXISTS(SELECT 1 FROM "employee_permission_overrides" o JOIN "employees" e ON e."id"=employee_id WHERE o."employeeId"=e."id" AND o."organizationId"=org_id AND o."permissionKey"=permission_key AND o."revokedAt" IS NULL AND (o."expiresAt" IS NULL OR o."expiresAt">clock_timestamp()) AND o."effect"='ALLOW' AND (o."scopeKind"='ORGANIZATION' OR o."scopeKind"='BRANCH' AND o."branchId"=branch_id AND e."homeBranchId"=branch_id)) OR
 EXISTS(SELECT 1 FROM "employee_job_role_assignments" j JOIN "job_roles" role ON role."id"=j."jobRoleId" JOIN "role_permissions" r ON r."roleId"=role."id" JOIN "employees" e ON e."id"=employee_id WHERE j."employeeId"=e."id" AND j."organizationId"=org_id AND j."effectiveTo" IS NULL AND role."active" AND r."organizationId"=org_id AND r."permissionKey"=permission_key AND r."revokedAt" IS NULL AND (r."scopeKind"='ORGANIZATION' OR r."scopeKind"='BRANCH' AND r."branchId"=branch_id AND e."homeBranchId"=branch_id)))
$$;

CREATE FUNCTION "s14_internal_authority"(actor_id UUID,project_id UUID,permission_key TEXT,allow_lead BOOLEAN) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE project_row "projects"%ROWTYPE; account_row "accounts"%ROWTYPE; employee_row "employees"%ROWTYPE;
BEGIN
 SELECT * INTO project_row FROM "projects" WHERE "id"=project_id FOR SHARE;
 SELECT * INTO account_row FROM "accounts" WHERE "id"=actor_id FOR SHARE;
 IF project_row."id" IS NULL OR account_row."state" IS DISTINCT FROM 'ACTIVE' OR project_row."status"<>'ACTIVE' THEN RETURN false; END IF;
 IF account_row."kind"='OWNER' THEN RETURN true; END IF;
 IF account_row."kind"<>'STAFF' THEN RETURN false; END IF;
 SELECT * INTO employee_row FROM "employees" WHERE "accountId"=actor_id FOR SHARE;
 IF employee_row."id" IS NULL OR employee_row."state"<>'ACTIVE' OR employee_row."organizationId"<>project_row."organizationId" THEN RETURN false; END IF;
 PERFORM 1 FROM "project_assignments" a WHERE a."projectId"=project_id AND a."organizationId"=project_row."organizationId" AND a."employeeId"=employee_row."id" AND a."revokedAt" IS NULL AND (employee_row."homeBranchId"=project_row."branchId" OR a."crossBranchAuthorized") FOR SHARE;
 IF NOT FOUND OR NOT "s14_branch_permission"(employee_row."id",project_row."organizationId",project_row."branchId",'project.view') THEN RETURN false; END IF;
 RETURN allow_lead AND project_row."currentLeadEmployeeId"=employee_row."id" OR "s14_branch_permission"(employee_row."id",project_row."organizationId",project_row."branchId",permission_key);
END $$;

CREATE FUNCTION "s14_primary_authority"(actor_id UUID,project_id UUID,allow_owner BOOLEAN) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE account_row "accounts"%ROWTYPE; project_row "projects"%ROWTYPE;
BEGIN
 SELECT * INTO project_row FROM "projects" WHERE "id"=project_id FOR SHARE;
 SELECT * INTO account_row FROM "accounts" WHERE "id"=actor_id FOR SHARE;
 IF project_row."id" IS NULL OR project_row."status"<>'ACTIVE' OR account_row."state" IS DISTINCT FROM 'ACTIVE' THEN RETURN false; END IF;
 IF allow_owner AND account_row."kind"='OWNER' THEN RETURN true; END IF;
 IF account_row."kind"<>'CLIENT' THEN RETURN false; END IF;
 PERFORM 1 FROM "client_portal_grants" g WHERE g."projectId"=project_id AND g."accountId"=actor_id AND g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">clock_timestamp()) FOR SHARE;
 RETURN FOUND;
END $$;

CREATE FUNCTION "s14_client_item_authority"(actor_id UUID,item_id UUID,capability TEXT) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE item_row "client_review_items"%ROWTYPE; grant_row "client_portal_grants"%ROWTYPE; item_grant "client_item_grants"%ROWTYPE;
BEGIN
 SELECT * INTO item_row FROM "client_review_items" WHERE "id"=item_id;
 PERFORM 1 FROM "projects" WHERE "id"=item_row."projectId" AND "status"='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM "accounts" WHERE "id"=actor_id AND "kind"='CLIENT' AND "state"='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO grant_row FROM "client_portal_grants" WHERE "projectId"=item_row."projectId" AND "organizationId"=item_row."organizationId" AND "accountId"=actor_id AND "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt">clock_timestamp()) FOR SHARE;
 IF grant_row."id" IS NULL THEN RETURN false; END IF;
 IF grant_row."primary" THEN RETURN true; END IF;
 SELECT * INTO item_grant FROM "client_item_grants" WHERE "portalGrantId"=grant_row."id" AND "itemId"=item_id FOR SHARE;
 RETURN coalesce(item_grant."view" AND CASE capability WHEN 'view' THEN true WHEN 'comment' THEN item_grant."comment" WHEN 'review' THEN item_grant."review" WHEN 'approve' THEN item_grant."approve" WHEN 'download' THEN item_grant."download" ELSE false END,false);
END $$;

CREATE FUNCTION "guard_s14_review_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='client_review_packages' THEN
  IF TG_OP='INSERT' THEN
   IF NEW."status"<>'OPEN' OR NEW."version"<>1 OR NOT "s14_internal_authority"(NEW."createdById",NEW."projectId",'client.review_manage',true) THEN RAISE EXCEPTION 'Client package requires current management authority'; END IF;
  ELSE
   IF (to_jsonb(NEW)-ARRAY['status','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version']) OR NEW."version"<>OLD."version"+1 OR OLD."status"<>'OPEN' OR NEW."status" NOT IN ('APPROVED','WITHDRAWN') THEN RAISE EXCEPTION 'Client package content is immutable and transitions are terminal'; END IF;
  END IF;
 ELSE
  IF TG_OP='INSERT' THEN
   IF NEW."status"<>'PENDING' OR NEW."version"<>1 OR NOT EXISTS(SELECT 1 FROM "client_review_packages" p JOIN "projects" project ON project."id"=p."projectId" WHERE p."id"=NEW."packageId" AND p."status"='OPEN' AND project."status"='ACTIVE') THEN RAISE EXCEPTION 'Client item requires an open package on an Active project'; END IF;
   IF NOT EXISTS(SELECT 1 FROM "tasks" t WHERE t."id"=NEW."taskId" AND t."projectId"=NEW."projectId" AND t."organizationId"=NEW."organizationId" AND t."reviewRequirement" IN ('CLIENT','BOTH')) THEN RAISE EXCEPTION 'Client item requires exact project task with client review'; END IF;
   IF EXISTS(SELECT 1 FROM "client_review_items" i JOIN "client_review_packages" p ON p."id"=i."packageId" WHERE i."taskId"=NEW."taskId" AND p."status"='OPEN' AND i."status" IN ('PENDING','IN_REVIEW','APPROVED')) THEN RAISE EXCEPTION 'Task cannot have concurrent open client review items'; END IF;
  ELSE
   IF (to_jsonb(NEW)-ARRAY['status','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version']) OR NEW."version"<>OLD."version"+1 OR NOT (OLD."status"='PENDING' AND NEW."status"='IN_REVIEW' OR OLD."status" IN ('PENDING','IN_REVIEW') AND NEW."status" IN ('APPROVED','REVISION_REQUIRED','REJECTED','WITHDRAWN')) THEN RAISE EXCEPTION 'Client item content and terminal decisions are immutable'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_package_identity" BEFORE INSERT OR UPDATE ON "client_review_packages" FOR EACH ROW EXECUTE FUNCTION "guard_s14_review_identity"();
CREATE TRIGGER "s14_item_identity" BEFORE INSERT OR UPDATE ON "client_review_items" FOR EACH ROW EXECUTE FUNCTION "guard_s14_review_identity"();

CREATE FUNCTION "check_s14_review_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE audit_row "audit_events"%ROWTYPE; event_key TEXT; task_row "tasks"%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='client_review_packages' THEN
  event_key:=CASE WHEN TG_OP='INSERT' THEN 'client.review_sent' WHEN NEW."status"='APPROVED' THEN 'client.final_approved' ELSE 'client.review_withdrawn' END;
  IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."subjectId"=NEW."id"::text AND a."eventKey"=event_key AND a."after"->>'packageId'=NEW."id"::text AND a."after"->>'version'=NEW."version"::text AND "s14_canonical_audit"(a."id",NEW."organizationId",NEW."projectId",a."actorId",event_key,NEW."id")) THEN RAISE EXCEPTION 'Client package mutation requires canonical evidence'; END IF;
  IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM "client_review_items" WHERE "packageId"=NEW."id") THEN RAISE EXCEPTION 'Client package requires at least one exact item'; END IF;
  IF NEW."status"='APPROVED' AND NOT EXISTS(SELECT 1 FROM "client_final_approvals" WHERE "packageId"=NEW."id") THEN RAISE EXCEPTION 'Client package approval requires Primary final evidence'; END IF;
 ELSE
  IF TG_OP='INSERT' THEN
   SELECT * INTO task_row FROM "tasks" WHERE "id"=NEW."taskId";
   IF NEW."snapshot"->>'taskId' IS DISTINCT FROM NEW."taskId"::text OR NEW."snapshot"->>'taskVersion' IS DISTINCT FROM task_row."version"::text OR NEW."snapshot"->>'title' IS DISTINCT FROM task_row."title" OR NEW."snapshot"->>'ownerEmployeeId' IS DISTINCT FROM task_row."primaryOwnerEmployeeId"::text OR NEW."snapshot"->>'reviewRequirement' IS DISTINCT FROM task_row."reviewRequirement"::text OR NEW."snapshot"->>'revisionId' IS DISTINCT FROM NEW."revisionId"::text THEN RAISE EXCEPTION 'Client item requires immutable exact task snapshot'; END IF;
   IF NEW."snapshot"->>'description' IS DISTINCT FROM task_row."description" OR NEW."snapshot"->>'targetDate' IS DISTINCT FROM task_row."targetDate"::text OR NEW."snapshot"->>'startDate' IS DISTINCT FROM task_row."startDate"::text OR NEW."snapshot"->>'planItemId' IS DISTINCT FROM task_row."planItemId"::text OR NEW."snapshot"->'estimatedHours' IS DISTINCT FROM coalesce(to_jsonb(task_row."estimatedHours"),'null'::jsonb) OR NEW."snapshot"->'tags' IS DISTINCT FROM to_jsonb(task_row."tags") OR NEW."snapshot"->'checklist' IS DISTINCT FROM task_row."checklist" THEN RAISE EXCEPTION 'Client task content snapshot must preserve every submitted field'; END IF;
   IF NEW."revisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "document_revisions" r JOIN "revision_approval_facts" f ON f."revisionId"=r."id" AND f."kind"='INTERNAL' JOIN "documents" d ON d."id"=r."fileId" WHERE r."id"=NEW."revisionId" AND r."isCurrent" AND r."state" IN ('APPROVED','ISSUED') AND NEW."snapshot"->>'drawingId'=r."drawingId"::text AND NEW."snapshot"->>'fileId'=r."fileId"::text AND NEW."snapshot"->>'blobId'=r."blobId"::text AND NEW."snapshot"->>'sha256'=r."sha256") THEN RAISE EXCEPTION 'Client drawing item requires current exact internally approved content'; END IF;
   event_key:='client.review_sent';
  ELSE
   event_key:=CASE NEW."status" WHEN 'IN_REVIEW' THEN 'client.review_started' WHEN 'WITHDRAWN' THEN 'client.review_withdrawn' ELSE 'client.item_decided' END;
   IF NEW."status" IN ('APPROVED','REVISION_REQUIRED','REJECTED') AND NOT EXISTS(SELECT 1 FROM "client_item_decisions" d WHERE d."itemId"=NEW."id" AND d."kind"::text=NEW."status"::text) THEN RAISE EXCEPTION 'Client item state requires its immutable exact decision'; END IF;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."eventKey"=event_key AND a."after"->>'itemId'=NEW."id"::text AND a."after"->>'version'=NEW."version"::text AND (TG_OP<>'INSERT' OR a."after"->'snapshot'=NEW."snapshot") AND "s14_canonical_audit"(a."id",NEW."organizationId",NEW."projectId",a."actorId",event_key,a."subjectId"::uuid)) THEN RAISE EXCEPTION 'Client item mutation requires canonical exact evidence'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_package_evidence" AFTER INSERT OR UPDATE ON "client_review_packages" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_review_evidence"();
CREATE CONSTRAINT TRIGGER "s14_item_evidence" AFTER INSERT OR UPDATE ON "client_review_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_review_evidence"();

CREATE FUNCTION "guard_s14_client_evidence_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_id UUID; capability TEXT; item_row "client_review_items"%ROWTYPE; package_row "client_review_packages"%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='client_item_decisions' THEN actor_id:=NEW."accountId"; capability:=CASE WHEN NEW."kind"='APPROVED' THEN 'approve' ELSE 'review' END;
 ELSIF TG_TABLE_NAME='client_review_comments' THEN actor_id:=NEW."authorId"; capability:='comment';
 ELSE actor_id:=NEW."accountId"; capability:='comment'; END IF;
 SELECT * INTO item_row FROM "client_review_items" WHERE "id"=NEW."itemId";
 SELECT * INTO package_row FROM "client_review_packages" WHERE "id"=item_row."packageId";
 IF NOT "s14_client_item_authority"(actor_id,NEW."itemId",capability) OR package_row."status"<>'OPEN' OR item_row."status" NOT IN ('PENDING','IN_REVIEW') THEN RAISE EXCEPTION 'Client action requires current exact open-item authority'; END IF;
 IF TG_TABLE_NAME='client_item_decisions' THEN
  IF NEW."kind"='APPROVED' AND NOT EXISTS(SELECT 1 FROM "passkey_credentials" c WHERE c."id"=NEW."credentialId" AND c."accountId"=actor_id AND c."revokedAt" IS NULL) THEN RAISE EXCEPTION 'Client approval requires this account active passkey'; END IF;
  IF item_row."revisionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "document_revisions" r WHERE r."id"=item_row."revisionId" AND r."isCurrent" AND r."state" IN ('APPROVED','ISSUED') AND r."sha256"=item_row."snapshot"->>'sha256') THEN RAISE EXCEPTION 'Client decision cannot target a stale drawing revision'; END IF;
 ELSIF TG_TABLE_NAME='client_review_comments' THEN
  IF NEW."referenceId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "client_references" r WHERE r."id"=NEW."referenceId" AND r."itemId"=NEW."itemId" AND r."accountId"=actor_id) THEN RAISE EXCEPTION 'Client comment reference must belong to its own author and item'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_decision_current_access" BEFORE INSERT ON "client_item_decisions" FOR EACH ROW EXECUTE FUNCTION "guard_s14_client_evidence_insert"();
CREATE TRIGGER "s14_comment_current_access" BEFORE INSERT ON "client_review_comments" FOR EACH ROW EXECUTE FUNCTION "guard_s14_client_evidence_insert"();
CREATE TRIGGER "s14_reference_current_access" BEFORE INSERT ON "client_references" FOR EACH ROW EXECUTE FUNCTION "guard_s14_client_evidence_insert"();

CREATE FUNCTION "check_s14_client_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_id UUID; event_key TEXT; audit_row "audit_events"%ROWTYPE; key_name TEXT;
BEGIN
 IF TG_TABLE_NAME='client_item_decisions' THEN actor_id:=NEW."accountId"; event_key:='client.item_decided'; key_name:='decisionId';
 ELSIF TG_TABLE_NAME='client_review_comments' THEN actor_id:=NEW."authorId"; event_key:='client.commented'; key_name:='commentId';
 ELSE actor_id:=NEW."accountId"; event_key:='client.reference_uploaded'; key_name:='referenceId'; END IF;
 IF TG_TABLE_NAME='client_references' THEN
  SELECT * INTO audit_row FROM "audit_events" a WHERE a."organizationId"=NEW."organizationId" AND a."actorId"=actor_id AND a."eventKey"=event_key AND a."subjectId"=NEW."id"::text;
 ELSE SELECT * INTO audit_row FROM "audit_events" WHERE "id"=NEW."auditEventId"; END IF;
 IF NOT "s14_canonical_audit"(audit_row."id",NEW."organizationId",NEW."projectId",actor_id,event_key,NEW."id") OR audit_row."after"->>key_name IS DISTINCT FROM NEW."id"::text OR audit_row."after"->>'itemId' IS DISTINCT FROM NEW."itemId"::text THEN RAISE EXCEPTION 'Client evidence requires canonical exact item audit'; END IF;
 IF TG_TABLE_NAME='client_item_decisions' THEN
  IF audit_row."after"->>'kind' IS DISTINCT FROM NEW."kind"::text OR NOT EXISTS(SELECT 1 FROM "client_review_items" i WHERE i."id"=NEW."itemId" AND i."status"::text=NEW."kind"::text) THEN RAISE EXCEPTION 'Client decision must match exact item outcome'; END IF;
  IF NEW."kind"='APPROVED' AND (audit_row."after"->>'signatureName' IS DISTINCT FROM NEW."signatureName" OR audit_row."after"->'consent' IS DISTINCT FROM 'true'::jsonb) THEN RAISE EXCEPTION 'Client approval audit must preserve passkey signature consent'; END IF;
 ELSIF TG_TABLE_NAME='client_review_comments' THEN
  IF audit_row."after"->>'text' IS DISTINCT FROM NEW."text" OR audit_row."after"->'annotations' IS DISTINCT FROM NEW."annotations" OR audit_row."after"->>'referenceId' IS DISTINCT FROM NEW."referenceId"::text THEN RAISE EXCEPTION 'Client comment requires immutable content audit'; END IF;
 ELSE
  IF audit_row."after"->>'sha256' IS DISTINCT FROM NEW."sha256" OR audit_row."after"->>'size' IS DISTINCT FROM NEW."size"::text OR audit_row."after"->>'mime' IS DISTINCT FROM NEW."mime" THEN RAISE EXCEPTION 'Client reference requires exact content audit'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_decision_evidence" AFTER INSERT ON "client_item_decisions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_client_evidence"();
CREATE CONSTRAINT TRIGGER "s14_comment_evidence" AFTER INSERT ON "client_review_comments" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_client_evidence"();
CREATE CONSTRAINT TRIGGER "s14_reference_evidence" AFTER INSERT ON "client_references" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_client_evidence"();

CREATE FUNCTION "guard_s14_item_grant"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT "s14_primary_authority"(NEW."changedById",NEW."projectId",true) THEN RAISE EXCEPTION 'Only Owner or current Primary configures exact Additional Client access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "client_portal_grants" g JOIN "accounts" a ON a."id"=g."accountId" WHERE g."id"=NEW."portalGrantId" AND NOT g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">clock_timestamp()) AND a."kind"='CLIENT' AND a."state"='ACTIVE') THEN RAISE EXCEPTION 'Exact item grant requires active Additional Client portal access'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW."version"<>1 THEN RAISE EXCEPTION 'Item grant begins at version one'; END IF;
 ELSE
  IF ROW(NEW."id",NEW."organizationId",NEW."projectId",NEW."portalGrantId",NEW."itemId") IS DISTINCT FROM ROW(OLD."id",OLD."organizationId",OLD."projectId",OLD."portalGrantId",OLD."itemId") OR NEW."version"<>OLD."version"+1 THEN RAISE EXCEPTION 'Item grant identity is immutable and requires next version'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_item_grant_authority" BEFORE INSERT OR UPDATE ON "client_item_grants" FOR EACH ROW EXECUTE FUNCTION "guard_s14_item_grant"();

CREATE FUNCTION "check_s14_item_grant_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE history_row "client_item_grant_changes"%ROWTYPE; after_snapshot JSONB; before_snapshot JSONB; audit_row "audit_events"%ROWTYPE;
BEGIN
 SELECT * INTO history_row FROM "client_item_grant_changes" WHERE "grantId"=NEW."id" AND "grantVersion"=NEW."version";
 after_snapshot:=jsonb_build_object('view',NEW."view",'comment',NEW."comment",'review',NEW."review",'approve',NEW."approve",'download',NEW."download");
 IF TG_OP='INSERT' THEN before_snapshot:='{}'::jsonb;
 ELSE before_snapshot:=jsonb_build_object('view',OLD."view",'comment',OLD."comment",'review',OLD."review",'approve',OLD."approve",'download',OLD."download"); END IF;
 SELECT * INTO audit_row FROM "audit_events" WHERE "id"=history_row."auditEventId";
 IF history_row."id" IS NULL OR history_row."actorId"<>NEW."changedById" OR history_row."reason"<>NEW."reason" OR history_row."before" IS DISTINCT FROM before_snapshot OR history_row."after" IS DISTINCT FROM after_snapshot OR NOT "s14_canonical_audit"(history_row."auditEventId",NEW."organizationId",NEW."projectId",NEW."changedById",'client.item_access_changed',NEW."id") OR audit_row."after"->>'grantId' IS DISTINCT FROM NEW."id"::text OR audit_row."after"->>'version' IS DISTINCT FROM NEW."version"::text OR audit_row."after"->'access' IS DISTINCT FROM after_snapshot OR audit_row."before"->'access' IS DISTINCT FROM before_snapshot THEN RAISE EXCEPTION 'Item grant requires exact immutable canonical change history'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_item_grant_evidence" AFTER INSERT OR UPDATE ON "client_item_grants" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_item_grant_evidence"();

CREATE FUNCTION "guard_s14_management_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE permission_key TEXT; allow_lead BOOLEAN;
BEGIN
 IF TG_TABLE_NAME='client_review_classifications' THEN permission_key:='client.revision_classify'; allow_lead:=false;
 ELSE permission_key:='client.correction_assign'; allow_lead:=true; END IF;
 IF NOT "s14_internal_authority"(NEW."actorId",NEW."projectId",permission_key,allow_lead) THEN RAISE EXCEPTION 'Client revision management requires explicit current authority'; END IF;
 PERFORM 1 FROM "client_review_items" i WHERE i."id"=NEW."itemId" AND (i."status" IN ('REVISION_REQUIRED','REJECTED') OR TG_TABLE_NAME='client_review_classifications' AND EXISTS(SELECT 1 FROM "document_revisions" r WHERE r."id"=i."revisionId" AND r."series"='CR')) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Classification and correction require client revision outcome'; END IF;
 IF TG_TABLE_NAME='client_review_classifications' THEN
  IF NEW."version"<>(SELECT coalesce(max("version"),0)+1 FROM "client_review_classifications" WHERE "itemId"=NEW."itemId") THEN RAISE EXCEPTION 'Classification history requires consecutive versions'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM "tasks" t JOIN "client_review_items" i ON i."id"=NEW."itemId" WHERE t."id"=NEW."correctionTaskId" AND t."projectId"=NEW."projectId" AND t."organizationId"=NEW."organizationId" AND t."type"='CORRECTION' AND t."id"<>i."taskId") THEN RAISE EXCEPTION 'Client correction requires distinct exact project correction task'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_classification_authority" BEFORE INSERT ON "client_review_classifications" FOR EACH ROW EXECUTE FUNCTION "guard_s14_management_evidence"();
CREATE TRIGGER "s14_correction_authority" BEFORE INSERT ON "client_corrections" FOR EACH ROW EXECUTE FUNCTION "guard_s14_management_evidence"();

CREATE FUNCTION "check_s14_management_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key TEXT; key_name TEXT; audit_row "audit_events"%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='client_review_classifications' THEN event_key:='client.revision_classified'; key_name:='classificationId'; ELSE event_key:='client.correction_assigned'; key_name:='correctionId'; END IF;
 SELECT * INTO audit_row FROM "audit_events" WHERE "id"=NEW."auditEventId";
 IF NOT "s14_canonical_audit"(NEW."auditEventId",NEW."organizationId",NEW."projectId",NEW."actorId",event_key,NEW."id") OR audit_row."reason" IS DISTINCT FROM NEW."reason" OR audit_row."after"->>key_name IS DISTINCT FROM NEW."id"::text OR audit_row."after"->>'itemId' IS DISTINCT FROM NEW."itemId"::text THEN RAISE EXCEPTION 'Client management requires exact canonical evidence'; END IF;
 IF TG_TABLE_NAME='client_review_classifications' THEN
  IF audit_row."after"->>'version' IS DISTINCT FROM NEW."version"::text OR audit_row."after"->>'category' IS DISTINCT FROM NEW."category"::text THEN RAISE EXCEPTION 'Client classification audit must preserve exact version and category'; END IF;
 ELSE
  IF audit_row."after"->>'correctionTaskId' IS DISTINCT FROM NEW."correctionTaskId"::text THEN RAISE EXCEPTION 'Client correction requires canonical exact task linkage'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "s14_classification_evidence" AFTER INSERT ON "client_review_classifications" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_management_evidence"();
CREATE CONSTRAINT TRIGGER "s14_correction_evidence" AFTER INSERT ON "client_corrections" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "check_s14_management_evidence"();

