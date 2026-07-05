import { Plug, ShieldCheck, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';

interface Def { label: string; value: string; sub: string; icon: LucideIcon; tone: string }

export function AdminStatCards({ stats }: { stats: { activeUsers: number; pendingRequests: number; integrationsConnected: number; integrationsTotal: number; activePolicies: number; customRoles: number } }) {
  const cards: Def[] = [
    { label: 'Active users', value: String(stats.activeUsers), sub: `${stats.customRoles} custom roles`, icon: Users, tone: 'bg-brand-soft text-brand-ink' },
    { label: 'Pending requests', value: String(stats.pendingRequests), sub: 'awaiting your action', icon: UserCheck, tone: 'bg-warning-soft text-warning' },
    { label: 'Integrations', value: `${stats.integrationsConnected}/${stats.integrationsTotal}`, sub: 'connected', icon: Plug, tone: 'bg-success-soft text-success' },
    { label: 'Active policies', value: String(stats.activePolicies), sub: 'versioned & audited', icon: ShieldCheck, tone: 'bg-ai-soft text-ai' },
  ];
  return (
    <section className="grid grid-cols-2 gap-5 @5xl:grid-cols-4">
      {cards.map((card) => (
        <GlassSurface key={card.label} tone="strong" className="flex flex-col gap-2 p-5">
          <span className={cn('grid size-10 place-items-center rounded-2xl', card.tone)}>
            <card.icon className="size-[18px]" />
          </span>
          <span className="font-display text-3xl font-bold leading-none text-ink tabular">{card.value}</span>
          <span className="text-[12.5px] font-semibold text-ink">{card.label}</span>
          <span className="text-[10.5px] font-medium text-ink-muted">{card.sub}</span>
        </GlassSurface>
      ))}
    </section>
  );
}
