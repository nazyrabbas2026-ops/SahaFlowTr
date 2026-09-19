import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { CustomersModule } from "./customers/customers.module";
import { TrustedOriginGuard } from "./common/trusted-origin.guard";
import { BigIntSerializerInterceptor } from "./common/bigint-serializer.interceptor";
import { JobsModule } from "./jobs/jobs.module";
import { EmployeesModule } from "./employees/employees.module";
import { DispatchModule } from "./dispatch/dispatch.module";
import { ServiceAgreementsModule } from "./service-agreements/service-agreements.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ServicePackagesModule } from "./service-packages/service-packages.module";

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
    ServiceAgreementsModule,
    CatalogModule,
    ServicePackagesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: TrustedOriginGuard },
    { provide: APP_INTERCEPTOR, useClass: BigIntSerializerInterceptor },
  ],
})
export class AppModule {}
