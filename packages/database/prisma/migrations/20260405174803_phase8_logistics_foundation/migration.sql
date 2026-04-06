-- CreateEnum
CREATE TYPE "LogisticsProviderStatus" AS ENUM ('draft', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "DealLogisticsSelectionStatus" AS ENUM ('selected', 'changed');

-- CreateTable
CREATE TABLE "LogisticsProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LogisticsProviderStatus" NOT NULL DEFAULT 'draft',
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsCapabilityProfile" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "transportTypes" JSONB,
    "serviceTypes" JSONB,
    "cargoCategories" JSONB,
    "supportedRegions" JSONB,
    "deliveryModes" JSONB,
    "additionalServices" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsCapabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealLogisticsSelection" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "logisticsProviderId" TEXT NOT NULL,
    "status" "DealLogisticsSelectionStatus" NOT NULL DEFAULT 'selected',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealLogisticsSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogisticsProvider_status_idx" ON "LogisticsProvider"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsCapabilityProfile_providerId_key" ON "LogisticsCapabilityProfile"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealLogisticsSelection_dealId_key" ON "DealLogisticsSelection"("dealId");

-- CreateIndex
CREATE INDEX "DealLogisticsSelection_logisticsProviderId_idx" ON "DealLogisticsSelection"("logisticsProviderId");

-- CreateIndex
CREATE INDEX "DealLogisticsSelection_status_idx" ON "DealLogisticsSelection"("status");

-- AddForeignKey
ALTER TABLE "LogisticsCapabilityProfile" ADD CONSTRAINT "LogisticsCapabilityProfile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LogisticsProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLogisticsSelection" ADD CONSTRAINT "DealLogisticsSelection_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "WholesaleDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLogisticsSelection" ADD CONSTRAINT "DealLogisticsSelection_logisticsProviderId_fkey" FOREIGN KEY ("logisticsProviderId") REFERENCES "LogisticsProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
