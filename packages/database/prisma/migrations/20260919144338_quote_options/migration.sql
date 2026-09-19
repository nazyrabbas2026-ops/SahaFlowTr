-- Teklif seçenekleri (Ekonomik/Önerilen/Premium) eklenir. Seçeneğe bağlı
-- olmayan satırlar (QuoteLine.optionId IS NULL) her seçenekte ortaktır.
--
-- Quote.convertedJobId, teklif onaylanınca doğan iş emrini tutar ve
-- Quote.jobId'den (teklifin çıktığı kaynak iş) ayrıdır. Unique kısıt aynı işin
-- iki teklifden doğmasını engeller; dönüşümün idempotency garantisi budur.
-- Alan PR 8'e (teklif → iş dönüşümü) kadar yazılmaz, aynı tabloya ikinci bir
-- migration açmamak için şimdi eklenmiştir.

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "convertedJobId" TEXT,
ADD COLUMN     "selectedOptionId" TEXT;

-- AlterTable
ALTER TABLE "QuoteLine" ADD COLUMN     "optionId" TEXT;

-- CreateTable
CREATE TABLE "QuoteOption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "tier" "ServicePackageTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "packageId" TEXT,
    "subtotalMinor" BIGINT NOT NULL DEFAULT 0,
    "vatMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteOption_organizationId_quoteId_position_idx" ON "QuoteOption"("organizationId", "quoteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOption_organizationId_id_key" ON "QuoteOption"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOption_organizationId_quoteId_tier_key" ON "QuoteOption"("organizationId", "quoteId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_convertedJobId_key" ON "Quote"("organizationId", "convertedJobId");

-- CreateIndex
CREATE INDEX "QuoteLine_organizationId_optionId_idx" ON "QuoteLine"("organizationId", "optionId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_convertedJobId_fkey" FOREIGN KEY ("organizationId", "convertedJobId") REFERENCES "Job"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_selectedOptionId_fkey" FOREIGN KEY ("organizationId", "selectedOptionId") REFERENCES "QuoteOption"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_organizationId_packageId_fkey" FOREIGN KEY ("organizationId", "packageId") REFERENCES "ServicePackage"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_optionId_fkey" FOREIGN KEY ("organizationId", "optionId") REFERENCES "QuoteOption"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

