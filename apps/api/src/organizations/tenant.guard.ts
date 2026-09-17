import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { REQUIRED_PERMISSIONS } from "./permission.decorator";
import { REQUIRED_ENTITLEMENTS } from "./entitlement.decorator";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawOrganizationId = request.params.organizationId;
    const organizationId = Array.isArray(rawOrganizationId)
      ? rawOrganizationId[0]
      : rawOrganizationId;
    if (!request.actor || !organizationId)
      throw new ForbiddenException("Organizasyon erişimi reddedildi");
    const membership = await this.database.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: request.actor.userId },
      },
      include: {
        role: { include: { permissions: true } },
        organization: {
          include: {
            subscription: {
              include: { plan: { include: { entitlements: true } } },
            },
          },
        },
      },
    });
    if (!membership?.active)
      throw new ForbiddenException("Organizasyon erişimi reddedildi");
    const permissions = membership.role.permissions.map(
      (entry) => entry.permissionKey,
    );
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (!required.every((permission) => permissions.includes(permission)))
      throw new ForbiddenException("Bu işlem için yetkiniz yok");
    const entitlements =
      membership.organization.subscription?.plan.entitlements
        .filter((entry) => entry.enabled)
        .map((entry) => entry.featureKey) ?? [];
    const requiredEntitlements =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ENTITLEMENTS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (
      !requiredEntitlements.every((entitlement) =>
        entitlements.includes(entitlement),
      )
    )
      throw new ForbiddenException("Bu özellik mevcut planınızda etkin değil");
    request.tenant = {
      organizationId,
      memberId: membership.id,
      roleId: membership.roleId,
      permissions,
      entitlements,
    };
    return true;
  }
}
