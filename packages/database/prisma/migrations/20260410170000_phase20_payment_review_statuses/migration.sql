ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'authorized';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'requires_review';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'mismatch_detected';
