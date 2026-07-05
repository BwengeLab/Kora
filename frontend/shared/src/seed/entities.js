// Organizational dimensions — the backbone that lets Kora scale from a 5-person
// shop to a multi-entity group. Every financial record can be sliced by legal
// entity and cost center. "All entities" = the consolidated group view.
//
// A small business simply runs with one entity and ignores the switcher; a large
// group gets per-entity books + consolidation. Same product, progressive depth.
export const seedEntities = [
    { id: 'ent-rw', name: 'Acme Insurance Rwanda', short: 'Rwanda', country: 'Rwanda', flag: '🇷🇼', kind: 'subsidiary', currency: 'USD', base: true },
    { id: 'ent-ke', name: 'Acme Life Kenya', short: 'Kenya', country: 'Kenya', flag: '🇰🇪', kind: 'subsidiary', currency: 'USD', base: false },
    { id: 'ent-ug', name: 'Acme Brokers Uganda', short: 'Uganda', country: 'Uganda', flag: '🇺🇬', kind: 'branch', currency: 'USD', base: false },
];
export const entityName = (scope) => scope === 'all' ? 'All entities' : seedEntities.find((e) => e.id === scope)?.name ?? 'All entities';
export const seedCostCenters = [
    { id: 'cc-uw', name: 'Underwriting', lead: 'Aline Mukamana' },
    { id: 'cc-claims', name: 'Claims', lead: 'Grace Ishimwe' },
    { id: 'cc-ops', name: 'Operations', lead: 'Eric Habimana' },
    { id: 'cc-sales', name: 'Sales & Distribution', lead: 'David Mugisha' },
    { id: 'cc-fin', name: 'Finance & Admin', lead: 'Eric Habimana' },
];
