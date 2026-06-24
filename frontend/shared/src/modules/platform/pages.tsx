import { Activity, ArrowUpRight, Ban, Check, Clock, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { toast } from '../../state/toastStore';
import { Dot, Metric, Panel, PlatformPage } from './primitives';

// ── Tenants ─────────────────────────────────────────────────────────────────
const TENANTS = [
  { name: 'Acme Insurance', plan: 'Growth', users: 9, mrr: '$499', health: 'success', since: '2024' },
  { name: 'Umoja SACCO', plan: 'Scale', users: 24, mrr: '$1,299', health: 'success', since: '2023' },
  { name: 'Bright Microfinance', plan: 'Growth', users: 12, mrr: '$499', health: 'warning', since: '2024' },
  { name: 'Kigali Logistics', plan: 'Starter', users: 4, mrr: '$149', health: 'success', since: '2025' },
  { name: 'MediCare Network', plan: 'Scale', users: 31, mrr: '$1,299', health: 'success', since: '2023' },
  { name: 'PesaPlus Ltd', plan: 'Starter', users: 3, mrr: '$149', health: 'danger', since: '2025' },
] as const;
export function PlatformTenantsPage() {
  return (
    <PlatformPage title="Tenants" subtitle="Every business running on Kora." right={<button type="button" onClick={() => toast({ tone: 'info', title: 'Onboard tenant', body: 'Provision a new tenant workspace.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-4" /> Onboard tenant</button>}>
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="Active tenants" value="48" delta="+5 this quarter" />
        <Metric label="Total seats" value="612" />
        <Metric label="MRR" value="$38.4k" delta="+12% MoM" tone="text-success" />
        <Metric label="At-risk" value="2" tone="text-danger" />
      </div>
      <Panel title="All tenants">
        <div className="grid grid-cols-[1fr_100px_80px_100px_90px] gap-3 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span>Tenant</span><span>Plan</span><span className="text-right">Users</span><span className="text-right">MRR</span><span className="text-right">Health</span>
        </div>
        <ul>
          {TENANTS.map((t) => (
            <li key={t.name}>
              <button type="button" onClick={() => toast({ tone: 'info', title: t.name, body: `${t.plan} plan · since ${t.since}` })} className="grid w-full grid-cols-[1fr_100px_80px_100px_90px] items-center gap-3 border-b border-white/40 py-3 text-left hover:bg-white/55">
                <div className="flex items-center gap-2.5"><PartyAvatar name={t.name} size="sm" /><span className="truncate text-[13px] font-semibold text-ink">{t.name}</span></div>
                <span className="text-[12px] font-semibold text-ink-soft">{t.plan}</span>
                <span className="text-right text-[12.5px] font-semibold text-ink tabular">{t.users}</span>
                <span className="text-right text-[12.5px] font-bold text-ink tabular">{t.mrr}</span>
                <span className="flex items-center justify-end gap-1.5 text-[11px] font-bold capitalize text-ink-soft"><Dot tone={t.health} /> {t.health === 'success' ? 'Healthy' : t.health === 'warning' ? 'Watch' : 'At risk'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </PlatformPage>
  );
}

// ── Plans & Billing ─────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Starter', price: '$149', tenants: 14, features: 'Core ledger · 5 seats' },
  { name: 'Growth', price: '$499', tenants: 22, features: 'AI agents · 15 seats · integrations' },
  { name: 'Scale', price: '$1,299', tenants: 12, features: 'Multi-entity · unlimited seats · SSO' },
];
export function PlatformPlansPage() {
  return (
    <PlatformPage title="Plans & Billing" subtitle="Platform revenue and plan mix.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="MRR" value="$38.4k" delta="+12% MoM" tone="text-success" />
        <Metric label="ARR" value="$461k" />
        <Metric label="Net revenue retention" value="118%" tone="text-success" />
        <Metric label="Churn" value="1.2%" />
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        {PLANS.map((p) => (
          <GlassSurface key={p.name} tone="strong" className="flex flex-col gap-2 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-ink"><Sparkles className="size-3.5" /> {p.name}</span>
            <p className="font-display text-3xl font-bold text-ink">{p.price}<span className="text-base font-semibold text-ink-muted">/mo</span></p>
            <p className="text-[12px] text-ink-muted">{p.features}</p>
            <div className="mt-2 rounded-xl bg-white/55 p-2.5 text-center ring-1 ring-white/60"><span className="font-display text-xl font-bold text-ink tabular">{p.tenants}</span><span className="ml-1.5 text-[12px] text-ink-muted">tenants</span></div>
          </GlassSurface>
        ))}
      </div>
    </PlatformPage>
  );
}

// ── Platform Config ─────────────────────────────────────────────────────────
const FLAGS = [
  { name: 'AI Copilot', desc: 'Grounded assistant across all tenants', on: true },
  { name: 'Insurance Claims pack', desc: 'Claims Officer role + workspace', on: true },
  { name: 'Credit Passport sharing', desc: 'External lender portals', on: true },
  { name: 'Mobile money auto-reconcile', desc: 'MoMo / Airtel matching agent', on: true },
  { name: 'Multi-entity consolidation', desc: 'Group reporting (Scale only)', on: false },
  { name: 'Experimental forecasting', desc: 'ML cash-flow projections (beta)', on: false },
];
export function PlatformConfigPage() {
  return (
    <PlatformPage title="Platform Config" subtitle="Feature flags and global defaults across all tenants.">
      <Panel title="Feature flags" desc="Roll capabilities out gradually. Tenant-level overrides apply on top.">
        <div className="flex flex-col gap-2">{FLAGS.map((f) => <FlagRow key={f.name} {...f} />)}</div>
      </Panel>
    </PlatformPage>
  );
}
function FlagRow({ name, desc, on }: { name: string; desc: string; on: boolean }) {
  const [v, setV] = useState(on);
  return (
    <button type="button" onClick={() => { setV((x) => !x); toast({ tone: v ? 'warning' : 'success', title: `${name} ${v ? 'disabled' : 'enabled'}`, body: 'Rollout updated across tenants.' }); }} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70">
      <div><p className="text-[13px] font-semibold text-ink">{name}</p><p className="text-[11.5px] text-ink-muted">{desc}</p></div>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', v ? 'bg-brand' : 'bg-ink/15')}><span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', v ? 'left-[22px]' : 'left-0.5')} /></span>
    </button>
  );
}

// ── System Health ───────────────────────────────────────────────────────────
const SERVICES = [
  { name: 'API Gateway', status: 'success', uptime: '99.99%', latency: '42ms' },
  { name: 'gRPC Core (Go)', status: 'success', uptime: '99.98%', latency: '18ms' },
  { name: 'AI Agents (Python)', status: 'warning', uptime: '99.81%', latency: '210ms' },
  { name: 'Reconciliation engine', status: 'success', uptime: '99.97%', latency: '64ms' },
  { name: 'Document OCR', status: 'success', uptime: '99.95%', latency: '320ms' },
  { name: 'Postgres (primary)', status: 'success', uptime: '100%', latency: '3ms' },
];
export function PlatformHealthPage() {
  return (
    <PlatformPage title="System Health" subtitle="Live service status across the platform.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="Overall uptime (30d)" value="99.96%" tone="text-success" />
        <Metric label="Open incidents" value="1" tone="text-warning" />
        <Metric label="Avg latency" value="78ms" />
        <Metric label="Error rate" value="0.04%" tone="text-success" />
      </div>
      <Panel title="Services">
        <ul className="flex flex-col gap-1.5">
          {SERVICES.map((s) => (
            <li key={s.name} className="flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60">
              <Dot tone={s.status as 'success' | 'warning' | 'danger'} />
              <span className="flex-1 text-[13px] font-semibold text-ink">{s.name}</span>
              <span className="text-[12px] text-ink-muted">uptime <span className="font-bold text-ink">{s.uptime}</span></span>
              <span className="text-[12px] text-ink-muted">latency <span className="font-bold text-ink">{s.latency}</span></span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mt-4"><Panel title="Active incident" desc="AI Agents elevated latency — investigating">
        <div className="flex items-center gap-3 rounded-2xl bg-warning-soft/50 p-4 ring-1 ring-warning/20">
          <ShieldAlert className="size-5 text-warning" />
          <div className="flex-1"><p className="text-[13px] font-bold text-ink">Degraded performance · AI Agents</p><p className="text-[11.5px] text-ink-muted">Started 14:20 CAT · queue backlog draining · next update 15:00</p></div>
          <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">Monitoring</span>
        </div>
      </Panel></div>
    </PlatformPage>
  );
}

// ── Usage & Cost ────────────────────────────────────────────────────────────
export function PlatformUsagePage() {
  return (
    <PlatformPage title="Usage & Cost" subtitle="Platform consumption and unit economics.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="API calls (30d)" value="4.2M" delta="+8% MoM" />
        <Metric label="AI tokens (30d)" value="182M" />
        <Metric label="Infra cost (30d)" value="$6,840" />
        <Metric label="Gross margin" value="82%" tone="text-success" />
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Panel title="Cost by service">
          {[['AI inference', 58], ['Compute', 22], ['Storage', 11], ['Egress', 9]].map(([k, v]) => (
            <div key={k as string} className="mb-3">
              <div className="flex justify-between text-[12px]"><span className="font-semibold text-ink-soft">{k}</span><span className="font-bold text-ink tabular">{v}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-brand" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </Panel>
        <Panel title="Top tenants by usage">
          <ul className="flex flex-col gap-1.5">
            {([['MediCare Network', '31%'], ['Umoja SACCO', '24%'], ['Acme Insurance', '14%'], ['Bright Microfinance', '9%']] as [string, string][]).map(([t, p]) => (
              <li key={t} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/55"><PartyAvatar name={t} size="sm" /><span className="flex-1 text-[13px] font-semibold text-ink">{t}</span><span className="text-[12.5px] font-bold text-ink tabular">{p}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </PlatformPage>
  );
}

// ── Platform Users (Kora staff) ─────────────────────────────────────────────
const STAFF = [
  { name: 'Jean-Paul Kagame', email: 'super@kora.local', role: 'Platform Owner', last: 'now' },
  { name: 'Sandrine Uwera', email: 'ops@kora.local', role: 'Platform Ops', last: '2h ago' },
  { name: 'David Mutoni', email: 'support@kora.local', role: 'Support Engineer', last: '1d ago' },
  { name: 'Reta Bot', email: 'ci@kora.local', role: 'Service account', last: '5m ago' },
];
export function PlatformUsersPage() {
  return (
    <PlatformPage title="Platform Users" subtitle="Kora staff with platform-plane access." right={<button type="button" onClick={() => toast({ tone: 'info', title: 'Invite staff', body: 'Grant platform-plane access.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><Plus className="size-4" /> Invite</button>}>
      <Panel title="Staff">
        <ul className="flex flex-col gap-1.5">
          {STAFF.map((s) => (
            <li key={s.email} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/55">
              <PartyAvatar name={s.name} size="md" />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{s.name}</p><p className="truncate text-[11px] text-ink-muted">{s.email}</p></div>
              <span className="text-[12px] font-semibold text-ink-soft">{s.role}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><Clock className="size-3" /> {s.last}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </PlatformPage>
  );
}

// ── Support Access (audited impersonation) ──────────────────────────────────
export function PlatformSupportPage() {
  return (
    <PlatformPage title="Support Access" subtitle="Time-boxed, audited access into a tenant — only with explicit grant.">
      <Panel title="Request tenant access" desc="Kora never sees tenant financial data without a logged, consented grant." action={<button type="button" onClick={() => toast({ tone: 'info', title: 'Access requested', body: 'Tenant Owner must approve. Session will be fully recorded.' })} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> Request</button>}>
        <div className="flex items-center gap-3 rounded-2xl bg-info-soft/50 p-4 ring-1 ring-info/20">
          <Activity className="size-5 text-info" />
          <p className="text-[12.5px] text-ink">All support sessions are read-scoped by default, expire automatically, and are written to both the platform and tenant audit logs.</p>
        </div>
      </Panel>
      <div className="mt-4"><Panel title="Active & recent grants">
        <ul className="flex flex-col gap-1.5">
          {[['Bright Microfinance', 'Active', '38m left', 'success'], ['PesaPlus Ltd', 'Expired', 'ended 2d ago', 'warning'], ['Kigali Logistics', 'Revoked', 'by tenant', 'danger']].map(([t, st, sub, tone]) => (
            <li key={t} className="flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60">
              <Dot tone={tone as 'success' | 'warning' | 'danger'} />
              <span className="flex-1 text-[13px] font-semibold text-ink">{t}</span>
              <span className="text-[11.5px] text-ink-muted">{sub}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', st === 'Active' ? 'bg-success-soft text-success' : 'bg-ink/10 text-ink-muted')}>{st}</span>
            </li>
          ))}
        </ul>
      </Panel></div>
    </PlatformPage>
  );
}

// ── Platform Audit ──────────────────────────────────────────────────────────
const AUDIT = [
  { actor: 'Sandrine Uwera', action: 'Enabled feature flag', target: 'Insurance Claims · Umoja SACCO', at: '14:42', icon: Check, tone: 'text-success' },
  { actor: 'David Mutoni', action: 'Requested support access', target: 'Bright Microfinance', at: '14:05', icon: Activity, tone: 'text-info' },
  { actor: 'super@kora.local', action: 'Onboarded tenant', target: 'Kigali Logistics', at: '11:20', icon: Plus, tone: 'text-brand' },
  { actor: 'Tenant Owner', action: 'Revoked support access', target: 'Kigali Logistics', at: '10:58', icon: Ban, tone: 'text-danger' },
  { actor: 'System', action: 'Scaled AI Agents pool', target: 'latency mitigation', at: '14:20', icon: ArrowUpRight, tone: 'text-warning' },
];
export function PlatformAuditPage() {
  return (
    <PlatformPage title="Platform Audit" subtitle="Immutable record of every platform-plane action.">
      <Panel title="Activity">
        <ul className="flex flex-col">
          {AUDIT.map((e, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-white/40 py-3 last:border-0">
              <span className={cn('grid size-9 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', e.tone)}><e.icon className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{e.action}</p><p className="truncate text-[11.5px] text-ink-muted">{e.actor} · {e.target}</p></div>
              <span className="font-mono text-[11.5px] text-ink-muted">{e.at}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </PlatformPage>
  );
}
