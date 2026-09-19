import { z } from "zod";

/**
 * Parasal alanlar kuruş cinsinden `bigint`'tir (ADR-003). İstemci değeri
 * dizgi olarak gönderebilir — `BigIntSerializerInterceptor` cevapları da dizgi
 * olarak döndürdüğü için form verisi aynı biçimde geri gelir — ya da güvenli
 * tam sayı aralığındaki bir `number` olarak. İki biçim de `bigint`'e
 * normalize edilir ki servis katmanı tek bir tiple çalışsın.
 */
export const minorAmountSchema = z
  .union([
    z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    z
      .string()
      .trim()
      .regex(/^\d{1,18}$/, "Tutar kuruş cinsinden tam sayı olmalıdır"),
  ])
  .transform((value) => BigInt(value));

/** KDV oranı basis point'tir: %20 → 2000. Enum kullanılmaz, oranlar değişir. */
export const vatRateBpsSchema = z.coerce.number().int().min(0).max(10_000);
