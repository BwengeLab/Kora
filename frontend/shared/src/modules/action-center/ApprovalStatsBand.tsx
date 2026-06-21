import { Clock, Flame, Layers, ShieldAlert, Users } from 'lucide-react';
import { GlassSurface, MoneyCell, Sparkline, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { seedApprovalStats, seedApprovalTypeStats, type ApprovalItem } from '../../seed/approvals';
import type { ActionVariant } from './variant';

function sum(items: ApprovalItem[]): Money {
  const total = items.reduce((acc, a) => acc + a.amount.amountMinor, 0n);
  return { amountMinor: total, currency: items[0]?.amount.currency ?? 'USD' };
}

export function ApprovalStatsBand({ variant, items }: { variant: ActionVariant; items: ApprovalItem[] }) {
  if (variant === 'org_owner') return <OwnerStats items={items} />;
  return <LeadStats />;
}

// ── Finance Lead: full operational aggregate ───────────────────────────────
function LeadStats() {
  const s = seedApprovalStats;
  return (
    <section className="grid grid-cols-1 gap-5 @4xl:grid-cols-[340px_1fr_240px]">
      <GlassSurface tone="strong" className="flex flex-col justify-between gap-3 p-6">
        <span className="text-[12px] font-semibold text-ink-muted">Awaiting your approval</span>
        <div>
          <span className="font-display text-4xl font-bold leading-none text-ink tabular">{s.awaitingCount}</span>
          <span className="ml-2 text-[13px] font-semibold text-ink-muted">items</span>
        </div>
        <MoneyCell amount={s.awaitingValue} size="lg" className="!text-xl" />
        <div className="flex flex-wrap gap-2">
          <Pill icon={<Flame className="size-3" />} tone="warning">{s.urgentCount} urgent</Pill>
          <Pill icon={<ShieldAlert className="size-3" />} tone="danger">{s.highRiskCount} high-risk</Pill>
          <Pill icon={<Users className="size-3" />} tone="info">{s.overLimitCount} dual-approval</Pill>
        </div>
      </GlassSurface>

      <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
        <span className="text-[12px] font-semibold text-ink-muted">By type</span>
        <div className="grid flex-1 grid-cols-2 gap-3 @2xl:grid-cols-5">
          {seedApprovalTypeStats.map((t) => (
            <div key={t.type} className="flex flex-col justify-center rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className="font-display text-2xl font-bold text-ink tabular">{t.count}</span>
              <span className="text-[11.5px] font-semibold text-ink-soft">{t.label}</span>
            </div>
          ))}
        </div>
      </GlassSurface>

      <GlassSurface tone="strong" className="flex flex-col justify-between gap-3 p-6">
        <span className="text-[12px] font-semibold text-ink-muted">Approved today</span>
        <div className="flex items-end justify-between gap-2">
          <span className="font-display text-4xl font-bold leading-none text-ink tabular">{s.approvedTodayCount}</span>
          <Sparkline data={s.approvedTodaySeries} color="#16a37b" width={88} height={40} />
        </div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <Clock className="size-3.5 text-ink-muted" />
          <MoneyCell amount={s.approvedTodayValue} size="sm" className="!text-[12.5px] font-semibold" />
          <span className="text-ink-muted">released</span>
        </div>
      </GlassSurface>
    </section>
  );
}

// ── Org Owner: top-tier, computed from the routed-up subset ────────────────
function OwnerStats({ items }: { items: ApprovalItem[] }) {
  const awaiting = items.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
  const valueAtStake = sum(awaiting);
  const highRisk = items.filter((a) => a.risk === 'high').length;
  const dual = items.filter((a) => a.requiresDualApproval).length;

  return (
    <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
      <StatCard label="Awaiting your sign-off" value={String(awaiting.length)} icon={<Layers className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" />
      <GlassSurface tone="strong" className="flex flex-col justify-center gap-1 p-5">
        <span className="text-[12px] font-semibold text-ink-muted">Value at stake</span>
        <MoneyCell amount={valueAtStake} size="xl" className="!text-[28px]" />
      </GlassSurface>
      <StatCard label="High-risk decisions" value={String(highRisk)} icon={<ShieldAlert className="size-[18px]" />} tone="bg-danger-soft text-danger" />
      <StatCard label="Need your 2nd signature" value={String(dual)} icon={<Users className="size-[18px]" />} tone="bg-info-soft text-info" />
    </section>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2 p-5">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tone)}>{icon}</span>
      <span className="font-display text-4xl font-bold leading-none text-ink tabular">{value}</span>
      <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}

function Pill({ icon, tone, children }: { icon: React.ReactNode; tone: 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  const toneClass = { warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', info: 'bg-info-soft text-info' }[tone];
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', toneClass)}>{icon}{children}</span>;
}
