-- CreateEnum
CREATE TYPE "RetailOrderStatus" AS ENUM ('created', 'paid', 'fulfilled', 'cancelled');

-- CreateTable
CREATE TABLE "RetailOrder" (
    "id" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "status" "RetailOrderStatus" NOT NULL DEFAULT 'created',
    "currency" TEXT NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailOrderItem" (
    "id" TEXT NOT NULL,
    "retailOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitAmountMinor" INTEGER NOT NULL,
    "lineAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailOrder_buyerProfileId_idx" ON "RetailOrder"("buyerProfileId");

-- CreateIndex
CREATE INDEX "RetailOrder_status_idx" ON "RetailOrder"("status");

-- CreateIndex
CREATE INDEX "RetailOrderItem_retailOrderId_idx" ON "RetailOrderItem"("retailOrderId");

-- CreateIndex
CREATE INDEX "RetailOrderItem_productId_idx" ON "RetailOrderItem"("productId");

-- AddForeignKey
ALTER TABLE "RetailOrder" ADD CONSTRAINT "RetailOrder_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailOrderItem" ADD CONSTRAINT "RetailOrderItem_retailOrderId_fkey" FOREIGN KEY ("retailOrderId") REFERENCES "RetailOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailOrderItem" ADD CONSTRAINT "RetailOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
