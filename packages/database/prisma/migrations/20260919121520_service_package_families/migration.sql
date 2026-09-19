-- Ekonomik/Önerilen/Premium seviyeleri bir arada tutan paket ailesi eklenir.
-- Ortak satırlar aile seviyesinde yönetilir ve ailedeki her pakete
-- ServicePackageItem.shared = true olarak yazılır; pakete özel satırlar
-- shared = false kalır ve aile düzenlemesinden etkilenmez.
--
-- ServicePackageItem.packageName düşürülür: hiçbir kod okumuyor veya yazmıyordu
-- ve ilişki üzerinden erişilebilen ServicePackage.name'in kopyasıydı.

-- CreateEnum
CREATE TYPE "ServicePackageTier" AS ENUM ('ECONOMY', 'RECOMMENDED', 'PREMIUM');

-- AlterTable
ALTER TABLE "ServicePackage" ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "tier" "ServicePackageTier",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ServicePackageItem" DROP COLUMN "packageName",
ADD COLUMN     "shared" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServicePackageFamily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackageFamily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePackageFamily_organizationId_active_idx" ON "ServicePackageFamily"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackageFamily_organizationId_id_key" ON "ServicePackageFamily"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackageFamily_organizationId_key_key" ON "ServicePackageFamily"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ServicePackage_organizationId_familyId_idx" ON "ServicePackage"("organizationId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_organizationId_familyId_tier_key" ON "ServicePackage"("organizationId", "familyId", "tier");

-- AddForeignKey
ALTER TABLE "ServicePackageFamily" ADD CONSTRAINT "ServicePackageFamily_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_organizationId_familyId_fkey" FOREIGN KEY ("organizationId", "familyId") REFERENCES "ServicePackageFamily"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

