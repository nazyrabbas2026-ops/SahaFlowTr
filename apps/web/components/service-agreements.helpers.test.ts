import { describe, expect, it } from "vitest";
import {
  describeGeneration,
  type GenerationPeriodResult,
} from "./service-agreements.helpers";

function period(
  overrides: Partial<GenerationPeriodResult> = {},
): GenerationPeriodResult {
  return {
    periodKey: "2026-07-15",
    status: "GENERATED",
    created: true,
    ...overrides,
  };
}

describe("describeGeneration", () => {
  it("reports that nothing was due when no period came back", () => {
    expect(describeGeneration([])).toBe(
      "Üretilecek yeni dönem yok; sözleşme güncel.",
    );
  });

  it("counts only the periods this call actually created", () => {
    expect(
      describeGeneration([
        period({ periodKey: "2026-07-15" }),
        period({ periodKey: "2026-08-15" }),
      ]),
    ).toBe("2 dönem işlendi: 2 yeni iş emri oluşturuldu.");
  });

  it("does not claim new jobs when the ledger already had every period", () => {
    // İdempotent ikinci çağrı: ledger kayıtları GENERATED döner ama bu çağrı
    // hiçbir iş emri oluşturmamıştır.
    expect(
      describeGeneration([
        period({ created: false }),
        period({ periodKey: "2026-08-15", created: false }),
      ]),
    ).toBe(
      "2 dönem işlendi: yeni iş emri oluşturulmadı, dönemler zaten üretilmişti.",
    );
  });

  it("separates newly created periods from previously generated ones", () => {
    expect(
      describeGeneration([
        period({ created: false }),
        period({ periodKey: "2026-08-15", created: true }),
      ]),
    ).toBe("2 dönem işlendi: 1 yeni iş emri oluşturuldu.");
  });

  it("surfaces failed periods alongside the created count", () => {
    expect(
      describeGeneration([
        period({ created: true }),
        period({ periodKey: "2026-08-15", status: "FAILED", created: false }),
      ]),
    ).toBe("2 dönem işlendi: 1 yeni iş emri oluşturuldu, 1 dönem başarısız.");
  });
});
