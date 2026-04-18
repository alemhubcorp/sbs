import { randomUUID } from 'node:crypto';
import type { PaymentInstructionResult, PaymentMethod, PaymentProviderCode } from '../payment.types.js';

function shortRef(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export class InternalManualPaymentProvider {
  readonly code: PaymentProviderCode = 'internal_manual';

  buildInstructions(input: {
    scope: 'order' | 'deal';
    method: PaymentMethod;
    amountMinor: number;
    currency: string;
    merchantName: string;
    beneficiaryName: string;
    bankName: string;
  }): PaymentInstructionResult {
    const paymentReference = shortRef(input.scope === 'deal' ? 'INV' : 'PAY');
    const bankReference = shortRef(input.method === 'manual' ? 'MAN' : 'TRF');
    const transactionId = randomUUID();
    const awaitingStatus = input.method === 'manual' ? 'awaiting_confirmation' : 'awaiting_transfer';

    return {
      provider: this.code,
      externalId: null,
      transactionId,
      bankReference,
      paymentReference,
      status: awaitingStatus,
      instructions: {
        scope: input.scope,
        method: input.method,
        merchantName: input.merchantName,
        beneficiaryName: input.beneficiaryName,
        bankName: input.bankName,
        amountMinor: input.amountMinor,
        currency: input.currency,
        paymentReference,
        bankReference,
        transferInstruction: 'Use the payment reference as the transfer reference.'
      }
    };
  }
}
