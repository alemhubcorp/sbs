-- Partners, assignment, and SMTP foundations

DO $$
BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PartnerType" AS ENUM (
    'logistics_company',
    'customs_broker',
    'insurance_company',
    'surveyor',
    'bank'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OperationalAssignmentKind" AS ENUM ('shipment', 'customs');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "partnerType" "PartnerType",
  ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_partnerType_idx" ON "Organization"("partnerType");
CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");

CREATE TABLE IF NOT EXISTS "OperationalAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" "OperationalAssignmentKind" NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "partnerOrganizationId" TEXT,
  "partnerUserId" TEXT,
  "reference" TEXT,
  "status" TEXT NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperationalAssignment_tenantId_idx" ON "OperationalAssignment"("tenantId");
CREATE INDEX IF NOT EXISTS "OperationalAssignment_kind_idx" ON "OperationalAssignment"("kind");
CREATE INDEX IF NOT EXISTS "OperationalAssignment_subjectType_subjectId_idx" ON "OperationalAssignment"("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "OperationalAssignment_partnerOrganizationId_idx" ON "OperationalAssignment"("partnerOrganizationId");
CREATE INDEX IF NOT EXISTS "OperationalAssignment_partnerUserId_idx" ON "OperationalAssignment"("partnerUserId");
CREATE INDEX IF NOT EXISTS "OperationalAssignment_status_idx" ON "OperationalAssignment"("status");

ALTER TABLE "OperationalAssignment"
  ADD CONSTRAINT "OperationalAssignment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OperationalAssignment_partnerOrganizationId_fkey"
  FOREIGN KEY ("partnerOrganizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "OperationalAssignment_partnerUserId_fkey"
  FOREIGN KEY ("partnerUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
