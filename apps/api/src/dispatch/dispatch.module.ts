import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
