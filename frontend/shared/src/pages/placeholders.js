import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Route components. Tenant-plane pages resolve through <RolePage/> so each
// role gets ITS OWN experience (or a role-scoped placeholder) — never another
// role's screen. Platform/portal pages are single-role (guarded), so they use
// a simple stub until built.
import { Outlet, useRouterState } from '@tanstack/react-router';
import { GlassSurface } from '../design-system';
import { AccountSettings } from '../modules/account';
import { PortalAccessPage as PortalAccess } from '../modules/portal-access';
import { ClaimsWorkspace } from '../modules/claims';
import { CreditPassportPortal } from '../modules/credit-passport-portal';
import { HomeSuperAdmin } from '../modules/home-super-admin';
import { Mailbox } from '../modules/mailbox';
import * as Platform from '../modules/platform';
import * as Settings from '../modules/settings';
import { RolePage } from './RolePage';
// Generic stub for single-role (platform / portal / settings) routes.
const Stub = () => {
    const path = useRouterState({ select: (s) => s.location.pathname });
    return (_jsx("div", { className: "px-8 pb-8 pt-2", children: _jsx(GlassSurface, { tone: "strong", className: "grid min-h-[60vh] place-items-center p-10", children: _jsxs("div", { className: "flex flex-col items-center gap-2 text-center", children: [_jsx("span", { className: "rounded-full bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted", children: "Route stub" }), _jsx("h2", { className: "font-display text-xl font-semibold text-ink", children: _jsx("code", { className: "font-mono text-base", children: path }) }), _jsx("p", { className: "max-w-md text-sm text-ink-muted", children: "This route is registered and permission-guarded. The screen lands here once it's built." })] }) }) }));
};
// ─── Tenant plane — role-isolated ──────────────────────────────────────────
export const HomePage = () => _jsx(RolePage, { pageKey: "home", label: "Home" });
export const ReconciliationPage = () => _jsx(RolePage, { pageKey: "reconciliation", label: "Reconciliation" });
export const ApprovalsPage = () => _jsx(RolePage, { pageKey: "approvals", label: "Action Center" });
export const LedgerPage = () => _jsx(RolePage, { pageKey: "ledger", label: "Ledger & Cashflow" });
export const GeneralLedgerPage = () => _jsx(RolePage, { pageKey: "gl", label: "General Ledger" });
export const StatementsPage = () => _jsx(RolePage, { pageKey: "statements", label: "Financial Statements" });
export const PayablesPage = () => _jsx(RolePage, { pageKey: "payables", label: "Accounts Payable" });
export const CollectionsPage = () => _jsx(RolePage, { pageKey: "collections", label: "Collections" });
export const ReportsPage = () => _jsx(RolePage, { pageKey: "reports", label: "Reports" });
export const RoiPage = () => _jsx(RolePage, { pageKey: "roi", label: "Value / ROI" });
export const RelationshipsPage = () => _jsx(RolePage, { pageKey: "relationships", label: "Relationships" });
export const ContractsPage = () => _jsx(RolePage, { pageKey: "contracts", label: "Contracts" });
export const CreditPassportPage = () => _jsx(RolePage, { pageKey: "credit_passport", label: "Credit Passport" });
export const AgentsPage = () => _jsx(RolePage, { pageKey: "agents", label: "AI Agents" });
export const AuditPage = () => _jsx(RolePage, { pageKey: "audit", label: "Audit & Risk" });
export const ConsentPage = () => _jsx(RolePage, { pageKey: "consent", label: "Consent" });
export const DataIntakePage = () => _jsx(RolePage, { pageKey: "data_intake", label: "Data Intake" });
export const TransactionsPage = () => _jsx(RolePage, { pageKey: "transactions", label: "Transactions" });
// The Claims route renders the workspace directly — it self-gates to the
// locked "unlock this pack" state when the Insurance feature is disabled.
export const ClaimsPage = () => _jsx(ClaimsWorkspace, {});
// Mail is a per-user feature available to every role (not behind RolePage).
export const MailPage = () => _jsx(Mailbox, {});
// Personal account & preferences — the gear icon. Per-user, every role.
export const AccountPage = () => _jsx(AccountSettings, {});
// ─── Settings (Org Admin / Owner) ──────────────────────────────────────────
export const SettingsLayout = Settings.SettingsLayout;
export const SettingsOrgPage = Settings.SettingsOrgPage;
export const SettingsUsersPage = Settings.SettingsUsersPage;
export const SettingsPoliciesPage = Settings.SettingsPoliciesPage;
export const SettingsIntegrationsPage = Settings.SettingsIntegrationsPage;
export const SettingsBillingPage = Settings.SettingsBillingPage;
export const SettingsDataPage = Settings.SettingsDataPage;
// ─── Platform plane (Super Admin) ──────────────────────────────────────────
export const PlatformLayout = Platform.PlatformLayout;
export const PlatformHomePage = () => _jsx(HomeSuperAdmin, {});
export const PlatformTenantsPage = Platform.PlatformTenantsPage;
export const PlatformPlansPage = Platform.PlatformPlansPage;
export const PlatformConfigPage = Platform.PlatformConfigPage;
export const PlatformHealthPage = Platform.PlatformHealthPage;
export const PlatformUsagePage = Platform.PlatformUsagePage;
export const PlatformUsersPage = Platform.PlatformUsersPage;
export const PlatformSupportPage = Platform.PlatformSupportPage;
export const PlatformAuditPage = Platform.PlatformAuditPage;
// ─── External Collaborator portal ──────────────────────────────────────────
export const PortalLayout = () => _jsx(Outlet, {});
export const PortalHomePage = () => _jsx(CreditPassportPortal, {});
export const PortalCreditPassportPage = () => _jsx(CreditPassportPortal, {});
export const PortalAccessPage = () => _jsx(PortalAccess, {});
