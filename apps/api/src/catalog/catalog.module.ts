import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
