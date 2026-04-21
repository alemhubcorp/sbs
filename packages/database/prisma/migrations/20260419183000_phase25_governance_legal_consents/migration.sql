CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "flow" TEXT NOT NULL,
  "documentSlug" TEXT NOT NULL,
  "documentTitle" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consent_records_userId_idx" ON "consent_records"("userId");
CREATE INDEX IF NOT EXISTS "consent_records_email_idx" ON "consent_records"("email");
CREATE INDEX IF NOT EXISTS "consent_records_flow_idx" ON "consent_records"("flow");
CREATE INDEX IF NOT EXISTS "consent_records_documentSlug_documentVersion_idx" ON "consent_records"("documentSlug", "documentVersion");
CREATE INDEX IF NOT EXISTS "consent_records_entityType_entityId_idx" ON "consent_records"("entityType", "entityId");

DO $$ BEGIN
  ALTER TABLE "consent_records"
    ADD CONSTRAINT "consent_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
