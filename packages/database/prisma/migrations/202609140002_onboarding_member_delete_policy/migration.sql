ALTER TABLE "OrganizationOnboardingStep"
DROP CONSTRAINT "OrganizationOnboardingStep_completedByMember_fkey";

ALTER TABLE "OrganizationOnboardingStep"
ADD CONSTRAINT "OrganizationOnboardingStep_completedByMember_fkey"
FOREIGN KEY ("organizationId", "completedByMemberId")
REFERENCES "OrganizationMember"("organizationId", "id")
ON DELETE NO ACTION ON UPDATE CASCADE;
