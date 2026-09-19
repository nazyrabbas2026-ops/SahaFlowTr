import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
  catalogItemListSchema,
  createCatalogItemSchema,
  updateCatalogItemSchema,
} from "./catalog.schemas";
import { CatalogService } from "./catalog.service";

@Controller("organizations/:organizationId/catalog-items")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("inventory.products")
@ApiTags("Katalog")
@ApiCookieAuth("access_token")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.catalog.list(
      request.tenant!.organizationId,
      parseBody(catalogItemListSchema, query),
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.catalog.create(
      request.tenant!.organizationId,
      request.actor!.userId,
      parseBody(createCatalogItemSchema, body),
      request,
    );
  }

  @Get(":catalogItemId")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  get(
    @Param("catalogItemId") catalogItemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.get(request.tenant!.organizationId, catalogItemId);
  }

  @Patch(":catalogItemId")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  update(
    @Param("catalogItemId") catalogItemId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.update(
      request.tenant!.organizationId,
      request.actor!.userId,
      catalogItemId,
      parseBody(updateCatalogItemSchema, body),
      request,
    );
  }

  @Delete(":catalogItemId")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  archive(
    @Param("catalogItemId") catalogItemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.archive(
      request.tenant!.organizationId,
      request.actor!.userId,
      catalogItemId,
      request,
    );
  }

  @Post(":catalogItemId/restore")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  restore(
    @Param("catalogItemId") catalogItemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalog.restore(
      request.tenant!.organizationId,
      request.actor!.userId,
      catalogItemId,
      request,
    );
  }
}
