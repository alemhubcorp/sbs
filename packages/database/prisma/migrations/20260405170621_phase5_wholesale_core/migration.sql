-- CreateEnum
CREATE TYPE "WholesaleRfqStatus" AS ENUM ('open', 'quoted', 'closed');

-- CreateEnum
CREATE TYPE "WholesaleQuoteStatus" AS ENUM ('submitted', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "WholesaleDealStatus" AS ENUM ('open', 'contract_pending', 'in_room', 'closed');

-- CreateEnum
CREATE TYPE "DealRoomStatus" AS ENUM ('active', 'closed');

-- CreateTable
CREATE TABLE "WholesaleRfq" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerProfileId" TEXT,
    "requestedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "status" "WholesaleRfqStatus" NOT NULL DEFAULT 'open',
    "selectedQuoteId" TEXT,
    "contractId" TEXT,
    "documentLinkage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleRfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleQuote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "message" TEXT,
    "status" "WholesaleQuoteStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleDeal" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "acceptedQuoteId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerProfileId" TEXT,
    "sellerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WholesaleDealStatus" NOT NULL DEFAULT 'open',
    "contractId" TEXT,
    "documentLinkage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealRoom" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "status" "DealRoomStatus" NOT NULL DEFAULT 'active',
    "latestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleRfq_selectedQuoteId_key" ON "WholesaleRfq"("selectedQuoteId");

-- CreateIndex
CREATE INDEX "WholesaleRfq_tenantId_idx" ON "WholesaleRfq"("tenantId");

-- CreateIndex
CREATE INDEX "WholesaleRfq_buyerProfileId_idx" ON "WholesaleRfq"("buyerProfileId");

-- CreateIndex
CREATE INDEX "WholesaleRfq_requestedByUserId_idx" ON "WholesaleRfq"("requestedByUserId");

-- CreateIndex
CREATE INDEX "WholesaleRfq_status_idx" ON "WholesaleRfq"("status");

-- CreateIndex
CREATE INDEX "WholesaleQuote_rfqId_idx" ON "WholesaleQuote"("rfqId");

-- CreateIndex
CREATE INDEX "WholesaleQuote_sellerProfileId_idx" ON "WholesaleQuote"("sellerProfileId");

-- CreateIndex
CREATE INDEX "WholesaleQuote_status_idx" ON "WholesaleQuote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleDeal_rfqId_key" ON "WholesaleDeal"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleDeal_acceptedQuoteId_key" ON "WholesaleDeal"("acceptedQuoteId");

-- CreateIndex
CREATE INDEX "WholesaleDeal_tenantId_idx" ON "WholesaleDeal"("tenantId");

-- CreateIndex
CREATE INDEX "WholesaleDeal_buyerProfileId_idx" ON "WholesaleDeal"("buyerProfileId");

-- CreateIndex
CREATE INDEX "WholesaleDeal_sellerProfileId_idx" ON "WholesaleDeal"("sellerProfileId");

-- CreateIndex
CREATE INDEX "WholesaleDeal_status_idx" ON "WholesaleDeal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DealRoom_dealId_key" ON "DealRoom"("dealId");

-- CreateIndex
CREATE INDEX "DealRoom_status_idx" ON "DealRoom"("status");

-- AddForeignKey
ALTER TABLE "WholesaleRfq" ADD CONSTRAINT "WholesaleRfq_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleRfq" ADD CONSTRAINT "WholesaleRfq_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleRfq" ADD CONSTRAINT "WholesaleRfq_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleRfq" ADD CONSTRAINT "WholesaleRfq_selectedQuoteId_fkey" FOREIGN KEY ("selectedQuoteId") REFERENCES "WholesaleQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleQuote" ADD CONSTRAINT "WholesaleQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "WholesaleRfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleQuote" ADD CONSTRAINT "WholesaleQuote_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDeal" ADD CONSTRAINT "WholesaleDeal_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "WholesaleRfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDeal" ADD CONSTRAINT "WholesaleDeal_acceptedQuoteId_fkey" FOREIGN KEY ("acceptedQuoteId") REFERENCES "WholesaleQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDeal" ADD CONSTRAINT "WholesaleDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDeal" ADD CONSTRAINT "WholesaleDeal_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDeal" ADD CONSTRAINT "WholesaleDeal_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealRoom" ADD CONSTRAINT "DealRoom_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "WholesaleDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
