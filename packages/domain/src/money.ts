export const VAT_RATES = {
  EXEMPT: 0,
  VAT_ONE: 1,
  VAT_TEN: 10,
  VAT_TWENTY: 20,
} as const;

export type VatRateKey = keyof typeof VAT_RATES;

export function vatPercent(rate: VatRateKey): number {
  return VAT_RATES[rate];
}

export function roundMinor(value: number): number {
  return Math.round(value);
}

export function applyDiscountBps(amountMinor: number, discountBps: number) {
  if (discountBps < 0 || discountBps > 10_000)
    throw new RangeError("discountBps 0 ile 10000 arasında olmalıdır");
  return roundMinor(amountMinor * (1 - discountBps / 10_000));
}

export interface PricingLineInput {
  unitPriceMinor: number;
  quantity: number;
  discountBps?: number;
  vatRate: VatRateKey;
}

export interface PricingLineResult {
  lineTotalMinor: number;
  vatMinor: number;
}

export function priceLine(input: PricingLineInput): PricingLineResult {
  if (!Number.isFinite(input.unitPriceMinor) || input.unitPriceMinor < 0)
    throw new RangeError("Birim fiyat negatif olamaz");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    throw new RangeError("Miktar sıfırdan büyük olmalıdır");
  const gross = roundMinor(input.unitPriceMinor * input.quantity);
  const lineTotalMinor = applyDiscountBps(gross, input.discountBps ?? 0);
  const vatMinor = roundMinor(
    (lineTotalMinor * vatPercent(input.vatRate)) / 100,
  );
  return { lineTotalMinor, vatMinor };
}

export interface DocumentTotals {
  subtotalMinor: number;
  discountMinor: number;
  vatMinor: number;
  totalMinor: number;
}

export function summarizeLines(
  lines: PricingLineResult[],
  documentDiscountMinor = 0,
): DocumentTotals {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const discountMinor = Math.max(
    0,
    Math.min(subtotalMinor, roundMinor(documentDiscountMinor)),
  );
  const taxableBase = subtotalMinor - discountMinor;
  const scale = subtotalMinor === 0 ? 0 : taxableBase / subtotalMinor;
  const vatMinor = lines.reduce(
    (sum, line) => sum + roundMinor(line.vatMinor * scale),
    0,
  );
  return {
    subtotalMinor,
    discountMinor,
    vatMinor,
    totalMinor: taxableBase + vatMinor,
  };
}

export function remainingBalanceMinor(
  totalMinor: number,
  paidMinor: number,
): number {
  return Math.max(0, totalMinor - paidMinor);
}

export function formatMinor(
  minor: number,
  currency = "TRY",
  locale = "tr-TR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}
