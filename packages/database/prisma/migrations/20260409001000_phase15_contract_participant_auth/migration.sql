ALTER TABLE "ContractRfq"
ADD COLUMN "buyerUserId" TEXT,
ADD COLUMN "supplierUserId" TEXT;

ALTER TABLE "ContractRfqQuote"
ADD COLUMN "buyerUserId" TEXT,
ADD COLUMN "supplierUserId" TEXT;

ALTER TABLE "ContractRfqDeal"
ADD COLUMN "buyerUserId" TEXT,
ADD COLUMN "supplierUserId" TEXT;

CREATE INDEX "ContractRfq_buyerUserId_idx" ON "ContractRfq"("buyerUserId");
CREATE INDEX "ContractRfq_supplierUserId_idx" ON "ContractRfq"("supplierUserId");
CREATE INDEX "ContractRfqQuote_buyerUserId_idx" ON "ContractRfqQuote"("buyerUserId");
CREATE INDEX "ContractRfqQuote_supplierUserId_idx" ON "ContractRfqQuote"("supplierUserId");
CREATE INDEX "ContractRfqDeal_buyerUserId_idx" ON "ContractRfqDeal"("buyerUserId");
CREATE INDEX "ContractRfqDeal_supplierUserId_idx" ON "ContractRfqDeal"("supplierUserId");
