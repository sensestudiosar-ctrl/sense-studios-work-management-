-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "AccountState" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WebAuthnChallengePurpose" AS ENUM ('REGISTRATION', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "EnrollmentGrantPurpose" AS ENUM ('OWNER_BOOTSTRAP', 'STAFF_INVITATION', 'STAFF_RECOVERY', 'OWNER_RECOVERY_SETUP');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN', 'CREDENTIAL_ADDED', 'CREDENTIAL_REVOKED', 'SESSION_REVOKED', 'RECOVERY_AUTHORIZED', 'RECOVERY_USED', 'RECOVERY_KIT_ISSUED', 'RECOVERY_KIT_ACKNOWLEDGED', 'ACCOUNT_STATE_CHANGED');

-- CreateEnum
CREATE TYPE "SecurityEventResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "kind" "AccountKind" NOT NULL,
    "state" "AccountState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_normalized_email_check" CHECK ("normalizedEmail" = lower(btrim("normalizedEmail"))),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_credentials" (
    "id" UUID NOT NULL,
    "credentialId" VARCHAR(2048) NOT NULL,
    "accountId" UUID NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" JSONB,
    "label" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webauthn_challenges" (
    "id" UUID NOT NULL,
    "accountId" UUID,
    "purpose" "WebAuthnChallengePurpose" NOT NULL,
    "challenge" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "csrfTokenHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "userAgent" VARCHAR(512),
    "ipAddress" VARCHAR(64),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_enrollment_grants" (
    "id" UUID NOT NULL,
    "purpose" "EnrollmentGrantPurpose" NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "accountId" UUID,
    "normalizedEmail" VARCHAR(320),
    "authorizedByAccountId" UUID,
    "recoveryAuthorizationId" UUID,
    "reason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),

    CONSTRAINT "identity_enrollment_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_recovery_codes" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "codeHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMPTZ(3),
    "replacedAt" TIMESTAMPTZ(3),
    "acknowledgedAt" TIMESTAMPTZ(3),

    CONSTRAINT "owner_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_recovery_authorizations" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "authorizedByAccountId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "lostCredentialIds" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "staff_recovery_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "eventType" "SecurityEventType" NOT NULL,
    "result" "SecurityEventResult" NOT NULL,
    "actorId" UUID,
    "subjectId" UUID,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_normalizedEmail_key" ON "accounts"("normalizedEmail");

-- The approved organization has one Owner identity; account kind is not a permission grant.
CREATE UNIQUE INDEX "accounts_one_owner_key" ON "accounts"("kind") WHERE "kind" = 'OWNER';

-- CreateIndex
CREATE INDEX "accounts_state_kind_idx" ON "accounts"("state", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentials_credentialId_key" ON "passkey_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "passkey_credentials_accountId_revokedAt_idx" ON "passkey_credentials"("accountId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_challenges_challenge_key" ON "webauthn_challenges"("challenge");

-- CreateIndex
CREATE INDEX "webauthn_challenges_expiresAt_consumedAt_idx" ON "webauthn_challenges"("expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "webauthn_challenges_accountId_purpose_createdAt_idx" ON "webauthn_challenges"("accountId", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_accountId_revokedAt_expiresAt_idx" ON "sessions"("accountId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_revokedAt_idx" ON "sessions"("expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "identity_enrollment_grants_tokenHash_key" ON "identity_enrollment_grants"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "identity_enrollment_grants_recoveryAuthorizationId_key" ON "identity_enrollment_grants"("recoveryAuthorizationId");

-- CreateIndex
CREATE INDEX "identity_enrollment_grants_purpose_expiresAt_consumedAt_idx" ON "identity_enrollment_grants"("purpose", "expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "identity_enrollment_grants_normalizedEmail_purpose_idx" ON "identity_enrollment_grants"("normalizedEmail", "purpose");

-- CreateIndex
CREATE INDEX "identity_enrollment_grants_authorizedByAccountId_createdAt_idx" ON "identity_enrollment_grants"("authorizedByAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "owner_recovery_codes_codeHash_key" ON "owner_recovery_codes"("codeHash");

CREATE UNIQUE INDEX "owner_recovery_codes_one_active_per_account_key" ON "owner_recovery_codes"("accountId") WHERE "usedAt" IS NULL AND "replacedAt" IS NULL;

-- CreateIndex
CREATE INDEX "owner_recovery_codes_accountId_usedAt_replacedAt_idx" ON "owner_recovery_codes"("accountId", "usedAt", "replacedAt");

-- CreateIndex
CREATE INDEX "staff_recovery_authorizations_accountId_createdAt_idx" ON "staff_recovery_authorizations"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_recovery_authorizations_authorizedByAccountId_created_idx" ON "staff_recovery_authorizations"("authorizedByAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_occurredAt_idx" ON "security_events"("occurredAt");

-- CreateIndex
CREATE INDEX "security_events_eventType_occurredAt_idx" ON "security_events"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "security_events_actorId_occurredAt_idx" ON "security_events"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "security_events_subjectId_occurredAt_idx" ON "security_events"("subjectId", "occurredAt");

-- AddForeignKey
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_enrollment_grants" ADD CONSTRAINT "identity_enrollment_grants_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_enrollment_grants" ADD CONSTRAINT "identity_enrollment_grants_authorizedByAccountId_fkey" FOREIGN KEY ("authorizedByAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_enrollment_grants" ADD CONSTRAINT "identity_enrollment_grants_recoveryAuthorizationId_fkey" FOREIGN KEY ("recoveryAuthorizationId") REFERENCES "staff_recovery_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_recovery_codes" ADD CONSTRAINT "owner_recovery_codes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_recovery_authorizations" ADD CONSTRAINT "staff_recovery_authorizations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_recovery_authorizations" ADD CONSTRAINT "staff_recovery_authorizations_authorizedByAccountId_fkey" FOREIGN KEY ("authorizedByAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
