import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditService } from "../audit/audit.service";
import { AccessTokenGuard } from "./access-token.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AccessTokenGuard, AuditService],
  exports: [TokenService, AccessTokenGuard, AuditService],
})
export class AuthModule {}
