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
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@sahaflow/domain";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { type AuthenticatedRequest, parseBody } from "../common/http";
import { RequireEntitlements } from "../organizations/entitlement.decorator";
import { RequirePermissions } from "../organizations/permission.decorator";
import { TenantGuard } from "../organizations/tenant.guard";
import {
  createServiceAgreementSchema,
  generateServiceAgreementSchema,
  serviceAgreementListSchema,
  updateServiceAgreementSchema,
} from "./service-agreements.schemas";
import { ServiceAgreementsService } from "./service-agreements.service";

@Controller("organizations/:organizationId/service-agreements")
@ApiTags("Servis Sözleşmeleri")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("operations.service-agreements")
export class ServiceAgreementsController {
  constructor(
    @Inject(ServiceAgreementsService)
    private readonly agreements: ServiceAgreementsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SERVICE_AGREEMENT_READ)
  @ApiOperation({ summary: "Servis sözleşmelerini listele" })
  list(@Query() q: unknown, @Req() r: AuthenticatedRequest) {
    return this.agreements.list(
      r.tenant!.organizationId,
      parseBody(serviceAgreementListSchema, q),
    );
  }

  @Get(":agreementId")
  @RequirePermissions(PERMISSIONS.SERVICE_AGREEMENT_READ)
  @ApiOperation({ summary: "Servis sözleşmesi detayını getir" })
  get(@Param("agreementId") id: string, @Req() r: AuthenticatedRequest) {
    return this.agreements.get(r.tenant!.organizationId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SERVICE_AGREEMENT_MANAGE)
  @ApiOperation({ summary: "Yeni servis sözleşmesi oluştur" })
  create(@Body() b: unknown, @Req() r: AuthenticatedRequest) {
    return this.agreements.create(
      r.tenant!.organizationId,
      r.actor!.userId,
      parseBody(createServiceAgreementSchema, b),
      r,
    );
  }

  @Patch(":agreementId")
  @RequirePermissions(PERMISSIONS.SERVICE_AGREEMENT_MANAGE)
  @ApiOperation({ summary: "Servis sözleşmesini güncelle" })
  update(
    @Param("agreementId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.agreements.update(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      parseBody(updateServiceAgreementSchema, b),
      r,
    );
  }

  @Post(":agreementId/generate")
  @RequirePermissions(PERMISSIONS.SERVICE_AGREEMENT_GENERATE)
  @ApiOperation({ summary: "Süresi gelen dönemler için iş emri üret" })
  generate(
    @Param("agreementId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.agreements.generate(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      parseBody(generateServiceAgreementSchema, b),
      r,
    );
  }
}
