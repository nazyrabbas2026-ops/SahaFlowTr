import { randomUUID } from "node:crypto";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import { OWNER_PERMISSIONS } from "@sahaflow/domain";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";
import type { LoginInput, RegisterInput } from "./auth.schemas";
import { REFRESH_TTL_MS, TokenService } from "./token.service";

const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;
const LOCK_AFTER_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async register(input: RegisterInput, request: Request) {
    const passwordHash = await hash(input.password, HASH_OPTIONS);
    const refresh = this.tokens.createRefreshToken();
    try {
      const result = await this.database.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, name: input.name, passwordHash },
        });
        const organization = await tx.organization.create({
          data: {
            name: input.organizationName,
            slug: await this.uniqueSlug(tx, input.organizationName),
          },
        });
        await Promise.all(
          OWNER_PERMISSIONS.map((key) =>
            tx.permission.upsert({
              where: { key },
              create: { key, description: key },
              update: {},
            }),
          ),
        );
        const role = await tx.role.create({
          data: {
            name: "Şirket Sahibi",
            organizationId: organization.id,
            permissions: {
              create: OWNER_PERMISSIONS.map((permissionKey) => ({
                permissionKey,
              })),
            },
          },
        });
        const member = await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            roleId: role.id,
          },
        });
        const starterPlan = await tx.plan.findUniqueOrThrow({
          where: { key: "starter" },
        });
        await tx.organizationSubscription.create({
          data: { organizationId: organization.id, planId: starterPlan.id },
        });
        await tx.organizationOnboardingStep.createMany({
          data: [
            {
              organizationId: organization.id,
              key: "organization_created",
              completedAt: new Date(),
              completedByMemberId: member.id,
            },
            {
              organizationId: organization.id,
              key: "owner_account_created",
              completedAt: new Date(),
              completedByMemberId: member.id,
            },
            { organizationId: organization.id, key: "team_invited" },
            { organizationId: organization.id, key: "service_catalog_ready" },
            { organizationId: organization.id, key: "first_customer_created" },
            { organizationId: organization.id, key: "first_job_created" },
          ],
        });
        await tx.notification.create({
          data: {
            organizationId: organization.id,
            recipientMemberId: member.id,
            type: "welcome",
            title: "Çalışma alanınız hazır",
            body: "SahaFlow TR şirket hesabınız başarıyla oluşturuldu.",
            href: "/",
          },
        });
        const session = await tx.refreshSession.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            familyId: refresh.familyId,
            tokenHash: refresh.hash,
            expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
            ...requestMeta(request),
          },
        });
        await this.audit.write(
          {
            organizationId: organization.id,
            actorId: user.id,
            action: "auth.registered",
            entity: "User",
            entityId: user.id,
            ...requestMeta(request),
          },
          tx,
        );
        return { user, organization, session };
      });
      return this.sessionResponse(
        result.user,
        result.session.id,
        refresh.token,
        [{ ...result.organization, role: "Şirket Sahibi" }],
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("Bu e-posta zaten kayıtlı");
      throw error;
    }
  }

  async login(input: LoginInput, request: Request) {
    const user = await this.database.user.findUnique({
      where: { email: input.email },
    });
    if (user?.lockedUntil && user.lockedUntil > new Date())
      throw new HttpException(
        "Hesap geçici olarak kilitli",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const valid = user
      ? await verify(user.passwordHash, input.password)
      : await verify(
          await hash("invalid-login-sentinel", HASH_OPTIONS),
          input.password,
        );
    if (!user || !valid) {
      if (user) {
        const failures = user.failedLoginCount + 1;
        await this.database.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: failures,
            lockedUntil:
              failures >= LOCK_AFTER_FAILURES
                ? new Date(Date.now() + LOCK_MS)
                : null,
          },
        });
      }
      throw new UnauthorizedException("E-posta veya parola hatalı");
    }
    const refresh = this.tokens.createRefreshToken();
    const memberships = await this.database.organizationMember.findMany({
      where: { userId: user.id, active: true },
      include: { organization: true, role: true },
    });
    const activeOrganization = memberships[0]?.organizationId;
    const session = await this.database.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
      const created = await tx.refreshSession.create({
        data: {
          userId: user.id,
          organizationId: activeOrganization,
          familyId: refresh.familyId,
          tokenHash: refresh.hash,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
          ...requestMeta(request),
        },
      });
      await this.audit.write(
        {
          organizationId: activeOrganization,
          actorId: user.id,
          action: "auth.login",
          entity: "RefreshSession",
          entityId: created.id,
          ...requestMeta(request),
        },
        tx,
      );
      return created;
    });
    return this.sessionResponse(
      user,
      session.id,
      refresh.token,
      memberships.map((membership) => ({
        ...membership.organization,
        role: membership.role.name,
      })),
    );
  }

  async refresh(rawToken: string | undefined, request: Request) {
    if (!rawToken) throw new UnauthorizedException("Refresh oturumu gerekli");
    const next = this.tokens.createRefreshToken();
    const outcome = await this.database.$transaction(async (tx) => {
      const current = await tx.refreshSession.findUnique({
        where: { tokenHash: this.tokens.hashRefreshToken(rawToken) },
        include: { user: true },
      });
      if (!current) return { kind: "invalid" as const };
      if (
        current.usedAt ||
        current.revokedAt ||
        current.expiresAt <= new Date()
      ) {
        await tx.refreshSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.write(
          {
            organizationId: current.organizationId ?? undefined,
            actorId: current.userId,
            action: "auth.refresh_replay",
            entity: "RefreshSession",
            entityId: current.id,
            ...requestMeta(request),
          },
          tx,
        );
        return { kind: "replay" as const };
      }
      const claimed = await tx.refreshSession.updateMany({
        where: { id: current.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        await tx.refreshSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { kind: "replay" as const };
      }
      const session = await tx.refreshSession.create({
        data: {
          userId: current.userId,
          organizationId: current.organizationId,
          familyId: current.familyId,
          tokenHash: next.hash,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
          ...requestMeta(request),
        },
      });
      return { kind: "ok" as const, user: current.user, session };
    });
    if (outcome.kind !== "ok")
      throw new UnauthorizedException(
        outcome.kind === "replay"
          ? "Oturum tekrar kullanımı tespit edildi"
          : "Oturum geçersiz",
      );
    return this.sessionResponse(outcome.user, outcome.session.id, next.token);
  }

  async logout(
    rawToken: string | undefined,
    userId: string | undefined,
    request: Request,
  ) {
    if (!rawToken) return;
    const session = await this.database.refreshSession.findUnique({
      where: { tokenHash: this.tokens.hashRefreshToken(rawToken) },
    });
    if (!session || (userId && session.userId !== userId)) return;
    await this.database.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.write(
        {
          organizationId: session.organizationId ?? undefined,
          actorId: session.userId,
          action: "auth.logout",
          entity: "RefreshSession",
          entityId: session.id,
          ...requestMeta(request),
        },
        tx,
      );
    });
  }

  async me(userId: string) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          where: { active: true },
          select: {
            organization: { select: { id: true, name: true, slug: true } },
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException("Kullanıcı bulunamadı");
    return user;
  }

  private sessionResponse(
    user: { id: string; name: string; email: string },
    sessionId: string,
    refreshToken: string,
    organizations?: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
    }>,
  ) {
    return {
      accessToken: this.tokens.signAccess(user.id, sessionId),
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      organizations,
    };
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base =
      name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "organizasyon";
    for (let attempt = 0; attempt < 20; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      if (
        !(await tx.organization.findUnique({
          where: { slug },
          select: { id: true },
        }))
      )
        return slug;
    }
    return `${base}-${randomUUID().slice(0, 8)}`;
  }
}
