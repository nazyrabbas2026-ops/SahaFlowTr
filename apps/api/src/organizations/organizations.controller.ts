import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@sahaflow/domain";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../common/http";
import { parseBody } from "../common/http";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { RequireEntitlements } from "./entitlement.decorator";
import { RequirePermissions } from "./permission.decorator";
import {
  addMemberSchema,
  createRoleSchema,
  notificationListSchema,
  updateNotificationSchema,
  updateMemberSchema,
} from "./organizations.schemas";
import { OrganizationsService } from "./organizations.service";
import { TenantGuard } from "./tenant.guard";

@Controller("organizations")
@UseGuards(AccessTokenGuard)
@ApiTags("Organizasyonlar")
@ApiCookieAuth("access_token")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizations: OrganizationsService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.organizations.listForUser(request.actor!.userId);
  }

  @Get(":organizationId")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  context(
    @Param("organizationId") organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.getContext(organizationId, request.actor!.userId);
  }

  @Get(":organizationId/workspace")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.WORKSPACE_READ)
  workspace(@Req() request: AuthenticatedRequest) {
    return this.organizations.getWorkspace(
      request.tenant!.organizationId,
      request.tenant!.memberId,
    );
  }

  @Get(":organizationId/notifications")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @RequireEntitlements("notifications")
  notifications(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.organizations.listNotifications(
      request.tenant!.organizationId,
      request.tenant!.memberId,
      parseBody(notificationListSchema, query),
    );
  }

  @Patch(":organizationId/notifications/:notificationId")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  @RequireEntitlements("notifications")
  updateNotification(
    @Param("notificationId") notificationId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateNotification(
      request.tenant!.organizationId,
      request.tenant!.memberId,
      notificationId,
      parseBody(updateNotificationSchema, body),
    );
  }

  @Get(":organizationId/members")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @RequireEntitlements("team.management")
  members(@Param("organizationId") organizationId: string) {
    return this.organizations.listMembers(organizationId);
  }

  @Post(":organizationId/members")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.MEMBER_MANAGE)
  @RequireEntitlements("team.management")
  addMember(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.addMember(
      organizationId,
      request.actor!.userId,
      parseBody(addMemberSchema, body),
      request,
    );
  }

  @Patch(":organizationId/members/:memberId")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.MEMBER_MANAGE)
  @RequireEntitlements("team.management")
  updateMember(
    @Param("organizationId") organizationId: string,
    @Param("memberId") memberId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateMember(
      organizationId,
      request.actor!.userId,
      memberId,
      parseBody(updateMemberSchema, body),
      request,
    );
  }

  @Post(":organizationId/roles")
  @UseGuards(TenantGuard)
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @RequireEntitlements("team.management")
  createRole(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.createRole(
      organizationId,
      request.actor!.userId,
      parseBody(createRoleSchema, body),
      request,
    );
  }
}
