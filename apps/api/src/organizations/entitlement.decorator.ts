import { SetMetadata } from "@nestjs/common";

export const REQUIRED_ENTITLEMENTS = "required_entitlements";
export const RequireEntitlements = (...entitlements: string[]) =>
  SetMetadata(REQUIRED_ENTITLEMENTS, entitlements);
