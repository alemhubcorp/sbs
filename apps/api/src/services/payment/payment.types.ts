import type { Prisma } from '@prisma/client';

export type PaymentScope = 'order' | 'deal';
export type PaymentMethod = 'card' | 'qr' | 'bank_transfer' | 'swift' | 'iban_invoice' | 'manual';
export type PaymentProviderCode = 'internal_manual' | 'airwallex' | 'none';
export type PaymentRecordStatus =
  | 'invoice_issued'
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'awaiting_transfer'
  | 'awaiting_confirmation'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'requires_review'
  | 'mismatch_detected';
export type PaymentAttemptType = 'initiate' | 'confirm' | 'reconcile' | 'webhook' | 'manual';

export type PaymentInstructions = Prisma.InputJsonValue;

export type PaymentRecordPayload = {
  scope: PaymentScope;
  orderId?: string | undefined;
  dealId?: string | undefined;
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProviderCode;
  status: PaymentRecordStatus;
  externalId?: string | null | undefined;
  transactionId?: string | null | undefined;
  bankReference?: string | null | undefined;
  paymentReference?: string | null | undefined;
  instructions?: PaymentInstructions | null | undefined;
  metadata?: PaymentInstructions | null | undefined;
};

export type PaymentAttemptPayload = {
  paymentRecordId: string;
  attemptType: PaymentAttemptType;
  method: PaymentMethod;
  provider: PaymentProviderCode;
  status: PaymentRecordStatus;
  amountMinor: number;
  currency: string;
  externalId?: string | null | undefined;
  transactionId?: string | null | undefined;
  bankReference?: string | null | undefined;
  paymentReference?: string | null | undefined;
  note?: string | null | undefined;
  payload?: PaymentInstructions | null | undefined;
};

export type PaymentInstructionResult = {
  provider: PaymentProviderCode;
  externalId: string | null;
  transactionId: string;
  bankReference: string | null;
  paymentReference: string;
  status: PaymentRecordStatus;
  instructions: PaymentInstructions;
};
