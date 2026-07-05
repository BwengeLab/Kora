import { CANONICAL_BLUEPRINT_IDS, PERMISSIONS } from '../../auth/catalog';
// "Admin Console" — manages users, roles, policies, integrations, billing.
// Explicitly NO financial approval authority (per doc 13 §3).
export const orgAdminBlueprint = {
    id: CANONICAL_BLUEPRINT_IDS.ORG_ADMIN,
    nav: [
        { id: 'home', labelKey: 'nav.home', path: '/', requires: [] },
        {
            id: 'settings',
            labelKey: 'nav.settings',
            path: '/settings',
            requires: [{ permission: PERMISSIONS.TENANT_READ }],
            children: [
                { id: 'settings.org', labelKey: 'nav.settings.org', path: '/settings/org', requires: [{ permission: PERMISSIONS.TENANT_READ }] },
                { id: 'settings.users', labelKey: 'nav.settings.users', path: '/settings/users-and-roles', requires: [{ permission: PERMISSIONS.USERS_MANAGE }] },
                { id: 'settings.policies', labelKey: 'nav.settings.policies', path: '/settings/rules-and-policies', requires: [{ permission: PERMISSIONS.POLICY_MANAGE }] },
                { id: 'settings.integrations', labelKey: 'nav.settings.integrations', path: '/settings/integrations', requires: [{ permission: PERMISSIONS.INTEGRATIONS_MANAGE }] },
                { id: 'settings.billing', labelKey: 'nav.settings.billing', path: '/settings/billing', requires: [{ permission: PERMISSIONS.BILLING_MANAGE }] },
                { id: 'settings.data', labelKey: 'nav.settings.data', path: '/settings/data', requires: [{ permission: PERMISSIONS.DATA_RETENTION_MANAGE }] },
            ],
        },
    ],
    homeModules: [
        { id: 'org.health', requires: [{ permission: PERMISSIONS.TENANT_READ }], span: 4 },
        { id: 'users.overview', requires: [{ permission: PERMISSIONS.USERS_MANAGE }], span: 2 },
        { id: 'integrations.status', requires: [{ permission: PERMISSIONS.INTEGRATIONS_MANAGE }], span: 2 },
        { id: 'policy.versions', requires: [{ permission: PERMISSIONS.POLICY_MANAGE }], span: 2 },
        { id: 'billing.usage', requires: [{ permission: PERMISSIONS.BILLING_MANAGE }], span: 2 },
    ],
};
