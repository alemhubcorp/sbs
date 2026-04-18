export function formatMoney(amountMinor: number, currency: string) {
  return `${currency} ${(amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return 'n/a';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'n/a';
  }

  return date.toLocaleString();
}

export function paymentMethodLabel(method?: string | null) {
  switch (method) {
    case 'card':
      return 'Card';
    case 'qr':
      return 'QR payment';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'swift':
      return 'SWIFT';
    case 'iban_invoice':
      return 'IBAN / invoice';
    case 'manual':
      return 'Manual';
    default:
      return method ?? 'n/a';
  }
}

export function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case 'pending':
      return 'Pending payment';
    case 'processing':
      return 'Processing';
    case 'authorized':
      return 'Authorized';
    case 'paid':
      return 'Paid';
    case 'awaiting_transfer':
      return 'Waiting for transfer';
    case 'awaiting_confirmation':
      return 'Waiting for confirmation';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    case 'requires_review':
      return 'Requires review';
    case 'mismatch_detected':
      return 'Mismatch detected';
    default:
      return status ?? 'n/a';
  }
}

export function payoutStatusLabel(status?: string | null) {
  switch (status) {
    case 'held':
      return 'Secured';
    case 'releasable':
      return 'Ready for release';
    case 'release_requested':
      return 'Release requested';
    case 'released':
      return 'Paid out';
    case 'payout_failed':
    case 'disputed':
      return 'Payout failed';
    case 'partially_released':
      return 'Partially paid out';
    case 'pending_review':
      return 'Pending review';
    case 'verified':
      return 'Verified';
    case 'restricted':
      return 'Restricted';
    case 'unverified':
      return 'Unverified';
    default:
      return status ?? 'n/a';
  }
}

export function normalizeFlowLabel(scope?: string | null) {
  switch (scope) {
    case 'order':
      return 'B2C';
    case 'deal':
      return 'B2B';
    default:
      return scope ?? 'n/a';
  }
}
