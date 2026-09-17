import { z } from "zod";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === "" ? undefined : value));
const optionalEmail = z
  .union([z.string().trim().email().max(254), z.literal("")])
  .optional()
  .transform((value) => value || undefined);
const phone = z.string().trim().min(7).max(30);

function validTckn(value: string) {
  if (!/^\d{11}$/.test(value) || value[0] === "0") return false;
  const digits = [...value].map(Number);
  const odd = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const even = digits[1]! + digits[3]! + digits[5]! + digits[7]!;
  return (
    (odd * 7 - even) % 10 === digits[9] &&
    digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10 ===
      digits[10]
  );
}

const customerFields = {
  primaryPhone: phone.optional(),
  alternatePhone: phone.optional(),
  email: optionalEmail,
  nationalId: z
    .union([
      z.string().trim().refine(validTckn, "Geçerli bir TCKN girin"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  taxNumber: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Vergi numarası 10 haneli olmalıdır"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  taxOffice: optionalText(120),
  notes: optionalText(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
};

export const createCustomerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INDIVIDUAL"),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    companyName: z.undefined().optional(),
    ...customerFields,
  }),
  z.object({
    type: z.literal("COMPANY"),
    companyName: z.string().trim().min(2).max(160),
    firstName: optionalText(80),
    lastName: optionalText(80),
    ...customerFields,
  }),
]);

export const updateCustomerSchema = z
  .object({
    version: z.number().int().positive(),
    type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
    firstName: optionalText(80),
    lastName: optionalText(80),
    companyName: optionalText(160),
    primaryPhone: z.union([phone, z.literal(""), z.null()]).optional(),
    alternatePhone: z.union([phone, z.literal(""), z.null()]).optional(),
    email: z
      .union([z.string().trim().email().max(254), z.literal(""), z.null()])
      .optional(),
    nationalId: z
      .union([
        z.string().trim().refine(validTckn, "Geçerli bir TCKN girin"),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    taxNumber: z
      .union([
        z
          .string()
          .trim()
          .regex(/^\d{10}$/, "Vergi numarası 10 haneli olmalıdır"),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    taxOffice: optionalText(120),
    notes: optionalText(2000),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .strict();

export const customerListSchema = z.object({
  search: z.string().trim().max(120).default(""),
  type: z.enum(["ALL", "INDIVIDUAL", "COMPANY"]).default("ALL"),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createContactSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    role: optionalText(100),
    phone: phone.optional(),
    email: optionalEmail,
    preferredChannel: z
      .enum(["PHONE", "EMAIL", "SMS", "WHATSAPP"])
      .default("PHONE"),
    isPrimary: z.boolean().default(false),
    marketingConsent: z.boolean().default(false),
    marketingConsentSource: optionalText(120),
  })
  .refine((value) => value.phone || value.email, {
    message: "Telefon veya e-posta gereklidir",
    path: ["phone"],
  });
export const updateContactSchema = createContactSchema;

export const createAddressSchema = z.object({
  label: z.string().trim().min(2).max(100),
  type: z.enum(["BILLING", "SERVICE", "BOTH"]).default("SERVICE"),
  line1: z.string().trim().min(5).max(300),
  line2: optionalText(200),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  postalCode: optionalText(20),
  siteName: optionalText(120),
  building: optionalText(50),
  block: optionalText(50),
  floor: optionalText(30),
  unit: optionalText(30),
  accessInstructions: optionalText(500),
});
export const updateAddressSchema = createAddressSchema;

const optionalDate = z
  .union([z.string().date(), z.literal(""), z.null()])
  .optional();
export const createAssetSchema = z.object({
  addressId: z.union([z.string().cuid(), z.literal(""), z.null()]).optional(),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(100),
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(120),
  installationDate: optionalDate,
  warrantyEndsAt: optionalDate,
  maintenanceIntervalDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .nullable()
    .optional(),
  notes: optionalText(1000),
});
export const updateAssetSchema = createAssetSchema;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListInput = z.infer<typeof customerListSchema>;
export type ContactInput = z.infer<typeof createContactSchema>;
export type AddressInput = z.infer<typeof createAddressSchema>;
export type AssetInput = z.infer<typeof createAssetSchema>;
