CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "AddressType" AS ENUM ('BILLING', 'SERVICE', 'BOTH');
CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');

CREATE TABLE "OrganizationSequence" (
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "OrganizationSequence_pkey" PRIMARY KEY ("organizationId", "key")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerNumber" TEXT NOT NULL,
  "type" "CustomerType" NOT NULL,
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "displayName" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "companyName" TEXT,
  "primaryPhone" TEXT,
  "alternatePhone" TEXT,
  "email" TEXT,
  "nationalIdCiphertext" TEXT,
  "nationalIdLastFour" TEXT,
  "taxNumber" TEXT,
  "taxOffice" TEXT,
  "notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerContact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "preferredChannel" "ContactChannel" NOT NULL DEFAULT 'PHONE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "marketingConsentAt" TIMESTAMP(3),
  "marketingConsentSource" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerAddress" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "AddressType" NOT NULL DEFAULT 'SERVICE',
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "district" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postalCode" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'TR',
  "siteName" TEXT,
  "building" TEXT,
  "block" TEXT,
  "floor" TEXT,
  "unit" TEXT,
  "accessInstructions" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "addressId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "installationDate" TIMESTAMP(3),
  "warrantyEndsAt" TIMESTAMP(3),
  "maintenanceIntervalDays" INTEGER,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_organizationId_id_key" ON "Customer"("organizationId", "id");
CREATE UNIQUE INDEX "Customer_organizationId_customerNumber_key" ON "Customer"("organizationId", "customerNumber");
CREATE UNIQUE INDEX "Customer_organizationId_taxNumber_key" ON "Customer"("organizationId", "taxNumber");
CREATE INDEX "Customer_organizationId_status_createdAt_idx" ON "Customer"("organizationId", "status", "createdAt");
CREATE INDEX "Customer_organizationId_type_displayName_idx" ON "Customer"("organizationId", "type", "displayName");
CREATE UNIQUE INDEX "CustomerContact_organizationId_id_key" ON "CustomerContact"("organizationId", "id");
CREATE INDEX "CustomerContact_organizationId_customerId_active_idx" ON "CustomerContact"("organizationId", "customerId", "active");
CREATE UNIQUE INDEX "CustomerAddress_organizationId_id_key" ON "CustomerAddress"("organizationId", "id");
CREATE INDEX "CustomerAddress_organizationId_customerId_active_idx" ON "CustomerAddress"("organizationId", "customerId", "active");
CREATE INDEX "CustomerAddress_organizationId_city_district_idx" ON "CustomerAddress"("organizationId", "city", "district");
CREATE UNIQUE INDEX "Asset_organizationId_id_key" ON "Asset"("organizationId", "id");
CREATE UNIQUE INDEX "Asset_organizationId_serialNumber_key" ON "Asset"("organizationId", "serialNumber");
CREATE INDEX "Asset_organizationId_customerId_active_idx" ON "Asset"("organizationId", "customerId", "active");
CREATE INDEX "Asset_organizationId_addressId_idx" ON "Asset"("organizationId", "addressId");

ALTER TABLE "OrganizationSequence" ADD CONSTRAINT "OrganizationSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customer_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customer_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_customer_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_address_fkey" FOREIGN KEY ("organizationId", "addressId") REFERENCES "CustomerAddress"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

INSERT INTO "PlanEntitlement" ("planId", "featureKey", "enabled", "limitValue")
VALUES ('plan_starter', 'crm.customers', true, 1000)
ON CONFLICT ("planId", "featureKey") DO NOTHING;

INSERT INTO "Permission" ("key", "description") VALUES
('customer.read', 'customer.read'),
('customer.create', 'customer.create'),
('customer.update', 'customer.update'),
('customer.archive', 'customer.archive')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("organizationId", "roleId", "permissionKey")
SELECT r."organizationId", r."id", p."key"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Şirket Sahibi'
  AND p."key" IN ('customer.read', 'customer.create', 'customer.update', 'customer.archive')
ON CONFLICT DO NOTHING;
