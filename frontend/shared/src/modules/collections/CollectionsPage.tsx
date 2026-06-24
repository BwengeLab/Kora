import { useState } from 'react';
import { Clock, HandCoins, Inbox, Send, Sparkles, TriangleAlert } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { seedCollectionsStats, seedOverdue, type Overdue, type RiskLevel } from '../../seed/ownerExtra';
import { toast } from '../../state/toastStore';

const RISK_TONE: Record<RiskLevel, string> = {
  low: 'bg-success-soft text-success',
  medium: 'bg-warning-soft text-warning',
  high: 'bg-danger-soft text-danger',
};

// Org Owner "Collections" — overdue receivables with agent-drafted reminders.
export function CollectionsPage() {
  const s = seedCollectionsStats;
  const [sent, setSent] = useState<Set<string>>(new Set());

  const sendReminder = (o: Overdue) => {
    setSent((prev) => new Set(prev).add(o.id));
    toast({ tone: 'success', title: 'Reminder sent', body: `Agent-drafted reminder sent to ${o.customer}.` });
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Collections"
        subtitle={<>Overdue receivables with agent-drafted reminders — turn ageing invoices into cash.</>}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-2 gap-5 @5xl:grid-cols-4">
          <StatMoney icon={<HandCoins className="size-[18px]" />} tone="bg-danger-soft text-danger" money={s.totalOverdue} label="Total overdue" />
          <Stat icon={<Inbox className="size-[18px]" />} tone="bg-warning-soft text-warning" value={String(s.overdueCount)} label="Overdue invoices" />
          <Stat icon={<Clock className="size-[18px]" />} tone="bg-info-soft text-info" value={`${s.avgDaysOverdue}d`} label="Avg days overdue" />
          <Stat icon={<TriangleAlert className="size-[18px]" />} tone="bg-success-soft text-success" value={String(s.promisesToPay)} label="Promises to pay" />
        </section>

        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <h3 className="font-display text-base font-bold text-ink">Overdue receivables</h3>
          <ul className="flex flex-col gap-2">
            {seedOverdue.map((o) => {
              const isSent = sent.has(o.id);
              return (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                  <PartyAvatar name={o.customer} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-bold text-ink">{o.customer}</p>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[o.risk])}>{o.risk}</span>
                    </div>
                    <p className="truncate text-[11px] text-ink-muted">{o.invoice} · {o.daysOverdue} days overdue</p>
                  </div>
                  <MoneyCell amount={o.amount} size="sm" className="shrink-0 font-bold !text-[13px] text-danger" />
                  <button
                    type="button"
                    disabled={isSent}
                    onClick={() => sendReminder(o)}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition-colors',
                      isSent ? 'bg-success-soft text-success' : 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110',
                    )}
                  >
                    {isSent ? <>Sent</> : <><Sparkles className="size-3.5" /> Send reminder</>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
            <Send className="size-3.5" /> Reminders are drafted by the Collections agent in each customer's tone — you approve &amp; send.
          </p>
        </GlassSurface>
      </div>
    </div>
  );
}

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-1.5 p-5">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tone)}>{icon}</span>
      <span className="font-display text-3xl font-bold leading-none text-ink tabular">{value}</span>
      <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}
function StatMoney({ icon, tone, money, label }: { icon: React.ReactNode; tone: string; money: Parameters<typeof MoneyCell>[0]['amount']; label: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-1.5 p-5">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tone)}>{icon}</span>
      <MoneyCell amount={money} size="lg" className="!text-2xl" />
      <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}
