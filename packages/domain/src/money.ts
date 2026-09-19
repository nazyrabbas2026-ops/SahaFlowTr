/**
 * Para ve KDV hesabı.
 *
 * Tüm parasal değerler kuruş (minor unit) cinsinden `bigint`'tir (ADR-003);
 * ondalık sayı veya `number` ile para taşınmaz. KDV oranı basis point'tir:
 * %20 → 2000, %10 → 1000, %1 → 100, istisna → 0. Oran enum değil sayı olarak
 * saklanır, çünkü KDV oranları mevzuatla değişir ve geçmiş belgeler kendi
 * oranını taşımaya devam etmelidir.
 *
 * Miktar, veritabanındaki `Decimal(12,3)` sütunlarıyla aynı çözünürlükte,
 * binde bir birim (`quantityMilli`) olarak taşınır: 1,5 adet → `1500n`.
 *
 * Yuvarlama her satırda ayrı ayrı ve sıfırdan uzağa "yarım yukarı" yapılır
 * (0,5 kuruş → 1 kuruş). Belge seviyesindeki indirim satırlara dağıtılır ve
 * KDV her satırın indirimli matrahı üzerinden yeniden hesaplanır; toplam KDV
 * oranlanarak ölçeklenmez, çünkü karışık oranlı belgelerde bu kuruş sapması
 * üretir.
 */

/** KDV oranı preset'leri basis point cinsinden. UI seçenekleri buradan üretilir. */
export const VAT_RATE_PRESETS_BPS = {
  EXEMPT: 0,
  VAT_ONE: 100,
  VAT_TEN: 1000,
  VAT_TWENTY: 2000,
} as const;

export type VatRatePreset = keyof typeof VAT_RATE_PRESETS_BPS;

export const BPS_DENOMINATOR = 10_000n;
const QUANTITY_SCALE = 1_000n;

export function assertRateBps(rateBps: number, label: string): void {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000)
    throw new RangeError(`${label} 0 ile 10000 arasında tam sayı olmalıdır`);
}

/**
 * Sıfırdan uzağa yarım yukarı yuvarlayarak böler. `bigint` bölmesi sıfıra
 * doğru kırptığı için yuvarlama açıkça uygulanır.
 */
export function divideRoundHalfUp(
  numerator: bigint,
  denominator: bigint,
): bigint {
  if (denominator <= 0n) throw new RangeError("Bölen pozitif olmalıdır");
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = (absolute * 2n + denominator) / (denominator * 2n);
  return negative ? -quotient : quotient;
}

/** Basis point cinsinden indirim tutarını verir (tutarın kendisini değil). */
export function discountAmountMinor(
  amountMinor: bigint,
  discountBps: number,
): bigint {
  assertRateBps(discountBps, "discountBps");
  return divideRoundHalfUp(amountMinor * BigInt(discountBps), BPS_DENOMINATOR);
}

export function applyDiscountBps(
  amountMinor: bigint,
  discountBps: number,
): bigint {
  return amountMinor - discountAmountMinor(amountMinor, discountBps);
}

export interface PricingLineInput {
  unitPriceMinor: bigint;
  /** Miktar × 1000; 1,5 adet → 1500n. */
  quantityMilli: bigint;
  discountBps?: number;
  vatRateBps: number;
}

export interface PricingLineResult {
  lineTotalMinor: bigint;
  vatMinor: bigint;
  vatRateBps: number;
}

export function priceLine(input: PricingLineInput): PricingLineResult {
  if (input.unitPriceMinor < 0n)
    throw new RangeError("Birim fiyat negatif olamaz");
  if (input.quantityMilli <= 0n)
    throw new RangeError("Miktar sıfırdan büyük olmalıdır");
  assertRateBps(input.vatRateBps, "vatRateBps");
  const gross = divideRoundHalfUp(
    input.unitPriceMinor * input.quantityMilli,
    QUANTITY_SCALE,
  );
  const lineTotalMinor = applyDiscountBps(gross, input.discountBps ?? 0);
  return {
    lineTotalMinor,
    vatMinor: divideRoundHalfUp(
      lineTotalMinor * BigInt(input.vatRateBps),
      BPS_DENOMINATOR,
    ),
    vatRateBps: input.vatRateBps,
  };
}

/**
 * Bir tutarı ağırlıklara göre kuruş kaybı olmadan dağıtır: taban paylar aşağı
 * yuvarlanır, artan kuruşlar en büyük kalana sahip satırlara sırayla verilir.
 * Dönen dizinin toplamı her zaman `amountMinor`'a eşittir.
 */
export function allocateProportionally(
  amountMinor: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (amountMinor < 0n) throw new RangeError("Dağıtılan tutar negatif olamaz");
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0n);
  if (weightSum <= 0n) {
    if (amountMinor !== 0n)
      throw new RangeError("Ağırlık toplamı sıfırken tutar dağıtılamaz");
    return weights.map(() => 0n);
  }
  const shares = weights.map((weight) => (weight * amountMinor) / weightSum);
  const remainders = weights.map((weight) => (weight * amountMinor) % weightSum);
  // Artan kuruş sayısı her zaman satır sayısından küçüktür.
  const leftover = Number(
    amountMinor - shares.reduce((sum, share) => sum + share, 0n),
  );
  const extra = new Set(
    remainders
      .map((remainder, index) => ({ remainder, index }))
      .sort((a, b) =>
        a.remainder === b.remainder
          ? a.index - b.index
          : a.remainder > b.remainder
            ? -1
            : 1,
      )
      .slice(0, leftover)
      .map(({ index }) => index),
  );
  return shares.map((share, index) => (extra.has(index) ? share + 1n : share));
}

export interface DocumentTotals {
  subtotalMinor: bigint;
  discountMinor: bigint;
  vatMinor: bigint;
  totalMinor: bigint;
}

/**
 * Belge toplamlarını hesaplar. `documentDiscountMinor` satır indirimlerinden
 * ayrı, belgenin tamamına uygulanan indirimdir; satır toplamlarına oranla
 * dağıtılır ve KDV her satırın indirim sonrası matrahından yeniden hesaplanır.
 */
export function summarizeLines(
  lines: readonly PricingLineResult[],
  documentDiscountMinor: bigint = 0n,
): DocumentTotals {
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.lineTotalMinor,
    0n,
  );
  const requested =
    documentDiscountMinor < 0n ? 0n : documentDiscountMinor;
  const discountMinor =
    requested > subtotalMinor ? subtotalMinor : requested;
  const allocated = allocateProportionally(
    discountMinor,
    lines.map((line) => line.lineTotalMinor),
  );
  const vatMinor = lines.reduce((sum, line, index) => {
    const base = line.lineTotalMinor - (allocated[index] ?? 0n);
    return (
      sum + divideRoundHalfUp(base * BigInt(line.vatRateBps), BPS_DENOMINATOR)
    );
  }, 0n);
  return {
    subtotalMinor,
    discountMinor,
    vatMinor,
    totalMinor: subtotalMinor - discountMinor + vatMinor,
  };
}

export function remainingBalanceMinor(
  totalMinor: bigint,
  paidMinor: bigint,
): bigint {
  const remaining = totalMinor - paidMinor;
  return remaining < 0n ? 0n : remaining;
}

/**
 * Kuruşu görüntülenebilir para birimine çevirir. `Intl.NumberFormat` ondalık
 * dizgiyi birebir biçimlendirdiği için `number`'a düşürülmez; büyük tutarlarda
 * kayan nokta hassasiyeti kaybı olmaz.
 */
export function formatMinor(
  minor: bigint,
  currency = "TRY",
  locale = "tr-TR",
): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const decimal = `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n)
    .toString()
    .padStart(2, "0")}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(decimal as unknown as number);
}
