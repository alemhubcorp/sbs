-- AlterEnum
ALTER TYPE "ContractRfqStatus" ADD VALUE IF NOT EXISTS 'quoted';

-- CreateEnum
CREATE TYPE "ContractRfqQuoteStatus" AS ENUM ('submitted', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "ContractDealPartyStatus" AS ENUM ('pending', 'accepted', 'rejected', 'active', 'completed', 'disputed');

-- CreateEnum
CREATE TYPE "ContractDealStatus" AS ENUM ('pending', 'quoted', 'accepted', 'rejected', 'in_escrow', 'shipped', 'completed', 'disputed');

-- CreateTable
CREATE TABLE "ContractRfqQuote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "status" "ContractRfqQuoteStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractRfqQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRfqDeal" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "buyerStatus" "ContractDealPartyStatus" NOT NULL DEFAULT 'pending',
    "supplierStatus" "ContractDealPartyStatus" NOT NULL DEFAULT 'pending',
    "dealStatus" "ContractDealStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractRfqDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractRfqQuote_rfqId_key" ON "ContractRfqQuote"("rfqId");

-- CreateIndex
CREATE INDEX "ContractRfqQuote_createdAt_idx" ON "ContractRfqQuote"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractRfqQuote_status_idx" ON "ContractRfqQuote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractRfqDeal_rfqId_key" ON "ContractRfqDeal"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractRfqDeal_quoteId_key" ON "ContractRfqDeal"("quoteId");

-- CreateIndex
CREATE INDEX "ContractRfqDeal_createdAt_idx" ON "ContractRfqDeal"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractRfqDeal_dealStatus_idx" ON "ContractRfqDeal"("dealStatus");

-- AddForeignKey
ALTER TABLE "ContractRfqQuote" ADD CONSTRAINT "ContractRfqQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "ContractRfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRfqDeal" ADD CONSTRAINT "ContractRfqDeal_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "ContractRfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRfqDeal" ADD CONSTRAINT "ContractRfqDeal_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ContractRfqQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
