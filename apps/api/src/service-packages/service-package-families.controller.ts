import {
  Body,
  Controller,
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
  createFamilySchema,
  familyListSchema,
  replaceItemsSchema,
  updateFamilySchema,
} from "./service-packages.schemas";
import { ServicePackagesService } from "./service-packages.service";

/**
 * Aileler paketlerden ayrı bir route öneki altındadır; `service-packages/:id`
 * ile `service-packages/families` aynı önekte olsaydı sıralamaya bağlı,
 * kırılgan bir eşleşme doğardı.
 */
@Controller("organizations/:organizationId/service-package-families")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("sales.quotes")
@ApiTags("Servis paketleri")
@ApiCookieAuth("access_token")
export class ServicePackageFamiliesController {
  constructor(
    @Inject(ServicePackagesService)
    private readonly packages: ServicePackagesService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.packages.listFamilies(
      request.tenant!.organizationId,
      parseBody(familyListSchema, query),
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.packages.createFamily(
      request.tenant!.organizationId,
      request.actor!.userId,
      parseBody(createFamilySchema, body),
      request,
    );
  }

  @Get(":familyId")
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  get(
    @Param("familyId") familyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.getFamily(request.tenant!.organizationId, familyId);
  }

  @Patch(":familyId")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  update(
    @Param("familyId") familyId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.updateFamily(
      request.tenant!.organizationId,
      request.actor!.userId,
      familyId,
      parseBody(updateFamilySchema, body),
      request,
    );
  }

  @Put(":familyId/shared-items")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  replaceSharedItems(
    @Param("familyId") familyId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.packages.replaceFamilySharedItems(
      request.tenant!.organizationId,
      request.actor!.userId,
      familyId,
      parseBody(replaceItemsSchema, body),
      request,
    );
  }
}
