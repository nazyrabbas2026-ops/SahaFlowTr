import { describe, expect, it } from "vitest";
import {
  lineTotalMinor,
  priceComparison,
  sortLines,
  TIER_LABELS,
  type PackageLine,
} from "./service-packages.helpers";

function line(
  overrides: Partial<PackageLine> & { name: string; listPriceMinor?: string },
): PackageLine {
  const { name, listPriceMinor = "10000", ...rest } = overrides;
  return {
    catalogItemId: `item-${name}`,
    quantity: "1",
    addon: false,
    shared: false,
    catalogItem: {
      id: `item-${name}`,
      sku: name.toUpperCase(),
      name,
      unit: "adet",
      listPriceMinor,
      vatRateBps: 2000,
      active: true,
    },
    ...rest,
  };
}

describe("sortLines", () => {
  it("ortak satırları öne, add-on'ları gruplarının sonuna koyar", () => {
    const sorted = sortLines([
      line({ name: "Pakete özel add-on", addon: true }),
      line({ name: "Pakete özel zorunlu" }),
      line({ name: "Ortak add-on", shared: true, addon: true }),
      line({ name: "Ortak zorunlu", shared: true }),
    ]);
    expect(sorted.map((item) => item.catalogItem.name)).toEqual([
      "Ortak zorunlu",
      "Ortak add-on",
      "Pakete özel zorunlu",
      "Pakete özel add-on",
    ]);
  });

  it("aynı gruptaki satırları Türkçe alfabetik sıralar", () => {
    const sorted = sortLines([
      line({ name: "Şarj" }),
      line({ name: "Contalar" }),
      line({ name: "Ölçüm" }),
    ]);
    expect(sorted.map((item) => item.catalogItem.name)).toEqual([
      "Contalar",
      "Ölçüm",
      "Şarj",
    ]);
  });

  it("girdiyi değiştirmez", () => {
    const input = [line({ name: "B" }), line({ name: "A" })];
    sortLines(input);
    expect(input[0]!.catalogItem.name).toBe("B");
  });
});

describe("lineTotalMinor", () => {
  it("zorunlu satırları miktarla çarpar, add-on'ları saymaz", () => {
    const total = lineTotalMinor([
      line({ name: "A", listPriceMinor: "10000", quantity: "2" }),
      line({ name: "B", listPriceMinor: "5000", quantity: "1.5" }),
      line({ name: "C", listPriceMinor: "99900", addon: true }),
    ]);
    expect(total).toBe("27500");
  });

  it("int4 tavanının üstünde kayıpsız toplar", () => {
    const total = lineTotalMinor([
      line({ name: "A", listPriceMinor: "3000000000", quantity: "2" }),
    ]);
    expect(total).toBe("6000000000");
  });

  it("satır yoksa sıfır döner", () => {
    expect(lineTotalMinor([])).toBe("0");
  });
});

describe("priceComparison", () => {
  it("paket fiyatı satır toplamının altındaysa indirimi yazar", () => {
    const lines = [line({ name: "A", listPriceMinor: "10000", quantity: "2" })];
    expect(priceComparison("16000", lines)).toContain("indirim");
    expect(priceComparison("16000", lines)).toContain("%20.0");
  });

  it("paket fiyatı üstündeyse farkı yazar", () => {
    const lines = [line({ name: "A", listPriceMinor: "10000" })];
    expect(priceComparison("12000", lines)).toContain("fark");
  });

  it("eşitken bunu söyler", () => {
    const lines = [line({ name: "A", listPriceMinor: "10000" })];
    expect(priceComparison("10000", lines)).toBe("Satır toplamıyla aynı");
  });

  it("karşılaştıracak satır yoksa uydurma oran üretmez", () => {
    expect(priceComparison("10000", [])).toBe("");
    expect(priceComparison("10000", [line({ name: "A", addon: true })])).toBe(
      "",
    );
  });
});

describe("TIER_LABELS", () => {
  it("üç seviyeyi Türkçe adlandırır", () => {
    expect(TIER_LABELS.ECONOMY).toBe("Ekonomik");
    expect(TIER_LABELS.RECOMMENDED).toBe("Önerilen");
    expect(TIER_LABELS.PREMIUM).toBe("Premium");
  });
});
