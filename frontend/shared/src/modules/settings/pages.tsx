import { useQuery } from '@tanstack/react-query';
import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchIntegrationStatuses, type IntegrationStatusItem } from '../../api/integrations';
import { fetchSettingsOverview, openBillingPortal, requestDataExport, saveDataControls, saveOrgProfile, savePolicyControls, type SettingsOverviewPayload } from '../../api/settingsOverview';
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

const fallbackOverview: SettingsOverviewPayload = {
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
    queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const [profile, setProfile] = useState(fallbackOverview.orgProfile);

  useEffect(() => {
    setProfile(data?.orgProfile ?? fallbackOverview.orgProfile);
  }, [data]);

  const save = async () => {
    if (!session?.token) return;
    try {
      await saveOrgProfile(apiBaseUrl, session.token, profile);
      toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save organization profile.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Organization profile" desc="Legal identity used across reports, contracts and the Credit Passport." action={<SaveBtn onClick={save} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Legal name" value={profile.legalName} onChange={(value) => setProfile((current) => ({ ...current, legalName: value }))} />
          <Field label="Trading name" value={profile.tradingName} onChange={(value) => setProfile((current) => ({ ...current, tradingName: value }))} />
          <Field label="Tax ID (TIN)" value={profile.taxId} onChange={(value) => setProfile((current) => ({ ...current, taxId: value }))} />
          <Field label="Registration no." value={profile.registrationNo} onChange={(value) => setProfile((current) => ({ ...current, registrationNo: value }))} />
          <Field label="Country" value={profile.country} onChange={(value) => setProfile((current) => ({ ...current, country: value }))} />
          <Field label="Base currency" value={profile.baseCurrency} hint="Reporting currency for consolidated views." onChange={(value) => setProfile((current) => ({ ...current, baseCurrency: value }))} />
        </div>
      </SettingsCard>
      <SettingsCard title="Fiscal & locale" desc="Drives period close, tax windows and date formatting.">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Fiscal year start" value={profile.fiscalYearStart} onChange={(value) => setProfile((current) => ({ ...current, fiscalYearStart: value }))} />
          <Field label="Timezone" value={profile.timezone} onChange={(value) => setProfile((current) => ({ ...current, timezone: value }))} />
          <Field label="VAT rate" value={profile.vatRate} onChange={(value) => setProfile((current) => ({ ...current, vatRate: value }))} />
        </div>
      </SettingsCard>
    </div>
  );
}

export function SettingsUsersPage() {
  return <UsersRoles />;
}

export function SettingsPoliciesPage() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const { data } = useQuery({
    queryKey: ['settings-overview', session?.tenant.id],
    queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const [controls, setControls] = useState(fallbackOverview.policyControls);

  useEffect(() => {
    setControls(data?.policyControls ?? fallbackOverview.policyControls);
  }, [data]);

  const updateControls = async (next: typeof controls) => {
    setControls(next);
    if (!session?.token) return;
    try {
      await savePolicyControls(apiBaseUrl, session.token, next);
      toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save policy controls.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DoaMatrix />
      <SettingsCard title="Controls" desc="Segregation of duties and evidence rules that sit above the matrix.">
        <div className="flex flex-col gap-2">
          <Toggle label="Segregation of duties (SoD)" desc="A preparer can never approve their own item." checked={controls.segregationOfDuties} onChange={(value) => void updateControls({ ...controls, segregationOfDuties: value })} />
          <Toggle label="Require evidence to post" desc="Every ledger entry needs a supporting document." checked={controls.requireEvidenceToPost} onChange={(value) => void updateControls({ ...controls, requireEvidenceToPost: value })} />
          <Toggle label="Lock periods after close" desc="Posted periods become read-only." checked={controls.lockPeriodsAfterClose} onChange={(value) => void updateControls({ ...controls, lockPeriodsAfterClose: value })} />
          <Toggle label="Flag round-number transfers" desc="Heuristic fraud signal for the Audit agent." checked={controls.flagRoundNumberTransfers} onChange={(value) => void updateControls({ ...controls, flagRoundNumberTransfers: value })} />
        </div>
      </SettingsCard>
    </div>
  );
}

export function SettingsIntegrationsPage() {
  const session = useSession();
  const { data } = useQuery({
    queryKey: ['integrations', 'settings', session?.tenant.id],
    queryFn: ({ signal }) => fetchIntegrationStatuses(getApiBaseUrl(), session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const items = data ?? INTEGRATIONS.map<IntegrationStatusItem>((item, index) => ({
    id: `seed-${index}`,
    name: item.name,
    category: item.kind,
    status: item.connected ? 'connected' : 'disconnected',
    lastSync: item.connected ? 'seed data' : 'Not connected',
    connected: item.connected,
  }));
  return (
    <SettingsCard title="Integrations" desc="Connect bank feeds, mobile money and accounting tools so data flows into Kora automatically.">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
            <span className="grid size-10 place-items-center rounded-xl bg-white/80 text-[13px] font-bold text-ink-soft ring-1 ring-white/60">{item.name.slice(0, 2)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-ink">{item.name}</p><p className="text-[11px] text-ink-muted">{item.category} · {item.lastSync}</p></div>
            {item.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success"><Check className="size-3" /> Connected</span>
            ) : (
              <button type="button" onClick={() => toast({ tone: 'success', title: `${item.name} connecting`, body: 'Authorize in the popup to finish.' })} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:brightness-110">Connect</button>
            )}
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

export function SettingsBillingPage() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const { data } = useQuery({
    queryKey: ['settings-overview', session?.tenant.id],
    queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const billing = data?.billing ?? fallbackOverview.billing;
  const invoices = data?.invoices ?? fallbackOverview.invoices;

  const managePlan = async () => {
    if (!session?.token) return;
    try {
      await openBillingPortal(apiBaseUrl, session.token);
      toast({ tone: 'info', title: 'Manage plan', body: 'Billing portal is ready for upgrade, downgrade or plan comparison.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Billing portal unavailable', body: error instanceof Error ? error.message : 'Could not open billing portal.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Plan" desc="Your Kora subscription." action={<button type="button" onClick={() => void managePlan()} className="rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 py-2 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110">Manage plan</button>}>
        <div className="flex items-end justify-between rounded-2xl bg-gradient-to-br from-brand-soft/60 to-white/40 p-5 ring-1 ring-brand/15">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-brand-ink"><Sparkles className="size-3.5" /> {billing.plan}</span>
            <p className="mt-2 font-display text-3xl font-bold text-ink">{billing.priceMonthly}<span className="text-base font-semibold text-ink-muted">/mo</span></p>
            <p className="text-[12px] text-ink-muted">Billed annually · renews {billing.renews}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatPill label="Seats used" value={`${billing.seatsUsed}/${billing.seatsIncluded}`} />
            <StatPill label="Tenants" value={String(billing.tenants)} />
            <StatPill label="API calls" value={billing.apiCalls} />
          </div>
        </div>
      </SettingsCard>
      <SettingsCard title="Invoices" desc="Recent billing history.">
        <ul className="flex flex-col gap-1.5">
          {invoices.map((invoice) => (
            <li key={invoice.number} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/55">
              <span className="font-mono text-[12px] font-semibold text-ink">{invoice.number}</span>
              <span className="flex-1 text-[12px] text-ink-muted">{invoice.date}</span>
              <span className="text-[13px] font-bold text-ink tabular">{invoice.amount}</span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">{invoice.status}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}

export function SettingsDataPage() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const { data } = useQuery({
    queryKey: ['settings-overview', session?.tenant.id],
    queryFn: ({ signal }) => fetchSettingsOverview(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const retention = data?.retention ?? fallbackOverview.retention;
  const [controls, setControls] = useState(fallbackOverview.dataControls);

  useEffect(() => {
    setControls(data?.dataControls ?? fallbackOverview.dataControls);
  }, [data]);

  const updateControls = async (next: typeof controls) => {
    setControls(next);
    if (!session?.token) return;
    try {
      await saveDataControls(apiBaseUrl, session.token, next);
      toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save data controls.' });
    }
  };

  const exportData = async () => {
    if (!session?.token) return;
    try {
      await requestDataExport(apiBaseUrl, session.token);
      toast({ tone: 'info', title: 'Export queued', body: 'Your data archive will be emailed when ready.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Export failed', body: error instanceof Error ? error.message : 'Could not queue the data export.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Retention" desc="How long Kora keeps records before archival. Africa-resident storage by default.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Transaction records" value={retention.transactionRecords} hint="Statutory minimum for Rwanda." />
          <Field label="Documents & evidence" value={retention.documentsEvidence} />
          <Field label="Audit log" value={retention.auditLog} hint="Immutable; never auto-deleted." />
          <Field label="Data residency" value={retention.dataResidency} />
        </div>
      </SettingsCard>
      <SettingsCard title="Data controls">
        <div className="flex flex-col gap-2">
          <Toggle label="Encrypt at rest" desc="AES-256 on all stored records." checked={controls.encryptAtRest} onChange={(value) => void updateControls({ ...controls, encryptAtRest: value })} />
          <Toggle label="Export entire dataset" desc="Generate a portable archive on demand." checked={controls.exportEntireDataset} onChange={(value) => void updateControls({ ...controls, exportEntireDataset: value })} />
          <Toggle label="Right-to-erasure workflow" desc="Honor deletion requests with audit trail." checked={controls.rightToErasureWorkflow} onChange={(value) => void updateControls({ ...controls, rightToErasureWorkflow: value })} />
        </div>
        <button type="button" onClick={() => void exportData()} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-5 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Request data export</button>
      </SettingsCard>
    </div>
  );
}

function SaveBtn({ onClick }: { onClick: () => void | Promise<void> }) {
  return <button type="button" onClick={() => { void onClick(); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Check className="size-3.5" /> Save</button>;
}
