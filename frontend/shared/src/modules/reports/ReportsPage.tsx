import {
  BarChart3,
  Briefcase,
  CreditCard,
  Download,
  FileWarning,
  Inbox,
  Play,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { seedReports, type ReportDef, type ReportKind } from '../../seed/ownerExtra';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

const ICON: Record<ReportKind, LucideIcon> = {
  executive: Briefcase,
  board: BarChart3,
  exception: FileWarning,
  collections: Inbox,
  supplier: Truck,
  credit: CreditCard,
  audit: ShieldCheck,
};
const TONE: Record<ReportKind, string> = {
  executive: 'bg-brand-soft text-brand-ink',
  board: 'bg-ai-soft text-ai',
  exception: 'bg-warning-soft text-warning',
  collections: 'bg-info-soft text-info',
  supplier: 'bg-lavender-soft text-lavender',
  credit: 'bg-success-soft text-success',
  audit: 'bg-danger-soft text-danger',
};

// Org Owner "Reports" — the report library (doc §Reports).
export function ReportsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Reports"
        subtitle={<>Decision-ready outputs — generate, schedule and export. Every report is evidence-backed.</>}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {seedReports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </section>
      </div>
    </div>
  );
}

function ReportCard({ report: r }: { report: ReportDef }) {
  const Icon = ICON[r.kind];
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <span className={cn('grid size-11 place-items-center rounded-2xl', TONE[r.kind])}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14.5px] font-bold text-ink">{r.name}</p>
          <p className="truncate text-[11.5px] text-ink-muted">{r.schedule} · last {r.lastGenerated}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => toast({ tone: 'success', title: 'Report generated', body: `${r.name} is ready.` })}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110"
        >
          <Play className="size-3.5" /> Generate
        </button>
        <button
          type="button"
          onClick={() => openDoc({ name: `${r.name}.pdf`, kind: 'report', context: r.schedule })}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink"
        >
          <Download className="size-3.5" /> View
        </button>
      </div>
    </GlassSurface>
  );
}
