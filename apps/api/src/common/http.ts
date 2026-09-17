import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import type { ZodType } from "zod";

export interface AuthenticatedRequest extends Request {
  actor?: { userId: string; sessionId: string };
  tenant?: {
    organizationId: string;
    memberId: string;
    roleId: string;
    permissions: string[];
    entitlements: string[];
  };
}

export function parseBody<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export function requestMeta(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent")?.slice(0, 500),
    requestId: request.get("x-request-id")?.slice(0, 100),
  };
}

export function assertTrustedBrowserOrigin(request: Request) {
  const origin = request.get("origin");
  if (!origin) return;
  const allowed = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim());
  if (!allowed.includes(origin))
    throw new ForbiddenException("Geçersiz istek kaynağı");
}
