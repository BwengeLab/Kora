import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// "Reconciliation Cockpit / My Work" — preparer; resolves exceptions, drafts collections.
// Prepares/proposes; never solo-approves money.
export const financeOperatorBlueprint: RoleBlueprint = {
  id: CANONICAL_BLUEPRINT_IDS.FINANCE_OPERATOR,
  nav: [
    { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
    { id: 'data_intake', labelKey: 'nav.dataIntake', path: '/data-intake', requires: [{ permission: PERMISSIONS.DOCUMENTS_UPLOAD }] },
    { id: 'transactions', labelKey: 'nav.transactions', path: '/transactions', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'reconciliation', labelKey: 'nav.reconciliation', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
    { id: 'approvals', labelKey: 'nav.approvals.mine', path: '/approvals', requires: [{ permission: PERMISSIONS.APPROVAL_CREATE }] },
    { id: 'collections', labelKey: 'nav.collections', path: '/collections', requires: [{ permission: PERMISSIONS.COLLECTIONS_SEND }] },
    { id: 'ledger', labelKey: 'nav.ledger.read', path: '/ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'gl', labelKey: 'nav.gl', path: '/general-ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'payables', labelKey: 'nav.payables', path: '/payables', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'agents', labelKey: 'nav.agents', path: '/agents', requires: [] },
  ],
  homeModules: [
    { id: 'exceptions.mine', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }], span: 3 },
    { id: 'tasks.mine', requires: [{ permission: PERMISSIONS.APPROVAL_CREATE }], span: 3 },
    { id: 'unmatched.count', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }], span: 2 },
    { id: 'data_quality.flags', requires: [{ permission: PERMISSIONS.DATA_QUALITY_REVIEW }], span: 2 },
    { id: 'agent.suggestions', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }], span: 2 },
    { id: 'throughput.mine', requires: [], span: 2 },
  ],
};
