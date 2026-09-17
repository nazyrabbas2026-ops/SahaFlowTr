import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshPepper: string;

  constructor(@Inject(JwtService) private readonly jwt: JwtService) {
    this.accessSecret = this.requireSecret("JWT_ACCESS_SECRET");
    this.refreshPepper = this.requireSecret("REFRESH_TOKEN_PEPPER");
  }

  signAccess(userId: string, sessionId: string) {
    return this.jwt.sign(
      { sub: userId, sid: sessionId, type: "access" },
      {
        secret: this.accessSecret,
        expiresIn: ACCESS_TTL_SECONDS,
        algorithm: "HS256",
        issuer: "sahaflow-api",
        audience: "sahaflow-web",
      },
    );
  }

  verifyAccess(token: string): { sub: string; sid: string; type: "access" } {
    try {
      const claims = this.jwt.verify<{
        sub: string;
        sid: string;
        type: string;
      }>(token, {
        secret: this.accessSecret,
        algorithms: ["HS256"],
        issuer: "sahaflow-api",
        audience: "sahaflow-web",
      });
      if (claims.type !== "access" || !claims.sub || !claims.sid)
        throw new Error("claims");
      return { sub: claims.sub, sid: claims.sid, type: "access" };
    } catch {
      throw new UnauthorizedException("Oturum geçersiz veya süresi dolmuş");
    }
  }

  createRefreshToken(familyId = randomUUID()) {
    const token = randomBytes(48).toString("base64url");
    return { token, hash: this.hashRefreshToken(token), familyId };
  }

  hashRefreshToken(token: string) {
    return createHash("sha256")
      .update(`${this.refreshPepper}:${token}`)
      .digest("hex");
  }

  private requireSecret(name: string) {
    const value = process.env[name];
    if (!value || value.length < 32)
      throw new Error(`${name} en az 32 karakter olmalıdır`);
    return value;
  }
}
