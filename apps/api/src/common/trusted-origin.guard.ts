import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { assertTrustedBrowserOrigin } from "./http";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class TrustedOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!safeMethods.has(request.method)) assertTrustedBrowserOrigin(request);
    return true;
  }
}
