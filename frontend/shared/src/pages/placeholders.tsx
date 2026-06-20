// Route placeholders. Every nav target referenced by a canonical blueprint
// resolves to one of these so the router doesn't 404 while we wait for the
// UI/UX descriptions. Each component intentionally renders nothing.
//
// When real pages land they replace these one by one, keyed by the path.

import { useRouterState } from '@tanstack/react-router';
import { useSession } from '../auth/hooks';
import { CANONICAL_BLUEPRINT_IDS } from '../auth/catalog';
import { GlassSurface } from '../design-system';
import { HomeOrgOwner } from '../modules/home-org-owner';

// Visible-but-empty placeholder for routes whose real screen hasn't been
// designed yet. Tells the developer/preview-user where they are and that the
// shell is working. Replaced one-by-one as UI/UX descriptions land.
const Placeholder = () => {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <GlassSurface className="grid place-items-center px-8 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Route stub
        </span>
        <h2 className="font-display text-xl font-semibold text-ink">
          <code className="font-mono text-base">{path}</code>
        </h2>
        <p className="max-w-md text-sm text-ink-muted">
          This route is registered and permission-guarded. The screen lands here once
          its UI/UX description is provided.
        </p>
      </div>
    </GlassSurface>
  );
};

// Home routes by role: Org Owner gets the full Business Command Center now;
// other roles still see the route-stub until their Home is built.
export const HomePage = () => {
  const session = useSession();
  const blueprintId = session?.roles[0]?.blueprintId;
  if (blueprintId === CANONICAL_BLUEPRINT_IDS.ORG_OWNER) {
    return <HomeOrgOwner />;
  }
  return <Placeholder />;
};
export const ReconciliationPage = Placeholder;
export const ApprovalsPage = Placeholder;
export const LedgerPage = Placeholder;
export const CollectionsPage = Placeholder;
export const ReportsPage = Placeholder;
export const RoiPage = Placeholder;
export const RelationshipsPage = Placeholder;
export const ContractsPage = Placeholder;
export const CreditPassportPage = Placeholder;
export const AgentsPage = Placeholder;
export const AuditPage = Placeholder;
export const ConsentPage = Placeholder;
export const DataIntakePage = Placeholder;
export const TransactionsPage = Placeholder;

// Settings (Org Admin)
export const SettingsLayout = Placeholder;
export const SettingsOrgPage = Placeholder;
export const SettingsUsersPage = Placeholder;
export const SettingsPoliciesPage = Placeholder;
export const SettingsIntegrationsPage = Placeholder;
export const SettingsBillingPage = Placeholder;
export const SettingsDataPage = Placeholder;

// Platform plane (Super Admin)
export const PlatformHomePage = Placeholder;
export const PlatformTenantsPage = Placeholder;
export const PlatformPlansPage = Placeholder;
export const PlatformConfigPage = Placeholder;
export const PlatformHealthPage = Placeholder;
export const PlatformUsagePage = Placeholder;
export const PlatformUsersPage = Placeholder;
export const PlatformSupportPage = Placeholder;
export const PlatformAuditPage = Placeholder;

// External Collaborator portal
export const PortalHomePage = Placeholder;
export const PortalCreditPassportPage = Placeholder;
export const PortalAccessPage = Placeholder;
