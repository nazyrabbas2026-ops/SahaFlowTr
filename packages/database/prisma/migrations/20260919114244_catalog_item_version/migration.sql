-- Katalog kalemi fiyatı birden fazla kullanıcı tarafından düzenlenebildiği
-- için güncellemeler optimistic concurrency ile korunur; `Customer`, `Job`,
-- `Quote` ve `Invoice` ile aynı desen.

-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
