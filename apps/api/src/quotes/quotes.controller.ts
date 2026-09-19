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
  createQuoteSchema,
  quoteListSchema,
  replaceLinesSchema,
  replaceOptionsSchema,
  selectOptionSchema,
  updateQuoteSchema,
} from "./quotes.schemas";
import { QuotesService } from "./quotes.service";

@Controller("organizations/:organizationId/quotes")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("sales.quotes")
@ApiTags("Teklifler")
@ApiCookieAuth("access_token")
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.quotes.list(
      request.tenant!.organizationId,
      parseBody(quoteListSchema, query),
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.quotes.create(
      request.tenant!.organizationId,
      request.actor!.userId,
      parseBody(createQuoteSchema, body),
      request,
    );
  }

  @Get(":quoteId")
  @RequirePermissions(PERMISSIONS.QUOTE_READ)
  get(@Param("quoteId") quoteId: string, @Req() request: AuthenticatedRequest) {
    return this.quotes.get(request.tenant!.organizationId, quoteId);
  }

  @Patch(":quoteId")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  update(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.quotes.update(
      request.tenant!.organizationId,
      request.actor!.userId,
      quoteId,
      parseBody(updateQuoteSchema, body),
      request,
    );
  }

  @Put(":quoteId/options")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  replaceOptions(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.quotes.replaceOptions(
      request.tenant!.organizationId,
      request.actor!.userId,
      quoteId,
      parseBody(replaceOptionsSchema, body),
      request,
    );
  }

  @Put(":quoteId/lines")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  replaceLines(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.quotes.replaceLines(
      request.tenant!.organizationId,
      request.actor!.userId,
      quoteId,
      parseBody(replaceLinesSchema, body),
      request,
    );
  }

  @Post(":quoteId/select-option")
  @RequirePermissions(PERMISSIONS.QUOTE_MANAGE)
  selectOption(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.quotes.selectOption(
      request.tenant!.organizationId,
      request.actor!.userId,
      quoteId,
      parseBody(selectOptionSchema, body),
      request,
    );
  }
}
