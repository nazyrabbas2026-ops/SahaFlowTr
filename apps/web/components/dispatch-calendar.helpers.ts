export const UNASSIGNED = "unassigned";

export function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const isoWeekday = (d.getDay() + 6) % 7; // Pazartesi = 0
  d.setDate(d.getDate() - isoWeekday);
  return d;
}

export function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

/** Ayın yerel takvimdeki ilk günü, yerel gece yarısı. */
export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Ayın yerel takvimdeki son günü, yerel gece yarısı. */
export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Ayı `amount` kadar ileri/geri kaydırır. Sadece ayın 1'ine hizalanmış
 * tarihlerle (takvim navigasyonu) kullanılmak üzere tasarlandı; gün
 * bileşenini korur ama hedef ayda o gün yoksa (ör. 31 Ocak + 1 ay) JS'in
 * standart taşma davranışına tabidir.
 */
export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
}

/**
 * Ay görünümü için hafta başlangıcına hizalanmış tam bir grid üretir: ayın
 * ilk gününün bulunduğu haftanın Pazartesi'sinden, son gününün bulunduğu
 * haftanın Pazar'ına kadar (her zaman 7'nin katı sayıda gün). `addDays` ile
 * tek tek ilerliyoruz (yaz saati geçişlerinde bile güvenli); ham milisaniye
 * farkıyla gün sayısı hesaplamıyoruz.
 */
export function getMonthGrid(monthDate: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthDate));
  const gridEnd = addDays(startOfWeek(endOfMonth(monthDate)), 6);
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor.getTime() <= gridEnd.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Tarayıcının yerel saatine göre YYYY-MM-DD anahtarı üretir. `toISOString()`
 * kullanmıyoruz: o UTC'ye çevirir ve pozitif UTC ofsetli saat dilimlerinde
 * (Türkiye dahil) gece yarısına yakın saatlerde günü bir gün geri kaydırır.
 */
export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function cellKey(memberId: string, dayKey: string) {
  return `${memberId}:${dayKey}`;
}

export type DropChanges = { memberId?: string; dayKey?: string };

/**
 * Bir iş emri takvim hücresine bırakıldığında hangi işlemlerin (teknisyen
 * değişimi ve/veya güne taşıma) tetiklenmesi gerektiğini belirler.
 * "Atanmamış" hücresine bırakma bir unassign işlemi tetiklemez (backend'de
 * karşılığı yok); sadece gerçek bir teknisyene veya farklı bir güne
 * bırakıldığında ilgili alan doldurulur.
 */
export function resolveDropChanges(
  job: {
    scheduledStart: string;
    assignments: Array<{ memberId: string; primary: boolean }>;
  },
  overId: string,
): DropChanges {
  const [memberId, dayKey] = overId.split(":");
  const currentPrimary =
    job.assignments.find((a) => a.primary)?.memberId ?? UNASSIGNED;
  const currentDayKey = toDateKey(new Date(job.scheduledStart));
  const changes: DropChanges = {};
  if (memberId && memberId !== currentPrimary && memberId !== UNASSIGNED)
    changes.memberId = memberId;
  if (dayKey && dayKey !== currentDayKey) changes.dayKey = dayKey;
  return changes;
}

/** Yeni güne taşırken saat/dakikayı koruyup süreye göre bitiş zamanını hesaplar. */
export function computeRescheduledRange(
  currentStartIso: string,
  newDayKey: string,
  estimatedDurationMinutes: number | null,
) {
  const oldStart = new Date(currentStartIso);
  const [year, month, day] = newDayKey.split("-").map(Number);
  // Yerel saat kurucusu: aynı saat/dakikayı, sadece farklı bir yerel takvim
  // gününde korur. `toISOString()` bunu doğru şekilde UTC'ye çevirir.
  const newStart = new Date(
    year!,
    month! - 1,
    day,
    oldStart.getHours(),
    oldStart.getMinutes(),
    0,
    0,
  );
  const durationMinutes = estimatedDurationMinutes ?? 60;
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);
  return {
    scheduledStart: newStart.toISOString(),
    scheduledEnd: newEnd.toISOString(),
  };
}
