import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();
const optionalDate = z.union([z.string().datetime(), z.null()]).optional();

const serviceAgreementFieldsSchema = z.object({
  customerId: z.string().cuid(),
  assetId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(100),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  problemDescription: optionalText(3000),
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(1)
    .max(10080)
    .nullable()
    .optional(),
  recurrenceIntervalMonths: z.number().int().min(1).max(24),
  anchorDate: z.string().datetime(),
  startDate: z.string().datetime(),
  endDate: optionalDate,
});

export const createServiceAgreementSchema = serviceAgreementFieldsSchema.refine(
  (v) => new Date(v.startDate) <= new Date(v.anchorDate),
  {
    message: "Başlangıç tarihi ilk tekrar tarihinden sonra olamaz",
    path: ["startDate"],
  },
);

export const updateServiceAgreementSchema = serviceAgreementFieldsSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
    version: z.number().int().positive(),
  });

export const serviceAgreementListSchema = z.object({
  customerId: z.string().cuid().optional(),
  active: z.enum(["ALL", "TRUE", "FALSE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const generateServiceAgreementSchema = z.object({
  asOf: z.string().datetime().optional(),
});

export type CreateServiceAgreementInput = z.infer<
  typeof createServiceAgreementSchema
>;
export type UpdateServiceAgreementInput = z.infer<
  typeof updateServiceAgreementSchema
>;
export type ServiceAgreementListInput = z.infer<
  typeof serviceAgreementListSchema
>;
export type GenerateServiceAgreementInput = z.infer<
  typeof generateServiceAgreementSchema
>;
