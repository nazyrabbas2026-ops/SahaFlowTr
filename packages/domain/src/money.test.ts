import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  applyDiscountBps,
  discountAmountMinor,
  divideRoundHalfUp,
  formatMinor,
  priceLine,
  remainingBalanceMinor,
  summarizeLines,
  VAT_RATE_PRESETS_BPS,
} from "./money";

describe("divideRoundHalfUp", () => {
  it("yarım kuruşu sıfırdan uzağa yuvarlar", () => {
    expect(divideRoundHalfUp(5n, 10n)).toBe(1n);
    expect(divideRoundHalfUp(4n, 10n)).toBe(0n);
    expect(divideRoundHalfUp(-5n, 10n)).toBe(-1n);
    expect(divideRoundHalfUp(15n, 10n)).toBe(2n);
  });

  it("sıfır veya negatif böleni reddeder", () => {
    expect(() => divideRoundHalfUp(1n, 0n)).toThrow(RangeError);
  });
});

describe("priceLine", () => {
  it("küsuratlı miktarı kuruşa yuvarlayarak fiyatlar", () => {
    // 1,5 × 1.333,33 TL = 1.999,995 TL → 2.000,00 TL
    const line = priceLine({
      unitPriceMinor: 133_333n,
      quantityMilli: 1_500n,
      vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TWENTY,
    });
    expect(line.lineTotalMinor).toBe(200_000n);
    expect(line.vatMinor).toBe(40_000n);
  });

  it("KDV'yi indirim sonrası matrahtan hesaplar", () => {
    const line = priceLine({
      unitPriceMinor: 100_000n,
      quantityMilli: 1_000n,
      discountBps: 1_000,
      vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TWENTY,
    });
    expect(line.lineTotalMinor).toBe(90_000n);
    expect(line.vatMinor).toBe(18_000n);
  });

  it("istisna oranında KDV üretmez", () => {
    const line = priceLine({
      unitPriceMinor: 100_000n,
      quantityMilli: 1_000n,
      vatRateBps: VAT_RATE_PRESETS_BPS.EXEMPT,
    });
    expect(line.vatMinor).toBe(0n);
  });

  it("int4 tavanının üstündeki tutarları kayıpsız taşır", () => {
    const line = priceLine({
      unitPriceMinor: 5_000_000_000n, // 50.000.000,00 TL
      quantityMilli: 2_000n,
      vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TWENTY,
    });
    expect(line.lineTotalMinor).toBe(10_000_000_000n);
    expect(line.vatMinor).toBe(2_000_000_000n);
  });

  it("geçersiz girdileri reddeder", () => {
    const base = { unitPriceMinor: 1_000n, quantityMilli: 1_000n, vatRateBps: 2_000 };
    expect(() => priceLine({ ...base, unitPriceMinor: -1n })).toThrow(RangeError);
    expect(() => priceLine({ ...base, quantityMilli: 0n })).toThrow(RangeError);
    expect(() => priceLine({ ...base, vatRateBps: 10_001 })).toThrow(RangeError);
    expect(() => priceLine({ ...base, discountBps: -1 })).toThrow(RangeError);
  });
});

describe("applyDiscountBps", () => {
  it("indirim tutarını ve kalanı tutarlı üretir", () => {
    expect(discountAmountMinor(10_000n, 1_500)).toBe(1_500n);
    expect(applyDiscountBps(10_000n, 1_500)).toBe(8_500n);
    expect(applyDiscountBps(10_000n, 0)).toBe(10_000n);
    expect(applyDiscountBps(10_000n, 10_000)).toBe(0n);
  });
});

describe("allocateProportionally", () => {
  it("artan kuruşları dağıtır ve toplamı korur", () => {
    const shares = allocateProportionally(100n, [1n, 1n, 1n]);
    expect(shares.reduce((sum, share) => sum + share, 0n)).toBe(100n);
    expect(shares).toEqual([34n, 33n, 33n]);
  });

  it("ağırlık toplamı sıfırken yalnızca sıfır tutarı dağıtır", () => {
    expect(allocateProportionally(0n, [0n, 0n])).toEqual([0n, 0n]);
    expect(() => allocateProportionally(1n, [0n, 0n])).toThrow(RangeError);
  });
});

describe("summarizeLines", () => {
  const mixedRateLines = [
    priceLine({
      unitPriceMinor: 100_000n,
      quantityMilli: 1_000n,
      vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TWENTY,
    }),
    priceLine({
      unitPriceMinor: 100_000n,
      quantityMilli: 1_000n,
      vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TEN,
    }),
  ];

  it("indirimsiz belgede satır KDV'lerini toplar", () => {
    const totals = summarizeLines(mixedRateLines);
    expect(totals.subtotalMinor).toBe(200_000n);
    expect(totals.discountMinor).toBe(0n);
    expect(totals.vatMinor).toBe(30_000n);
    expect(totals.totalMinor).toBe(230_000n);
  });

  it("belge indirimini satırlara dağıtıp KDV'yi yeniden hesaplar", () => {
    // 1.000,00 TL indirim iki eşit satıra 500,00 TL olarak dağılır:
    // (%20 × 500) + (%10 × 500) = 100,00 + 50,00 = 150,00 TL KDV.
    const totals = summarizeLines(mixedRateLines, 100_000n);
    expect(totals.discountMinor).toBe(100_000n);
    expect(totals.vatMinor).toBe(15_000n);
    expect(totals.totalMinor).toBe(115_000n);
  });

  it("karışık oranlı belgede toplamı deterministik üretir", () => {
    const lines = [
      priceLine({
        unitPriceMinor: 33_333n,
        quantityMilli: 3_000n,
        vatRateBps: VAT_RATE_PRESETS_BPS.VAT_TWENTY,
      }),
      priceLine({
        unitPriceMinor: 16_667n,
        quantityMilli: 1_000n,
        vatRateBps: VAT_RATE_PRESETS_BPS.VAT_ONE,
      }),
    ];
    const totals = summarizeLines(lines, 7n);
    const repeated = summarizeLines(lines, 7n);
    expect(totals).toEqual(repeated);
    expect(totals.subtotalMinor).toBe(116_666n);
    expect(totals.discountMinor).toBe(7n);
    expect(totals.totalMinor).toBe(
      totals.subtotalMinor - totals.discountMinor + totals.vatMinor,
    );
  });

  it("belge indirimini ara toplamla sınırlar", () => {
    const totals = summarizeLines(mixedRateLines, 999_999n);
    expect(totals.discountMinor).toBe(200_000n);
    expect(totals.vatMinor).toBe(0n);
    expect(totals.totalMinor).toBe(0n);
  });

  it("boş belgeyi sıfırlarla özetler", () => {
    expect(summarizeLines([])).toEqual({
      subtotalMinor: 0n,
      discountMinor: 0n,
      vatMinor: 0n,
      totalMinor: 0n,
    });
  });
});

describe("remainingBalanceMinor", () => {
  it("fazla ödemede negatife düşmez", () => {
    expect(remainingBalanceMinor(10_000n, 3_000n)).toBe(7_000n);
    expect(remainingBalanceMinor(10_000n, 12_000n)).toBe(0n);
  });
});

describe("formatMinor", () => {
  it("kuruşu Türk lirası biçiminde yazar", () => {
    expect(formatMinor(123_456n)).toBe("₺1.234,56");
    expect(formatMinor(-50n)).toBe("-₺0,50");
  });

  it("çok büyük tutarlarda hassasiyet kaybetmez", () => {
    expect(formatMinor(1_234_567_890_123_456_789n)).toBe(
      "₺12.345.678.901.234.567,89",
    );
  });
});
