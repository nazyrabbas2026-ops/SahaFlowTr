import { describe, expect, it } from "vitest";
import {
  formatMinor,
  formatVatRate,
  minorToInput,
  parseMinorInput,
} from "./catalog.helpers";

describe("parseMinorInput", () => {
  it("Türkçe biçimli tutarı kuruşa çevirir", () => {
    expect(parseMinorInput("1.234,56")).toBe("123456");
    expect(parseMinorInput("1234,5")).toBe("123450");
    expect(parseMinorInput("1234")).toBe("123400");
  });

  it("nokta ayraçlı girdiyi de kabul eder", () => {
    expect(parseMinorInput("1234.56")).toBe("123456");
    expect(parseMinorInput("1.234")).toBe("123400");
  });

  it("boşluk ve para simgesini yok sayar", () => {
    expect(parseMinorInput(" ₺ 1.234,56 ")).toBe("123456");
    expect(parseMinorInput("")).toBe("0");
  });

  it("güvenli tam sayı aralığının üstünde de kayıpsız çalışır", () => {
    expect(parseMinorInput("99.999.999.999.999,99")).toBe("9999999999999999");
  });

  it("geçersiz girdiyi reddeder", () => {
    expect(() => parseMinorInput("abc")).toThrow();
    expect(() => parseMinorInput("12,345")).toThrow();
    expect(() => parseMinorInput("-5")).toThrow();
  });
});

describe("formatMinor", () => {
  it("kuruşu Türk lirası biçiminde yazar", () => {
    expect(formatMinor("123456")).toBe("₺1.234,56");
    expect(formatMinor("5")).toBe("₺0,05");
    expect(formatMinor("0")).toBe("₺0,00");
  });

  it("çok büyük tutarı hassasiyet kaybetmeden yazar", () => {
    expect(formatMinor("1234567890123456789")).toBe(
      "₺12.345.678.901.234.567,89",
    );
  });
});

describe("minorToInput", () => {
  it("düzenleme formunu doldurur", () => {
    expect(minorToInput("123456")).toBe("1234,56");
    expect(minorToInput("5")).toBe("0,05");
  });

  it("parseMinorInput ile gidiş-dönüş tutarlıdır", () => {
    expect(parseMinorInput(minorToInput("987654"))).toBe("987654");
  });
});

describe("formatVatRate", () => {
  it("basis point'i yüzdeye çevirir", () => {
    expect(formatVatRate(2000)).toBe("%20");
    expect(formatVatRate(100)).toBe("%1");
    expect(formatVatRate(0)).toBe("%0");
  });
});
