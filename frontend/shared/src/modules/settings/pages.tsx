import { Check, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { toast } from '../../state/toastStore';
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

// ── Users & Roles (role builder) ────────────────────────────────────────────
const ROLES = [
  { name: 'Organization Owner', members: 1, perms: 'Full · final approver', tone: 'bg-brand-soft text-brand-ink', system: true },
  { name: 'Finance Lead', members: 2, perms: 'Approve · post · manage', tone: 'bg-success-soft text-success', system: true },
  { name: 'Finance Operator', members: 4, perms: 'Prepare · reconcile · intake', tone: 'bg-info-soft text-info', system: true },
  { name: 'Auditor', members: 1, perms: 'Read-only · investigate', tone: 'bg-warning-soft text-warning', system: true },
  { name: 'Org Admin', members: 1, perms: 'Manage org · no money', tone: 'bg-lavender-soft text-lavender', system: true },
  { name: 'Claims Officer', members: 3, perms: 'Claims workspace', tone: 'bg-ai-soft text-ai', system: false },
];
const MEMBERS = [
  { name: 'Aline Mukamana', email: 'owner@acme.local', role: 'Organization Owner', status: 'Active' },
  { name: 'Eric Habimana', email: 'cfo@acme.local', role: 'Finance Lead', status: 'Active' },
  { name: 'Diane Uwase', email: 'accountant@acme.local', role: 'Finance Operator', status: 'Active' },
  { name: 'Patrick Niyonsenga', email: 'auditor@acme.local', role: 'Auditor', status: 'Active' },
  { name: 'Grace Ishimwe', email: 'claims@acme.local', role: 'Claims Officer', status: 'Invited' },
];
export function SettingsUsersPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="People" value="9" />
        <StatPill label="Roles" value="6" tone="text-brand-ink" />
        <StatPill label="Pending invites" value="1" tone="text-warning" />
      </div>
      <SettingsCard title="Roles" desc="Each role is a least-privilege bundle of permissions. Custom roles come from feature packs." action={<button type="button" onClick={() => toast({ tone: 'info', title: 'New role', body: 'Pick permissions to compose a custom role.' })} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> New role</button>}>
        <ul className="flex flex-col gap-2">
          {ROLES.map((r) => (
            <li key={r.name} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className={cn('grid size-9 place-items-center rounded-xl', r.tone)}><ShieldCheck className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="text-[13px] font-bold text-ink">{r.name}</p>{!r.system ? <span className="rounded-full bg-ai-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-ai">Custom</span> : null}</div>
                <p className="text-[11.5px] text-ink-muted">{r.perms}</p>
              </div>
              <span className="text-[12px] font-semibold text-ink-soft">{r.members} {r.members === 1 ? 'member' : 'members'}</span>
              <button type="button" onClick={() => toast({ tone: 'info', title: `Editing ${r.name}`, body: 'Adjust permissions for this role.' })} className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/70 hover:bg-white">Edit</button>
            </li>
          ))}
        </ul>
      </SettingsCard>
      <SettingsCard title="People" desc="Members and their assigned role." action={<button type="button" onClick={() => toast({ tone: 'info', title: 'Invite member', body: 'Send an email invite with a role.' })} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><Plus className="size-3.5" /> Invite</button>}>
        <ul className="flex flex-col gap-1.5">
          {MEMBERS.map((m) => (
            <li key={m.email} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/55">
              <PartyAvatar name={m.name} size="md" />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{m.name}</p><p className="truncate text-[11px] text-ink-muted">{m.email}</p></div>
              <span className="text-[12px] font-semibold text-ink-soft">{m.role}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', m.status === 'Active' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{m.status}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}

// ── Rules & Policies ────────────────────────────────────────────────────────
export function SettingsPoliciesPage() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsCard title="Approval policy" desc="Thresholds that decide when a second signature or dual approval is required." action={<SaveBtn />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Finance Lead approval limit" value="USD 100,000" hint="Above this, the Owner co-signs." />
          <Field label="Dual-approval threshold" value="USD 100,000" />
          <Field label="High-risk auto-escalation" value="Enabled" />
          <Field label="Owner approves last" value="Enforced" hint="Owner cannot give first approval on dual items." />
        </div>
      </SettingsCard>
      <SettingsCard title="Controls" desc="Segregation of duties and evidence rules.">
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
