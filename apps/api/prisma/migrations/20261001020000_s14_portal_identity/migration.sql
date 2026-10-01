CREATE TABLE "client_portal_grants" (
 "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
 "accountId" UUID NOT NULL, "primary" BOOLEAN NOT NULL DEFAULT false,
 "invitedById" UUID NOT NULL, "reason" VARCHAR(1000) NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(3), "revokedAt" TIMESTAMPTZ(3), "version" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "client_portal_grant_project_fk" FOREIGN KEY ("projectId","organizationId") REFERENCES "projects"("id","organizationId") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_grant_account_fk" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_grant_inviter_fk" FOREIGN KEY ("invitedById") REFERENCES "accounts"("id") ON DELETE RESTRICT,
 CONSTRAINT "client_portal_grant_shape" CHECK (length(btrim("reason")) BETWEEN 3 AND 1000 AND "version">0)
);
CREATE UNIQUE INDEX "client_portal_grants_projectId_accountId_key" ON "client_portal_grants"("projectId","accountId");
CREATE UNIQUE INDEX "client_portal_grants_id_organizationId_projectId_key" ON "client_portal_grants"("id","organizationId","projectId");
CREATE UNIQUE INDEX "client_portal_one_primary" ON "client_portal_grants"("projectId") WHERE "primary" AND "revokedAt" IS NULL;
CREATE INDEX "client_portal_grants_accountId_revokedAt_expiresAt_idx" ON "client_portal_grants"("accountId","revokedAt","expiresAt");

CREATE TABLE "client_portal_sessions" (
 "id" UUID PRIMARY KEY, "accountId" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "tokenHash" CHAR(64) NOT NULL UNIQUE, "csrfTokenHash" CHAR(64) NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "revokedAt" TIMESTAMPTZ(3),
 "userAgent" VARCHAR(512), "ipAddress" VARCHAR(64),
 CONSTRAINT "client_portal_session_shape" CHECK ("tokenHash"~'^[a-f0-9]{64}$' AND "csrfTokenHash"~'^[a-f0-9]{64}$' AND "expiresAt">"createdAt")
);
CREATE INDEX "client_portal_sessions_accountId_revokedAt_expiresAt_idx" ON "client_portal_sessions"("accountId","revokedAt","expiresAt");

CREATE TABLE "client_portal_codes" (
 "accountId" UUID PRIMARY KEY REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "codeHash" CHAR(64) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "sendWindowStartedAt" TIMESTAMPTZ(3) NOT NULL, "sendsInWindow" INTEGER NOT NULL DEFAULT 1,
 "lastSentAt" TIMESTAMPTZ(3) NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL, "consumedAt" TIMESTAMPTZ(3),
 CONSTRAINT "client_portal_code_shape" CHECK ("codeHash"~'^[a-f0-9]{64}$' AND "attempts" BETWEEN 0 AND 5 AND "sendsInWindow" BETWEEN 1 AND 5 AND "expiresAt">"lastSentAt")
);
CREATE INDEX "client_portal_codes_expiresAt_idx" ON "client_portal_codes"("expiresAt");

CREATE TABLE "client_portal_ceremonies" (
 "id" UUID PRIMARY KEY, "accountId" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
 "sessionId" UUID NOT NULL REFERENCES "client_portal_sessions"("id") ON DELETE RESTRICT,
 "purpose" VARCHAR(20) NOT NULL, "challenge" VARCHAR(512) NOT NULL UNIQUE,
 "binding" JSONB NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL, "consumedAt" TIMESTAMPTZ(3),
 CONSTRAINT "client_portal_ceremony_shape" CHECK ("purpose" IN ('REGISTRATION','APPROVAL') AND jsonb_typeof("binding")='object')
);
CREATE INDEX "client_portal_ceremonies_accountId_sessionId_expiresAt_idx" ON "client_portal_ceremonies"("accountId","sessionId","expiresAt");

-- Identity isolation is also enforced at the database boundary: CLIENT cannot
-- acquire an internal session, and staff/Owner cannot acquire a portal session.
CREATE FUNCTION "check_s14_session_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_kind TEXT;
BEGIN
 SELECT "kind"::text INTO account_kind FROM "accounts" WHERE "id"=NEW."accountId";
 IF TG_TABLE_NAME='sessions' AND account_kind='CLIENT' THEN RAISE EXCEPTION 'Client identities require portal sessions'; END IF;
 IF TG_TABLE_NAME<>'sessions' AND account_kind IS DISTINCT FROM 'CLIENT' THEN RAISE EXCEPTION 'Portal identity must be a client'; END IF;
 IF TG_TABLE_NAME='client_portal_ceremonies' AND NOT EXISTS(SELECT 1 FROM "client_portal_sessions" s WHERE s."id"=NEW."sessionId" AND s."accountId"=NEW."accountId") THEN RAISE EXCEPTION 'Portal ceremony requires the same account session'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_internal_session_identity" BEFORE INSERT OR UPDATE ON "sessions" FOR EACH ROW EXECUTE FUNCTION "check_s14_session_identity"();
CREATE TRIGGER "s14_portal_session_identity" BEFORE INSERT OR UPDATE ON "client_portal_sessions" FOR EACH ROW EXECUTE FUNCTION "check_s14_session_identity"();
CREATE TRIGGER "s14_portal_code_identity" BEFORE INSERT OR UPDATE ON "client_portal_codes" FOR EACH ROW EXECUTE FUNCTION "check_s14_session_identity"();
CREATE TRIGGER "s14_portal_ceremony_identity" BEFORE INSERT OR UPDATE ON "client_portal_ceremonies" FOR EACH ROW EXECUTE FUNCTION "check_s14_session_identity"();

CREATE FUNCTION "check_s14_portal_grant_scope"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_state TEXT; inviter_kind TEXT;
BEGIN
 SELECT "status"::text INTO project_state FROM "projects" WHERE "id"=NEW."projectId" FOR SHARE;
 IF TG_OP='INSERT' AND project_state IN ('CANCELLED','COMPLETED','ARCHIVED') THEN RAISE EXCEPTION 'Closed project cannot invite client users'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "accounts" WHERE "id"=NEW."accountId" AND "kind"='CLIENT') THEN RAISE EXCEPTION 'Client grant requires client identity'; END IF;
 SELECT "kind"::text INTO inviter_kind FROM "accounts" WHERE "id"=NEW."invitedById" AND "state"='ACTIVE';
 IF TG_OP='INSERT' THEN
  IF NEW."primary" AND inviter_kind IS DISTINCT FROM 'OWNER' THEN RAISE EXCEPTION 'Only Owner appoints Primary Client'; END IF;
  IF NOT NEW."primary" AND inviter_kind IS DISTINCT FROM 'OWNER' AND NOT EXISTS(SELECT 1 FROM "client_portal_grants" g WHERE g."projectId"=NEW."projectId" AND g."accountId"=NEW."invitedById" AND g."primary" AND g."revokedAt" IS NULL AND (g."expiresAt" IS NULL OR g."expiresAt">CURRENT_TIMESTAMP)) THEN RAISE EXCEPTION 'Only Primary Client or Owner invites additional users'; END IF;
 ELSE
  IF ROW(NEW."accountId",NEW."projectId",NEW."organizationId",NEW."invitedById",NEW."createdAt",NEW."reason") IS DISTINCT FROM ROW(OLD."accountId",OLD."projectId",OLD."organizationId",OLD."invitedById",OLD."createdAt",OLD."reason") THEN RAISE EXCEPTION 'Client grant identity is immutable'; END IF;
  IF NEW."version"<>OLD."version"+1 THEN RAISE EXCEPTION 'Client grant changes require next version'; END IF;
 END IF;
 IF project_state='CANCELLED' AND NEW."revokedAt" IS NULL AND NEW."expiresAt" IS NULL THEN RAISE EXCEPTION 'Cancelled project client access requires finite expiry'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_portal_grant_scope" BEFORE INSERT OR UPDATE ON "client_portal_grants" FOR EACH ROW EXECUTE FUNCTION "check_s14_portal_grant_scope"();

-- Fail closed until the cancellation command supplies each client's end date.
CREATE FUNCTION "check_s14_cancel_client_expiry"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status"='CANCELLED' AND OLD."status"<>'CANCELLED' AND EXISTS(SELECT 1 FROM "client_portal_grants" WHERE "projectId"=NEW."id" AND "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt"<=CURRENT_TIMESTAMP)) THEN RAISE EXCEPTION 'Owner must set a future end date for every retained client grant'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "s14_cancellation_client_expiry" BEFORE UPDATE ON "projects" FOR EACH ROW EXECUTE FUNCTION "check_s14_cancel_client_expiry"();
