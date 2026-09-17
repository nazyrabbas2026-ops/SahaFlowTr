import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();
const optionalDate = z.union([z.string().datetime(), z.null()]).optional();
export const jobListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z
    .enum([
      "ALL",
      "NEW",
      "SCHEDULED",
      "ASSIGNED",
      "EN_ROUTE",
      "ARRIVED",
      "IN_PROGRESS",
      "ON_HOLD",
      "COMPLETED",
      "INVOICED",
      "PAID",
      "CANCELLED",
    ])
    .default("ALL"),
  priority: z.enum(["ALL", "LOW", "NORMAL", "HIGH", "URGENT"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const jobFieldsSchema = z.object({
  customerId: z.string().cuid(),
  addressId: z.string().cuid().nullable().optional(),
  assetId: z.string().cuid().nullable().optional(),
  category: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(180),
  problemDescription: optionalText(3000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  scheduledStart: optionalDate,
  scheduledEnd: optionalDate,
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(1)
    .max(10080)
    .nullable()
    .optional(),
  source: z
    .enum(["PHONE", "WEB", "CUSTOMER_PORTAL", "INTERNAL", "INTEGRATION"])
    .default("INTERNAL"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  internalNote: optionalText(2000),
  customerNote: optionalText(2000),
});
export const createJobSchema = jobFieldsSchema.refine(
  (v) =>
    !v.scheduledStart ||
    !v.scheduledEnd ||
    new Date(v.scheduledEnd) > new Date(v.scheduledStart),
  {
    message: "Bitiş zamanı başlangıçtan sonra olmalıdır",
    path: ["scheduledEnd"],
  },
);
export const updateJobSchema = jobFieldsSchema
  .partial()
  .extend({ version: z.number().int().positive() });
export const assignJobSchema = z.object({
  memberId: z.string().cuid(),
  primary: z.boolean().default(true),
});
export const transitionJobSchema = z
  .object({
    status: z.enum([
      "SCHEDULED",
      "ASSIGNED",
      "EN_ROUTE",
      "ARRIVED",
      "IN_PROGRESS",
      "ON_HOLD",
      "COMPLETED",
      "INVOICED",
      "PAID",
      "CANCELLED",
    ]),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((v, c) => {
    if (["ON_HOLD", "CANCELLED"].includes(v.status) && !v.reason)
      c.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Bu durum için neden gereklidir",
      });
  });
export const createJobNoteSchema = z.object({
  body: z.string().trim().min(1).max(3000),
  visibility: z.enum(["INTERNAL", "CUSTOMER"]).default("INTERNAL"),
});
export type JobListInput = z.infer<typeof jobListSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type AssignJobInput = z.infer<typeof assignJobSchema>;
export type TransitionJobInput = z.infer<typeof transitionJobSchema>;
