import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
// "Business Command Center" — whole-business view; final approver.
// Sidebar nav is the curated 10-item set; Contracts/Credit Passport/Consent
// are still accessible (drill-in from the home modules, direct URL) but kept
// out of the sidebar to keep it short and focused. Settings, Search, Copilot
// and Notifications all live in the top bar — not the sidebar — by design.
export const organizationOwnerBlueprint = {
    id: CANONICAL_BLUEPRINT_IDS.ORG_OWNER,
    nav: [
        { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
        { id: 'approvals', labelKey: 'nav.approvals', path: '/approvals', requires: [{ permission: PERMISSIONS.APPROVAL_CREATE }] },
        { id: 'ledger', labelKey: 'nav.cashflow', path: '/ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
        { id: 'gl', labelKey: 'nav.gl', path: '/general-ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
        { id: 'statements', labelKey: 'nav.statements', path: '/statements', requires: [{ permission: PERMISSIONS.REPORTS_READ }] },
        { id: 'reconciliation', labelKey: 'nav.reconciliation', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
        { id: 'relationships', labelKey: 'nav.relationships', path: '/relationships', requires: [{ permission: PERMISSIONS.RELATIONSHIPS_MANAGE }] },
        { id: 'agents', labelKey: 'nav.agents', path: '/agents', requires: [] },
        { id: 'audit', labelKey: 'nav.audit', path: '/audit', requires: [{ permission: PERMISSIONS.AUDIT_READ }] },
        { id: 'roi', labelKey: 'nav.roi', path: '/roi', requires: [{ permission: PERMISSIONS.ROI_READ }] },
        { id: 'reports', labelKey: 'nav.reports', path: '/reports', requires: [{ permission: PERMISSIONS.REPORTS_READ }] },
        { id: 'collections', labelKey: 'nav.collections', path: '/collections', requires: [{ permission: PERMISSIONS.COLLECTIONS_SEND }] },
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
