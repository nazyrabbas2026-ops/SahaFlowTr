/**
 * Parasal değerler API sınırında kuruş cinsinden dizgi olarak taşınır
 * (`BigIntSerializerInterceptor`), çünkü `bigint` JSON'a sığmaz ve `number`
 * büyük tutarlarda hassasiyet kaybettirir. Bu yüzden form girdisi burada
 * doğrudan kuruş dizgisine çevrilir; arada `number`'a düşülmez.
 */

/** "1.234,56" → "123456". Türkçe ve nokta ayraçlı girdi birlikte kabul edilir. */
export function parseMinorInput(value: string): string {
  const cleaned = value.replace(/[\s₺]/g, "");
  if (!cleaned) return "0";
  let normalized: string;
  if (cleaned.includes(",")) {
    // Virgül varsa ondalık ayracı odur, noktalar binlik ayracıdır.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = cleaned.split(".");
    // Tek nokta ve en fazla iki basamak ondalık demektir; "1.234" binliktir.
    normalized =
      parts.length === 2 && parts[1]!.length <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error("Tutarı 1234,56 biçiminde girin");
  const [units, fraction = ""] = normalized.split(".");
  const minor = `${units}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
  return minor;
}

/** "123456" → "₺1.234,56". Dizgi biçimlendirilir, `number`'a düşürülmez. */
export function formatMinor(minor: string, currency = "TRY"): string {
  const negative = minor.startsWith("-");
  const digits = (negative ? minor.slice(1) : minor).padStart(3, "0");
  const decimal = `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(decimal as unknown as number);
}

/** "123456" → "1234,56"; düzenleme formunu doldurmak için. */
export function minorToInput(minor: string): string {
  const digits = minor.padStart(3, "0");
  return `${digits.slice(0, -2)},${digits.slice(-2)}`;
}

export function formatVatRate(bps: number): string {
  return `%${bps / 100}`;
}

export const VAT_RATE_OPTIONS = [
  { bps: 2000, label: "%20" },
  { bps: 1000, label: "%10" },
  { bps: 100, label: "%1" },
  { bps: 0, label: "İstisna" },
];
