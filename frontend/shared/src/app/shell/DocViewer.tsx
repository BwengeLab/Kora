import * as Dialog from '@radix-ui/react-dialog';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Printer,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GlassSurface, IconButton } from '../../design-system';
import { useDocViewerStore } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

// The dedicated document viewer — a modal "view box" used everywhere a doc can
// be opened (evidence, audit packs, statements). The preview is representative
// (real bytes come from the object store later); the chrome (zoom, download,
// print, page ref, evidence seal) is real.
export function DocViewer() {
  const doc = useDocViewerStore((s) => s.doc);
  const close = useDocViewerStore((s) => s.close);
  const open = doc !== null;

  const ext = doc?.name.split('.').pop()?.toUpperCase() ?? 'PDF';
  const Icon = ext === 'XLSX' || ext === 'CSV' ? FileSpreadsheet : ext === 'PNG' || ext === 'JPG' ? ImageIcon : FileText;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[95] flex h-[82vh] w-[min(880px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-white/55 px-5 py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate font-display text-[15px] font-bold text-ink">
                {doc?.name}
              </Dialog.Title>
              <p className="truncate text-[11.5px] text-ink-muted">
                {[doc?.kind, doc?.sizeText, doc?.pageRef, doc?.context].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <IconButton variant="ghost" size="sm" label="Zoom out"><ZoomOut /></IconButton>
              <IconButton variant="ghost" size="sm" label="Zoom in"><ZoomIn /></IconButton>
              <IconButton variant="ghost" size="sm" label="Fit"><Maximize2 /></IconButton>
              <span className="mx-1 h-5 w-px bg-ink/10" />
              <IconButton variant="ghost" size="sm" label="Print" onClick={() => toast({ tone: 'info', title: 'Sent to print', body: doc?.name })}>
                <Printer />
              </IconButton>
              <IconButton variant="glass" size="sm" label="Download" onClick={() => toast({ tone: 'success', title: 'Download started', body: doc?.name })}>
                <Download />
              </IconButton>
              <Dialog.Close asChild>
                <IconButton variant="ghost" size="sm" label="Close"><X /></IconButton>
              </Dialog.Close>
            </div>
          </header>

          {/* Document canvas */}
          <div className="scrollbar-thin flex-1 overflow-auto bg-[#e9edf6] p-6">
            <GlassSurface noBlur tone="strong" className="mx-auto w-[640px] max-w-full bg-white p-10 shadow-glass-lg">
              <MockPage name={doc?.name ?? ''} context={doc?.context} ext={ext} />
            </GlassSurface>
          </div>

          {/* Footer */}
          <footer className="flex items-center gap-2 border-t border-white/55 px-5 py-2.5">
            <ShieldCheck className="size-4 text-success" />
            <span className="text-[11.5px] font-semibold text-ink-soft">
              Evidence document · integrity verified · opening is logged to the audit trail
            </span>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// A representative document body so the viewer reads like a real one.
function MockPage({ name, context, ext }: { name: string; context?: string | undefined; ext: string }) {
  if (ext === 'XLSX' || ext === 'CSV') {
    return (
      <div className="font-mono text-[11px]">
        <p className="mb-4 font-display text-base font-bold text-ink">{name}</p>
        <div className="overflow-hidden rounded-lg ring-1 ring-ink/10">
          {Array.from({ length: 9 }).map((_, r) => (
            <div key={r} className={`grid grid-cols-4 ${r === 0 ? 'bg-ink/5 font-bold' : r % 2 ? 'bg-ink/[0.02]' : ''}`}>
              {Array.from({ length: 4 }).map((__, c) => (
                <span key={c} className="truncate border-b border-r border-ink/10 px-2 py-1.5 text-ink-soft">
                  {r === 0 ? ['Date', 'Reference', 'Party', 'Amount'][c] : <span className="inline-block h-2 w-[70%] rounded bg-ink/10" />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-start justify-between border-b-2 border-ink/80 pb-4">
        <div>
          <p className="font-display text-xl font-bold text-ink">{name.replace(/\.[^.]+$/, '')}</p>
          {context ? <p className="text-[12px] text-ink-muted">{context}</p> : null}
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-ink-muted">
          Kora<br />Evidence preview
        </div>
      </div>
      <div className="mt-6 space-y-2.5">
        {[100, 92, 96, 70].map((w, i) => (
          <div key={i} className="h-2.5 rounded bg-ink/10" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-ink/[0.03] p-3 ring-1 ring-ink/10">
            <div className="mb-2 h-2 w-1/3 rounded bg-ink/15" />
            <div className="h-2 w-2/3 rounded bg-ink/10" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2.5">
        {[88, 100, 84, 95, 60].map((w, i) => (
          <div key={i} className="h-2.5 rounded bg-ink/10" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-8 flex items-end justify-between border-t border-ink/15 pt-4">
        <div className="h-10 w-32 rounded bg-ink/[0.04] ring-1 ring-ink/10" />
        <p className="text-[10px] text-ink-muted">Page 1 of 1</p>
      </div>
    </div>
  );
}
