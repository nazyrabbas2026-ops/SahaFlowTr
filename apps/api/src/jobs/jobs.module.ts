import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
