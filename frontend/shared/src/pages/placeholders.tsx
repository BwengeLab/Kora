// Route components. Tenant-plane pages resolve through <RolePage/> so each
// role gets ITS OWN experience (or a role-scoped placeholder) — never another
// role's screen. Platform/portal pages are single-role (guarded), so they use
// a simple stub until built.

import { useRouterState } from '@tanstack/react-router';
import { GlassSurface } from '../design-system';
import { ClaimsWorkspace } from '../modules/claims';
import { CreditPassportPortal } from '../modules/credit-passport-portal';
import { HomeSuperAdmin } from '../modules/home-super-admin';
import { RolePage } from './RolePage';

// Generic stub for single-role (platform / portal / settings) routes.
const Stub = () => {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="px-8 pb-8 pt-2">
      <GlassSurface tone="strong" className="grid min-h-[60vh] place-items-center p-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Route stub
          </span>
          <h2 className="font-display text-xl font-semibold text-ink">
            <code className="font-mono text-base">{path}</code>
          </h2>
          <p className="max-w-md text-sm text-ink-muted">
            This route is registered and permission-guarded. The screen lands here once it&apos;s built.
          </p>
        </div>
      </GlassSurface>
    </div>
  );
};

// ─── Tenant plane — role-isolated ──────────────────────────────────────────
export const HomePage = () => <RolePage pageKey="home" label="Home" />;
export const ReconciliationPage = () => <RolePage pageKey="reconciliation" label="Reconciliation" />;
export const ApprovalsPage = () => <RolePage pageKey="approvals" label="Action Center" />;
export const LedgerPage = () => <RolePage pageKey="ledger" label="Ledger & Cashflow" />;
export const CollectionsPage = () => <RolePage pageKey="collections" label="Collections" />;
export const ReportsPage = () => <RolePage pageKey="reports" label="Reports" />;
export const RoiPage = () => <RolePage pageKey="roi" label="Value / ROI" />;
export const RelationshipsPage = () => <RolePage pageKey="relationships" label="Relationships" />;
export const ContractsPage = () => <RolePage pageKey="contracts" label="Contracts" />;
export const CreditPassportPage = () => <RolePage pageKey="credit_passport" label="Credit Passport" />;
export const AgentsPage = () => <RolePage pageKey="agents" label="AI Agents" />;
export const AuditPage = () => <RolePage pageKey="audit" label="Audit & Risk" />;
export const ConsentPage = () => <RolePage pageKey="consent" label="Consent" />;
export const DataIntakePage = () => <RolePage pageKey="data_intake" label="Data Intake" />;
export const TransactionsPage = () => <RolePage pageKey="transactions" label="Transactions" />;
// The Claims route renders the workspace directly — it self-gates to the
// locked "unlock this pack" state when the Insurance feature is disabled.
export const ClaimsPage = () => <ClaimsWorkspace />;

// ─── Settings (Org Admin / Owner) ──────────────────────────────────────────
export const SettingsLayout = Stub;
export const SettingsOrgPage = Stub;
export const SettingsUsersPage = Stub;
export const SettingsPoliciesPage = Stub;
export const SettingsIntegrationsPage = Stub;
export const SettingsBillingPage = Stub;
export const SettingsDataPage = Stub;

// ─── Platform plane (Super Admin) ──────────────────────────────────────────
export const PlatformHomePage = () => <HomeSuperAdmin />;
export const PlatformTenantsPage = Stub;
export const PlatformPlansPage = Stub;
export const PlatformConfigPage = Stub;
export const PlatformHealthPage = Stub;
export const PlatformUsagePage = Stub;
export const PlatformUsersPage = Stub;
export const PlatformSupportPage = Stub;
export const PlatformAuditPage = Stub;

// ─── External Collaborator portal ──────────────────────────────────────────
export const PortalHomePage = () => <CreditPassportPortal />;
export const PortalCreditPassportPage = () => <CreditPassportPortal />;
export const PortalAccessPage = Stub;
