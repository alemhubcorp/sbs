-- AlterEnum
ALTER TYPE "RetailOrderStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "RetailOrderStatus" ADD VALUE IF NOT EXISTS 'shipped';
ALTER TYPE "RetailOrderStatus" ADD VALUE IF NOT EXISTS 'delivered';

-- CreateEnum
CREATE TYPE "RetailPaymentStatus" AS ENUM ('pending', 'paid', 'failed');

-- AlterTable
ALTER TABLE "RetailOrder"
  ADD COLUMN "supplierProfileId" TEXT,
  ADD COLUMN "paymentStatus" "RetailPaymentStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "paymentTransactionId" TEXT,
  ADD COLUMN "shippingAddress" JSONB;

-- CreateIndex
CREATE INDEX "RetailOrder_supplierProfileId_idx" ON "RetailOrder"("supplierProfileId");
CREATE INDEX "RetailOrder_paymentStatus_idx" ON "RetailOrder"("paymentStatus");
CREATE UNIQUE INDEX "RetailOrder_paymentTransactionId_key" ON "RetailOrder"("paymentTransactionId");

-- AddForeignKey
ALTER TABLE "RetailOrder" ADD CONSTRAINT "RetailOrder_supplierProfileId_fkey" FOREIGN KEY ("supplierProfileId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
