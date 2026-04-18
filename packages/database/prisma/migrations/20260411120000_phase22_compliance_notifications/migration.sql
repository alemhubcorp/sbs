-- Compliance and notifications layer

ALTER TABLE "WholesaleDeal"
  ADD COLUMN IF NOT EXISTS "agreementSnapshot" JSONB;

ALTER TABLE "ContractRfqDeal"
  ADD COLUMN IF NOT EXISTS "agreementSnapshot" JSONB;

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "actorId" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log"("action");
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx" ON "audit_log"("actor");
CREATE INDEX IF NOT EXISTS "audit_log_createdAt_idx" ON "audit_log"("createdAt");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "entityType" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
