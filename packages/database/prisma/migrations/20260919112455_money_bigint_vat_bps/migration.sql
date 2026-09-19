-- Para sütunları INTEGER'dan BIGINT'e taşınır (ADR-003: bigint minor unit).
-- INTEGER tavanı 2.147.483.647 kuruş, yani 21.474.836,47 TRY idi.

-- KDV oranı "VatRate" enum'undan basis point'e taşınır: oranlar mevzuatla
-- değişir ve enum'la her değişiklik migration + veri yeniden yazımı gerektirir.
-- Sütun önce eklenir, mevcut enum değerleri karşılıklarına çevrilir, eski sütun
-- ondan sonra düşürülür; dönüşüm veri kaybetmez.

-- AlterTable
ALTER TABLE "CatalogItem"
ADD COLUMN     "vatRateBps" INTEGER NOT NULL DEFAULT 2000,
ALTER COLUMN "listPriceMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "costPriceMinor" SET DATA TYPE BIGINT;

UPDATE "CatalogItem" SET "vatRateBps" = CASE "vatRate"
  WHEN 'EXEMPT' THEN 0
  WHEN 'VAT_ONE' THEN 100
  WHEN 'VAT_TEN' THEN 1000
  WHEN 'VAT_TWENTY' THEN 2000
END;

ALTER TABLE "CatalogItem" DROP COLUMN "vatRate";

-- AlterTable
ALTER TABLE "CommissionRule" ALTER COLUMN "capMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "CostLine" ALTER COLUMN "unitAmountMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "amountMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "subtotalMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "discountMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "vatMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "totalMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "paidMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "InvoiceLine"
ADD COLUMN     "vatRateBps" INTEGER NOT NULL DEFAULT 2000,
ALTER COLUMN "unitPriceMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "lineTotalMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "vatMinor" SET DATA TYPE BIGINT;

UPDATE "InvoiceLine" SET "vatRateBps" = CASE "vatRate"
  WHEN 'EXEMPT' THEN 0
  WHEN 'VAT_ONE' THEN 100
  WHEN 'VAT_TEN' THEN 1000
  WHEN 'VAT_TWENTY' THEN 2000
END;

ALTER TABLE "InvoiceLine" DROP COLUMN "vatRate";

-- AlterTable
ALTER TABLE "LaborRate" ALTER COLUMN "hourlyRateMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "amountMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Quote" ALTER COLUMN "subtotalMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "discountMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "vatMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "totalMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "QuoteLine"
ADD COLUMN     "vatRateBps" INTEGER NOT NULL DEFAULT 2000,
ALTER COLUMN "unitPriceMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "lineTotalMinor" SET DATA TYPE BIGINT,
ALTER COLUMN "vatMinor" SET DATA TYPE BIGINT;

UPDATE "QuoteLine" SET "vatRateBps" = CASE "vatRate"
  WHEN 'EXEMPT' THEN 0
  WHEN 'VAT_ONE' THEN 100
  WHEN 'VAT_TEN' THEN 1000
  WHEN 'VAT_TWENTY' THEN 2000
END;

ALTER TABLE "QuoteLine" DROP COLUMN "vatRate";

-- AlterTable
ALTER TABLE "QuotePackageLine" ALTER COLUMN "priceMinor" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ServicePackage"
ADD COLUMN     "vatRateBps" INTEGER NOT NULL DEFAULT 2000,
ALTER COLUMN "priceMinor" SET DATA TYPE BIGINT;

UPDATE "ServicePackage" SET "vatRateBps" = CASE "vatRate"
  WHEN 'EXEMPT' THEN 0
  WHEN 'VAT_ONE' THEN 100
  WHEN 'VAT_TEN' THEN 1000
  WHEN 'VAT_TWENTY' THEN 2000
END;

ALTER TABLE "ServicePackage" DROP COLUMN "vatRate";

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "unitCostMinor" SET DATA TYPE BIGINT;

-- DropEnum
DROP TYPE "VatRate";
