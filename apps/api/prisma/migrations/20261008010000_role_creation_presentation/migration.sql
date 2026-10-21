ALTER TABLE "job_roles"
  ADD COLUMN "creationPresentation" VARCHAR(16);

ALTER TABLE "job_roles"
  ADD CONSTRAINT "job_roles_creation_presentation_check"
  CHECK ("creationPresentation" IS NULL OR "creationPresentation" IN ('EMPLOYEE', 'LEADER', 'SITE'));
