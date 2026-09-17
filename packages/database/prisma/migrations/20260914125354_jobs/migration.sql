-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'INVOICED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('PHONE', 'WEB', 'CUSTOMER_PORTAL', 'INTERNAL', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "JobNoteVisibility" AS ENUM ('INTERNAL', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressId" TEXT,
    "assetId" TEXT,
    "jobNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problemDescription" TEXT,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "JobStatus" NOT NULL DEFAULT 'NEW',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "estimatedDurationMinutes" INTEGER,
    "source" "JobSource" NOT NULL DEFAULT 'INTERNAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNote" TEXT,
    "customerNote" TEXT,
    "holdReason" TEXT,
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatusHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "JobNoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_organizationId_status_scheduledStart_idx" ON "Job"("organizationId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Job_organizationId_customerId_createdAt_idx" ON "Job"("organizationId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_organizationId_addressId_idx" ON "Job"("organizationId", "addressId");

-- CreateIndex
CREATE INDEX "Job_organizationId_assetId_idx" ON "Job"("organizationId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_organizationId_id_key" ON "Job"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Job_organizationId_jobNumber_key" ON "Job"("organizationId", "jobNumber");

-- CreateIndex
CREATE INDEX "JobAssignment_organizationId_jobId_unassignedAt_idx" ON "JobAssignment"("organizationId", "jobId", "unassignedAt");

-- CreateIndex
CREATE INDEX "JobAssignment_organizationId_memberId_unassignedAt_idx" ON "JobAssignment"("organizationId", "memberId", "unassignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_organizationId_id_key" ON "JobAssignment"("organizationId", "id");

-- CreateIndex
CREATE INDEX "JobStatusHistory_organizationId_jobId_createdAt_idx" ON "JobStatusHistory"("organizationId", "jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobNote_organizationId_jobId_createdAt_idx" ON "JobNote"("organizationId", "jobId", "createdAt");

-- RenameForeignKey
ALTER TABLE "Asset" RENAME CONSTRAINT "Asset_address_fkey" TO "Asset_organizationId_addressId_fkey";

-- RenameForeignKey
ALTER TABLE "Asset" RENAME CONSTRAINT "Asset_customer_fkey" TO "Asset_organizationId_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "CustomerAddress" RENAME CONSTRAINT "CustomerAddress_customer_fkey" TO "CustomerAddress_organizationId_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "CustomerContact" RENAME CONSTRAINT "CustomerContact_customer_fkey" TO "CustomerContact_organizationId_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "Notification" RENAME CONSTRAINT "Notification_recipientMember_fkey" TO "Notification_organizationId_recipientMemberId_fkey";

-- RenameForeignKey
ALTER TABLE "OrganizationOnboardingStep" RENAME CONSTRAINT "OrganizationOnboardingStep_completedByMember_fkey" TO "OrganizationOnboardingStep_organizationId_completedByMembe_fkey";

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_addressId_fkey" FOREIGN KEY ("organizationId", "addressId") REFERENCES "CustomerAddress"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_assetId_fkey" FOREIGN KEY ("organizationId", "assetId") REFERENCES "Asset"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PlanEntitlement" ("planId", "featureKey", "enabled", "limitValue")
VALUES ('plan_starter', 'operations.jobs', true, 1000)
ON CONFLICT ("planId", "featureKey") DO NOTHING;

INSERT INTO "Permission" ("key", "description") VALUES
('job.read', 'job.read'), ('job.create', 'job.create'),
('job.assign', 'job.assign'), ('job.update', 'job.update'),
('job.complete', 'job.complete'), ('job.cancel', 'job.cancel')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("organizationId", "roleId", "permissionKey")
SELECT r."organizationId", r."id", p."key"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'Şirket Sahibi' AND p."key" LIKE 'job.%'
ON CONFLICT DO NOTHING;

-- RenameIndex
ALTER INDEX "Notification_organizationId_recipientMemberId_readAt_createdAt_" RENAME TO "Notification_organizationId_recipientMemberId_readAt_create_idx";
