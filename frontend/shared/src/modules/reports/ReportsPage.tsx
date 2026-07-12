import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Briefcase, Clock, CreditCard, Download, FileStack, FileWarning, Inbox, RefreshCw, ShieldCheck, Sparkles, Truck, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { buildBoardPack, exportReport, fetchReportDetail, fetchReports, generateReport, scheduleReport, type ReportContent } from '../../api/reports';
import { GlassSurface, cn } from '../../design-system';
import { seedReports, type ReportDef, type ReportKind } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const ICON: Record<ReportKind, LucideIcon> = { executive: Briefcase, board: BarChart3, exception: FileWarning, collections: Inbox, supplier: Truck, credit: CreditCard, audit: ShieldCheck };
const TONE: Record<ReportKind, string> = { executive: 'bg-brand-soft text-brand-ink', board: 'bg-ai-soft text-ai', exception: 'bg-warning-soft text-warning', collections: 'bg-info-soft text-info', supplier: 'bg-lavender-soft text-lavender', credit: 'bg-success-soft text-success', audit: 'bg-danger-soft text-danger' };

export function ReportsPage({ variant = 'read' }: { variant?: 'read' | 'produce' }) {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<ReportDef | null>(null);
  const { data } = useQuery({
    queryKey: ['reports', token],
    queryFn: ({ signal }) => fetchReports(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const reports = data ?? seedReports;
  const produce = variant === 'produce';
  const generateMutation = useMutation({
    mutationFn: (reportID: string) => generateReport(apiBaseUrl, token, reportID),
    onSuccess: (_, reportID) => {
      void queryClient.invalidateQueries({ queryKey: ['reports', token] });
      void queryClient.invalidateQueries({ queryKey: ['report-detail', token, reportID] });
      toast({ tone: 'success', title: 'Generated', body: 'Report regenerated from backend data.' });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Generate failed', body: error.message }),
  });
  const boardPackMutation = useMutation({
    mutationFn: () => buildBoardPack(apiBaseUrl, token),
    onSuccess: (blob) => {
      downloadFile(blob, 'kora-board-pack.pdf');
      toast({ tone: 'success', title: 'Board pack downloaded', body: 'The board pack was compiled from current backend reports.' });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Board pack failed', body: error.message }),
  });
  const scheduleMutation = useMutation({
    mutationFn: ({ reportID, schedule }: { reportID: string; schedule: string }) => scheduleReport(apiBaseUrl, token, reportID, schedule),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ['reports', token] });
      toast({ tone: 'success', title: 'Scheduled', body: `${report.name} now runs ${report.schedule}.` });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Schedule failed', body: error.message }),
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Reports"
        subtitle={produce ? 'Produce the numbers the business runs on - generate, schedule and build the board pack from backend data.' : 'Decision-ready outputs, generated from backend data. Open one to read it; export to share.'}
        right={
          <div className="flex items-center gap-2.5">
            {produce ? <button type="button" onClick={() => boardPackMutation.mutate()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><FileStack className="size-4" /> Build board pack</button> : null}
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {produce ? (
          <section className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
            <ProdStat label="Reports" value={String(reports.length)} />
            <ProdStat label="Scheduled" value={String(reports.filter((r) => r.schedule !== 'On demand').length)} tone="text-brand-ink" />
            <ProdStat label="Generated today" value="3" tone="text-success" />
            <ProdStat label="On demand" value={String(reports.filter((r) => r.schedule === 'On demand').length)} tone="text-ink-soft" />
          </section>
        ) : null}
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {reports.map((report) => {
            const Icon = ICON[report.kind];
            return (
              <GlassSurface key={report.id} tone="strong" className="flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-2xl', TONE[report.kind])}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-display text-[14.5px] font-bold text-ink">{report.name}</p><p className="truncate text-[11.5px] text-ink-muted">{report.schedule} · last {report.lastGenerated}</p></div>
                </div>
                {produce ? (
                  <div className="mt-auto flex items-center gap-2">
                    <button type="button" onClick={() => generateMutation.mutate(report.id)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><RefreshCw className="size-3.5" /> Generate</button>
                    <button type="button" onClick={() => scheduleMutation.mutate({ reportID: report.id, schedule: nextSchedule(report.schedule) })} className="inline-flex size-9 items-center justify-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink" title="Schedule"><Clock className="size-4" /></button>
                    <button type="button" onClick={() => setOpen(report)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Open</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setOpen(report)} className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110">Open report</button>
                )}
              </GlassSurface>
            );
          })}
        </section>
      </div>

      <Dialog.Root open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" />
          <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[95] flex h-[min(82vh,760px)] w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
            {open ? <ReportView report={open} /> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function ProdStat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <GlassSurface tone="strong" className="p-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className={cn('block font-display text-2xl font-bold tabular', tone)}>{value}</span>
    </GlassSurface>
  );
}

function ReportView({ report }: { report: ReportDef }) {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const [period, setPeriod] = useState('May 2025');
  const exportMutation = useMutation({
    mutationFn: () => exportReport(apiBaseUrl, token, report.id, period),
    onSuccess: (blob) => {
      const fileName = `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'}.pdf`;
      downloadFile(blob, fileName);
      toast({ tone: 'success', title: 'Report downloaded', body: `${report.name} for ${period} was exported from backend data.` });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Export failed', body: error.message }),
  });
  const { data } = useQuery({
    queryKey: ['report-detail', token, report.id],
    queryFn: ({ signal }) => fetchReportDetail(apiBaseUrl, token, report.id, signal),
    enabled: Boolean(token),
  });
  const content: ReportContent = data?.content ?? { kpis: [], columns: [], rows: [], narrative: '' };
  const periods = data?.periods ?? ['May 2025'];
  const Icon = ICON[report.kind];

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/55 px-6 py-4">
        <span className={cn('grid size-10 place-items-center rounded-2xl', TONE[report.kind])}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1"><Dialog.Title className="font-display text-[16px] font-bold text-ink">{report.name}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{report.schedule} · evidence-backed</p></div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-xl bg-white/70 px-3 text-[12px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
          {periods.map((entry) => <option key={entry}>{entry}</option>)}
        </select>
        <button type="button" onClick={() => exportMutation.mutate()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Download className="size-3.5" /> Export</button>
        <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
      </header>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{report.name} · {period}</p>
        <div className={cn('mb-5 grid gap-3', content.kpis.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {content.kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{kpi.label}</span>
              <p className={cn('font-display text-2xl font-bold tabular', kpi.tone ?? 'text-ink')}>{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/60">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-white/60"><tr>{content.columns.map((column, index) => <th key={column} className={cn('px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted', index > 0 && index === content.columns.length - 1 && 'text-right')}>{column}</th>)}</tr></thead>
            <tbody>
              {content.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-white/45 bg-white/30">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className={cn('px-3.5 py-2.5', cellIndex === 0 ? 'font-semibold text-ink' : 'text-ink-soft', cellIndex === row.length - 1 && cellIndex > 0 && 'text-right font-semibold tabular')}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-ai-soft/40 p-4 ring-1 ring-ai/15">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-ai">Summary</p><p className="mt-0.5 text-[13px] leading-relaxed text-ink">{content.narrative}</p></div>
        </div>
      </div>
    </>
  );
}

function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function nextSchedule(current: string) {
  if (current === 'On demand') return 'Weekly - Mon';
  if (current.startsWith('Weekly')) return 'Monthly';
  if (current === 'Monthly') return 'Daily';
  return 'On demand';
}
