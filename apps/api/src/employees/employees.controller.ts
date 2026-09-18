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
import { EmployeesService } from "./employees.service";
import { z } from "zod";
import { parseBody } from "../common/http";

const createEmployeeSchema = z.object({
  memberId: z.string().cuid(),
  employeeNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  phone: z.string().max(20).nullable().optional(),
  homeCity: z.string().max(100).nullable().optional(),
  homeDistrict: z.string().max(100).nullable().optional(),
});

const addSkillSchema = z.object({
  skillId: z.string().cuid(),
  level: z.number().int().min(1).max(5),
});

const recordLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  jobId: z.string().cuid().optional(),
});

const createSkillSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
});

@Controller("organizations/:organizationId/employees")
@ApiTags("Çalışanlar")
@UseGuards(AccessTokenGuard, TenantGuard)
@RequireEntitlements("operations.employees")
export class EmployeesController {
  constructor(@Inject(EmployeesService) private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  @ApiOperation({ summary: "Organizasyondaki çalışanları listele" })
  async list(@Req() req: AuthenticatedRequest) {
    return this.employees.listByOrganization(req.tenant!.organizationId);
  }

  @Get("skills")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  @ApiOperation({ summary: "Beceri kataloğunu listele" })
  async listSkills(@Req() req: AuthenticatedRequest) {
    return this.employees.listSkills(req.tenant!.organizationId);
  }

  @Post("skills")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @ApiOperation({ summary: "Beceri kataloğuna ekle" })
  async createSkill(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseBody(createSkillSchema, body);
    return this.employees.createSkill(req.tenant!.organizationId, input);
  }

  @Get(":employeeId")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  @ApiOperation({ summary: "Çalışan detaylarını getir" })
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param("employeeId") employeeId: string,
  ) {
    return this.employees.getById(req.tenant!.organizationId, employeeId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @ApiOperation({ summary: "Yeni çalışan oluştur" })
  async create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseBody(createEmployeeSchema, body);
    return this.employees.create(req.tenant!.organizationId, input.memberId, {
      employeeNumber: input.employeeNumber,
      title: input.title,
      phone: input.phone,
      homeCity: input.homeCity,
      homeDistrict: input.homeDistrict,
    });
  }

  @Post(":employeeId/skills")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @ApiOperation({ summary: "Çalışana beceri ekle" })
  async addSkill(
    @Req() req: AuthenticatedRequest,
    @Param("employeeId") employeeId: string,
    @Body() body: unknown,
  ) {
    const input = parseBody(addSkillSchema, body);
    return this.employees.addSkill(
      req.tenant!.organizationId,
      employeeId,
      input.skillId,
      input.level,
    );
  }

  @Post(":employeeId/location")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @ApiOperation({ summary: "Çalışan konumunu kaydet" })
  async recordLocation(
    @Req() req: AuthenticatedRequest,
    @Param("employeeId") employeeId: string,
    @Body() body: unknown,
  ) {
    const input = parseBody(recordLocationSchema, body);
    return this.employees.recordLocation(
      req.tenant!.organizationId,
      employeeId,
      input.latitude,
      input.longitude,
      input.jobId,
    );
  }
}
