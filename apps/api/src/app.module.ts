import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { CustomersModule } from "./customers/customers.module";
import { TrustedOriginGuard } from "./common/trusted-origin.guard";
import { JobsModule } from "./jobs/jobs.module";
import { EmployeesModule } from "./employees/employees.module";
import { DispatchModule } from "./dispatch/dispatch.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    JobsModule,
    EmployeesModule,
    DispatchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: TrustedOriginGuard },
  ],
})
export class AppModule {}
