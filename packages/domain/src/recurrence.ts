export interface RecurrenceInput {
  anchorDate: Date;
  startDate: Date;
  endDate: Date | null;
  intervalMonths: number;
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * `anchorDate`'ten başlayıp `intervalMonths` adımlarla ilerleyen, ancak
 * `startDate`'e eşit/sonraki, `asOf`'a eşit/önceki ve (varsa) `endDate`'i
 * aşmayan tüm tekrar tarihlerini döndürür. Sonuç kronolojik sırayla gelir.
 *
 * Ay taşması (ör. anchor 31'iyse ve hedef ayda 31 yoksa) JS `Date`'in
 * standart taşma davranışına tabidir — bu MVP için bilinçli bir
 * sadeleştirmedir, tam bir RRULE motoru değildir.
 */
export function computeDueOccurrences(
  input: RecurrenceInput,
  asOf: Date,
): Date[] {
  const occurrences: Date[] = [];
  let index = 0;
  let occurrence = input.anchorDate;
  while (occurrence.getTime() < input.startDate.getTime()) {
    index += 1;
    occurrence = addMonthsUtc(input.anchorDate, index * input.intervalMonths);
  }
  while (
    occurrence.getTime() <= asOf.getTime() &&
    (!input.endDate || occurrence.getTime() <= input.endDate.getTime())
  ) {
    occurrences.push(occurrence);
    index += 1;
    occurrence = addMonthsUtc(input.anchorDate, index * input.intervalMonths);
  }
  return occurrences;
}

/** Bir tekrar tarihini generation ledger için değişmez bir dönem
 * anahtarına çevirir (UTC takvim günü — sunucu tarafı saf hesaplama, tarayıcı
 * yerel saatiyle karıştırılmaz). */
export function periodKeyFor(occurrence: Date): string {
  return occurrence.toISOString().slice(0, 10);
}
