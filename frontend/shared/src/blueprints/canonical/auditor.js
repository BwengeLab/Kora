import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
// "Audit & Risk Command Center" — read-only; investigates evidence + control gaps.
// Changes nothing; SoD enforced by the absence of write permissions.
export const auditorBlueprint = {
    id: CANONICAL_BLUEPRINT_IDS.AUDITOR,
    nav: [
        { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
        { id: 'audit', labelKey: 'nav.audit', path: '/audit', requires: [{ permission: PERMISSIONS.AUDIT_READ }] },
        { id: 'transactions', labelKey: 'nav.transactions.read', path: '/transactions', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
        { id: 'reconciliation', labelKey: 'nav.reconciliation.read', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
        { id: 'ledger', labelKey: 'nav.ledger.read', path: '/ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
        { id: 'gl', labelKey: 'nav.gl', path: '/general-ledger', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
        { id: 'statements', labelKey: 'nav.statements', path: '/statements', requires: [{ permission: PERMISSIONS.REPORTS_READ }] },
        { id: 'reports', labelKey: 'nav.reports', path: '/reports', requires: [{ permission: PERMISSIONS.REPORTS_READ }] },
        { id: 'relationships', labelKey: 'nav.relationships.read', path: '/relationships', requires: [{ permission: PERMISSIONS.RELATIONSHIPS_MANAGE }] },
        { id: 'contracts', labelKey: 'nav.contracts.read', path: '/contracts', requires: [{ permission: PERMISSIONS.CONTRACTS_MANAGE }] },
        { id: 'consent', labelKey: 'nav.consent.log', path: '/consent', requires: [{ permission: PERMISSIONS.CONSENT_MANAGE }] },
        { id: 'agents', labelKey: 'nav.agents', path: '/agents', requires: [] },
    ],
    homeModules: [
        { id: 'audit.feed', requires: [{ permission: PERMISSIONS.AUDIT_READ }], span: 4 },
        { id: 'risk.flags', requires: [{ permission: PERMISSIONS.AUDIT_READ }], span: 2 },
        { id: 'sod.violations', requires: [{ permission: PERMISSIONS.AUDIT_READ }], span: 2 },
        { id: 'missing_docs', requires: [{ permission: PERMISSIONS.AUDIT_READ }], span: 2 },
        { id: 'control_health', requires: [{ permission: PERMISSIONS.AUDIT_READ }], span: 2 },
    ],
};
