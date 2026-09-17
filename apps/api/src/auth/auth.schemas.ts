import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Geçerli bir e-posta girin")
  .max(254);
const password = z
  .string()
  .min(12, "Parola en az 12 karakter olmalıdır")
  .max(128)
  .regex(/[a-zçğıöşü]/i, "Parola harf içermelidir")
  .regex(/[0-9]/, "Parola rakam içermelidir");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
  organizationName: z.string().trim().min(2).max(120),
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
