import type { LinkedRecord } from '../seed/cashLedger';

const ROUTE_BY_KIND: Record<LinkedRecord['kind'], string> = {
  bill: '/payables',
  claim: '/claims',
  contract: '/contracts',
  invoice: '/collections',
  payroll: '/ledger',
  policy: '/relationships',
};

export function linkedRecordPath(linked: LinkedRecord): string {
  const params = new URLSearchParams({ ref: linked.ref, kind: linked.kind });
  return `${ROUTE_BY_KIND[linked.kind]}?${params.toString()}`;
}

export function openLinkedRecord(linked: LinkedRecord): void {
  window.location.assign(linkedRecordPath(linked));
}
