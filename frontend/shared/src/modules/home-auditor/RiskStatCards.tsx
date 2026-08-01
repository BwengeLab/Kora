import { AlertOctagon, FileX2, Flag, ShieldAlert, type LucideIcon } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';

interface RiskStats {
  riskFlags: number;
  sodViolations: number;
  suspicious: number;
  missingDocs: number;
}

interface Def { label: string; sub: string; value: number; icon: LucideIcon; tone: string }

export function RiskStatCards({ riskStats }: { riskStats?: RiskStats }) {
  if (!riskStats) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <GlassSurface tone="strong" className="flex flex-col gap-2 p-5">
          <p className="text-sm text-ink-muted">No risk data available</p>
        </GlassSurface>
      </div>
    );
  }
  const s = riskStats;
  const cards: Def[] = [
    { label: 'Risk flags', sub: 'open · all severities', value: s.riskFlags, icon: Flag, tone: 'bg-warning-soft text-warning' },
    { label: 'SoD violations', sub: 'segregation of duties', value: s.sodViolations, icon: ShieldAlert, tone: 'bg-danger-soft text-danger' },
    { label: 'Suspicious activity', sub: 'agent-flagged', value: s.suspicious, icon: AlertOctagon, tone: 'bg-danger-soft text-danger' },
    { label: 'Missing documents', sub: 'unsupported entries', value: s.missingDocs, icon: FileX2, tone: 'bg-info-soft text-info' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
