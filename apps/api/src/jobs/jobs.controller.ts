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
import { JobStatus } from "@sahaflow/database";
import { PERMISSIONS } from "@sahaflow/domain";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { type AuthenticatedRequest, parseBody } from "../common/http";
import { RequireEntitlements } from "../organizations/entitlement.decorator";
import { RequirePermissions } from "../organizations/permission.decorator";
import { TenantGuard } from "../organizations/tenant.guard";
import {
  assignJobSchema,
  createJobNoteSchema,
  createJobSchema,
  jobListSchema,
  transitionJobSchema,
  updateJobSchema,
} from "./jobs.schemas";
import { JobsService } from "./jobs.service";

@Controller("organizations/:organizationId/jobs")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("operations.jobs")
export class JobsController {
  constructor(@Inject(JobsService) private jobs: JobsService) {}
  @Get() @RequirePermissions(PERMISSIONS.JOB_READ) list(
    @Query() q: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.jobs.list(
      r.tenant!.organizationId,
      parseBody(jobListSchema, q),
    );
  }
  @Post() @RequirePermissions(PERMISSIONS.JOB_CREATE) create(
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.jobs.create(
      r.tenant!.organizationId,
      r.actor!.userId,
      parseBody(createJobSchema, b),
      r,
    );
  }
  @Get(":jobId") @RequirePermissions(PERMISSIONS.JOB_READ) get(
    @Param("jobId") id: string,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.jobs.get(r.tenant!.organizationId, id);
  }
  @Patch(":jobId") @RequirePermissions(PERMISSIONS.JOB_UPDATE) update(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.jobs.update(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      parseBody(updateJobSchema, b),
      r,
    );
  }
  @Post(":jobId/assign") @RequirePermissions(PERMISSIONS.JOB_ASSIGN) assign(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.jobs.assign(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      parseBody(assignJobSchema, b),
      r,
    );
  }
  @Post(":jobId/note") @RequirePermissions(PERMISSIONS.JOB_UPDATE) note(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    const v = parseBody(createJobNoteSchema, b);
    return this.jobs.note(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      v.body,
      v.visibility,
      r,
    );
  }
  @Post(":jobId/schedule") @RequirePermissions(PERMISSIONS.JOB_UPDATE) schedule(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.SCHEDULED, b, r);
  }
  @Post(":jobId/en-route") @RequirePermissions(PERMISSIONS.JOB_UPDATE) enRoute(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.EN_ROUTE, b, r);
  }
  @Post(":jobId/arrive") @RequirePermissions(PERMISSIONS.JOB_UPDATE) arrive(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.ARRIVED, b, r);
  }
  @Post(":jobId/start") @RequirePermissions(PERMISSIONS.JOB_UPDATE) start(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.IN_PROGRESS, b, r);
  }
  @Post(":jobId/hold") @RequirePermissions(PERMISSIONS.JOB_UPDATE) hold(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.ON_HOLD, b, r);
  }
  @Post(":jobId/complete")
  @RequirePermissions(PERMISSIONS.JOB_COMPLETE)
  complete(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.COMPLETED, b, r);
  }
  @Post(":jobId/cancel") @RequirePermissions(PERMISSIONS.JOB_CANCEL) cancel(
    @Param("jobId") id: string,
    @Body() b: unknown,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.change(id, JobStatus.CANCELLED, b, r);
  }
  private change(
    id: string,
    status: JobStatus,
    body: unknown,
    r: AuthenticatedRequest,
  ) {
    const parsed = parseBody(transitionJobSchema, {
      ...(body as object),
      status,
    });
    return this.jobs.transition(
      r.tenant!.organizationId,
      r.actor!.userId,
      id,
      status,
      parsed.reason,
      r,
    );
  }
}
