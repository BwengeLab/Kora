import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchIntegrationStatuses } from '../../api/integrations';
import { fetchSettingsOverview, openBillingPortal, requestDataExport, saveDataControls, saveOrgProfile, savePolicyControls } from '../../api/settingsOverview';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { DoaMatrix } from './DoaMatrix';
import { UsersRoles } from './UsersRoles';
import { Field, SettingsCard, StatPill, Toggle } from './primitives';
const INTEGRATIONS = [
    { name: 'Bank of Kigali', kind: 'Bank feed', connected: true },
    { name: 'I&M Bank', kind: 'Bank feed', connected: true },
    { name: 'MTN MoMo', kind: 'Mobile money', connected: true },
    { name: 'Airtel Money', kind: 'Mobile money', connected: false },
    { name: 'QuickBooks', kind: 'Accounting', connected: false },
    { name: 'Stripe', kind: 'Payments', connected: false },
];
const fallbackOverview = {
    orgProfile: {
        legalName: 'Acme Insurance Ltd.',
        tradingName: 'Acme Insurance',
        taxId: 'RW-104872211',
        registrationNo: 'RDB-2019-44821',
        country: 'Rwanda',
        baseCurrency: 'USD',
        fiscalYearStart: 'January',
        timezone: 'Africa/Kigali (CAT)',
        vatRate: '18%',
    },
    policyControls: {
        segregationOfDuties: true,
        requireEvidenceToPost: true,
        lockPeriodsAfterClose: true,
        flagRoundNumberTransfers: false,
    },
    billing: {
        plan: 'Growth',
        priceMonthly: '$499',
        renews: 'Jan 1, 2026',
        seatsUsed: 9,
        seatsIncluded: 15,
        tenants: 1,
        apiCalls: '84k',
    },
    invoices: [
        { number: 'INV-2025-05', date: 'May 1, 2025', amount: '$499.00', status: 'Paid' },
        { number: 'INV-2025-04', date: 'Apr 1, 2025', amount: '$499.00', status: 'Paid' },
        { number: 'INV-2025-03', date: 'Mar 1, 2025', amount: '$499.00', status: 'Paid' },
    ],
    retention: {
        transactionRecords: '7 years',
        documentsEvidence: '7 years',
        auditLog: 'Indefinite',
        dataResidency: 'Africa (Kigali)',
    },
    dataControls: {
        encryptAtRest: true,
        exportEntireDataset: false,
        rightToErasureWorkflow: true,
    },
};
export function SettingsOrgPage() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const { data } = useQuery({
        queryKey: ['settings-overview', session?.tenant.id],
        queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const [profile, setProfile] = useState(fallbackOverview.orgProfile);
    useEffect(() => {
        setProfile(data?.orgProfile ?? fallbackOverview.orgProfile);
    }, [data]);
    const save = async () => {
        if (!session?.token)
            return;
        try {
            await saveOrgProfile(apiBaseUrl, session.token, profile);
            toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save organization profile.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(SettingsCard, { title: "Organization profile", desc: "Legal identity used across reports, contracts and the Credit Passport.", action: _jsx(SaveBtn, { onClick: save }), children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Field, { label: "Legal name", value: profile.legalName, onChange: (value) => setProfile((current) => ({ ...current, legalName: value })) }), _jsx(Field, { label: "Trading name", value: profile.tradingName, onChange: (value) => setProfile((current) => ({ ...current, tradingName: value })) }), _jsx(Field, { label: "Tax ID (TIN)", value: profile.taxId, onChange: (value) => setProfile((current) => ({ ...current, taxId: value })) }), _jsx(Field, { label: "Registration no.", value: profile.registrationNo, onChange: (value) => setProfile((current) => ({ ...current, registrationNo: value })) }), _jsx(Field, { label: "Country", value: profile.country, onChange: (value) => setProfile((current) => ({ ...current, country: value })) }), _jsx(Field, { label: "Base currency", value: profile.baseCurrency, hint: "Reporting currency for consolidated views.", onChange: (value) => setProfile((current) => ({ ...current, baseCurrency: value })) })] }) }), _jsx(SettingsCard, { title: "Fiscal & locale", desc: "Drives period close, tax windows and date formatting.", children: _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsx(Field, { label: "Fiscal year start", value: profile.fiscalYearStart, onChange: (value) => setProfile((current) => ({ ...current, fiscalYearStart: value })) }), _jsx(Field, { label: "Timezone", value: profile.timezone, onChange: (value) => setProfile((current) => ({ ...current, timezone: value })) }), _jsx(Field, { label: "VAT rate", value: profile.vatRate, onChange: (value) => setProfile((current) => ({ ...current, vatRate: value })) })] }) })] }));
}
export function SettingsUsersPage() {
    return _jsx(UsersRoles, {});
}
export function SettingsPoliciesPage() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const { data } = useQuery({
        queryKey: ['settings-overview', session?.tenant.id],
        queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const [controls, setControls] = useState(fallbackOverview.policyControls);
    useEffect(() => {
        setControls(data?.policyControls ?? fallbackOverview.policyControls);
    }, [data]);
    const updateControls = async (next) => {
        setControls(next);
        if (!session?.token)
            return;
        try {
            await savePolicyControls(apiBaseUrl, session.token, next);
            toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save policy controls.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(DoaMatrix, {}), _jsx(SettingsCard, { title: "Controls", desc: "Segregation of duties and evidence rules that sit above the matrix.", children: _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Toggle, { label: "Segregation of duties (SoD)", desc: "A preparer can never approve their own item.", checked: controls.segregationOfDuties, onChange: (value) => void updateControls({ ...controls, segregationOfDuties: value }) }), _jsx(Toggle, { label: "Require evidence to post", desc: "Every ledger entry needs a supporting document.", checked: controls.requireEvidenceToPost, onChange: (value) => void updateControls({ ...controls, requireEvidenceToPost: value }) }), _jsx(Toggle, { label: "Lock periods after close", desc: "Posted periods become read-only.", checked: controls.lockPeriodsAfterClose, onChange: (value) => void updateControls({ ...controls, lockPeriodsAfterClose: value }) }), _jsx(Toggle, { label: "Flag round-number transfers", desc: "Heuristic fraud signal for the Audit agent.", checked: controls.flagRoundNumberTransfers, onChange: (value) => void updateControls({ ...controls, flagRoundNumberTransfers: value }) })] }) })] }));
}
export function SettingsIntegrationsPage() {
    const session = useSession();
    const { data } = useQuery({
        queryKey: ['integrations', 'settings', session?.tenant.id],
        queryFn: ({ signal }) => fetchIntegrationStatuses(getApiBaseUrl(), session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const items = data ?? INTEGRATIONS.map((item, index) => ({
        id: `seed-${index}`,
        name: item.name,
        category: item.kind,
        status: item.connected ? 'connected' : 'disconnected',
        lastSync: item.connected ? 'seed data' : 'Not connected',
        connected: item.connected,
    }));
    return (_jsx(SettingsCard, { title: "Integrations", desc: "Connect bank feeds, mobile money and accounting tools so data flows into Kora automatically.", children: _jsx("div", { className: "grid grid-cols-2 gap-3", children: items.map((item) => (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60", children: [_jsx("span", { className: "grid size-10 place-items-center rounded-xl bg-white/80 text-[13px] font-bold text-ink-soft ring-1 ring-white/60", children: item.name.slice(0, 2) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: item.name }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: [item.category, " \u00B7 ", item.lastSync] })] }), item.connected ? (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success", children: [_jsx(Check, { className: "size-3" }), " Connected"] })) : (_jsx("button", { type: "button", onClick: () => toast({ tone: 'success', title: `${item.name} connecting`, body: 'Authorize in the popup to finish.' }), className: "rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:brightness-110", children: "Connect" }))] }, item.id))) }) }));
}
export function SettingsBillingPage() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const { data } = useQuery({
        queryKey: ['settings-overview', session?.tenant.id],
        queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const billing = data?.billing ?? fallbackOverview.billing;
    const invoices = data?.invoices ?? fallbackOverview.invoices;
    const managePlan = async () => {
        if (!session?.token)
            return;
        try {
            await openBillingPortal(apiBaseUrl, session.token);
            toast({ tone: 'info', title: 'Manage plan', body: 'Billing portal is ready for upgrade, downgrade or plan comparison.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Billing portal unavailable', body: error instanceof Error ? error.message : 'Could not open billing portal.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(SettingsCard, { title: "Plan", desc: "Your Kora subscription.", action: _jsx("button", { type: "button", onClick: () => void managePlan(), className: "rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 py-2 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: "Manage plan" }), children: _jsxs("div", { className: "flex items-end justify-between rounded-2xl bg-gradient-to-br from-brand-soft/60 to-white/40 p-5 ring-1 ring-brand/15", children: [_jsxs("div", { children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-brand-ink", children: [_jsx(Sparkles, { className: "size-3.5" }), " ", billing.plan] }), _jsxs("p", { className: "mt-2 font-display text-3xl font-bold text-ink", children: [billing.priceMonthly, _jsx("span", { className: "text-base font-semibold text-ink-muted", children: "/mo" })] }), _jsxs("p", { className: "text-[12px] text-ink-muted", children: ["Billed annually \u00B7 renews ", billing.renews] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-center", children: [_jsx(StatPill, { label: "Seats used", value: `${billing.seatsUsed}/${billing.seatsIncluded}` }), _jsx(StatPill, { label: "Tenants", value: String(billing.tenants) }), _jsx(StatPill, { label: "API calls", value: billing.apiCalls })] })] }) }), _jsx(SettingsCard, { title: "Invoices", desc: "Recent billing history.", children: _jsx("ul", { className: "flex flex-col gap-1.5", children: invoices.map((invoice) => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/55", children: [_jsx("span", { className: "font-mono text-[12px] font-semibold text-ink", children: invoice.number }), _jsx("span", { className: "flex-1 text-[12px] text-ink-muted", children: invoice.date }), _jsx("span", { className: "text-[13px] font-bold text-ink tabular", children: invoice.amount }), _jsx("span", { className: "rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success", children: invoice.status })] }, invoice.number))) }) })] }));
}
export function SettingsDataPage() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const { data } = useQuery({
        queryKey: ['settings-overview', session?.tenant.id],
        queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const retention = data?.retention ?? fallbackOverview.retention;
    const [controls, setControls] = useState(fallbackOverview.dataControls);
    useEffect(() => {
        setControls(data?.dataControls ?? fallbackOverview.dataControls);
    }, [data]);
    const updateControls = async (next) => {
        setControls(next);
        if (!session?.token)
            return;
        try {
            await saveDataControls(apiBaseUrl, session.token, next);
            toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save data controls.' });
        }
    };
    const exportData = async () => {
        if (!session?.token)
            return;
        try {
            await requestDataExport(apiBaseUrl, session.token);
            toast({ tone: 'info', title: 'Export queued', body: 'Your data archive will be emailed when ready.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Export failed', body: error instanceof Error ? error.message : 'Could not queue the data export.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(SettingsCard, { title: "Retention", desc: "How long Kora keeps records before archival. Africa-resident storage by default.", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Field, { label: "Transaction records", value: retention.transactionRecords, hint: "Statutory minimum for Rwanda." }), _jsx(Field, { label: "Documents & evidence", value: retention.documentsEvidence }), _jsx(Field, { label: "Audit log", value: retention.auditLog, hint: "Immutable; never auto-deleted." }), _jsx(Field, { label: "Data residency", value: retention.dataResidency })] }) }), _jsxs(SettingsCard, { title: "Data controls", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Toggle, { label: "Encrypt at rest", desc: "AES-256 on all stored records.", checked: controls.encryptAtRest, onChange: (value) => void updateControls({ ...controls, encryptAtRest: value }) }), _jsx(Toggle, { label: "Export entire dataset", desc: "Generate a portable archive on demand.", checked: controls.exportEntireDataset, onChange: (value) => void updateControls({ ...controls, exportEntireDataset: value }) }), _jsx(Toggle, { label: "Right-to-erasure workflow", desc: "Honor deletion requests with audit trail.", checked: controls.rightToErasureWorkflow, onChange: (value) => void updateControls({ ...controls, rightToErasureWorkflow: value }) })] }), _jsx("button", { type: "button", onClick: () => void exportData(), className: "mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-5 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: "Request data export" })] })] }));
}
function SaveBtn({ onClick }) {
    return _jsxs("button", { type: "button", onClick: () => { void onClick(); }, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Check, { className: "size-3.5" }), " Save"] });
}
