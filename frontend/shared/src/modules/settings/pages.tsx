import { Check, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { toast } from '../../state/toastStore';
import { DoaMatrix } from './DoaMatrix';
import { UsersRoles } from './UsersRoles';
import { Field, SettingsCard, StatPill, Toggle } from './primitives';

const saved = () => toast({ tone: 'success', title: 'Saved', body: 'Your changes were applied and logged.' });

// ── Organization ────────────────────────────────────────────────────────────
export function SettingsOrgPage() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Organization profile" desc="Legal identity used across reports, contracts and the Credit Passport." action={<SaveBtn />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Legal name" value="Acme Insurance Ltd." />
          <Field label="Trading name" value="Acme Insurance" />
          <Field label="Tax ID (TIN)" value="RW-104872211" />
          <Field label="Registration no." value="RDB-2019-44821" />
          <Field label="Country" value="Rwanda" />
          <Field label="Base currency" value="USD" hint="Reporting currency for consolidated views." />
        </div>
      </SettingsCard>
      <SettingsCard title="Fiscal & locale" desc="Drives period close, tax windows and date formatting.">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Fiscal year start" value="January" />
          <Field label="Timezone" value="Africa/Kigali (CAT)" />
          <Field label="VAT rate" value="18%" />
        </div>
      </SettingsCard>
    </div>
  );
}

// ── Users & Roles — many users per role, scoped by entity/department ─────────
export function SettingsUsersPage() {
  return <UsersRoles />;
}

// ── Rules & Policies ────────────────────────────────────────────────────────
export function SettingsPoliciesPage() {
  return (
    <div className="flex flex-col gap-5">
      <DoaMatrix />
      <SettingsCard title="Controls" desc="Segregation of duties and evidence rules that sit above the matrix.">
        <div className="flex flex-col gap-2">
          <Toggle label="Segregation of duties (SoD)" desc="A preparer can never approve their own item." defaultOn onChange={saved} />
          <Toggle label="Require evidence to post" desc="Every ledger entry needs a supporting document." defaultOn onChange={saved} />
          <Toggle label="Lock periods after close" desc="Posted periods become read-only." defaultOn onChange={saved} />
          <Toggle label="Flag round-number transfers" desc="Heuristic fraud signal for the Audit agent." onChange={saved} />
        </div>
      </SettingsCard>
    </div>
  );
}

// ── Integrations ────────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name: 'Bank of Kigali', kind: 'Bank feed', connected: true },
  { name: 'I&M Bank', kind: 'Bank feed', connected: true },
  { name: 'MTN MoMo', kind: 'Mobile money', connected: true },
  { name: 'Airtel Money', kind: 'Mobile money', connected: false },
  { name: 'QuickBooks', kind: 'Accounting', connected: false },
  { name: 'Stripe', kind: 'Payments', connected: false },
];
export function SettingsIntegrationsPage() {
  return (
    <SettingsCard title="Integrations" desc="Connect bank feeds, mobile money and accounting tools so data flows into Kora automatically.">
      <div className="grid grid-cols-2 gap-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
            <span className="grid size-10 place-items-center rounded-xl bg-white/80 text-[13px] font-bold text-ink-soft ring-1 ring-white/60">{i.name.slice(0, 2)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-ink">{i.name}</p><p className="text-[11px] text-ink-muted">{i.kind}</p></div>
            {i.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success"><Check className="size-3" /> Connected</span>
            ) : (
              <button type="button" onClick={() => toast({ tone: 'success', title: `${i.name} connecting`, body: 'Authorize in the popup to finish.' })} className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:brightness-110">Connect</button>
            )}
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

// ── Billing ─────────────────────────────────────────────────────────────────
export function SettingsBillingPage() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Plan" desc="Your Kora subscription." action={<button type="button" onClick={() => toast({ tone: 'info', title: 'Manage plan', body: 'Upgrade, downgrade or compare plans.' })} className="rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 py-2 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110">Manage plan</button>}>
        <div className="flex items-end justify-between rounded-2xl bg-gradient-to-br from-brand-soft/60 to-white/40 p-5 ring-1 ring-brand/15">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-brand-ink"><Sparkles className="size-3.5" /> Growth</span>
            <p className="mt-2 font-display text-3xl font-bold text-ink">$499<span className="text-base font-semibold text-ink-muted">/mo</span></p>
            <p className="text-[12px] text-ink-muted">Billed annually · renews Jan 1, 2026</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatPill label="Seats used" value="9/15" />
            <StatPill label="Tenants" value="1" />
            <StatPill label="API calls" value="84k" />
          </div>
        </div>
      </SettingsCard>
      <SettingsCard title="Invoices" desc="Recent billing history.">
        <ul className="flex flex-col gap-1.5">
          {[['INV-2025-05', 'May 1, 2025', '$499.00', 'Paid'], ['INV-2025-04', 'Apr 1, 2025', '$499.00', 'Paid'], ['INV-2025-03', 'Mar 1, 2025', '$499.00', 'Paid']].map(([no, date, amt, st]) => (
            <li key={no} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/55">
              <span className="font-mono text-[12px] font-semibold text-ink">{no}</span>
              <span className="flex-1 text-[12px] text-ink-muted">{date}</span>
              <span className="text-[13px] font-bold text-ink tabular">{amt}</span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">{st}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}

// ── Data & Retention ────────────────────────────────────────────────────────
export function SettingsDataPage() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Retention" desc="How long Kora keeps records before archival. Africa-resident storage by default.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Transaction records" value="7 years" hint="Statutory minimum for Rwanda." />
          <Field label="Documents & evidence" value="7 years" />
          <Field label="Audit log" value="Indefinite" hint="Immutable; never auto-deleted." />
          <Field label="Data residency" value="Africa (Kigali)" />
        </div>
      </SettingsCard>
      <SettingsCard title="Data controls">
        <div className="flex flex-col gap-2">
          <Toggle label="Encrypt at rest" desc="AES-256 on all stored records." defaultOn />
          <Toggle label="Export entire dataset" desc="Generate a portable archive on demand." />
          <Toggle label="Right-to-erasure workflow" desc="Honor deletion requests with audit trail." defaultOn />
        </div>
        <button type="button" onClick={() => toast({ tone: 'info', title: 'Export queued', body: 'Your data archive will be emailed when ready.' })} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-5 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Request data export</button>
      </SettingsCard>
    </div>
  );
}

function SaveBtn() {
  return <button type="button" onClick={saved} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Check className="size-3.5" /> Save</button>;
}
