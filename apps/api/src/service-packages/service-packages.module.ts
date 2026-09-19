import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ServicePackageFamiliesController } from "./service-package-families.controller";
import { ServicePackagesController } from "./service-packages.controller";
import { ServicePackagesService } from "./service-packages.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ServicePackagesController, ServicePackageFamiliesController],
  providers: [ServicePackagesService],
})
export class ServicePackagesModule {}
