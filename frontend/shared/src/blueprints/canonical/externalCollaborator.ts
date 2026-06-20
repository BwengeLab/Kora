import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// "Shared Portal" — consent-scoped, time-boxed, revocable. The artifact viewer
// is intentionally minimal in nav and premium in depth (a lender's Credit
// Passport portal is a polished credit-assessment experience).
export const externalCollaboratorBlueprint: RoleBlueprint = {
  id: CANONICAL_BLUEPRINT_IDS.EXTERNAL_COLLABORATOR,
  nav: [
    { id: 'portal.home', labelKey: 'nav.portal.home', path: '/portal', requires: [] },
    { id: 'portal.credit_passport', labelKey: 'nav.portal.creditPassport', path: '/portal/credit-passport', requires: [{ permission: PERMISSIONS.CREDIT_PASSPORT_READ }] },
    { id: 'portal.access', labelKey: 'nav.portal.access', path: '/portal/access', requires: [] },
  ],
  homeModules: [
    { id: 'portal.artifact_summary', requires: [], span: 4 },
    { id: 'portal.expiry', requires: [], span: 2 },
    { id: 'portal.actions', requires: [], span: 2 },
  ],
};
