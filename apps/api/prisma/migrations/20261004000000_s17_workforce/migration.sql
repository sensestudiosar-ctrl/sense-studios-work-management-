-- CreateTable
CREATE TABLE "workforce_records" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "employeeId" UUID,
    "branchId" UUID,
    "taskId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" VARCHAR(30) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_versions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" VARCHAR(30) NOT NULL,
    "data" JSONB NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "actorId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_receipts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "commandId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_ledger" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" VARCHAR(25) NOT NULL,
    "sourceKey" VARCHAR(180) NOT NULL,
    "days" DECIMAL(18,9) NOT NULL,
    "data" JSONB NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_selfies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "mime" VARCHAR(30) NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "noticeAt" TIMESTAMPTZ(3),
    "holdReason" VARCHAR(1000),
    "purgedAt" TIMESTAMPTZ(3),

    CONSTRAINT "workforce_selfies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workforce_records_organizationId_kind_employeeId_idx" ON "workforce_records"("organizationId", "kind", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "workforce_versions_recordId_version_key" ON "workforce_versions"("recordId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workforce_receipts_actorId_commandId_key" ON "workforce_receipts"("actorId", "commandId");

-- CreateIndex
CREATE INDEX "workforce_ledger_organizationId_employeeId_year_idx" ON "workforce_ledger"("organizationId", "employeeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "workforce_ledger_employeeId_sourceKey_key" ON "workforce_ledger"("employeeId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "workforce_selfies_attendanceId_key" ON "workforce_selfies"("attendanceId");
