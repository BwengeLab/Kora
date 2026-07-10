import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, Lock, Plus, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { fetchPortalAccess, requestPortalAccess } from '../../api/portal';
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const SCOPE_META: Record<string, { label: string; desc: string }> = {
  'credit-passport': { label: 'Credit Passport', desc: 'Score, limits, repayment behaviour' },
  financials: { label: 'Financial statements', desc: 'P&L, balance sheet, cash flow' },
  'bank-statements': { label: 'Bank statements', desc: 'Verified bank-feed history' },
  transactions: { label: 'Transaction detail', desc: 'Line-level movements for deeper diligence' },
  contracts: { label: 'Contracts register', desc: 'Obligations and committed spend' },
};

const REQUESTABLE = [
  { scope: 'transactions', label: 'Transaction detail', desc: 'Line-level movements for deeper diligence' },
  { scope: 'contracts', label: 'Contracts register', desc: 'Obligations and committed spend' },
];

export function PortalAccessPage() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['portal-access', token],
    queryFn: ({ signal }) => fetchPortalAccess(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const requestMutation = useMutation({
    mutationFn: (scope: string) => requestPortalAccess(apiBaseUrl, token, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal-access', token] });
    },
  });
  const grants = data?.grants ?? [];
  const granted = [...new Map(grants.flatMap((grant) => grant.scopes.map((scope) => [scope, grant] as const))).entries()];
  const requestable = REQUESTABLE.filter((request) => !granted.some(([scope]) => scope === request.scope));
  const primaryExpiry = grants[0]?.expiresAt;

  const requestScope = async (scope: string, label: string) => {
    try {
      await requestMutation.mutateAsync(scope);
      toast({ tone: 'info', title: 'Request sent', body: `${data?.organizationName ?? 'The business'} will review your request for ${label}.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request this access scope.' });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Access & Requests" subtitle={<>Your access to <span className="font-semibold text-ink">{data?.organizationName ?? 'the business'}</span> - consent-scoped, time-boxed and revocable at any time.</>} />
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <GlassSurface tone="strong" className="flex items-center gap-4 bg-gradient-to-br from-success-soft/50 to-white/40 p-5 ring-1 ring-success/15">
            <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success"><ShieldCheck className="size-6" /></span>
            <div className="flex-1"><p className="text-[14px] font-bold text-ink">{grants.length > 0 ? `Access granted - expires ${formatDate(primaryExpiry)}` : 'No active access'}</p><p className="text-[12.5px] text-ink-muted">Every view is consent-scoped, time-boxed and auditable.</p></div>
            {primaryExpiry ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-bold text-success"><Clock className="size-3.5" /> {daysUntil(primaryExpiry)} days left</span> : null}
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-bold text-ink">What you can access</h3>
            <ul className="flex flex-col gap-2">
              {granted.map(([scope, grant]) => {
                const meta = SCOPE_META[scope] ?? { label: scope, desc: 'Consent-scoped data access' };
                return <li key={scope} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-ink"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-ink">{meta.label}</p><p className="text-[11.5px] text-ink-muted">{meta.desc}</p></div>
                  <span className="text-[11.5px] text-ink-muted">until {formatDate(grant.expiresAt)}</span>
                  <button type="button" onClick={() => openDoc({ name: `${meta.label}.pdf`, kind: 'statement', sizeText: '-', context: data?.organizationName ?? 'Business' })} className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/70 hover:bg-white">Open</button>
                </li>;
              })}
              {granted.length === 0 ? <li className="rounded-2xl bg-white/55 p-3.5 text-[12.5px] text-ink-muted ring-1 ring-white/60">No active consent grants are available.</li> : null}
            </ul>
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-1 font-display text-[15px] font-bold text-ink">Request more access</h3>
            <p className="mb-3 text-[12.5px] text-ink-muted">The business reviews every request before granting. You will be notified of their decision.</p>
            <ul className="flex flex-col gap-2">
              {requestable.map((request) => (
                <li key={request.scope} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/80 text-ink-muted ring-1 ring-white/60"><Lock className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-ink">{request.label}</p><p className="text-[11.5px] text-ink-muted">{request.desc}</p></div>
                  <button type="button" disabled={requestMutation.isPending} onClick={() => void requestScope(request.scope, request.label)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 py-1.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"><Plus className="size-3.5" /> Request</button>
                </li>
              ))}
              {requestable.length === 0 ? <li className="rounded-2xl bg-success-soft/50 p-3.5 text-[12.5px] font-medium text-success ring-1 ring-success/20">All available portal scopes are already granted.</li> : null}
            </ul>
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-bold text-ink">Your access activity</h3>
            <ul className="flex flex-col">
              {(data?.activity ?? []).map((entry) => (
                <li key={`${entry.action}-${entry.at}`} className="flex items-center gap-3 border-b border-white/40 py-2.5 last:border-0">
                  <span className={cn('size-2 rounded-full bg-brand')} />
                  <span className="flex-1 text-[12.5px] font-semibold text-ink">{entry.action}</span>
                  <span className="text-[11.5px] text-ink-muted">{formatDateTime(entry.at)}</span>
                </li>
              ))}
              {(data?.activity ?? []).length === 0 ? <li className="py-2.5 text-[12.5px] text-ink-muted">No access activity has been recorded yet.</li> : null}
            </ul>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function daysUntil(value: string): number {
  const date = new Date(`${value}T23:59:59Z`);
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
