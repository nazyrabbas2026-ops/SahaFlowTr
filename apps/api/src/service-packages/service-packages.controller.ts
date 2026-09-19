import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@sahaflow/domain";
import { AccessTokenGuard } from "../auth/access-token.guard";
import type { AuthenticatedRequest } from "../common/http";
import { parseBody } from "../common/http";
import { RequireEntitlements } from "../organizations/entitlement.decorator";
import { RequirePermissions } from "../organizations/permission.decorator";
import { TenantGuard } from "../organizations/tenant.guard";
import {
  createPackageSchema,
  packageListSchema,
  replaceItemsSchema,
  updatePackageSchema,
} from "./service-packages.schemas";
import { ServicePackagesService } from "./service-packages.service";

@Controller("organizations/:organizationId/service-packages")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("sales.quotes")
@ApiTags("Servis paketleri")
@ApiCookieAuth("access_token")
export class ServicePackagesController {
  constructor(
    @Inject(ServicePackagesService)
    private readonly packages: ServicePackagesService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.packages.listPackages(
      request.tenant!.organizationId,
      parseBody(packageListSchema, query),
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.packages.createPackage(
      request.tenant!.organizationId,
      request.actor!.userId,
      parseBody(createPackageSchema, body),
      request,
    );
  }

  @Get(":packageId")
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  get(
    @Param("packageId") packageId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.getPackage(request.tenant!.organizationId, packageId);
  }

  @Patch(":packageId")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  update(
    @Param("packageId") packageId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.updatePackage(
      request.tenant!.organizationId,
      request.actor!.userId,
      packageId,
      parseBody(updatePackageSchema, body),
      request,
    );
  }

  @Put(":packageId/items")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  replaceItems(
    @Param("packageId") packageId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.replacePackageItems(
      request.tenant!.organizationId,
      request.actor!.userId,
      packageId,
      parseBody(replaceItemsSchema, body),
      request,
    );
  }

  @Delete(":packageId")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  archive(
    @Param("packageId") packageId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.archivePackage(
      request.tenant!.organizationId,
      request.actor!.userId,
      packageId,
      request,
    );
  }

  @Post(":packageId/restore")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  restore(
    @Param("packageId") packageId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.restorePackage(
      request.tenant!.organizationId,
      request.actor!.userId,
      packageId,
      request,
    );
  }
}
