// Organizational dimensions — the backbone that lets Kora scale from a 5-person
// shop to a multi-entity group. Every financial record can be sliced by legal
// entity and cost center. "All entities" = the consolidated group view.
//
// A small business simply runs with one entity and ignores the switcher; a large
// group gets per-entity books + consolidation. Same product, progressive depth.

export type EntityId = 'ent-rw' | 'ent-ke' | 'ent-ug';
export type EntityScope = 'all' | EntityId;

export interface BusinessEntity {
  id: EntityId;
  name: string;
  short: string;
  country: string;
  flag: string;
  kind: 'subsidiary' | 'branch';
  currency: string;
  base: boolean; // the primary/reporting entity
}

export const seedEntities: BusinessEntity[] = [
  { id: 'ent-rw', name: 'Acme Insurance Rwanda', short: 'Rwanda', country: 'Rwanda', flag: '🇷🇼', kind: 'subsidiary', currency: 'USD', base: true },
  { id: 'ent-ke', name: 'Acme Life Kenya', short: 'Kenya', country: 'Kenya', flag: '🇰🇪', kind: 'subsidiary', currency: 'USD', base: false },
  { id: 'ent-ug', name: 'Acme Brokers Uganda', short: 'Uganda', country: 'Uganda', flag: '🇺🇬', kind: 'branch', currency: 'USD', base: false },
];

export const entityName = (scope: EntityScope): string =>
  scope === 'all' ? 'All entities' : seedEntities.find((e) => e.id === scope)?.name ?? 'All entities';

// Cost centers / departments — the second dimension. Used for budgets, approvals
// routing and reporting once an org grows beyond a flat structure.
export interface CostCenter {
  id: string;
  name: string;
  lead: string;
}

export const seedCostCenters: CostCenter[] = [
  { id: 'cc-uw', name: 'Underwriting', lead: 'Aline Mukamana' },
  { id: 'cc-claims', name: 'Claims', lead: 'Grace Ishimwe' },
  { id: 'cc-ops', name: 'Operations', lead: 'Eric Habimana' },
  { id: 'cc-sales', name: 'Sales & Distribution', lead: 'David Mugisha' },
  { id: 'cc-fin', name: 'Finance & Admin', lead: 'Eric Habimana' },
];
