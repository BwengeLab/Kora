import { CLAIMS_PERMISSIONS, CUSTOM_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// "Claims Officer" — a CUSTOM role auto-composed from the Insurance vertical
// pack (doc 16 §4). Cloned from Finance Operator, scoped to claims: their day
// is the Claims workspace, backed by reconciliation + data intake + the agents.
export const claimsOfficerBlueprint: RoleBlueprint = {
  id: CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER,
  nav: [
    { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
    { id: 'claims', labelKey: 'nav.claims', path: '/claims', requires: [{ permission: CLAIMS_PERMISSIONS.CLAIMS_REVIEW }] },
    { id: 'reconciliation', labelKey: 'nav.reconciliation', path: '/reconciliation', requires: [{ permission: PERMISSIONS.RECONCILIATION_REVIEW }] },
    { id: 'data_intake', labelKey: 'nav.dataIntake', path: '/data-intake', requires: [{ permission: PERMISSIONS.DOCUMENTS_UPLOAD }] },
    { id: 'transactions', labelKey: 'nav.transactions', path: '/transactions', requires: [{ permission: PERMISSIONS.EVENTS_READ }] },
    { id: 'agents', labelKey: 'nav.agents', path: '/agents', requires: [] },
  ],
  homeModules: [],
};
