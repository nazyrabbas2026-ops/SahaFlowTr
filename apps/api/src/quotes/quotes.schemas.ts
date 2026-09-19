import { z } from "zod";
import { minorAmountSchema, vatRateBpsSchema } from "../common/money.schemas";

const tierSchema = z.enum(["ECONOMY", "RECOMMENDED", "PREMIUM"]);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

// Miktar veritabanında Decimal(12,3); hesap `money.ts`'e binde bir birim
// (quantityMilli) olarak gider, bu yüzden üç ondalıktan fazlası kabul edilmez.
const quantitySchema = z
  .union([z.number().positive().max(999_999), z.string().trim()])
  .transform((value, ctx) => {
    const text =
      typeof value === "number" ? String(value) : value.replace(",", ".");
    if (!/^\d{1,9}(\.\d{1,3})?$/.test(text) || Number(text) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Miktar sıfırdan büyük ve en fazla üç ondalıklı olmalıdır",
      });
      return z.NEVER;
    }
    return text;
  });

const quoteBase = z.object({
  customerId: z.string().cuid(),
  title: z.string().trim().min(2).max(160),
  description: optionalText(2000),
  terms: optionalText(4000),
  // Teklifin çıktığı kaynak iş; dönüşümle doğan iş ayrı bir alandır.
  jobId: z.union([z.string().cuid(), z.null()]).optional(),
  validUntil: z.string().datetime({ offset: true }).or(z.string().date()),
  discountMinor: minorAmountSchema.optional(),
});

export const createQuoteSchema = quoteBase;

// Update create'in taban nesnesinden türetilir; ikisi bağımsız yazıldığında
// zamanla ayrışır ve hata yalnızca akışlardan birinde ortaya çıkar.
export const updateQuoteSchema = quoteBase.partial().extend({
  version: z.coerce.number().int().positive(),
});

export const quoteLineSchema = z.object({
  // Boş bırakılırsa satır tüm seçeneklerde ortaktır.
  optionId: z.union([z.string().cuid(), z.null()]).optional(),
  kind: z
    .enum(["PRODUCT", "SERVICE", "PACKAGE", "ADDON", "DISCOUNT"])
    .default("SERVICE"),
  catalogItemId: z.union([z.string().cuid(), z.null()]).optional(),
  name: z.string().trim().min(1).max(200),
  description: optionalText(1000),
  unit: z.string().trim().min(1).max(20).default("adet"),
  quantity: quantitySchema,
  unitPriceMinor: minorAmountSchema,
  discountBps: z.coerce.number().int().min(0).max(10_000).default(0),
  vatRateBps: vatRateBpsSchema.default(2_000),
});

/** Satır listesi bütün olarak değiştirilir; toplamlar aynı işlemde yeniden hesaplanır. */
export const replaceLinesSchema = z.object({
  version: z.coerce.number().int().positive(),
  lines: z.array(quoteLineSchema).max(200),
});

export const replaceOptionsSchema = z.object({
  version: z.coerce.number().int().positive(),
  options: z
    .array(
      z.object({
        tier: tierSchema,
        name: z.string().trim().min(2).max(160),
        description: optionalText(1000),
        // Verilirse seçeneğin satırları bu paketten üretilir (snapshot).
        packageId: z.union([z.string().cuid(), z.null()]).optional(),
      }),
    )
    .max(3),
});

export const selectOptionSchema = z.object({
  version: z.coerce.number().int().positive(),
  optionId: z.union([z.string().cuid(), z.null()]),
});

export const quoteListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z
    .enum([
      "ALL",
      "DRAFT",
      "SENT",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ])
    .default("ALL"),
  customerId: z.string().trim().max(40).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type ReplaceLinesInput = z.infer<typeof replaceLinesSchema>;
export type ReplaceOptionsInput = z.infer<typeof replaceOptionsSchema>;
export type SelectOptionInput = z.infer<typeof selectOptionSchema>;
export type QuoteListInput = z.infer<typeof quoteListSchema>;
