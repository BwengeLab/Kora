import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowUpRight, Ban, Check, Clock, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { createPlatformTenant, createPlatformUser, createSupportRequest, fetchPlatformConsole, togglePlatformFlag, type PlatformConsolePayload } from '../../api/platformAdmin';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { Dot, Metric, Panel, PlatformPage } from './primitives';

const fallbackConsole: PlatformConsolePayload = {
  tenantMetrics: { activeTenants: '48', totalSeats: '612', mrr: '$38.4k', atRisk: '2' },
  tenants: [
    { id: 'tenant-acme', name: 'Acme Insurance', plan: 'Growth', users: 9, mrr: '$499', health: 'success', since: '2024' },
    { id: 'tenant-umoja', name: 'Umoja SACCO', plan: 'Scale', users: 24, mrr: '$1,299', health: 'success', since: '2023' },
    { id: 'tenant-bright', name: 'Bright Microfinance', plan: 'Growth', users: 12, mrr: '$499', health: 'warning', since: '2024' },
    { id: 'tenant-kigali', name: 'Kigali Logistics', plan: 'Starter', users: 4, mrr: '$149', health: 'success', since: '2025' },
    { id: 'tenant-medicare', name: 'MediCare Network', plan: 'Scale', users: 31, mrr: '$1,299', health: 'success', since: '2023' },
    { id: 'tenant-pesaplus', name: 'PesaPlus Ltd', plan: 'Starter', users: 3, mrr: '$149', health: 'danger', since: '2025' },
  ],
  planMetrics: { mrr: '$38.4k', arr: '$461k', netRevenueRetention: '118%', churn: '1.2%' },
  plans: [
    { id: 'plan-starter', name: 'Starter', price: '$149', tenants: 14, features: 'Core ledger · 5 seats' },
    { id: 'plan-growth', name: 'Growth', price: '$499', tenants: 22, features: 'AI agents · 15 seats · integrations' },
    { id: 'plan-scale', name: 'Scale', price: '$1,299', tenants: 12, features: 'Multi-entity · unlimited seats · SSO' },
  ],
  featureFlags: [
    { id: 'flag-ai-copilot', name: 'AI Copilot', desc: 'Grounded assistant across all tenants', on: true },
    { id: 'flag-claims-pack', name: 'Insurance Claims pack', desc: 'Claims Officer role + workspace', on: true },
    { id: 'flag-credit-passport', name: 'Credit Passport sharing', desc: 'External lender portals', on: true },
    { id: 'flag-momo-reconcile', name: 'Mobile money auto-reconcile', desc: 'MoMo / Airtel matching agent', on: true },
    { id: 'flag-multi-entity', name: 'Multi-entity consolidation', desc: 'Group reporting (Scale only)', on: false },
    { id: 'flag-forecasting', name: 'Experimental forecasting', desc: 'ML cash-flow projections (beta)', on: false },
  ],
  healthMetrics: { overallUptime: '99.96%', openIncidents: '1', avgLatency: '78ms', errorRate: '0.04%' },
  services: [
    { id: 'svc-gateway', name: 'API Gateway', status: 'success', uptime: '99.99%', latency: '42ms' },
    { id: 'svc-core', name: 'gRPC Core (Go)', status: 'success', uptime: '99.98%', latency: '18ms' },
    { id: 'svc-agents', name: 'AI Agents (Python)', status: 'warning', uptime: '99.81%', latency: '210ms' },
    { id: 'svc-recon', name: 'Reconciliation engine', status: 'success', uptime: '99.97%', latency: '64ms' },
    { id: 'svc-ocr', name: 'Document OCR', status: 'success', uptime: '99.95%', latency: '320ms' },
    { id: 'svc-postgres', name: 'Postgres (primary)', status: 'success', uptime: '100%', latency: '3ms' },
  ],
  activeIncident: {
    title: 'Degraded performance · AI Agents',
    detail: 'AI Agents elevated latency - investigating',
    subtext: 'Started 14:20 CAT · queue backlog draining · next update 15:00',
    badge: 'Monitoring',
  },
  usageMetrics: { apiCalls: '4.2M', aiTokens: '182M', infraCost: '$6,840', grossMargin: '82%' },
  costByService: [
    { name: 'AI inference', value: 58 },
    { name: 'Compute', value: 22 },
    { name: 'Storage', value: 11 },
    { name: 'Egress', value: 9 },
  ],
  usageTenants: [
    { tenant: 'MediCare Network', share: '31%' },
    { tenant: 'Umoja SACCO', share: '24%' },
    { tenant: 'Acme Insurance', share: '14%' },
    { tenant: 'Bright Microfinance', share: '9%' },
  ],
  platformUsers: [
    { id: 'platform-jean', name: 'Jean-Paul Kagame', email: 'super@kora.local', role: 'Platform Owner', last: 'now' },
    { id: 'platform-sandrine', name: 'Sandrine Uwera', email: 'ops@kora.local', role: 'Platform Ops', last: '2h ago' },
    { id: 'platform-david', name: 'David Mutoni', email: 'support@kora.local', role: 'Support Engineer', last: '1d ago' },
    { id: 'platform-reta', name: 'Reta Bot', email: 'ci@kora.local', role: 'Service account', last: '5m ago' },
  ],
  supportGrants: [
    { id: 'grant-bright', tenant: 'Bright Microfinance', status: 'Active', detail: '38m left', tone: 'success' },
    { id: 'grant-pesaplus', tenant: 'PesaPlus Ltd', status: 'Expired', detail: 'ended 2d ago', tone: 'warning' },
    { id: 'grant-kigali', tenant: 'Kigali Logistics', status: 'Revoked', detail: 'by tenant', tone: 'danger' },
  ],
  auditEvents: [
    { id: 'audit-1', actor: 'Sandrine Uwera', action: 'Enabled feature flag', target: 'Insurance Claims · Umoja SACCO', at: '14:42', icon: 'check', tone: 'success' },
    { id: 'audit-2', actor: 'David Mutoni', action: 'Requested support access', target: 'Bright Microfinance', at: '14:05', icon: 'activity', tone: 'info' },
    { id: 'audit-3', actor: 'super@kora.local', action: 'Onboarded tenant', target: 'Kigali Logistics', at: '11:20', icon: 'plus', tone: 'brand' },
    { id: 'audit-4', actor: 'Tenant Owner', action: 'Revoked support access', target: 'Kigali Logistics', at: '10:58', icon: 'ban', tone: 'danger' },
    { id: 'audit-5', actor: 'System', action: 'Scaled AI Agents pool', target: 'latency mitigation', at: '14:20', icon: 'arrow-up-right', tone: 'warning' },
  ],
};

function usePlatformConsole() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const query = useQuery({
    queryKey: ['platform-console', session?.token],
    queryFn: ({ signal }) => fetchPlatformConsole(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  return { session, apiBaseUrl, data: query.data ?? fallbackConsole };
}

export function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const { session, apiBaseUrl, data } = usePlatformConsole();

  const onboard = async () => {
    if (!session?.token) return;
    try {
      const name = `Tenant ${data.tenants.length + 1}`;
      await createPlatformTenant(apiBaseUrl, session.token, name);
      await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
      toast({ tone: 'success', title: 'Provisioning started', body: `${name} was added to the platform roster.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Onboarding failed', body: error instanceof Error ? error.message : 'Could not provision tenant.' });
    }
  };

  return (
    <PlatformPage title="Tenants" subtitle="Every business running on Kora." right={<button type="button" onClick={() => void onboard()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-4" /> Onboard tenant</button>}>
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="Active tenants" value={data.tenantMetrics.activeTenants} />
        <Metric label="Total seats" value={data.tenantMetrics.totalSeats} />
        <Metric label="MRR" value={data.tenantMetrics.mrr} tone="text-success" />
        <Metric label="At-risk" value={data.tenantMetrics.atRisk} tone="text-danger" />
      </div>
      <Panel title="All tenants">
        <div className="grid grid-cols-[1fr_100px_80px_100px_90px] gap-3 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span>Tenant</span><span>Plan</span><span className="text-right">Users</span><span className="text-right">MRR</span><span className="text-right">Health</span>
        </div>
        <ul>
          {data.tenants.map((tenant) => (
            <li key={tenant.id}>
              <button type="button" onClick={() => toast({ tone: 'info', title: tenant.name, body: `${tenant.plan} plan · since ${tenant.since}` })} className="grid w-full grid-cols-[1fr_100px_80px_100px_90px] items-center gap-3 border-b border-white/40 py-3 text-left hover:bg-white/55">
                <div className="flex items-center gap-2.5"><PartyAvatar name={tenant.name} size="sm" /><span className="truncate text-[13px] font-semibold text-ink">{tenant.name}</span></div>
                <span className="text-[12px] font-semibold text-ink-soft">{tenant.plan}</span>
                <span className="text-right text-[12.5px] font-semibold text-ink tabular">{tenant.users}</span>
                <span className="text-right text-[12.5px] font-bold text-ink tabular">{tenant.mrr}</span>
                <span className="flex items-center justify-end gap-1.5 text-[11px] font-bold capitalize text-ink-soft"><Dot tone={tenant.health} /> {tenant.health === 'success' ? 'Healthy' : tenant.health === 'warning' ? 'Watch' : 'At risk'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </PlatformPage>
  );
}

export function PlatformPlansPage() {
  const { data } = usePlatformConsole();
  return (
    <PlatformPage title="Plans & Billing" subtitle="Platform revenue and plan mix.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="MRR" value={data.planMetrics.mrr} tone="text-success" />
        <Metric label="ARR" value={data.planMetrics.arr} />
        <Metric label="Net revenue retention" value={data.planMetrics.netRevenueRetention} tone="text-success" />
        <Metric label="Churn" value={data.planMetrics.churn} />
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        {data.plans.map((plan) => (
          <GlassSurface key={plan.id} tone="strong" className="flex flex-col gap-2 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-ink"><Sparkles className="size-3.5" /> {plan.name}</span>
            <p className="font-display text-3xl font-bold text-ink">{plan.price}<span className="text-base font-semibold text-ink-muted">/mo</span></p>
            <p className="text-[12px] text-ink-muted">{plan.features}</p>
            <div className="mt-2 rounded-xl bg-white/55 p-2.5 text-center ring-1 ring-white/60"><span className="font-display text-xl font-bold text-ink tabular">{plan.tenants}</span><span className="ml-1.5 text-[12px] text-ink-muted">tenants</span></div>
          </GlassSurface>
        ))}
      </div>
    </PlatformPage>
  );
}

export function PlatformConfigPage() {
  const queryClient = useQueryClient();
  const { session, apiBaseUrl, data } = usePlatformConsole();

  const toggleFlag = async (flagId: string, nextOn: boolean, name: string) => {
    if (!session?.token) return;
    try {
      await togglePlatformFlag(apiBaseUrl, session.token, flagId);
      await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
      toast({ tone: nextOn ? 'success' : 'warning', title: `${name} ${nextOn ? 'enabled' : 'disabled'}`, body: 'Rollout updated across tenants.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Flag update failed', body: error instanceof Error ? error.message : 'Could not update feature flag.' });
    }
  };

  return (
    <PlatformPage title="Platform Config" subtitle="Feature flags and global defaults across all tenants.">
      <Panel title="Feature flags" desc="Roll capabilities out gradually. Tenant-level overrides apply on top.">
        <div className="flex flex-col gap-2">
          {data.featureFlags.map((flag) => (
            <button key={flag.id} type="button" onClick={() => void toggleFlag(flag.id, !flag.on, flag.name)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70">
              <div><p className="text-[13px] font-semibold text-ink">{flag.name}</p><p className="text-[11.5px] text-ink-muted">{flag.desc}</p></div>
              <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', flag.on ? 'bg-brand' : 'bg-ink/15')}><span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', flag.on ? 'left-[22px]' : 'left-0.5')} /></span>
            </button>
          ))}
        </div>
      </Panel>
    </PlatformPage>
  );
}

export function PlatformHealthPage() {
  const { data } = usePlatformConsole();
  return (
    <PlatformPage title="System Health" subtitle="Live service status across the platform.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="Overall uptime (30d)" value={data.healthMetrics.overallUptime} tone="text-success" />
        <Metric label="Open incidents" value={data.healthMetrics.openIncidents} tone="text-warning" />
        <Metric label="Avg latency" value={data.healthMetrics.avgLatency} />
        <Metric label="Error rate" value={data.healthMetrics.errorRate} tone="text-success" />
      </div>
      <Panel title="Services">
        <ul className="flex flex-col gap-1.5">
          {data.services.map((service) => (
            <li key={service.id} className="flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60">
              <Dot tone={service.status} />
              <span className="flex-1 text-[13px] font-semibold text-ink">{service.name}</span>
              <span className="text-[12px] text-ink-muted">uptime <span className="font-bold text-ink">{service.uptime}</span></span>
              <span className="text-[12px] text-ink-muted">latency <span className="font-bold text-ink">{service.latency}</span></span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mt-4">
        <Panel title="Active incident" desc={data.activeIncident.detail}>
          <div className="flex items-center gap-3 rounded-2xl bg-warning-soft/50 p-4 ring-1 ring-warning/20">
            <ShieldAlert className="size-5 text-warning" />
            <div className="flex-1"><p className="text-[13px] font-bold text-ink">{data.activeIncident.title}</p><p className="text-[11.5px] text-ink-muted">{data.activeIncident.subtext}</p></div>
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">{data.activeIncident.badge}</span>
          </div>
        </Panel>
      </div>
    </PlatformPage>
  );
}

export function PlatformUsagePage() {
  const { data } = usePlatformConsole();
  return (
    <PlatformPage title="Usage & Cost" subtitle="Platform consumption and unit economics.">
      <div className="mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Metric label="API calls (30d)" value={data.usageMetrics.apiCalls} />
        <Metric label="AI tokens (30d)" value={data.usageMetrics.aiTokens} />
        <Metric label="Infra cost (30d)" value={data.usageMetrics.infraCost} />
        <Metric label="Gross margin" value={data.usageMetrics.grossMargin} tone="text-success" />
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Panel title="Cost by service">
          {data.costByService.map((slice) => (
            <div key={slice.name} className="mb-3">
              <div className="flex justify-between text-[12px]"><span className="font-semibold text-ink-soft">{slice.name}</span><span className="font-bold text-ink tabular">{slice.value}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-brand" style={{ width: `${slice.value}%` }} /></div>
            </div>
          ))}
        </Panel>
        <Panel title="Top tenants by usage">
          <ul className="flex flex-col gap-1.5">
            {data.usageTenants.map((tenant) => (
              <li key={tenant.tenant} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/55"><PartyAvatar name={tenant.tenant} size="sm" /><span className="flex-1 text-[13px] font-semibold text-ink">{tenant.tenant}</span><span className="text-[12.5px] font-bold text-ink tabular">{tenant.share}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </PlatformPage>
  );
}

export function PlatformUsersPage() {
  const queryClient = useQueryClient();
  const { session, apiBaseUrl, data } = usePlatformConsole();

  const invite = async () => {
    if (!session?.token) return;
    try {
      const name = `Platform User ${data.platformUsers.length + 1}`;
      await createPlatformUser(apiBaseUrl, session.token, name);
      await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
      toast({ tone: 'success', title: 'Invite sent', body: `${name} now has a platform access invitation.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Invite failed', body: error instanceof Error ? error.message : 'Could not invite platform user.' });
    }
  };

  return (
    <PlatformPage title="Platform Users" subtitle="Kora staff with platform-plane access." right={<button type="button" onClick={() => void invite()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><Plus className="size-4" /> Invite</button>}>
      <Panel title="Staff">
        <ul className="flex flex-col gap-1.5">
          {data.platformUsers.map((user) => (
            <li key={user.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/55">
              <PartyAvatar name={user.name} size="md" />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{user.name}</p><p className="truncate text-[11px] text-ink-muted">{user.email}</p></div>
              <span className="text-[12px] font-semibold text-ink-soft">{user.role}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><Clock className="size-3" /> {user.last}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </PlatformPage>
  );
}

export function PlatformSupportPage() {
  const queryClient = useQueryClient();
  const { session, apiBaseUrl, data } = usePlatformConsole();

  const requestAccess = async () => {
    if (!session?.token) return;
    try {
      const tenant = data.tenants[0]?.name ?? 'Acme Insurance';
      await createSupportRequest(apiBaseUrl, session.token, tenant);
      await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
      toast({ tone: 'info', title: 'Access requested', body: `Tenant owner approval was requested for ${tenant}.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request support access.' });
    }
  };

  return (
    <PlatformPage title="Support Access" subtitle="Time-boxed, audited access into a tenant - only with explicit grant.">
      <Panel title="Request tenant access" desc="Kora never sees tenant financial data without a logged, consented grant." action={<button type="button" onClick={() => void requestAccess()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> Request</button>}>
        <div className="flex items-center gap-3 rounded-2xl bg-info-soft/50 p-4 ring-1 ring-info/20">
          <Activity className="size-5 text-info" />
          <p className="text-[12.5px] text-ink">All support sessions are read-scoped by default, expire automatically, and are written to both the platform and tenant audit logs.</p>
        </div>
      </Panel>
      <div className="mt-4">
        <Panel title="Active & recent grants">
          <ul className="flex flex-col gap-1.5">
            {data.supportGrants.map((grant) => (
              <li key={grant.id} className="flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60">
                <Dot tone={grant.tone} />
                <span className="flex-1 text-[13px] font-semibold text-ink">{grant.tenant}</span>
                <span className="text-[11.5px] text-ink-muted">{grant.detail}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', grant.status === 'Active' ? 'bg-success-soft text-success' : 'bg-ink/10 text-ink-muted')}>{grant.status}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PlatformPage>
  );
}

const iconMap = {
  check: Check,
  activity: Activity,
  plus: Plus,
  ban: Ban,
  'arrow-up-right': ArrowUpRight,
};

export function PlatformAuditPage() {
  const { data } = usePlatformConsole();
  return (
    <PlatformPage title="Platform Audit" subtitle="Immutable record of every platform-plane action.">
      <Panel title="Activity">
        <ul className="flex flex-col">
          {data.auditEvents.map((event) => {
            const Icon = iconMap[event.icon];
            return (
              <li key={event.id} className="flex items-center gap-3 border-b border-white/40 py-3 last:border-0">
                <span className={cn('grid size-9 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', toneClass(event.tone))}><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{event.action}</p><p className="truncate text-[11.5px] text-ink-muted">{event.actor} · {event.target}</p></div>
                <span className="font-mono text-[11.5px] text-ink-muted">{event.at}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </PlatformPage>
  );
}

function toneClass(tone: PlatformConsolePayload['auditEvents'][number]['tone']) {
  switch (tone) {
    case 'success':
      return 'text-success';
    case 'info':
      return 'text-info';
    case 'brand':
      return 'text-brand';
    case 'danger':
      return 'text-danger';
    default:
      return 'text-warning';
  }
}
