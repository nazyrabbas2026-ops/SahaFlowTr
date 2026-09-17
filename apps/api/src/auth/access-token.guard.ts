import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { TokenService } from "./token.service";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string> | undefined;
    const header = request.headers.authorization;
    const token =
      cookies?.access_token ??
      (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    if (!token) throw new UnauthorizedException("Oturum gerekli");
    const claims = this.tokens.verifyAccess(token);
    const session = await this.database.refreshSession.findUnique({
      where: { id: claims.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException("Oturum sonlandırılmış");
    request.actor = { userId: claims.sub, sessionId: claims.sid };
    return true;
  }
}
