import { describe, expect, it } from "vitest";
import {
  defaultValidUntil,
  describeLineProblem,
  QUOTE_STATUS_LABELS,
  toLinePayload,
  type DraftLine,
} from "./quotes.helpers";

function draft(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    optionId: null,
    name: "Klima bakımı",
    quantity: "2",
    unitPrice: "1.250,00",
    vatRateBps: 2000,
    discountBps: 0,
    ...overrides,
  };
}

describe("toLinePayload", () => {
  it("tutarı kuruşa çevirir ve miktarı normalize eder", () => {
    expect(toLinePayload(draft({ quantity: "1,5" }))).toEqual({
      optionId: null,
      name: "Klima bakımı",
      quantity: "1.5",
      unitPriceMinor: "125000",
      vatRateBps: 2000,
      discountBps: 0,
    });
  });

  it("seçenek kimliğini olduğu gibi taşır", () => {
    expect(toLinePayload(draft({ optionId: "opt_1" })).optionId).toBe("opt_1");
  });

  it("satır adının baştaki ve sondaki boşluğunu atar", () => {
    expect(toLinePayload(draft({ name: "  Gaz dolumu  " })).name).toBe(
      "Gaz dolumu",
    );
  });
});

describe("describeLineProblem", () => {
  it("geçerli satır için sorun bildirmez", () => {
    expect(describeLineProblem(draft())).toBeNull();
  });

  it("boş adı, geçersiz miktarı ve geçersiz fiyatı ayrı ayrı anlatır", () => {
    expect(describeLineProblem(draft({ name: "   " }))).toMatch(/adı/);
    expect(describeLineProblem(draft({ quantity: "0" }))).toMatch(/Miktar/);
    expect(describeLineProblem(draft({ quantity: "abc" }))).toMatch(/Miktar/);
    expect(describeLineProblem(draft({ unitPrice: "bedava" }))).toMatch(
      /Birim fiyat/,
    );
  });
});

describe("defaultValidUntil", () => {
  it("bugünden 30 gün sonrasını ISO tarih olarak verir", () => {
    expect(defaultValidUntil(new Date("2026-09-19T10:00:00.000Z"))).toBe(
      "2026-10-19",
    );
  });

  it("ay ve yıl sınırını doğru aşar", () => {
    expect(defaultValidUntil(new Date("2026-12-15T10:00:00.000Z"))).toBe(
      "2027-01-14",
    );
  });
});

describe("QUOTE_STATUS_LABELS", () => {
  it("altı durumu da Türkçe adlandırır", () => {
    expect(Object.keys(QUOTE_STATUS_LABELS)).toHaveLength(6);
    expect(QUOTE_STATUS_LABELS.DRAFT).toBe("Taslak");
    expect(QUOTE_STATUS_LABELS.CONVERTED).toBe("İşe dönüştü");
  });
});
