import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRoute,
} from '@tanstack/react-router';
import { AppShell } from '../app/shell';
import { PERMISSIONS } from '../auth/catalog';
import * as P from '../pages/placeholders';
import { requirePermission } from './guards';

// The shell route renders provider tree + <AppShell><Outlet /></AppShell> so
// every routed page shows up inside the persistent sidebar + top-bar chrome.
const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const route = <C,>(path: string, component: C, beforeLoad?: () => void) =>
  beforeLoad
    ? createRoute({ getParentRoute: () => rootRoute, path, component: component as never, beforeLoad })
    : createRoute({ getParentRoute: () => rootRoute, path, component: component as never });

// --- Tenant plane ---
const indexRoute = route('/', P.HomePage);
const reconciliationRoute = route('/reconciliation', P.ReconciliationPage, requirePermission(PERMISSIONS.RECONCILIATION_REVIEW));
const approvalsRoute = route('/approvals', P.ApprovalsPage, requirePermission(PERMISSIONS.APPROVAL_CREATE));
const ledgerRoute = route('/ledger', P.LedgerPage, requirePermission(PERMISSIONS.EVENTS_READ));
const collectionsRoute = route('/collections', P.CollectionsPage, requirePermission(PERMISSIONS.COLLECTIONS_SEND));
const reportsRoute = route('/reports', P.ReportsPage, requirePermission(PERMISSIONS.REPORTS_READ));
const roiRoute = route('/roi', P.RoiPage, requirePermission(PERMISSIONS.ROI_READ));
const relationshipsRoute = route('/relationships', P.RelationshipsPage, requirePermission(PERMISSIONS.RELATIONSHIPS_MANAGE));
const contractsRoute = route('/contracts', P.ContractsPage, requirePermission(PERMISSIONS.CONTRACTS_MANAGE));
const creditPassportRoute = route('/credit-passport', P.CreditPassportPage, requirePermission(PERMISSIONS.CREDIT_PASSPORT_READ));
const agentsRoute = route('/agents', P.AgentsPage);
const auditRoute = route('/audit', P.AuditPage, requirePermission(PERMISSIONS.AUDIT_READ));
const consentRoute = route('/consent', P.ConsentPage, requirePermission(PERMISSIONS.CONSENT_MANAGE));
const dataIntakeRoute = route('/data-intake', P.DataIntakePage, requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD));
const transactionsRoute = route('/transactions', P.TransactionsPage, requirePermission(PERMISSIONS.EVENTS_READ));
const claimsRoute = route('/claims', P.ClaimsPage);
const mailRoute = route('/mail', P.MailPage);
const accountRoute = route('/account', P.AccountPage);

// --- Settings (Org Admin) ---
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: P.SettingsLayout,
  beforeLoad: requirePermission(PERMISSIONS.TENANT_READ),
});
const settingsIndexRoute = createRoute({ getParentRoute: () => settingsRoute, path: '/', component: P.SettingsOrgPage });
const settingsOrgRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'org', component: P.SettingsOrgPage });
const settingsUsersRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'users-and-roles', component: P.SettingsUsersPage, beforeLoad: requirePermission(PERMISSIONS.USERS_MANAGE) });
const settingsPoliciesRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'rules-and-policies', component: P.SettingsPoliciesPage, beforeLoad: requirePermission(PERMISSIONS.POLICY_MANAGE) });
const settingsIntegrationsRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'integrations', component: P.SettingsIntegrationsPage, beforeLoad: requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE) });
const settingsBillingRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'billing', component: P.SettingsBillingPage, beforeLoad: requirePermission(PERMISSIONS.BILLING_MANAGE) });
const settingsDataRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'data', component: P.SettingsDataPage, beforeLoad: requirePermission(PERMISSIONS.DATA_RETENTION_MANAGE) });

// --- Platform plane (Super Admin) ---
const platformGate = requirePermission(PERMISSIONS.PLATFORM_ADMIN);
const platformRoute = createRoute({ getParentRoute: () => rootRoute, path: '/platform', component: P.PlatformLayout, beforeLoad: platformGate });
const platformIndexRoute = createRoute({ getParentRoute: () => platformRoute, path: '/', component: P.PlatformHomePage });
const platformTenantsRoute = createRoute({ getParentRoute: () => platformRoute, path: 'tenants', component: P.PlatformTenantsPage });
const platformPlansRoute = createRoute({ getParentRoute: () => platformRoute, path: 'plans-and-billing', component: P.PlatformPlansPage });
const platformConfigRoute = createRoute({ getParentRoute: () => platformRoute, path: 'config', component: P.PlatformConfigPage });
const platformHealthRoute = createRoute({ getParentRoute: () => platformRoute, path: 'health', component: P.PlatformHealthPage });
const platformUsageRoute = createRoute({ getParentRoute: () => platformRoute, path: 'usage-and-cost', component: P.PlatformUsagePage });
const platformUsersRoute = createRoute({ getParentRoute: () => platformRoute, path: 'users', component: P.PlatformUsersPage });
const platformSupportRoute = createRoute({ getParentRoute: () => platformRoute, path: 'support-access', component: P.PlatformSupportPage });
const platformAuditRoute = createRoute({ getParentRoute: () => platformRoute, path: 'audit', component: P.PlatformAuditPage });

// --- External Collaborator portal ---
const portalRoute = createRoute({ getParentRoute: () => rootRoute, path: '/portal', component: P.PortalLayout });
const portalIndexRoute = createRoute({ getParentRoute: () => portalRoute, path: '/', component: P.PortalHomePage });
const portalCreditPassportRoute = createRoute({ getParentRoute: () => portalRoute, path: 'credit-passport', component: P.PortalCreditPassportPage, beforeLoad: requirePermission(PERMISSIONS.CREDIT_PASSPORT_READ) });
const portalAccessRoute = createRoute({ getParentRoute: () => portalRoute, path: 'access', component: P.PortalAccessPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  reconciliationRoute,
  approvalsRoute,
  ledgerRoute,
  collectionsRoute,
  reportsRoute,
  roiRoute,
  relationshipsRoute,
  contractsRoute,
  creditPassportRoute,
  agentsRoute,
  auditRoute,
  consentRoute,
  dataIntakeRoute,
  transactionsRoute,
  claimsRoute,
  mailRoute,
  accountRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    settingsOrgRoute,
    settingsUsersRoute,
    settingsPoliciesRoute,
    settingsIntegrationsRoute,
    settingsBillingRoute,
    settingsDataRoute,
  ]),
  platformRoute.addChildren([
    platformIndexRoute,
    platformTenantsRoute,
    platformPlansRoute,
    platformConfigRoute,
    platformHealthRoute,
    platformUsageRoute,
    platformUsersRoute,
    platformSupportRoute,
    platformAuditRoute,
  ]),
  portalRoute.addChildren([portalIndexRoute, portalCreditPassportRoute, portalAccessRoute]),
] as AnyRoute[]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
