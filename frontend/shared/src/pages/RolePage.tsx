import type { ComponentType } from 'react';
import { Construction } from 'lucide-react';
import { CANONICAL_BLUEPRINT_IDS } from '../auth/catalog';
import { useSession } from '../auth/hooks';
import { GlassSurface, PartyAvatar } from '../design-system';
import { ActionCenter } from '../modules/action-center';
import { AiAgentsPage } from '../modules/ai-agents';
import { ClaimsWorkspace } from '../modules/claims';
import { CreditPassportPortal } from '../modules/credit-passport-portal';
import { CollectionsPage } from '../modules/collections';
import { DataIntakePage } from '../modules/data-intake';
import { TransactionsPage } from '../modules/transactions';
import { ContractsPage } from '../modules/contracts';
import { ConsentPage } from '../modules/consent';
import { LedgerCashflow } from '../modules/ledger-cashflow';
import { OwnerAuditRisk } from '../modules/owner-audit';
import { ReconciliationOverview } from '../modules/reconciliation-overview';
import { RelationshipsPage } from '../modules/relationships';
import { ReportsPage } from '../modules/reports';
import { ValueRoiPage } from '../modules/value-roi';
import { HomeAuditor } from '../modules/home-auditor';
import { HomeFinanceLead } from '../modules/home-finance-lead';
import { HomeFinanceOperator } from '../modules/home-finance-operator';
import { HomeOrgAdmin } from '../modules/home-org-admin';
import { HomeOrgOwner } from '../modules/home-org-owner';
import { HomeSuperAdmin } from '../modules/home-super-admin';
import { ReconciliationCockpit } from '../modules/reconciliation-cockpit';
import { CUSTOM_BLUEPRINT_IDS } from '../auth/catalog';

// ────────────────────────────────────────────────────────────────────────────
// Role-isolated page resolution.
//
// A page is NOT one component shared by every role — each role gets ITS OWN
// experience for a given route. This registry maps  pageKey → blueprintId →
// component. If the current role has no built experience for a page yet, we
// render a role-scoped "in progress" panel — NEVER another role's screen.
//
// This is the page-level half of the blueprint renderer (doc 16): the sidebar
// nav is already composed per role; this makes the page bodies match.
// ────────────────────────────────────────────────────────────────────────────

const B = CANONICAL_BLUEPRINT_IDS;

const REGISTRY: Record<string, Partial<Record<string, ComponentType>>> = {
  home: {
    [B.ORG_OWNER]: HomeOrgOwner,
    [B.FINANCE_OPERATOR]: HomeFinanceOperator,
    [B.FINANCE_LEAD]: HomeFinanceLead,
    [B.AUDITOR]: HomeAuditor,
    [B.ORG_ADMIN]: HomeOrgAdmin,
    // Super Admin & External Collaborator land on their platform/portal home.
    [B.SUPER_ADMIN]: HomeSuperAdmin,
    [B.EXTERNAL_COLLABORATOR]: CreditPassportPortal,
    // Claims Officer (custom) lands straight in the claims workspace.
    [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: ClaimsWorkspace,
  },
  claims: {
    [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: ClaimsWorkspace,
  },
  reconciliation: {
    [B.FINANCE_OPERATOR]: ReconciliationCockpit,
    [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: ReconciliationCockpit,
    [B.ORG_OWNER]: ReconciliationOverview,
    [B.FINANCE_LEAD]: ReconciliationOverview,
    [B.AUDITOR]: ReconciliationOverview,
  },
  data_intake: {
    [B.FINANCE_OPERATOR]: DataIntakePage,
  },
  transactions: {
    [B.FINANCE_OPERATOR]: TransactionsPage,
    [B.AUDITOR]: () => <TransactionsPage readOnly />,
  },
  ledger: {
    [B.ORG_OWNER]: LedgerCashflow,
    [B.FINANCE_OPERATOR]: LedgerCashflow,
    [B.FINANCE_LEAD]: LedgerCashflow,
    [B.AUDITOR]: LedgerCashflow,
  },
  agents: {
    [B.ORG_OWNER]: AiAgentsPage,
    [B.FINANCE_OPERATOR]: AiAgentsPage,
    [B.FINANCE_LEAD]: AiAgentsPage,
    [B.AUDITOR]: AiAgentsPage,
  },
  audit: {
    [B.ORG_OWNER]: OwnerAuditRisk,
    [B.FINANCE_LEAD]: OwnerAuditRisk,
    [B.AUDITOR]: OwnerAuditRisk,
  },
  roi: {
    [B.ORG_OWNER]: ValueRoiPage,
    [B.FINANCE_LEAD]: ValueRoiPage,
  },
  reports: {
    [B.ORG_OWNER]: ReportsPage,
    [B.FINANCE_LEAD]: ReportsPage,
    [B.AUDITOR]: ReportsPage,
  },
  relationships: {
    [B.ORG_OWNER]: RelationshipsPage,
    [B.FINANCE_LEAD]: RelationshipsPage,
    [B.AUDITOR]: RelationshipsPage,
  },
  collections: {
    [B.ORG_OWNER]: CollectionsPage,
    [B.FINANCE_OPERATOR]: CollectionsPage,
    [B.FINANCE_LEAD]: CollectionsPage,
  },
  contracts: {
    [B.FINANCE_LEAD]: ContractsPage,
    [B.AUDITOR]: () => <ContractsPage readOnly />,
  },
  consent: {
    [B.FINANCE_LEAD]: ConsentPage,
    [B.AUDITOR]: () => <ConsentPage readOnly />,
  },
  credit_passport: {
    [B.FINANCE_LEAD]: CreditPassportPortal,
  },
  approvals: {
    [B.FINANCE_OPERATOR]: () => <ActionCenter variant="finance_operator" />,
    [B.FINANCE_LEAD]: () => <ActionCenter variant="finance_lead" />,
    [B.ORG_OWNER]: () => <ActionCenter variant="org_owner" />,
  },
};

export function RolePage({ pageKey, label }: { pageKey: string; label: string }) {
  const session = useSession();
  const role = session?.roles[0];
  const blueprintId = role?.blueprintId;

  const Component = blueprintId ? REGISTRY[pageKey]?.[blueprintId] : undefined;
  if (Component) return <Component />;

  return <RoleScopedPlaceholder label={label} roleName={role?.name ?? 'your role'} />;
}

// A professional, role-aware "coming soon" — proves the route is isolated to
// the current role and tells the user whose experience is being built.
function RoleScopedPlaceholder({ label, roleName }: { label: string; roleName: string }) {
  return (
    <div className="px-8 pb-8 pt-2">
      <GlassSurface tone="strong" className="grid min-h-[60vh] place-items-center p-10">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-soft to-ai-soft text-brand-ink">
            <Construction className="size-8" />
          </span>
          <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-white/70">
            <PartyAvatar name={roleName} size="sm" />
            <span className="text-[12px] font-bold text-ink">{roleName}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">
            {label}
          </h2>
          <p className="text-[14px] leading-relaxed text-ink-muted">
            This is <span className="font-semibold text-ink">{roleName}</span>&apos;s {label} experience —
            scoped to this role and being crafted next. You&apos;re not seeing another role&apos;s screen.
          </p>
        </div>
      </GlassSurface>
    </div>
  );
}
