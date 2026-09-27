CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationDeliveryState" AS ENUM ('PENDING', 'LEASED', 'DELIVERED', 'DEAD');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "recipientAccountId" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "internalRoute" VARCHAR(500) NOT NULL,
  "critical" BOOLEAN NOT NULL DEFAULT false,
  "mandatory" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMPTZ(3),
  "deliveryState" "NotificationDeliveryState" NOT NULL DEFAULT 'PENDING',
  "deliveredAt" TIMESTAMPTZ(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "failureCode" VARCHAR(100),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_internalRoute_check" CHECK ("internalRoute" LIKE '/%' AND "internalRoute" NOT LIKE '//%' AND "internalRoute" !~ '[[:cntrl:]]'),
  CONSTRAINT "notifications_failureCode_check" CHECK ("failureCode" IS NULL OR "failureCode" ~ '^[a-z0-9_]{1,100}$'),
  CONSTRAINT "notifications_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "notifications_eventId_recipientAccountId_channel_key" ON "notifications"("eventId", "recipientAccountId", "channel");
CREATE INDEX "notifications_recipientAccountId_createdAt_idx" ON "notifications"("recipientAccountId", "createdAt");
CREATE INDEX "notifications_eventId_idx" ON "notifications"("eventId");
CREATE INDEX "notifications_channel_deliveryState_createdAt_idx" ON "notifications"("channel", "deliveryState", "createdAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientAccountId_fkey" FOREIGN KEY ("recipientAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_accountId_category_channel_key" ON "notification_preferences"("accountId", "category", "channel");
CREATE INDEX "notification_preferences_accountId_category_idx" ON "notification_preferences"("accountId", "category");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_quiet_hours" (
  "accountId" UUID NOT NULL,
  "startLocal" CHAR(5) NOT NULL,
  "endLocal" CHAR(5) NOT NULL,
  "timeZone" VARCHAR(100) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_quiet_hours_pkey" PRIMARY KEY ("accountId"),
  CONSTRAINT "notification_quiet_hours_start_check" CHECK ("startLocal" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "notification_quiet_hours_end_check" CHECK ("endLocal" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "notification_quiet_hours_range_check" CHECK ("startLocal" <> "endLocal"),
  CONSTRAINT "notification_quiet_hours_timeZone_check" CHECK (length("timeZone") BETWEEN 1 AND 100)
);
ALTER TABLE "notification_quiet_hours" ADD CONSTRAINT "notification_quiet_hours_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
