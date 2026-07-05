import type { ReactNode } from 'react';
import { useState } from 'react';
import { GlassSurface, cn } from '../../design-system';

// Shared building blocks for the settings surfaces.

export function SettingsCard({ title, desc, children, action }: { title: string; desc?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <GlassSurface tone="strong" className="p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
          {desc ? <p className="mt-0.5 text-[12.5px] text-ink-muted">{desc}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </GlassSurface>
  );
}

export function Field({ label, value, hint, onChange }: { label: string; value: string; hint?: string; onChange?: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <input
        value={value}
        readOnly={!onChange}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-11 rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      {hint ? <span className="text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ label, desc, defaultOn = false, checked, onChange }: { label: string; desc?: string; defaultOn?: boolean; checked?: boolean; onChange?: (v: boolean) => void }) {
  const [internal, setInternal] = useState(defaultOn);
  const on = checked ?? internal;
  return (
    <button type="button" onClick={() => { if (checked === undefined) setInternal((v) => !v); onChange?.(!on); }} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {desc ? <p className="text-[11.5px] text-ink-muted">{desc}</p> : null}
      </div>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-ink/15')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function StatPill({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
      <span className={cn('block font-display text-2xl font-bold tabular', tone)}>{value}</span>
      <span className="text-[11px] font-semibold text-ink-muted">{label}</span>
    </div>
  );
}
