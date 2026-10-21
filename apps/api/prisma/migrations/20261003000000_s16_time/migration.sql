-- CreateTable
CREATE TABLE "time_timers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "projectId" UUID,
    "taskId" UUID,
    "state" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "elapsedMs" BIGINT NOT NULL DEFAULT 0,
    "runningSince" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "stoppedAt" TIMESTAMPTZ(3),

    CONSTRAINT "time_timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "projectId" UUID,
    "taskId" UUID,
    "timerId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "approvedVersion" INTEGER,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entry_versions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "editorId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,

    CONSTRAINT "time_entry_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_approvals" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,

    CONSTRAINT "time_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_transitions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "timerId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "fromState" VARCHAR(20),
    "toState" VARCHAR(20) NOT NULL,
    "elapsedMs" BIGINT NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,

    CONSTRAINT "time_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_command_receipts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "commandId" UUID NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "time_command_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_accounting_deliveries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(300),
    "deliveredAt" TIMESTAMPTZ(3),
    "requestedById" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "eventId" UUID NOT NULL,

    CONSTRAINT "time_accounting_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_accounting_attempts" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "leaseToken" UUID NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_accounting_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_timers_organizationId_employeeId_idx" ON "time_timers"("organizationId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "time_entries_timerId_key" ON "time_entries"("timerId");

-- CreateIndex
CREATE INDEX "time_entries_organizationId_employeeId_createdAt_idx" ON "time_entries"("organizationId", "employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "time_entry_versions_entryId_version_key" ON "time_entry_versions"("entryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "time_approvals_entryId_version_key" ON "time_approvals"("entryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "time_transitions_timerId_version_key" ON "time_transitions"("timerId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "time_command_receipts_actorId_commandId_key" ON "time_command_receipts"("actorId", "commandId");

-- CreateIndex
CREATE INDEX "time_accounting_deliveries_state_leaseUntil_idx" ON "time_accounting_deliveries"("state", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "time_accounting_deliveries_entryId_revision_key" ON "time_accounting_deliveries"("entryId", "revision");

