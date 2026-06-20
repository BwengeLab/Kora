import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// "Business Command Center" — whole-business view; final approver.
// Nav = everything the tenant plane offers.
export const organizationOwnerBlueprint: RoleBlueprint = {
  id: CANONICAL_BLUEPRINT_IDS.ORG_OWNER,
  nav: [
    { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
    { id: 'reconciliation', labelKey: 'nav.reconciliation', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
    { id: 'approvals', labelKey: 'nav.approvals', path: '/approvals', requires: [{ permission: PERMISSIONS.APPROVAL_CREATE }] },
    { id: 'ledger', labelKey: 'nav.ledger', path: '/ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'collections', labelKey: 'nav.collections', path: '/collections', requires: [{ permission: PERMISSIONS.COLLECTIONS_SEND }] },
    { id: 'reports', labelKey: 'nav.reports', path: '/reports', requires: [{ permission: PERMISSIONS.REPORTS_READ }] },
    { id: 'roi', labelKey: 'nav.roi', path: '/roi', requires: [{ permission: PERMISSIONS.ROI_READ }] },
    { id: 'relationships', labelKey: 'nav.relationships', path: '/relationships', requires: [{ permission: PERMISSIONS.RELATIONSHIPS_MANAGE }] },
    { id: 'contracts', labelKey: 'nav.contracts', path: '/contracts', requires: [{ permission: PERMISSIONS.CONTRACTS_MANAGE }] },
    { id: 'credit_passport', labelKey: 'nav.creditPassport', path: '/credit-passport', requires: [{ permission: PERMISSIONS.CREDIT_PASSPORT_READ }] },
    { id: 'agents', labelKey: 'nav.agents', path: '/agents', requires: [] },
    { id: 'audit', labelKey: 'nav.audit', path: '/audit', requires: [{ permission: PERMISSIONS.AUDIT_READ }] },
    { id: 'consent', labelKey: 'nav.consent', path: '/consent', requires: [{ permission: PERMISSIONS.CONSENT_MANAGE }] },
  ],
  homeModules: [
    { id: 'overview.business', requires: [], span: 4 },
    { id: 'cashflow', requires: [{ permission: PERMISSIONS.EVENTS_READ }], span: 2 },
    { id: 'approvals.top', requires: [{ permission: PERMISSIONS.FINANCIAL_APPROVE }], span: 2 },
    { id: 'reconciliation.snapshot', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }], span: 2 },
    { id: 'relationships.top', requires: [{ permission: PERMISSIONS.RELATIONSHIPS_MANAGE }], span: 2 },
    { id: 'credit_passport.summary', requires: [{ permission: PERMISSIONS.CREDIT_PASSPORT_READ }], span: 2 },
    { id: 'roi.summary', requires: [{ permission: PERMISSIONS.ROI_READ }], span: 2 },
    { id: 'agents.activity', requires: [], span: 2 },
  ],
};
