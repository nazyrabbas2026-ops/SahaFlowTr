import { describe, expect, it } from "vitest";
import { serializeBigInt } from "./bigint-serializer.interceptor";

describe("serializeBigInt", () => {
  it("bigint alanları dizgiye çevirir", () => {
    expect(serializeBigInt({ totalMinor: 230_000n })).toEqual({
      totalMinor: "230000",
    });
  });

  it("iç içe nesne ve dizileri dolaşır", () => {
    expect(
      serializeBigInt({
        invoice: { totalMinor: 1n, lines: [{ vatMinor: 2n }, { vatMinor: 3n }] },
      }),
    ).toEqual({
      invoice: { totalMinor: "1", lines: [{ vatMinor: "2" }, { vatMinor: "3" }] },
    });
  });

  it("int4 tavanının üstündeki tutarı kayıpsız aktarır", () => {
    expect(serializeBigInt({ totalMinor: 9_007_199_254_740_993n })).toEqual({
      totalMinor: "9007199254740993",
    });
  });

  it("bigint olmayan değerlere dokunmaz", () => {
    const date = new Date("2026-09-19T00:00:00.000Z");
    const payload = {
      id: "quote_1",
      status: "DRAFT",
      vatRateBps: 2_000,
      approvedAt: null,
      createdAt: date,
    };
    const result = serializeBigInt(payload) as Record<string, unknown>;
    expect(result).toEqual({ ...payload, createdAt: date });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("sınıf örneklerini alanlarına ayrıştırmaz", () => {
    class Decimalish {
      constructor(private readonly value: string) {}
      toJSON() {
        return this.value;
      }
    }
    const quantity = new Decimalish("1.500");
    const result = serializeBigInt({ quantity }) as { quantity: unknown };
    expect(result.quantity).toBe(quantity);
  });
});
