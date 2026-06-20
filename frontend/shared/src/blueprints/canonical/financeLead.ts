import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// "Finance Control Center" — runs finance, approves within policy, posts ledger.
export const financeLeadBlueprint: RoleBlueprint = {
  id: CANONICAL_BLUEPRINT_IDS.FINANCE_LEAD,
  nav: [
    { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
    { id: 'reconciliation', labelKey: 'nav.reconciliation', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
    { id: 'approvals', labelKey: 'nav.approvals', path: '/approvals', requires: [{ permission: PERMISSIONS.FINANCIAL_APPROVE }] },
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
    { id: 'cashflow.forecast', requires: [{ permission: PERMISSIONS.EVENTS_READ }], span: 3 },
    { id: 'approvals.mine', requires: [{ permission: PERMISSIONS.FINANCIAL_APPROVE }], span: 3 },
    { id: 'reconciliation.status', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }], span: 2 },
    { id: 'margin.trend', requires: [{ permission: PERMISSIONS.EVENTS_READ }], span: 2 },
    { id: 'receivables.payables', requires: [{ permission: PERMISSIONS.EVENTS_READ }], span: 2 },
    { id: 'roi.summary', requires: [{ permission: PERMISSIONS.ROI_READ }], span: 2 },
    { id: 'ai.insights', requires: [], span: 2 },
  ],
};
