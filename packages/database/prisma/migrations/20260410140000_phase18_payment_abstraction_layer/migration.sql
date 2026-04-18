-- Retail payment statuses
ALTER TYPE "RetailPaymentStatus" ADD VALUE IF NOT EXISTS 'awaiting_transfer';
ALTER TYPE "RetailPaymentStatus" ADD VALUE IF NOT EXISTS 'awaiting_confirmation';
ALTER TYPE "RetailPaymentStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "RetailPaymentStatus" ADD VALUE IF NOT EXISTS 'refunded';

-- Payment abstraction enums
DO $$ BEGIN
  CREATE TYPE "PaymentScope" AS ENUM ('order', 'deal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('card', 'qr', 'bank_transfer', 'swift', 'iban_invoice', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('internal_manual', 'airwallex', 'none');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentRecordStatus" AS ENUM ('invoice_issued', 'pending', 'awaiting_transfer', 'awaiting_confirmation', 'paid', 'failed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentAttemptType" AS ENUM ('initiate', 'confirm', 'reconcile', 'webhook', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentRecord" (
  "id" TEXT NOT NULL,
  "scope" "PaymentScope" NOT NULL,
  "orderId" TEXT,
  "dealId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentRecordStatus" NOT NULL DEFAULT 'pending',
  "externalId" TEXT,
  "transactionId" TEXT,
  "bankReference" TEXT,
  "paymentReference" TEXT,
  "instructions" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_transactionId_key" ON "PaymentRecord"("transactionId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_paymentReference_key" ON "PaymentRecord"("paymentReference");
CREATE INDEX IF NOT EXISTS "PaymentRecord_orderId_idx" ON "PaymentRecord"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentRecord_dealId_idx" ON "PaymentRecord"("dealId");
CREATE INDEX IF NOT EXISTS "PaymentRecord_scope_idx" ON "PaymentRecord"("scope");
CREATE INDEX IF NOT EXISTS "PaymentRecord_status_idx" ON "PaymentRecord"("status");
CREATE INDEX IF NOT EXISTS "PaymentRecord_provider_idx" ON "PaymentRecord"("provider");

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "paymentRecordId" TEXT NOT NULL,
  "attemptType" "PaymentAttemptType" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentRecordStatus" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "externalId" TEXT,
  "transactionId" TEXT,
  "bankReference" TEXT,
  "paymentReference" TEXT,
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentAttempt_paymentRecordId_idx" ON "PaymentAttempt"("paymentRecordId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_attemptType_idx" ON "PaymentAttempt"("attemptType");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "RetailOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord"
  ADD CONSTRAINT "PaymentRecord_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "ContractRfqDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_paymentRecordId_fkey"
  FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
