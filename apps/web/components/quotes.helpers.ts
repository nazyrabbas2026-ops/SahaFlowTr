import { parseMinorInput } from "./catalog.helpers";

export type QuoteStatus =
  "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CONVERTED";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  EXPIRED: "Süresi doldu",
  CONVERTED: "İşe dönüştü",
};

export interface DraftLine {
  optionId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  vatRateBps: number;
  discountBps: number;
}

/**
 * Editördeki bir satırı API gövdesine çevirir. Tutar burada kuruşa çevrilir ve
 * `number`'a düşürülmez; toplamı hesaplamak istemcinin işi değildir, backend
 * `money.ts` ile yeniden hesaplar ve cevabında döndürür.
 */
export function toLinePayload(line: DraftLine) {
  return {
    optionId: line.optionId,
    name: line.name.trim(),
    quantity: line.quantity.replace(",", "."),
    unitPriceMinor: parseMinorInput(line.unitPrice),
    vatRateBps: line.vatRateBps,
    discountBps: line.discountBps,
  };
}

/** Kaydetmeden önce kullanıcıya gösterilecek doğrulama; boş satır gönderilmez. */
export function describeLineProblem(line: DraftLine): string | null {
  if (!line.name.trim()) return "Satır adı boş olamaz";
  const quantity = Number(line.quantity.replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0)
    return "Miktar sıfırdan büyük olmalıdır";
  try {
    parseMinorInput(line.unitPrice);
  } catch {
    return "Birim fiyatı 1234,56 biçiminde girin";
  }
  return null;
}

/** Teklif geçerlilik tarihi için varsayılan: bugünden 30 gün sonra. */
export function defaultValidUntil(now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}
