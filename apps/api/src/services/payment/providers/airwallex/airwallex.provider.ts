import { randomUUID } from 'node:crypto';
import type { PaymentInstructionResult, PaymentMethod, PaymentProviderCode } from '../../payment.types.js';

function shortId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export class AirwallexPaymentProvider {
  readonly code: PaymentProviderCode = 'airwallex';

  buildInstructions(input: {
    scope: 'order' | 'deal';
    method: PaymentMethod;
    amountMinor: number;
    currency: string;
    merchantName: string;
    beneficiaryName: string;
    bankName: string;
  }): PaymentInstructionResult {
    const transactionId = randomUUID();
    const paymentReference = shortId(input.scope === 'deal' ? 'AWXINV' : 'AWXPAY');
    const bankReference = shortId('AWXREF');
    const externalId = shortId('awx');

    if (input.method === 'card') {
      return {
        provider: this.code,
        externalId,
        transactionId,
        bankReference: null,
        paymentReference,
        status: 'processing',
        instructions: {
          provider: 'airwallex',
          flow: 'hosted_card_checkout',
          paymentLink: `https://pay.airwallex.example/${externalId}`,
          amountMinor: input.amountMinor,
          currency: input.currency,
          paymentReference,
          merchantName: input.merchantName
        }
      };
    }

    if (input.method === 'qr') {
      return {
        provider: this.code,
        externalId,
        transactionId,
        bankReference,
        paymentReference,
        status: 'awaiting_confirmation',
        instructions: {
          provider: 'airwallex',
          flow: 'qr_payment',
          qrCodeData: `airwallex:${externalId}`,
          amountMinor: input.amountMinor,
          currency: input.currency,
          paymentReference
        }
      };
    }

    return {
      provider: this.code,
      externalId,
      transactionId,
      bankReference,
      paymentReference,
      status: 'awaiting_transfer',
      instructions: {
        provider: 'airwallex',
        flow: 'bank_transfer_instructions',
        beneficiaryName: input.beneficiaryName,
        bankName: input.bankName,
        accountNumber: 'AIRWALLEX-GLOBAL-ACCOUNT',
        iban: 'AWX-IBAN-PLACEHOLDER',
        swift: 'AIRWALLEXBIC',
        amountMinor: input.amountMinor,
        currency: input.currency,
        paymentReference,
        bankReference
      }
    };
  }
}
