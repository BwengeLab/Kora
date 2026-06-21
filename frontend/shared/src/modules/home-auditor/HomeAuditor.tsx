import { Download, Eye } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AuditLogFeedCard } from './AuditLogFeedCard';
import { ControlHealthCard } from './ControlHealthCard';
import { MissingDocsCard } from './MissingDocsCard';
import { RiskStatCards } from './RiskStatCards';
import { SodViolationsCard } from './SodViolationsCard';

// Auditor "Audit & Risk Command Center" home (doc 05). Read-only oversight:
// control health, the immutable audit feed, and what to investigate.
export function HomeAuditor() {
  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink-soft ring-1 ring-white/70">
              <Eye className="size-3" /> Read-only
            </span>
            Control health and what to investigate — independence by design.
          </span>
        }
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <Download className="size-4" /> Export audit pack
            </button>
            <DateRangePill label="May 12 – May 18, 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* Control health + risk stats */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-6"><ControlHealthCard /></div>
          <div className="@5xl:col-span-6"><RiskStatCards /></div>
        </section>

        {/* Audit feed + SoD violations */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><AuditLogFeedCard /></div>
          <div className="@5xl:col-span-5"><SodViolationsCard /></div>
        </section>

        {/* Missing documents */}
        <section>
          <MissingDocsCard />
        </section>
      </div>
    </div>
  );
}
