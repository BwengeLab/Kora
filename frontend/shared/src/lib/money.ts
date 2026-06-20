// Money is stored as integer minor units to avoid float drift.
export interface Money {
  amountMinor: bigint;
  currency: string; // ISO 4217, e.g. "RWF", "USD"
}

export function formatMoney(m: Money, locale = 'en-US'): string {
  const major = Number(m.amountMinor) / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(major);
}
