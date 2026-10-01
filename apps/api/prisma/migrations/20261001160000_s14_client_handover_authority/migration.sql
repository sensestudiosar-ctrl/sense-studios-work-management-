-- Extend formal issue evidence only at the CLIENT boundary. Existing internal
-- recipient, exact issue, and own-recipient acknowledgement guards stay intact.
CREATE FUNCTION "guard_s14_client_handover_recipient"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE client_account "accounts"%ROWTYPE; portal_grant "client_portal_grants"%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "accounts" WHERE "id"=NEW."accountId" AND "kind"='CLIENT') THEN RETURN NEW; END IF;
 PERFORM 1 FROM "projects" WHERE "id"=NEW."projectId" AND "organizationId"=NEW."organizationId" AND "status"='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client handover commands require an Active project'; END IF;
 SELECT * INTO client_account FROM "accounts" WHERE "id"=NEW."accountId" FOR SHARE;
 SELECT * INTO portal_grant FROM "client_portal_grants" WHERE "accountId"=NEW."accountId" AND "projectId"=NEW."projectId" AND "organizationId"=NEW."organizationId" FOR SHARE;
 IF client_account."kind"<>'CLIENT' OR client_account."state"<>'ACTIVE' OR portal_grant."id" IS NULL OR portal_grant."revokedAt" IS NOT NULL OR portal_grant."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Client handover requires current project access'; END IF;
 PERFORM g."id" FROM "client_item_grants" g JOIN "client_review_items" i ON i."id"=g."itemId" JOIN "transmittal_items" t ON t."revisionId"=i."revisionId" WHERE g."portalGrantId"=portal_grant."id" AND t."transmittalId"=NEW."transmittalId" ORDER BY g."id" FOR SHARE OF g;
 IF EXISTS(
  SELECT 1 FROM "transmittal_items" t JOIN "document_revisions" r ON r."id"=t."revisionId" JOIN "file_blob_metadata" b ON b."id"=r."blobId"
  WHERE t."transmittalId"=NEW."transmittalId" AND (
   b."mimeType" NOT IN ('application/pdf','image/png','image/jpeg','image/gif','image/webp') OR
   NOT EXISTS(SELECT 1 FROM "client_review_items" i WHERE i."projectId"=NEW."projectId" AND i."organizationId"=NEW."organizationId" AND i."revisionId"=r."id" AND (
    portal_grant."primary" OR EXISTS(SELECT 1 FROM "client_item_grants" g WHERE g."portalGrantId"=portal_grant."id" AND g."itemId"=i."id" AND g."view")
   ))
  )
 ) THEN RAISE EXCEPTION 'Client handover requires every exact shared PDF or image'; END IF;
 -- Re-sample after exact-item lock waits as well as after the portal-grant lock.
 IF portal_grant."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Client handover requires current project access'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_client_handover_current_scope" BEFORE INSERT OR UPDATE ON "transmittal_recipients" FOR EACH ROW EXECUTE FUNCTION "guard_s14_client_handover_recipient"();
