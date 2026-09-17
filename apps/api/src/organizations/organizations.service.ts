import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@sahaflow/database";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { requestMeta } from "../common/http";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  listForUser(userId: string) {
    return this.database.organizationMember.findMany({
      where: { userId, active: true },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            currency: true,
          },
        },
        role: { select: { id: true, name: true } },
      },
      orderBy: { organization: { name: "asc" } },
    });
  }

  getContext(organizationId: string, userId: string) {
    return this.database.organizationMember.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
      select: {
        id: true,
        active: true,
        organization: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: { select: { permissionKey: true } },
          },
        },
      },
    });
  }

  async getWorkspace(organizationId: string, memberId: string) {
    const [membership, unreadNotifications] = await Promise.all([
      this.database.organizationMember.findUniqueOrThrow({
        where: { organizationId_id: { organizationId, id: memberId } },
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
              currency: true,
              _count: { select: { members: true, customers: true } },
              subscription: {
                select: {
                  status: true,
                  plan: {
                    select: {
                      key: true,
                      name: true,
                      entitlements: {
                        select: {
                          featureKey: true,
                          enabled: true,
                          limitValue: true,
                        },
                      },
                    },
                  },
                },
              },
              onboardingSteps: {
                select: { key: true, completedAt: true },
                orderBy: { key: "asc" },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              permissions: { select: { permissionKey: true } },
            },
          },
        },
      }),
      this.database.notification.count({
        where: {
          organizationId,
          readAt: null,
          OR: [{ recipientMemberId: null }, { recipientMemberId: memberId }],
        },
      }),
    ]);
    const { _count, subscription, onboardingSteps, ...organization } =
      membership.organization;
    return {
      organization,
      membership: {
        id: membership.id,
        role: { id: membership.role.id, name: membership.role.name },
        permissions: membership.role.permissions.map(
          (entry) => entry.permissionKey,
        ),
      },
      plan: subscription
        ? {
            key: subscription.plan.key,
            name: subscription.plan.name,
            status: subscription.status,
            entitlements: subscription.plan.entitlements,
          }
        : null,
      onboarding: onboardingSteps,
      metrics: {
        members: _count.members,
        customers: _count.customers,
        unreadNotifications,
      },
    };
  }

  async listNotifications(
    organizationId: string,
    memberId: string,
    input: { page: number; pageSize: number; status: "all" | "unread" },
  ) {
    const where = {
      organizationId,
      OR: [{ recipientMemberId: null }, { recipientMemberId: memberId }],
      ...(input.status === "unread" ? { readAt: null } : {}),
    };
    const [items, total] = await Promise.all([
      this.database.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          href: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.database.notification.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / input.pageSize)),
      },
    };
  }

  async updateNotification(
    organizationId: string,
    memberId: string,
    notificationId: string,
    input: { read: boolean },
  ) {
    const notification = await this.database.notification.findFirst({
      where: {
        id: notificationId,
        organizationId,
        OR: [{ recipientMemberId: null }, { recipientMemberId: memberId }],
      },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException("Bildirim bulunamadı");
    return this.database.notification.update({
      where: { id: notification.id },
      data: { readAt: input.read ? new Date() : null },
      select: { id: true, readAt: true },
    });
  }

  listMembers(organizationId: string) {
    return this.database.organizationMember.findMany({
      where: { organizationId },
      select: {
        id: true,
        active: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async addMember(
    organizationId: string,
    actorId: string,
    input: { email: string; roleId: string },
    request: Request,
  ) {
    const [user, role] = await Promise.all([
      this.database.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      }),
      this.database.role.findUnique({
        where: { organizationId_id: { organizationId, id: input.roleId } },
        select: { id: true },
      }),
    ]);
    if (!user)
      throw new NotFoundException(
        "Bu e-posta ile kayıtlı kullanıcı bulunamadı",
      );
    if (!role) throw new NotFoundException("Rol bulunamadı");
    try {
      return await this.database.$transaction(async (tx) => {
        const member = await tx.organizationMember.create({
          data: { organizationId, userId: user.id, roleId: role.id },
        });
        await this.audit.write(
          {
            organizationId,
            actorId,
            action: "member.created",
            entity: "OrganizationMember",
            entityId: member.id,
            metadata: { roleId: role.id },
            ...requestMeta(request),
          },
          tx,
        );
        return member;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("Kullanıcı zaten bu organizasyona üye");
      throw error;
    }
  }

  async updateMember(
    organizationId: string,
    actorId: string,
    memberId: string,
    input: { roleId: string; active?: boolean },
    request: Request,
  ) {
    const role = await this.database.role.findUnique({
      where: { organizationId_id: { organizationId, id: input.roleId } },
      select: { id: true },
    });
    if (!role) throw new NotFoundException("Rol bulunamadı");
    const existing = await this.database.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!existing) throw new NotFoundException("Üyelik bulunamadı");
    return this.database.$transaction(async (tx) => {
      const member = await tx.organizationMember.update({
        where: { id: memberId },
        data: { roleId: role.id, active: input.active },
      });
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: "member.updated",
          entity: "OrganizationMember",
          entityId: member.id,
          metadata: {
            beforeRoleId: existing.roleId,
            afterRoleId: role.id,
            active: member.active,
          },
          ...requestMeta(request),
        },
        tx,
      );
      return member;
    });
  }

  async createRole(
    organizationId: string,
    actorId: string,
    input: { name: string; permissions: string[] },
    request: Request,
  ) {
    const permissionKeys = [...new Set(input.permissions)];
    const count = await this.database.permission.count({
      where: { key: { in: permissionKeys } },
    });
    if (count !== permissionKeys.length)
      throw new NotFoundException("Geçersiz yetki anahtarı");
    return this.database.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          organizationId,
          name: input.name,
          permissions: {
            create: permissionKeys.map((permissionKey) => ({
              permissionKey,
            })),
          },
        },
      });
      await this.audit.write(
        {
          organizationId,
          actorId,
          action: "role.created",
          entity: "Role",
          entityId: role.id,
          metadata: { permissions: permissionKeys },
          ...requestMeta(request),
        },
        tx,
      );
      return role;
    });
  }
}
