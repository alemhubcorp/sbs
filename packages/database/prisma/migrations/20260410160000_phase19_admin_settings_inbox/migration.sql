-- CreateTable
CREATE TABLE "AdminSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "AdminSetting"("key");

-- CreateIndex
CREATE INDEX "AdminSetting_section_idx" ON "AdminSetting"("section");

-- CreateIndex
CREATE INDEX "AdminSetting_updatedAt_idx" ON "AdminSetting"("updatedAt");
