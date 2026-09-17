"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Parolanızı girin"),
});
const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalıdır")
    .max(100),
  organizationName: z
    .string()
    .trim()
    .min(2, "Şirket adı en az 2 karakter olmalıdır")
    .max(120),
  password: z
    .string()
    .min(12, "Parola en az 12 karakter olmalıdır")
    .max(128)
    .regex(/[a-zçğıöşü]/i, "Parola harf içermelidir")
    .regex(/[0-9]/, "Parola rakam içermelidir"),
});
type FormValues = {
  email: string;
  password: string;
  name?: string;
  organizationName?: string;
};

const unavailableMessage =
  "Sunucuya şu anda ulaşılamıyor. Lütfen kısa bir süre sonra tekrar deneyin.";

async function responseError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await response.json()) as { message?: string | string[] };
      const message = Array.isArray(data.message)
        ? data.message[0]
        : data.message;
      if (message) return message;
    } catch {
      // A malformed upstream response must not expose a parser error to users.
    }
  }
  return response.status >= 500 ? unavailableMessage : "İşlem tamamlanamadı";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const resolver = (registering
    ? zodResolver(registerSchema)
    : zodResolver(loginSchema)) as unknown as Resolver<FormValues>;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver });

  async function submit(values: FormValues) {
    setServerError("");
    const payload = registering
      ? values
      : { email: values.email, password: values.password };
    try {
      const response = await fetch(
        `/api/v1/auth/${registering ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      window.location.assign("/");
    } catch (error) {
      setServerError(
        error instanceof TypeError
          ? unavailableMessage
          : error instanceof Error
            ? error.message
            : unavailableMessage,
      );
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
      {registering && (
        <>
          <Field
            id="name"
            icon={<UserRound size={18} />}
            label="Ad soyad"
            error={errors.name?.message}
          >
            <input
              id="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              autoComplete="name"
              {...register("name")}
              placeholder="Ayşe Kaya"
            />
          </Field>
          <Field
            id="organizationName"
            icon={<Building2 size={18} />}
            label="Şirket adı"
            error={errors.organizationName?.message}
          >
            <input
              id="organizationName"
              aria-invalid={!!errors.organizationName}
              aria-describedby={
                errors.organizationName ? "organizationName-error" : undefined
              }
              autoComplete="organization"
              {...register("organizationName")}
              placeholder="Akdeniz Teknik Servis"
            />
          </Field>
        </>
      )}
      <Field
        id="email"
        icon={<Mail size={18} />}
        label="E-posta"
        error={errors.email?.message}
      >
        <input
          id="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          type="email"
          autoComplete="email"
          {...register("email")}
          placeholder="ad@firma.com"
        />
      </Field>
      <Field
        id="password"
        icon={<LockKeyhole size={18} />}
        label="Parola"
        error={errors.password?.message}
        action={
          <button
            type="button"
            className="password-toggle"
            aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        }
      >
        <input
          id="password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          type={showPassword ? "text" : "password"}
          autoComplete={registering ? "new-password" : "current-password"}
          {...register("password")}
          placeholder={registering ? "En az 12 karakter" : "Parolanız"}
        />
      </Field>
      {serverError && (
        <div className="auth-error" role="alert">
          {serverError}
        </div>
      )}
      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="spin" size={18} /> İşleniyor…
          </>
        ) : (
          <>
            {registering ? "Şirket hesabını oluştur" : "Giriş yap"}
            <ArrowRight size={18} />
          </>
        )}
      </button>
      <p className="auth-switch">
        {registering ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}{" "}
        <Link href={registering ? "/giris" : "/kayit"}>
          {registering ? "Giriş yapın" : "Ücretsiz başlayın"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={error ? "auth-field invalid" : "auth-field"}>
      <label htmlFor={id}>{label}</label>
      <div>
        {icon}
        {children}
        {action}
      </div>
      {error && <small id={`${id}-error`}>{error}</small>}
    </div>
  );
}
