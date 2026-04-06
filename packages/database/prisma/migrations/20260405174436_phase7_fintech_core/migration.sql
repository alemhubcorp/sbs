-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('wholesale_deal');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('created', 'held', 'partially_released', 'released', 'refunded', 'disputed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentLedgerEntryType" AS ENUM ('created', 'hold', 'release', 'refund', 'dispute');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('payment', 'document', 'commercial');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "transactionType" "PaymentTransactionType" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'created',
    "currency" TEXT NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "heldAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "releasedAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "refundedAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLedgerEntry" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "entryType" "PaymentLedgerEntryType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "resultingHeldMinor" INTEGER NOT NULL,
    "resultingReleasedMinor" INTEGER NOT NULL,
    "resultingRefundedMinor" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeCase" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "paymentTransactionId" TEXT,
    "disputeType" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentTransaction_dealId_idx" ON "PaymentTransaction"("dealId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentLedgerEntry_paymentTransactionId_idx" ON "PaymentLedgerEntry"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "PaymentLedgerEntry_entryType_idx" ON "PaymentLedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "PaymentLedgerEntry_createdAt_idx" ON "PaymentLedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "DisputeCase_dealId_idx" ON "DisputeCase"("dealId");

-- CreateIndex
CREATE INDEX "DisputeCase_paymentTransactionId_idx" ON "DisputeCase"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "DisputeCase_status_idx" ON "DisputeCase"("status");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "WholesaleDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "WholesaleDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
