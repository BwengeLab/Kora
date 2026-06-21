// Finance Lead "Finance Control Center" home seed (doc 03 §Home).
// Decision-weighted: the finance state + what's awaiting approval. Reuses
// seedApprovals (approvals block), seedInsights (AI insights) and
// seedReconciliation (recon snapshot) from the other home seeds.

import type { Money } from '../lib/money';

const M = (amount: number, currency = 'USD'): Money => ({
  amountMinor: BigInt(Math.round(amount * 100)),
  currency,
});

export interface FlKpi {
  id: 'cash' | 'projected' | 'receivables' | 'payables';
  label: string;
  money: Money;
  delta: { direction: 'up' | 'down'; valueText: string; label: string };
  positiveDirection: 'up' | 'down';
}

export const seedFinanceLeadKpis: FlKpi[] = [
  { id: 'cash', label: 'Cash position', money: M(2457389), delta: { direction: 'up', valueText: '12.5%', label: 'vs last week' }, positiveDirection: 'up' },
  { id: 'projected', label: 'Projected end of May', money: M(3210000), delta: { direction: 'up', valueText: '23%', label: 'vs Apr 30' }, positiveDirection: 'up' },
  { id: 'receivables', label: 'Receivables', money: M(2154890.3), delta: { direction: 'up', valueText: '15.3%', label: 'MoM' }, positiveDirection: 'down' },
  { id: 'payables', label: 'Payables', money: M(1324560.4), delta: { direction: 'down', valueText: '6.2%', label: 'MoM' }, positiveDirection: 'down' },
];

// Cash position with forecast — actual weeks then projected weeks.
export const seedCashForecast = {
  current: M(2457389),
  projected: M(3210000),
  labels: ['Apr 21', 'Apr 28', 'May 5', 'May 12', 'May 19', 'May 26', 'May 31'],
  actual: [1.9, 2.1, 2.25, 2.46, null, null, null] as (number | null)[],
  forecast: [null, null, null, 2.46, 2.74, 2.98, 3.21] as (number | null)[],
};

// Month-end close status (finance lead runs close).
export const seedCloseStatus = {
  period: 'May 2025',
  dueText: 'Close in 9 days',
  checklistDone: 6,
  checklistTotal: 10,
  openExceptions: 170,
};

export const seedMargin = { pct: 24.6, deltaPts: -2.4 };

// ROI / value Kora delivered (doc 03 §Value/ROI surfaced on Home).
export interface RoiMetric {
  id: string;
  label: string;
  value: Money;
  icon: 'recovered' | 'duplicates' | 'unsupported' | 'hours';
  valueOverride?: string;
}

export const seedFinanceLeadRoi: RoiMetric[] = [
  { id: 'recovered', label: 'Money recovered', value: M(86400), icon: 'recovered' },
  { id: 'duplicates', label: 'Duplicate payments avoided', value: M(45600), icon: 'duplicates' },
  { id: 'unsupported', label: 'Unsupported spend caught', value: M(12480), icon: 'unsupported' },
  { id: 'hours', label: 'Finance hours saved', value: M(0), valueOverride: '128 hrs', icon: 'hours' },
];
