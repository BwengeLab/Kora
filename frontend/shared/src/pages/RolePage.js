import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Construction } from 'lucide-react';
import { CANONICAL_BLUEPRINT_IDS } from '../auth/catalog';
import { useSession } from '../auth/hooks';
import { GlassSurface, PartyAvatar } from '../design-system';
import { ActionCenter } from '../modules/action-center';
import { AiAgentsPage } from '../modules/ai-agents';
import { ClaimsWorkspace } from '../modules/claims';
import { CreditPassportPortal } from '../modules/credit-passport-portal';
import { CollectionsPage, CollectionsOverview } from '../modules/collections';
import { CollectionsManagement } from '../modules/collections-lead';
import { DataIntakePage } from '../modules/data-intake';
import { TransactionsPage } from '../modules/transactions';
import { ContractsPage } from '../modules/contracts';
import { ConsentPage } from '../modules/consent';
import { LedgerCashflow } from '../modules/ledger-cashflow';
import { GeneralLedger } from '../modules/general-ledger';
import { FinancialStatements } from '../modules/financial-statements';
import { Payables } from '../modules/payables';
import { OwnerAuditRisk } from '../modules/owner-audit';
import { ReconciliationOverview } from '../modules/reconciliation-overview';
import { RelationshipsPage } from '../modules/relationships';
import { ReceivablesPayables } from '../modules/relationships-lead';
import { ReportsPage } from '../modules/reports';
import { ValueRoiPage } from '../modules/value-roi';
import { HomeAuditor } from '../modules/home-auditor';
import { HomeFinanceLead } from '../modules/home-finance-lead';
import { HomeFinanceOperator } from '../modules/home-finance-operator';
import { HomeOrgAdmin } from '../modules/home-org-admin';
import { HomeOrgOwner } from '../modules/home-org-owner';
import { HomeSuperAdmin } from '../modules/home-super-admin';
import { ReconciliationCockpit } from '../modules/reconciliation-cockpit';
import { FinanceLeadReconciliation } from '../modules/reconciliation-lead';
import { ControlsClose } from '../modules/controls-close';
import { AuditInvestigations } from '../modules/audit-investigations';
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
const REGISTRY = {
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
        [B.FINANCE_LEAD]: FinanceLeadReconciliation,
        [B.AUDITOR]: () => _jsx(ReconciliationOverview, { readOnly: true }),
    },
    data_intake: {
        [B.FINANCE_OPERATOR]: DataIntakePage,
        [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: DataIntakePage,
    },
    transactions: {
        [B.FINANCE_OPERATOR]: TransactionsPage,
        [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: TransactionsPage,
        [B.AUDITOR]: () => _jsx(TransactionsPage, { readOnly: true }),
    },
    ledger: {
        // Owner & Lead oversee (view, understand, ask/flag); the Operator reconciles;
        // the Auditor reads only. Everyone sees every movement and its "why".
        [B.ORG_OWNER]: () => _jsx(LedgerCashflow, { mode: "oversight" }),
        [B.FINANCE_OPERATOR]: () => _jsx(LedgerCashflow, { mode: "operate" }),
        [B.FINANCE_LEAD]: () => _jsx(LedgerCashflow, { mode: "post" }),
        [B.AUDITOR]: () => _jsx(LedgerCashflow, { mode: "read" }),
    },
    gl: {
        // The double-entry books. Finance Lead & Operator post; Owner & Auditor read.
        [B.FINANCE_LEAD]: () => _jsx(GeneralLedger, { canEdit: true }),
        [B.FINANCE_OPERATOR]: () => _jsx(GeneralLedger, { canEdit: true }),
        [B.ORG_OWNER]: GeneralLedger,
        [B.AUDITOR]: GeneralLedger,
    },
    statements: {
        // P&L / Balance Sheet / Cash Flow — derived from the GL, same for whoever reads.
        [B.ORG_OWNER]: FinancialStatements,
        [B.FINANCE_LEAD]: FinancialStatements,
        [B.AUDITOR]: FinancialStatements,
    },
    payables: {
        // Procure-to-Pay. Operator prepares bills; Finance Lead approves & pays (posts to GL).
        [B.FINANCE_LEAD]: () => _jsx(Payables, { canApprove: true }),
        [B.FINANCE_OPERATOR]: Payables,
        [B.ORG_OWNER]: Payables,
        [B.AUDITOR]: Payables,
    },
    agents: {
        [B.ORG_OWNER]: AiAgentsPage,
        [B.FINANCE_OPERATOR]: AiAgentsPage,
        [CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER]: AiAgentsPage,
        [B.FINANCE_LEAD]: AiAgentsPage,
        [B.AUDITOR]: AiAgentsPage,
    },
    audit: {
        [B.ORG_OWNER]: OwnerAuditRisk,
        [B.FINANCE_LEAD]: ControlsClose,
        [B.AUDITOR]: AuditInvestigations,
    },
    roi: {
        // ROI is an owner/exec metric — not the Finance Lead's page.
        [B.ORG_OWNER]: ValueRoiPage,
    },
    reports: {
        [B.ORG_OWNER]: ReportsPage,
        [B.FINANCE_LEAD]: () => _jsx(ReportsPage, { variant: "produce" }),
        [B.AUDITOR]: ReportsPage,
    },
    relationships: {
        [B.ORG_OWNER]: RelationshipsPage,
        [B.FINANCE_LEAD]: ReceivablesPayables,
        [B.AUDITOR]: () => _jsx(RelationshipsPage, { readOnly: true }),
    },
    collections: {
        // Owner gets the OVERSIGHT view (watch health, delegate, flag); the finance
        // roles get the working desk where reminders are actually sent.
        [B.ORG_OWNER]: CollectionsOverview,
        [B.FINANCE_OPERATOR]: CollectionsPage,
        [B.FINANCE_LEAD]: CollectionsManagement,
    },
    contracts: {
        [B.ORG_OWNER]: () => _jsx(ContractsPage, { variant: "read" }),
        [B.FINANCE_LEAD]: ContractsPage,
        [B.AUDITOR]: () => _jsx(ContractsPage, { variant: "read" }),
    },
    consent: {
        [B.ORG_OWNER]: () => _jsx(ConsentPage, { readOnly: true }),
        [B.FINANCE_LEAD]: ConsentPage,
        [B.AUDITOR]: () => _jsx(ConsentPage, { readOnly: true }),
    },
    credit_passport: {
        [B.ORG_OWNER]: CreditPassportPortal,
        [B.FINANCE_LEAD]: CreditPassportPortal,
    },
    approvals: {
        [B.FINANCE_OPERATOR]: () => _jsx(ActionCenter, { variant: "finance_operator" }),
        [B.FINANCE_LEAD]: () => _jsx(ActionCenter, { variant: "finance_lead" }),
        [B.ORG_OWNER]: () => _jsx(ActionCenter, { variant: "org_owner" }),
    },
};
export function hasRolePage(pageKey, blueprintId) {
    return Boolean(REGISTRY[pageKey]?.[blueprintId]);
}
export function RolePage({ pageKey, label }) {
    const session = useSession();
    const role = session?.roles[0];
    const blueprintId = role?.blueprintId;
    const Component = blueprintId ? REGISTRY[pageKey]?.[blueprintId] : undefined;
    if (Component)
        return _jsx(Component, {});
    throw new Error(`No ${label} page is registered for blueprint ${blueprintId ?? 'unknown'}`);
}
// A professional, role-aware "coming soon" — proves the route is isolated to
// the current role and tells the user whose experience is being built.
function RoleScopedPlaceholder({ label, roleName }) {
    return (_jsx("div", { className: "px-8 pb-8 pt-2", children: _jsx(GlassSurface, { tone: "strong", className: "grid min-h-[60vh] place-items-center p-10", children: _jsxs("div", { className: "flex max-w-md flex-col items-center gap-4 text-center", children: [_jsx("span", { className: "grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-soft to-ai-soft text-brand-ink", children: _jsx(Construction, { className: "size-8" }) }), _jsxs("div", { className: "flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-white/70", children: [_jsx(PartyAvatar, { name: roleName, size: "sm" }), _jsx("span", { className: "text-[12px] font-bold text-ink", children: roleName })] }), _jsx("h2", { className: "font-display text-2xl font-bold text-ink", children: label }), _jsxs("p", { className: "text-[14px] leading-relaxed text-ink-muted", children: ["This is ", _jsx("span", { className: "font-semibold text-ink", children: roleName }), "'s ", label, " experience \u2014 scoped to this role and being crafted next. You're not seeing another role's screen."] })] }) }) }));
}
