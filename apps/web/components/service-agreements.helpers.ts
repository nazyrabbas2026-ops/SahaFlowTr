export type GenerationStatus = "GENERATED" | "SKIPPED" | "FAILED";

export interface GenerationPeriodResult {
  periodKey: string;
  status: GenerationStatus;
  /** Bu çağrının dönemi gerçekten üretip üretmediği; idempotent tekrar
   * çağrılarda ledger'daki eski kayıt da `GENERATED` olarak döndüğü için
   * "yeni oluştu" bilgisi yalnızca bu alandan okunabilir. */
  created: boolean;
}

/** "Şimdi Üret" sonucunu kullanıcıya doğru anlatan mesajı üretir: tekrar
 * çalıştırmada yeni iş emri oluşmadığını gizlemez, başarısız dönemleri de
 * ayrıca belirtir. */
export function describeGeneration(
  periods: readonly GenerationPeriodResult[],
): string {
  if (periods.length === 0)
    return "Üretilecek yeni dönem yok; sözleşme güncel.";
  const created = periods.filter(
    (period) => period.created && period.status === "GENERATED",
  ).length;
  const failed = periods.filter((period) => period.status === "FAILED").length;
  const outcome = created
    ? `${created} yeni iş emri oluşturuldu`
    : "yeni iş emri oluşturulmadı, dönemler zaten üretilmişti";
  const failure = failed ? `, ${failed} dönem başarısız` : "";
  return `${periods.length} dönem işlendi: ${outcome}${failure}.`;
}
