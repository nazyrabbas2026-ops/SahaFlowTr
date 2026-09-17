import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import {
  assertTrustedBrowserOrigin,
  type AuthenticatedRequest,
  parseBody,
} from "../common/http";
import { AccessTokenGuard } from "./access-token.guard";
import { loginSchema, registerSchema } from "./auth.schemas";
import { AuthService } from "./auth.service";

const secure = process.env.NODE_ENV === "production";
const accessCookie = {
  httpOnly: true,
  secure,
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000,
  path: "/",
};
const refreshCookie = {
  httpOnly: true,
  secure,
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
};

@Controller("auth")
@ApiTags("Kimlik")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Kullanıcı ve ilk organizasyonu oluşturur" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "email", "password", "organizationName"],
      properties: {
        name: { type: "string", example: "Ayşe Kaya" },
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 12, writeOnly: true },
        organizationName: { type: "string", example: "Akdeniz Teknik Servis" },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedBrowserOrigin(request);
    return this.respond(
      response,
      await this.auth.register(parseBody(registerSchema, body), request),
    );
  }

  @Post("login")
  @ApiOperation({ summary: "Güvenli web oturumu açar" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", writeOnly: true },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedBrowserOrigin(request);
    return this.respond(
      response,
      await this.auth.login(parseBody(loginSchema, body), request),
    );
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh tokenı tek kullanımlı olarak döndürür" })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedBrowserOrigin(request);
    const cookies = request.cookies as Record<string, string> | undefined;
    return this.respond(
      response,
      await this.auth.refresh(cookies?.refresh_token, request),
    );
  }

  @Post("logout")
  @ApiOperation({ summary: "Refresh token ailesini iptal eder" })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedBrowserOrigin(request);
    const cookies = request.cookies as Record<string, string> | undefined;
    await this.auth.logout(cookies?.refresh_token, undefined, request);
    response.clearCookie("access_token", accessCookie);
    response.clearCookie("refresh_token", refreshCookie);
    return { success: true };
  }

  @Get("me")
  @ApiCookieAuth("access_token")
  @ApiOperation({ summary: "Aktif kullanıcı ve üyeliklerini döndürür" })
  @UseGuards(AccessTokenGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.actor!.userId);
  }

  private respond(
    response: Response,
    result: Awaited<ReturnType<AuthService["login"]>>,
  ) {
    response.cookie("access_token", result.accessToken, accessCookie);
    response.cookie("refresh_token", result.refreshToken, refreshCookie);
    return { user: result.user, organizations: result.organizations };
  }
}
