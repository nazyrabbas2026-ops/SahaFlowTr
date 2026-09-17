import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { InternalServerErrorException } from "@nestjs/common";

export function encryptSensitive(value: string) {
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret || secret.length < 32)
    throw new InternalServerErrorException(
      "Hassas veri şifreleme anahtarı yapılandırılmamış",
    );
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}
