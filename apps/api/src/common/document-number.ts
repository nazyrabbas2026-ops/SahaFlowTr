import type { Prisma } from "@sahaflow/database";

/**
 * Tenant içinde boşluksuz, seri ve yıl bazında sıfırlanan belge numarası
 * üretir: `TEK-2026-000001`.
 *
 * Sayaç `OrganizationSequence` üzerinde `"<seri>:<yıl>"` anahtarıyla tutulur ve
 * `upsert` ile atomik olarak artırılır; iki eşzamanlı istek aynı numarayı
 * alamaz. Yılın anahtarın parçası olması Türkiye'de fatura serilerinin her yıl
 * baştan başlaması gerektiği içindir — sayaç ömür boyu artsaydı etiketteki yıl
 * ile sıra numarası birbirini tutmazdı.
 *
 * Fatura numaralandırması (PR 9) aynı yardımcıyı kendi serisiyle kullanır.
 * Üretilen numara **dahili belge numarasıdır**; e-Fatura/e-Arşiv numarası
 * belge zincirinde atanır ve bu alanla karıştırılmamalıdır.
 */
export async function allocateDocumentNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  series: string,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getFullYear();
  const key = `${series.toLowerCase()}:${year}`;
  const sequence = await tx.organizationSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  const allocated = sequence.nextValue - 1;
  return `${series}-${year}-${String(allocated).padStart(6, "0")}`;
}
