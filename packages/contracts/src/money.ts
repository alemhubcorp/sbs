export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export interface Money {
  amount: string;
  currency: CurrencyCode;
}

export function formatMoney(money: Money): string {
  return `${money.currency} ${money.amount}`;
}
