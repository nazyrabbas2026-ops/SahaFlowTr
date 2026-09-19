import { z } from "zod";
import { minorAmountSchema, vatRateBpsSchema } from "../common/money.schemas";

// Aile ve paket anahtarları tenant içinde tekildir; katalog SKU'sunda olduğu
// gibi büyük harfe normalize edilir ki "bakim" ile "BAKIM" iki ayrı kayıt
// olmasın.
const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Anahtar harf, rakam, nokta, tire ve alt çizgi içerebilir",
  )
  .transform((value) => value.toUpperCase());

const descriptionSchema = z
  .union([z.string().trim().max(2000), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" ? null : value));

// Miktar veritabanında Decimal(12,3); istemci dizgi veya sayı gönderebilir.
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

const packageItemSchema = z.object({
  catalogItemId: z.string().cuid(),
  quantity: quantitySchema,
  // Zorunlu satır mı, müşterinin seçimine bırakılan add-on mu.
  addon: z.boolean().default(false),
});

/** Aile ve paket satır listeleri bütün olarak değiştirilir; kısmi güncelleme yok. */
export const replaceItemsSchema = z.object({
  version: z.coerce.number().int().positive(),
  items: z.array(packageItemSchema).max(100),
});

const familyBase = z.object({
  key: keySchema,
  name: z.string().trim().min(2).max(160),
  description: descriptionSchema,
});

export const createFamilySchema = familyBase;
export const updateFamilySchema = familyBase.partial().extend({
  version: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
});

const packageBase = z.object({
  key: keySchema,
  name: z.string().trim().min(2).max(160),
  description: descriptionSchema,
  familyId: z.union([z.string().cuid(), z.null()]).optional(),
  tier: z
    .union([z.enum(["ECONOMY", "RECOMMENDED", "PREMIUM"]), z.null()])
    .optional(),
  priceMinor: minorAmountSchema,
  vatRateBps: vatRateBpsSchema.default(2_000),
});

export const createPackageSchema = packageBase;
export const updatePackageSchema = packageBase.partial().extend({
  version: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
});

export const packageListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  familyId: z.string().trim().max(40).default(""),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const familyListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type ReplaceItemsInput = z.infer<typeof replaceItemsSchema>;
export type PackageListInput = z.infer<typeof packageListSchema>;
export type FamilyListInput = z.infer<typeof familyListSchema>;
