import { z } from "zod";
import { minorAmountSchema, vatRateBpsSchema } from "../common/money.schemas";

// SKU tenant içinde tekildir. Büyük harfe normalize edilir, aksi hâlde "abc"
// ve "ABC" veritabanında iki ayrı kalem olur ve aynı ürün iki kez fiyatlanır.
const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "SKU harf, rakam, nokta, tire ve alt çizgi içerebilir",
  )
  .transform((value) => value.toUpperCase());

const catalogItemBase = z.object({
  sku: skuSchema,
  name: z.string().trim().min(2).max(160),
  kind: z.enum(["PRODUCT", "SERVICE", "LABOR"]).default("PRODUCT"),
  category: z.string().trim().min(2).max(100),
  unit: z.string().trim().min(1).max(20).default("adet"),
  listPriceMinor: minorAmountSchema,
  costPriceMinor: minorAmountSchema.optional(),
  vatRateBps: vatRateBpsSchema.default(2_000),
  trackInventory: z.boolean().default(true),
  reorderPoint: z.coerce.number().int().min(0).max(1_000_000).default(0),
  serialized: z.boolean().default(false),
});

export const createCatalogItemSchema = catalogItemBase;

// Update create'in taban nesnesinden türetilir; ikisi bağımsız yazıldığında
// zamanla ayrışır ve hata yalnızca akışlardan birinde ortaya çıkar.
export const updateCatalogItemSchema = catalogItemBase.partial().extend({
  version: z.coerce.number().int().positive(),
});

export const catalogItemListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  kind: z.enum(["ALL", "PRODUCT", "SERVICE", "LABOR"]).default("ALL"),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;
export type CatalogItemListInput = z.infer<typeof catalogItemListSchema>;
