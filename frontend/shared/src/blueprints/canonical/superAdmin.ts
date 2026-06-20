import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
import type { RoleBlueprint } from '../types';

// Platform-plane only. Super Admin operates Kora-the-company across tenants;
// never sees tenant financial data without an explicit, audited grant.
export const superAdminBlueprint: RoleBlueprint = {
  id: CANONICAL_BLUEPRINT_IDS.SUPER_ADMIN,
  nav: [
    { id: 'platform.home', labelKey: 'nav.platform.home', path: '/platform', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.tenants', labelKey: 'nav.platform.tenants', path: '/platform/tenants', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.plans', labelKey: 'nav.platform.plans', path: '/platform/plans-and-billing', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.config', labelKey: 'nav.platform.config', path: '/platform/config', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.health', labelKey: 'nav.platform.health', path: '/platform/health', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.usage', labelKey: 'nav.platform.usage', path: '/platform/usage-and-cost', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.users', labelKey: 'nav.platform.users', path: '/platform/users', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.support', labelKey: 'nav.platform.support', path: '/platform/support-access', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
    { id: 'platform.audit', labelKey: 'nav.platform.audit', path: '/platform/audit', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }] },
  ],
  homeModules: [
    { id: 'platform.overview', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }], span: 4 },
    { id: 'platform.health', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }], span: 2 },
    { id: 'platform.usage', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }], span: 2 },
    { id: 'platform.incidents', requires: [{ permission: PERMISSIONS.PLATFORM_ADMIN }], span: 2 },
  ],
};
