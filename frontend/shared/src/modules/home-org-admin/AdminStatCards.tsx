import { Plug, ShieldCheck, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedAdminStats } from '../../seed/adminHome';

interface Def { label: string; value: string; sub: string; icon: LucideIcon; tone: string }

export function AdminStatCards() {
  const s = seedAdminStats;
  const cards: Def[] = [
    { label: 'Active users', value: String(s.activeUsers), sub: `${s.customRoles} custom roles`, icon: Users, tone: 'bg-brand-soft text-brand-ink' },
    { label: 'Pending requests', value: String(s.pendingRequests), sub: 'awaiting your action', icon: UserCheck, tone: 'bg-warning-soft text-warning' },
    { label: 'Integrations', value: `${s.integrationsConnected}/${s.integrationsTotal}`, sub: 'connected', icon: Plug, tone: 'bg-success-soft text-success' },
    { label: 'Active policies', value: String(s.activePolicies), sub: 'versioned & audited', icon: ShieldCheck, tone: 'bg-ai-soft text-ai' },
  ];
  return (
    <section className="grid grid-cols-2 gap-5 @5xl:grid-cols-4">
      {cards.map((c) => (
        <GlassSurface key={c.label} tone="strong" className="flex flex-col gap-2 p-5">
          <span className={cn('grid size-10 place-items-center rounded-2xl', c.tone)}>
            <c.icon className="size-[18px]" />
          </span>
          <span className="font-display text-3xl font-bold leading-none text-ink tabular">{c.value}</span>
          <span className="text-[12.5px] font-semibold text-ink">{c.label}</span>
          <span className="text-[10.5px] font-medium text-ink-muted">{c.sub}</span>
        </GlassSurface>
      ))}
    </section>
  );
}
