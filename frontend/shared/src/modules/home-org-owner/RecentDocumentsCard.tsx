import { FileSpreadsheet, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';

const EXT_ICON = {
  PDF: { Icon: FileText, tone: 'bg-danger-soft text-danger' },
  XLSX: { Icon: FileSpreadsheet, tone: 'bg-success-soft text-success' },
  CSV: { Icon: FileSpreadsheet, tone: 'bg-info-soft text-info' },
  PNG: { Icon: ImageIcon, tone: 'bg-lavender-soft text-lavender' },
} satisfies Record<DocSeed['ext'], { Icon: typeof FileText; tone: string }>;

export function RecentDocumentsCard({ documents }: { documents: DocSeed[] }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-3 p-5">
      <h3 className="font-display text-base font-semibold text-ink">Recent Documents</h3>
      <ul className="grid grid-cols-2 gap-2 @2xl:grid-cols-3 @5xl:grid-cols-6">
        {documents.map((document) => {
          const { Icon, tone } = EXT_ICON[document.ext];
          return (
            <li key={document.id}>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left ring-1 ring-white/70 hover:bg-white">
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', tone)}>
                  <Icon className="size-[16px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{document.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {document.ext} · {document.size} · {document.when}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white/40 p-3 text-left text-brand hover:bg-white/70">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Upload className="size-[16px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">Upload Document</p>
              <p className="text-[11px] font-medium text-ink-muted">
                Drag &amp; drop or <span className="underline">browse</span>
              </p>
            </div>
          </button>
        </li>
      </ul>
    </GlassSurface>
  );
}
