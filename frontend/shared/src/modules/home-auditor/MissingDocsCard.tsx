import { FileX2 } from 'lucide-react';
import { GlassSurface, MoneyCell } from '../../design-system';
import type { MissingDoc } from '../../types/api';

export function MissingDocsCard({ items = [] }: { items?: MissingDoc[] }) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-info-soft text-info">
          <FileX2 className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Missing documents</h3>
      </header>
      <ul className="flex flex-col">
        {items.map((d, i) => (
          <li key={d.id} className={i > 0 ? 'border-t border-white/55' : ''}>
            <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{d.party}</p>
                <p className="truncate text-[11px] text-ink-muted">{d.reference} · {d.ageText} old</p>
              </div>
              <span className="rounded-lg bg-info-soft px-2 py-0.5 text-[10.5px] font-bold text-info">{d.missing}</span>
              <MoneyCell amount={d.amount} size="sm" className="w-24 shrink-0 text-right font-bold !text-[12.5px]" />
            </button>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
