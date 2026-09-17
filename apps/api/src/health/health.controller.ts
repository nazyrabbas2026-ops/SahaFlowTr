import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@Controller("health")
@ApiTags("Sistem")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}
  @Get() live() {
    return { status: "ok", service: "sahaflow-api" };
  }
  @Get("ready") ready() {
    return this.health.check();
  }
}
