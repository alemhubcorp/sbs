-- CreateEnum
CREATE TYPE "ContractRfqStatus" AS ENUM ('new', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "ContractRfq" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "ContractRfqStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractRfq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractRfq_createdAt_idx" ON "ContractRfq"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractRfq_status_idx" ON "ContractRfq"("status");
