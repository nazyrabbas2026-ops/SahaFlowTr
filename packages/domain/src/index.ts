export const APP_CONFIG = {
  productName: "SahaFlow TR",
  country: "TR",
  currency: "TRY",
  locale: "tr-TR",
  timezone: "Europe/Istanbul",
} as const;

export const PERMISSIONS = {
  ORGANIZATION_READ: "organization.read",
  WORKSPACE_READ: "workspace.read",
  MEMBER_READ: "member.read",
  MEMBER_MANAGE: "member.manage",
  ROLE_MANAGE: "role.manage",
  NOTIFICATION_READ: "notification.read",
  ONBOARDING_READ: "onboarding.read",
  CUSTOMER_READ: "customer.read",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_ARCHIVE: "customer.archive",
  JOB_READ: "job.read",
  JOB_CREATE: "job.create",
  JOB_ASSIGN: "job.assign",
  JOB_UPDATE: "job.update",
  JOB_COMPLETE: "job.complete",
  JOB_CANCEL: "job.cancel",
  AUDIT_READ: "audit.read",
  EMPLOYEE_READ: "employee.read",
  EMPLOYEE_MANAGE: "employee.manage",
  DISPATCH_READ: "dispatch.read",
  DISPATCH_ASSIGN: "dispatch.assign",
  SERVICE_AGREEMENT_READ: "service-agreement.read",
  SERVICE_AGREEMENT_MANAGE: "service-agreement.manage",
  SERVICE_AGREEMENT_GENERATE: "service-agreement.generate",
} as const;

export const OWNER_PERMISSIONS = Object.values(PERMISSIONS);

export * from "./money";
export * from "./geo";
export * from "./dispatch";
export * from "./recurrence";
export interface Membership {
  userId: string;
  organizationId: string;
  active: boolean;
  permissions: readonly string[];
}
// Only use memberships loaded from the trusted persistence layer.
export function authorize(
  memberships: readonly Membership[],
  userId: string,
  organizationId: string,
  permission: string,
): boolean {
  return memberships.some(
    (m) =>
      m.userId === userId &&
      m.organizationId === organizationId &&
      m.active &&
      m.permissions.includes(permission),
  );
}
