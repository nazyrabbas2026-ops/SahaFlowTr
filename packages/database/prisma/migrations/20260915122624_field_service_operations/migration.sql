-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('FIELD', 'WORKSHOP', 'REMOTE');

-- CreateEnum
CREATE TYPE "TimeEntryKind" AS ENUM ('WORK', 'TRAVEL', 'BREAK', 'ON_CALL');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "QuoteLineKind" AS ENUM ('PRODUCT', 'SERVICE', 'PACKAGE', 'ADDON', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "VatRate" AS ENUM ('EXEMPT', 'VAT_ONE', 'VAT_TEN', 'VAT_TWENTY');

-- CreateEnum
CREATE TYPE "CatalogItemKind" AS ENUM ('PRODUCT', 'SERVICE', 'LABOR');

-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('WAREHOUSE', 'VEHICLE', 'WORKSHOP', 'CUSTOMER_SITE');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('PURCHASE', 'SALE', 'JOB_CONSUME', 'RETURN', 'TRANSFER', 'COUNT_ADJUST', 'SCRAP');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'PORTAL_LINK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CostLineKind" AS ENUM ('LABOR', 'MATERIAL', 'TRAVEL', 'SUBCONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SIGNED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('JOB_PHOTO', 'REPORT_BEFORE', 'REPORT_AFTER', 'SIGNATURE', 'QUOTE_PDF', 'INVOICE_PDF', 'REPORT_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "PortalAccessScope" AS ENUM ('QUOTE', 'JOB', 'INVOICE');

-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('MAPS', 'PAYMENT', 'WHATSAPP', 'SMS', 'EMAIL', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('JOB_CREATED', 'JOB_ASSIGNED', 'JOB_STATUS_CHANGED', 'JOB_COMPLETED', 'QUOTE_APPROVED', 'INVOICE_SENT', 'INVOICE_PAID', 'STOCK_LOW');

-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "requiredSkillIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceMode" "ServiceMode" NOT NULL DEFAULT 'FIELD',
    "phone" TEXT,
    "homeDistrict" TEXT,
    "homeCity" TEXT,
    "workLatencyMinutes" INTEGER NOT NULL DEFAULT 15,
    "overtimeMultiplierBps" INTEGER NOT NULL DEFAULT 1500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("organizationId","employeeId","skillId")
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "jobId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicianLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" "TimeEntryKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "minutes" INTEGER NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentQuoteId" TEXT,
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "vatMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "terms" TEXT,
    "shareTokenHash" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "rejectionReason" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "QuoteLineKind" NOT NULL DEFAULT 'SERVICE',
    "catalogItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'adet',
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPriceMinor" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "vatRate" "VatRate" NOT NULL DEFAULT 'VAT_TWENTY',
    "lineTotalMinor" INTEGER NOT NULL,
    "vatMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotePackageLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceMinor" INTEGER NOT NULL,

    CONSTRAINT "QuotePackageLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "vatRate" "VatRate" NOT NULL DEFAULT 'VAT_TWENTY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackageItem" (
    "organizationId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "addon" BOOLEAN NOT NULL DEFAULT false,
    "packageName" TEXT,

    CONSTRAINT "ServicePackageItem_pkey" PRIMARY KEY ("organizationId","packageId","catalogItemId")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CatalogItemKind" NOT NULL DEFAULT 'PRODUCT',
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'adet',
    "listPriceMinor" INTEGER NOT NULL DEFAULT 0,
    "costPriceMinor" INTEGER NOT NULL DEFAULT 0,
    "vatRate" "VatRate" NOT NULL DEFAULT 'VAT_TWENTY',
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "serialized" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LocationKind" NOT NULL DEFAULT 'WAREHOUSE',
    "memberId" TEXT,
    "addressId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("organizationId","locationId","catalogItemId")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCostMinor" INTEGER NOT NULL DEFAULT 0,
    "reason" "StockMovementReason" NOT NULL,
    "jobId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT,
    "quoteId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "vatMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "paidMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "catalogItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'adet',
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPriceMinor" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "vatRate" "VatRate" NOT NULL DEFAULT 'VAT_TWENTY',
    "lineTotalMinor" INTEGER NOT NULL,
    "vatMinor" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "providerKey" TEXT,
    "providerIntentId" TEXT,
    "note" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "hourlyRateMinor" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'LABOR',
    "rateBps" INTEGER NOT NULL,
    "capMinor" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "laborRateId" TEXT,
    "commissionRuleId" TEXT,
    "catalogItemId" TEXT,
    "kind" "CostLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitAmountMinor" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "recommendations" TEXT,
    "partsUsed" TEXT,
    "deviceStatus" TEXT,
    "nextServiceAt" TIMESTAMP(3),
    "laborMinutes" INTEGER NOT NULL DEFAULT 0,
    "travelMinutes" INTEGER NOT NULL DEFAULT 0,
    "signatureData" TEXT,
    "signedByName" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReportMaterial" (
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServiceReportMaterial_pkey" PRIMARY KEY ("organizationId","reportId","catalogItemId")
);

-- CreateTable
CREATE TABLE "JobAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reportId" TEXT,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'JOB_PHOTO',
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "jobId" TEXT,
    "quoteId" TEXT,
    "invoiceId" TEXT,
    "reportId" TEXT,
    "attachmentId" TEXT,
    "documentNumber" TEXT,
    "renderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAccessGrant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "PortalAccessScope" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "providerKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configCiphertext" TEXT,
    "configMasked" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "triggerStatus" TEXT,
    "action" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'NOTIFICATION',
    "template" TEXT NOT NULL,
    "recipients" TEXT NOT NULL DEFAULT 'ASSIGNEE',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Skill_organizationId_active_category_idx" ON "Skill"("organizationId", "active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_organizationId_id_key" ON "Skill"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_organizationId_key_key" ON "Skill"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_organizationId_memberId_key" ON "EmployeeProfile"("organizationId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_organizationId_id_key" ON "EmployeeProfile"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_organizationId_employeeNumber_key" ON "EmployeeProfile"("organizationId", "employeeNumber");

-- CreateIndex
CREATE INDEX "EmployeeSkill_organizationId_skillId_level_idx" ON "EmployeeSkill"("organizationId", "skillId", "level");

-- CreateIndex
CREATE INDEX "WorkSchedule_organizationId_memberId_weekday_idx" ON "WorkSchedule"("organizationId", "memberId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSchedule_organizationId_id_key" ON "WorkSchedule"("organizationId", "id");

-- CreateIndex
CREATE INDEX "TechnicianLocation_organizationId_memberId_recordedAt_idx" ON "TechnicianLocation"("organizationId", "memberId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianLocation_organizationId_id_key" ON "TechnicianLocation"("organizationId", "id");

-- CreateIndex
CREATE INDEX "TimeEntry_organizationId_memberId_startsAt_idx" ON "TimeEntry"("organizationId", "memberId", "startsAt");

-- CreateIndex
CREATE INDEX "TimeEntry_organizationId_jobId_idx" ON "TimeEntry"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_organizationId_id_key" ON "TimeEntry"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Quote_organizationId_status_validUntil_idx" ON "Quote"("organizationId", "status", "validUntil");

-- CreateIndex
CREATE INDEX "Quote_organizationId_customerId_createdAt_idx" ON "Quote"("organizationId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_organizationId_jobId_idx" ON "Quote"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_id_key" ON "Quote"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_quoteNumber_key" ON "Quote"("organizationId", "quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteLine_organizationId_quoteId_position_idx" ON "QuoteLine"("organizationId", "quoteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLine_organizationId_id_key" ON "QuoteLine"("organizationId", "id");

-- CreateIndex
CREATE INDEX "QuotePackageLine_organizationId_quoteId_position_idx" ON "QuotePackageLine"("organizationId", "quoteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuotePackageLine_organizationId_id_key" ON "QuotePackageLine"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ServicePackage_organizationId_active_idx" ON "ServicePackage"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_organizationId_id_key" ON "ServicePackage"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_organizationId_key_key" ON "ServicePackage"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ServicePackageItem_organizationId_catalogItemId_idx" ON "ServicePackageItem"("organizationId", "catalogItemId");

-- CreateIndex
CREATE INDEX "CatalogItem_organizationId_active_category_idx" ON "CatalogItem"("organizationId", "active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_organizationId_id_key" ON "CatalogItem"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_organizationId_sku_key" ON "CatalogItem"("organizationId", "sku");

-- CreateIndex
CREATE INDEX "StockLocation_organizationId_kind_active_idx" ON "StockLocation"("organizationId", "kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_organizationId_id_key" ON "StockLocation"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_organizationId_name_key" ON "StockLocation"("organizationId", "name");

-- CreateIndex
CREATE INDEX "StockLevel_organizationId_catalogItemId_idx" ON "StockLevel"("organizationId", "catalogItemId");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_catalogItemId_createdAt_idx" ON "StockMovement"("organizationId", "catalogItemId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_jobId_idx" ON "StockMovement"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_organizationId_id_key" ON "StockMovement"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_dueDate_idx" ON "Invoice"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_customerId_createdAt_idx" ON "Invoice"("organizationId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_jobId_idx" ON "Invoice"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_id_key" ON "Invoice"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceLine_organizationId_invoiceId_position_idx" ON "InvoiceLine"("organizationId", "invoiceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_organizationId_id_key" ON "InvoiceLine"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Payment_organizationId_invoiceId_paidAt_idx" ON "Payment"("organizationId", "invoiceId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_organizationId_providerIntentId_idx" ON "Payment"("organizationId", "providerIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_id_key" ON "Payment"("organizationId", "id");

-- CreateIndex
CREATE INDEX "LaborRate_organizationId_memberId_effectiveFrom_idx" ON "LaborRate"("organizationId", "memberId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "LaborRate_organizationId_id_key" ON "LaborRate"("organizationId", "id");

-- CreateIndex
CREATE INDEX "CommissionRule_organizationId_active_idx" ON "CommissionRule"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_organizationId_id_key" ON "CommissionRule"("organizationId", "id");

-- CreateIndex
CREATE INDEX "CostLine_organizationId_jobId_kind_idx" ON "CostLine"("organizationId", "jobId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CostLine_organizationId_id_key" ON "CostLine"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ServiceReport_organizationId_status_createdAt_idx" ON "ServiceReport"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_organizationId_id_key" ON "ServiceReport"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_organizationId_jobId_key" ON "ServiceReport"("organizationId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_organizationId_reportNumber_key" ON "ServiceReport"("organizationId", "reportNumber");

-- CreateIndex
CREATE INDEX "ServiceReportMaterial_organizationId_catalogItemId_idx" ON "ServiceReportMaterial"("organizationId", "catalogItemId");

-- CreateIndex
CREATE INDEX "JobAttachment_organizationId_jobId_kind_idx" ON "JobAttachment"("organizationId", "jobId", "kind");

-- CreateIndex
CREATE INDEX "JobAttachment_organizationId_reportId_idx" ON "JobAttachment"("organizationId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAttachment_organizationId_id_key" ON "JobAttachment"("organizationId", "id");

-- CreateIndex
CREATE INDEX "AuditDocument_organizationId_kind_renderedAt_idx" ON "AuditDocument"("organizationId", "kind", "renderedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditDocument_organizationId_id_key" ON "AuditDocument"("organizationId", "id");

-- CreateIndex
CREATE INDEX "PortalAccessGrant_organizationId_tokenHash_idx" ON "PortalAccessGrant"("organizationId", "tokenHash");

-- CreateIndex
CREATE INDEX "PortalAccessGrant_organizationId_customerId_idx" ON "PortalAccessGrant"("organizationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalAccessGrant_organizationId_id_key" ON "PortalAccessGrant"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_organizationId_id_key" ON "IntegrationSetting"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_organizationId_kind_providerKey_key" ON "IntegrationSetting"("organizationId", "kind", "providerKey");

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_trigger_active_idx" ON "AutomationRule"("organizationId", "trigger", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_organizationId_id_key" ON "AutomationRule"("organizationId", "id");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_ruleId_createdAt_idx" ON "AutomationRun"("organizationId", "ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationRun_organizationId_entityType_entityId_idx" ON "AutomationRun"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRun_organizationId_id_key" ON "AutomationRun"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_organizationId_employeeId_fkey" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "EmployeeProfile"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_organizationId_skillId_fkey" FOREIGN KEY ("organizationId", "skillId") REFERENCES "Skill"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianLocation" ADD CONSTRAINT "TechnicianLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianLocation" ADD CONSTRAINT "TechnicianLocation_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_parentQuoteId_fkey" FOREIGN KEY ("organizationId", "parentQuoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePackageLine" ADD CONSTRAINT "QuotePackageLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePackageLine" ADD CONSTRAINT "QuotePackageLine_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePackageLine" ADD CONSTRAINT "QuotePackageLine_organizationId_packageId_fkey" FOREIGN KEY ("organizationId", "packageId") REFERENCES "ServicePackage"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageItem" ADD CONSTRAINT "ServicePackageItem_organizationId_packageId_fkey" FOREIGN KEY ("organizationId", "packageId") REFERENCES "ServicePackage"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageItem" ADD CONSTRAINT "ServicePackageItem_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "StockLocation"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fromLocationId_fkey" FOREIGN KEY ("organizationId", "fromLocationId") REFERENCES "StockLocation"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_toLocationId_fkey" FOREIGN KEY ("organizationId", "toLocationId") REFERENCES "StockLocation"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborRate" ADD CONSTRAINT "LaborRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborRate" ADD CONSTRAINT "LaborRate_organizationId_memberId_fkey" FOREIGN KEY ("organizationId", "memberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_organizationId_laborRateId_fkey" FOREIGN KEY ("organizationId", "laborRateId") REFERENCES "LaborRate"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_organizationId_commissionRuleId_fkey" FOREIGN KEY ("organizationId", "commissionRuleId") REFERENCES "CommissionRule"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLine" ADD CONSTRAINT "CostLine_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportMaterial" ADD CONSTRAINT "ServiceReportMaterial_organizationId_reportId_fkey" FOREIGN KEY ("organizationId", "reportId") REFERENCES "ServiceReport"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportMaterial" ADD CONSTRAINT "ServiceReportMaterial_organizationId_catalogItemId_fkey" FOREIGN KEY ("organizationId", "catalogItemId") REFERENCES "CatalogItem"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_organizationId_reportId_fkey" FOREIGN KEY ("organizationId", "reportId") REFERENCES "ServiceReport"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_jobId_fkey" FOREIGN KEY ("organizationId", "jobId") REFERENCES "Job"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_reportId_fkey" FOREIGN KEY ("organizationId", "reportId") REFERENCES "ServiceReport"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_organizationId_attachmentId_fkey" FOREIGN KEY ("organizationId", "attachmentId") REFERENCES "JobAttachment"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccessGrant" ADD CONSTRAINT "PortalAccessGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccessGrant" ADD CONSTRAINT "PortalAccessGrant_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSetting" ADD CONSTRAINT "IntegrationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_organizationId_ruleId_fkey" FOREIGN KEY ("organizationId", "ruleId") REFERENCES "AutomationRule"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Field service entitlements and permissions
INSERT INTO "PlanEntitlement" ("planId", "featureKey", "enabled", "limitValue") VALUES
('plan_starter', 'operations.dispatch', true, NULL),
('plan_starter', 'operations.employees', true, 5),
('plan_starter', 'sales.quotes', true, 1000),
('plan_starter', 'service.reports', true, 1000),
('plan_starter', 'billing.invoices', true, 1000),
('plan_starter', 'inventory.products', true, 500),
('plan_starter', 'insights.reports', true, NULL),
('plan_starter', 'integrations', true, 2),
('plan_starter', 'automation', true, 3),
('plan_starter', 'technician.mobile', true, NULL),
('plan_starter', 'customer.portal', true, NULL)
ON CONFLICT ("planId", "featureKey") DO NOTHING;

INSERT INTO "Permission" ("key", "description") VALUES
('employee.read', 'employee.read'), ('employee.manage', 'employee.manage'),
('dispatch.read', 'dispatch.read'), ('dispatch.assign', 'dispatch.assign'),
('quote.read', 'quote.read'), ('quote.manage', 'quote.manage'), ('quote.approve', 'quote.approve'),
('report.read', 'report.read'), ('report.manage', 'report.manage'), ('report.sign', 'report.sign'),
('invoice.read', 'invoice.read'), ('invoice.manage', 'invoice.manage'), ('payment.record', 'payment.record'),
('inventory.read', 'inventory.read'), ('inventory.manage', 'inventory.manage'),
('report.analytics', 'report.analytics'),
('integration.manage', 'integration.manage'), ('automation.manage', 'automation.manage'),
('portal.access', 'portal.access')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("organizationId", "roleId", "permissionKey")
SELECT r."organizationId", r."id", p."key"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'Şirket Sahibi'
ON CONFLICT DO NOTHING;
