/*
  Warnings:

  - Added the required column `module` to the `AuditEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "module" TEXT NOT NULL,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "subjectType" TEXT,
ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "AuditEvent_module_idx" ON "AuditEvent"("module");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_idx" ON "AuditEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AuditEvent_subjectType_subjectId_idx" ON "AuditEvent"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
