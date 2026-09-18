import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { JobsModule } from "../jobs/jobs.module";
import { ServiceAgreementsController } from "./service-agreements.controller";
import { ServiceAgreementsService } from "./service-agreements.service";
@Module({
  imports: [DatabaseModule, AuthModule, JobsModule],
  controllers: [ServiceAgreementsController],
  providers: [ServiceAgreementsService],
})
export class ServiceAgreementsModule {}
