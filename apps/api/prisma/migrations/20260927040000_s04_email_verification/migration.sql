ALTER TABLE "accounts" ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3);
-- Prisma's pg adapter sends JavaScript Date values without an explicit zone; pin API sessions to UTC.
ALTER ROLE sense_app_runtime SET TimeZone = 'UTC';

CREATE TABLE "email_verification_challenges" (
  "accountId" UUID NOT NULL,
  "codeHash" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sendWindowStartedAt" TIMESTAMPTZ(3) NOT NULL,
  "sendsInWindow" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "email_verification_challenges_pkey" PRIMARY KEY ("accountId"),
  CONSTRAINT "email_verification_challenges_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "email_verification_challenges_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5),
  CONSTRAINT "email_verification_challenges_sends_check" CHECK ("sendsInWindow" BETWEEN 1 AND 5)
);

CREATE INDEX "email_verification_challenges_expiresAt_idx" ON "email_verification_challenges"("expiresAt");

GRANT SELECT, INSERT, UPDATE, DELETE ON "email_verification_challenges" TO sense_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sense_app_runtime;
