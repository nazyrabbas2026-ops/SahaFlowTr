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
  createAddressSchema,
  createAssetSchema,
  createContactSchema,
  createCustomerSchema,
  customerListSchema,
  updateAddressSchema,
  updateAssetSchema,
  updateContactSchema,
  updateCustomerSchema,
} from "./customers.schemas";
import { CustomersService } from "./customers.service";

@Controller("organizations/:organizationId/customers")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("crm.customers")
@ApiTags("Müşteriler")
@ApiCookieAuth("access_token")
export class CustomersController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.customers.list(
      request.tenant!.organizationId,
      parseBody(customerListSchema, query),
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMER_CREATE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.customers.create(
      request.tenant!.organizationId,
      request.actor!.userId,
      parseBody(createCustomerSchema, body),
      request,
    );
  }

  @Get(":customerId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  get(
    @Param("customerId") customerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.get(request.tenant!.organizationId, customerId);
  }

  @Patch(":customerId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  update(
    @Param("customerId") customerId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.update(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      parseBody(updateCustomerSchema, body),
      request,
    );
  }

  @Delete(":customerId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_ARCHIVE)
  archive(
    @Param("customerId") customerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.archive(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      request,
    );
  }

  @Post(":customerId/restore")
  @RequirePermissions(PERMISSIONS.CUSTOMER_ARCHIVE)
  restore(
    @Param("customerId") customerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.restore(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      request,
    );
  }

  @Post(":customerId/contacts")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  createContact(
    @Param("customerId") customerId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.createContact(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      parseBody(createContactSchema, body),
      request,
    );
  }

  @Patch(":customerId/contacts/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  updateContact(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.updateContact(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      parseBody(updateContactSchema, body),
      request,
    );
  }

  @Delete(":customerId/contacts/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  archiveContact(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.archiveContact(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      request,
    );
  }

  @Post(":customerId/addresses")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  createAddress(
    @Param("customerId") customerId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.createAddress(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      parseBody(createAddressSchema, body),
      request,
    );
  }

  @Patch(":customerId/addresses/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  updateAddress(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.updateAddress(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      parseBody(updateAddressSchema, body),
      request,
    );
  }

  @Delete(":customerId/addresses/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  archiveAddress(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.archiveAddress(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      request,
    );
  }

  @Post(":customerId/assets")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  createAsset(
    @Param("customerId") customerId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.createAsset(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      parseBody(createAssetSchema, body),
      request,
    );
  }

  @Patch(":customerId/assets/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  updateAsset(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.updateAsset(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      parseBody(updateAssetSchema, body),
      request,
    );
  }

  @Delete(":customerId/assets/:itemId")
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  archiveAsset(
    @Param("customerId") customerId: string,
    @Param("itemId") itemId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customers.archiveAsset(
      request.tenant!.organizationId,
      request.actor!.userId,
      customerId,
      itemId,
      request,
    );
  }
}
