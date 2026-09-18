-- CreateEnum
CREATE TYPE "ServiceAgreementGenerationStatus" AS ENUM ('GENERATED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "problemDescription" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "recurrenceIntervalMonths" INTEGER NOT NULL,
    "anchorDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAgreementGenerationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceAgreementId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "ServiceAgreementGenerationStatus" NOT NULL,
    "failureReason" TEXT,
    "jobId" TEXT,
    "triggeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAgreementGenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceAgreement_organizationId_customerId_active_idx" ON "ServiceAgreement"("organizationId", "customerId", "active");

-- CreateIndex
CREATE INDEX "ServiceAgreement_organizationId_active_anchorDate_idx" ON "ServiceAgreement"("organizationId", "active", "anchorDate");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreement_organizationId_id_key" ON "ServiceAgreement"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ServiceAgreementGenerationRun_organizationId_jobId_idx" ON "ServiceAgreementGenerationRun"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreementGenerationRun_organizationId_serviceAgreeme_key" ON "ServiceAgreementGenerationRun"("organizationId", "serviceAgreementId", "periodKey");

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_organizationId_assetId_fkey" FOREIGN KEY ("organizationId", "assetId") REFERENCES "Asset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementGenerationRun" ADD CONSTRAINT "ServiceAgreementGenerationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementGenerationRun" ADD CONSTRAINT "ServiceAgreementGenerationRun_organizationId_serviceAgreem_fkey" FOREIGN KEY ("organizationId", "serviceAgreementId") REFERENCES "ServiceAgreement"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementGenerationRun" ADD CONSTRAINT "ServiceAgreementGenerationRun_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreementGenerationRun" ADD CONSTRAINT "ServiceAgreementGenerationRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PlanEntitlement" ("planId", "featureKey", "enabled", "limitValue")
VALUES ('plan_starter', 'operations.service-agreements', true, 100)
ON CONFLICT ("planId", "featureKey") DO NOTHING;

INSERT INTO "Permission" ("key", "description") VALUES
('service-agreement.read', 'service-agreement.read'),
('service-agreement.manage', 'service-agreement.manage'),
('service-agreement.generate', 'service-agreement.generate')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("organizationId", "roleId", "permissionKey")
SELECT r."organizationId", r."id", p."key"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'Şirket Sahibi' AND p."key" LIKE 'service-agreement.%'
ON CONFLICT DO NOTHING;
