import type { ReactNode } from 'react';
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';

// Shared chrome for the platform surfaces.
export function PlatformPage({ title, subtitle, right, children }: { title: string; subtitle: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} subtitle={subtitle} right={right} />
      <div className="@container scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-8">{children}</div>
    </div>
  );
}

export function Metric({ label, value, delta, tone = 'text-ink' }: { label: string; value: string; delta?: string; tone?: string }) {
  return (
    <GlassSurface tone="strong" className="p-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <p className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</p>
      {delta ? <span className="text-[11.5px] font-semibold text-success">{delta}</span> : null}
    </GlassSurface>
  );
}

export function Panel({ title, desc, children, action }: { title: string; desc?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <GlassSurface tone="strong" className="p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>{desc ? <p className="mt-0.5 text-[12.5px] text-ink-muted">{desc}</p> : null}</div>
        {action}
      </header>
      {children}
    </GlassSurface>
  );
}

export function Dot({ tone }: { tone: 'success' | 'warning' | 'danger' }) {
  return <span className={cn('inline-block size-2 rounded-full', tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-danger')} />;
}
