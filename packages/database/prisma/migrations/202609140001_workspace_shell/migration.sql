CREATE UNIQUE INDEX "OrganizationMember_organizationId_id_key"
ON "OrganizationMember"("organizationId", "id");

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanEntitlement" (
  "planId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" INTEGER,
  CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("planId", "featureKey")
);

CREATE TABLE "OrganizationSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationOnboardingStep" (
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completedByMemberId" TEXT,
  CONSTRAINT "OrganizationOnboardingStep_pkey" PRIMARY KEY ("organizationId", "key")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "recipientMemberId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");
CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");
CREATE INDEX "OrganizationSubscription_planId_status_idx" ON "OrganizationSubscription"("planId", "status");
CREATE INDEX "OrganizationOnboardingStep_organizationId_completedAt_idx" ON "OrganizationOnboardingStep"("organizationId", "completedAt");
CREATE INDEX "Notification_organizationId_recipientMemberId_readAt_createdAt_idx" ON "Notification"("organizationId", "recipientMemberId", "readAt", "createdAt");

ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationOnboardingStep" ADD CONSTRAINT "OrganizationOnboardingStep_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationOnboardingStep" ADD CONSTRAINT "OrganizationOnboardingStep_completedByMember_fkey" FOREIGN KEY ("organizationId", "completedByMemberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientMember_fkey" FOREIGN KEY ("organizationId", "recipientMemberId") REFERENCES "OrganizationMember"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "key", "name")
VALUES ('plan_starter', 'starter', 'Başlangıç');

INSERT INTO "PlanEntitlement" ("planId", "featureKey", "enabled", "limitValue") VALUES
('plan_starter', 'workspace.shell', true, NULL),
('plan_starter', 'team.management', true, 5),
('plan_starter', 'notifications', true, NULL);

INSERT INTO "Permission" ("key", "description") VALUES
('workspace.read', 'workspace.read'),
('notification.read', 'notification.read'),
('onboarding.read', 'onboarding.read')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("organizationId", "roleId", "permissionKey")
SELECT r."organizationId", r."id", p."key"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Şirket Sahibi'
  AND p."key" IN ('workspace.read', 'notification.read', 'onboarding.read')
ON CONFLICT DO NOTHING;

INSERT INTO "OrganizationSubscription" ("id", "organizationId", "planId")
SELECT 'sub_' || md5(o."id"), o."id", 'plan_starter'
FROM "Organization" o
ON CONFLICT ("organizationId") DO NOTHING;

INSERT INTO "OrganizationOnboardingStep" ("organizationId", "key", "completedAt", "completedByMemberId")
SELECT o."id", steps."key", CASE WHEN steps."done" THEN CURRENT_TIMESTAMP ELSE NULL END,
       CASE WHEN steps."done" THEN member."id" ELSE NULL END
FROM "Organization" o
JOIN LATERAL (
  SELECT m."id" FROM "OrganizationMember" m
  WHERE m."organizationId" = o."id"
  ORDER BY m."createdAt" ASC LIMIT 1
) member ON true
CROSS JOIN (VALUES
  ('organization_created', true),
  ('owner_account_created', true),
  ('team_invited', false),
  ('service_catalog_ready', false),
  ('first_customer_created', false),
  ('first_job_created', false)
) AS steps("key", "done")
ON CONFLICT DO NOTHING;

INSERT INTO "Notification" ("id", "organizationId", "recipientMemberId", "type", "title", "body", "href")
SELECT 'notification_' || md5(o."id"), o."id", member."id", 'welcome',
       'Çalışma alanınız hazır', 'SahaFlow TR şirket hesabınız başarıyla oluşturuldu.', '/'
FROM "Organization" o
JOIN LATERAL (
  SELECT m."id" FROM "OrganizationMember" m
  WHERE m."organizationId" = o."id"
  ORDER BY m."createdAt" ASC LIMIT 1
) member ON true;
