import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@sahaflow/domain";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { RequireEntitlements } from "../organizations/entitlement.decorator";
import { RequirePermissions } from "../organizations/permission.decorator";
import { TenantGuard } from "../organizations/tenant.guard";
import { AuthenticatedRequest } from "../common/http";
import { Req } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";
import { z } from "zod";
import { parseBody } from "../common/http";

const assignJobSchema = z.object({
  memberId: z.string().cuid(),
});

@Controller("organizations/:organizationId/dispatch")
@ApiTags("Dispatch")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("operations.dispatch")
export class DispatchController {
  constructor(@Inject(DispatchService) private readonly dispatch: DispatchService) {}

  @Get("jobs/:jobId/candidates")
  @RequirePermissions(PERMISSIONS.DISPATCH_READ)
  @ApiOperation({ summary: "İş için aday çalışanları öner" })
  async suggestCandidates(
    @Req() req: AuthenticatedRequest,
    @Param("jobId") jobId: string,
  ) {
    return this.dispatch.suggestCandidates(req.tenant!.organizationId, jobId);
  }

  @Post("jobs/:jobId/assign")
  @RequirePermissions(PERMISSIONS.DISPATCH_ASSIGN)
  @ApiOperation({ summary: "Çalışanı işe ata" })
  async assignJob(
    @Req() req: AuthenticatedRequest,
    @Param("jobId") jobId: string,
    @Body() body: unknown,
  ) {
    const input = parseBody(assignJobSchema, body);
    return this.dispatch.assignJob(
      req.tenant!.organizationId,
      jobId,
      input.memberId,
    );
  }
}
