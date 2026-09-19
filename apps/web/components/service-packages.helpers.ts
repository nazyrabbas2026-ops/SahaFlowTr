import { formatMinor } from "./catalog.helpers";

export type PackageTier = "ECONOMY" | "RECOMMENDED" | "PREMIUM";

export const TIER_LABELS: Record<PackageTier, string> = {
  ECONOMY: "Ekonomik",
  RECOMMENDED: "Önerilen",
  PREMIUM: "Premium",
};

export const TIER_ORDER: PackageTier[] = ["ECONOMY", "RECOMMENDED", "PREMIUM"];

export interface PackageLine {
  catalogItemId: string;
  quantity: string;
  addon: boolean;
  shared: boolean;
  catalogItem: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    listPriceMinor: string;
    vatRateBps: number;
    active: boolean;
  };
}

/**
 * Bir paketin satırlarını okunur sıraya koyar: önce ailenin ortak satırları,
 * sonra pakete özel satırlar, her grupta zorunlu satırlar add-on'lardan önce.
 * Kullanıcı paketler arasında karşılaştırma yaparken ortak kısmın aynı yerde
 * durması gerekiyor.
 */
export function sortLines(lines: readonly PackageLine[]): PackageLine[] {
  const rank = (line: PackageLine) =>
    (line.shared ? 0 : 2) + (line.addon ? 1 : 0);
  return [...lines].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.catalogItem.name.localeCompare(b.catalogItem.name, "tr"),
  );
}

/** Satırların katalog liste fiyatına göre toplamı; paket fiyatıyla kıyas için. */
export function lineTotalMinor(lines: readonly PackageLine[]): string {
  const total = lines
    .filter((line) => !line.addon)
    .reduce((sum, line) => {
      const milli = BigInt(Math.round(Number(line.quantity) * 1000));
      return sum + (BigInt(line.catalogItem.listPriceMinor) * milli) / 1000n;
    }, 0n);
  return total.toString();
}

/**
 * Paket fiyatının satır toplamına göre farkını anlatır. Satır yoksa
 * karşılaştıracak bir taban da yoktur, bu durumda boş döner — uydurma bir
 * "%0 indirim" göstermek yanıltıcı olurdu.
 */
export function priceComparison(
  priceMinor: string,
  lines: readonly PackageLine[],
): string {
  const base = BigInt(lineTotalMinor(lines));
  if (base === 0n) return "";
  const price = BigInt(priceMinor);
  if (price === base) return "Satır toplamıyla aynı";
  const difference = price - base;
  const percent = Number((difference * 1000n) / base) / 10;
  const label = difference < 0n ? "indirim" : "fark";
  const absolute = difference < 0n ? -difference : difference;
  return `Satır toplamı ${formatMinor(base.toString())} · ${formatMinor(
    absolute.toString(),
  )} ${label} (%${Math.abs(percent).toFixed(1)})`;
}
