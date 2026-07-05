// The people in a tenant — many users per role, each SCOPED to the entities and
// department they may touch. This is how a scaling org (multiple branches, an
// AP team, an AR team) keeps each clerk to their own slice while the Lead/Owner
// see across. Data scope = role × entity × department.
export const seedOrgUsers = [
    { id: 'u-1', name: 'Aline Mukamana', email: 'owner@acme.local', role: 'Organization Owner', department: 'All', scope: 'all', status: 'active', lastActive: 'now' },
    { id: 'u-2', name: 'Eric Habimana', email: 'cfo@acme.local', role: 'Finance Lead', department: 'Finance & Admin', scope: 'all', status: 'active', lastActive: '5m ago' },
    { id: 'u-3', name: 'Diane Uwase', email: 'accountant@acme.local', role: 'Finance Operator', department: 'Finance & Admin', scope: 'ent-rw', status: 'active', lastActive: '12m ago' },
    { id: 'u-4', name: 'Patrick Niyonsenga', email: 'auditor@acme.local', role: 'Auditor', department: 'All', scope: 'all', status: 'active', lastActive: '1h ago' },
    { id: 'u-5', name: 'Sarah Ingabire', email: 'admin@acme.local', role: 'Org Admin', department: 'Operations', scope: 'all', status: 'active', lastActive: '2h ago' },
    { id: 'u-6', name: 'Grace Ishimwe', email: 'claims@acme.local', role: 'Claims Officer', department: 'Claims', scope: 'ent-rw', status: 'active', lastActive: '30m ago' },
    { id: 'u-7', name: 'Joseph Otieno', email: 'ar.ke@acme.local', role: 'Finance Operator', department: 'Finance & Admin', scope: 'ent-ke', status: 'active', lastActive: '3h ago' },
    { id: 'u-8', name: 'Brenda Achieng', email: 'lead.ke@acme.local', role: 'Finance Lead', department: 'Finance & Admin', scope: 'ent-ke', status: 'active', lastActive: '1d ago' },
    { id: 'u-9', name: 'Moses Mugisha', email: 'ap.ug@acme.local', role: 'Finance Operator', department: 'Operations', scope: 'ent-ug', status: 'active', lastActive: '4h ago' },
    { id: 'u-10', name: 'Claire Mutoni', email: 'claims2@acme.local', role: 'Claims Officer', department: 'Claims', scope: 'ent-rw', status: 'invited', lastActive: '—' },
    { id: 'u-11', name: 'David Mugabo', email: 'sales@acme.local', role: 'Finance Operator', department: 'Sales & Distribution', scope: 'ent-rw', status: 'suspended', lastActive: '21d ago' },
];
export const ASSIGNABLE_ROLES = [
    'Organization Owner',
    'Finance Lead',
    'Finance Operator',
    'Auditor',
    'Org Admin',
    'Claims Officer',
];
