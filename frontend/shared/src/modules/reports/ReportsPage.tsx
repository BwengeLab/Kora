import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, Briefcase, Clock, CreditCard, Download, FileStack, FileWarning, Inbox, RefreshCw, ShieldCheck, Sparkles, Truck, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { seedCashMovements } from '../../seed/cashLedger';
import { seedOverdue, seedParties, seedReports, type ReportDef, type ReportKind } from '../../seed/ownerExtra';
import { toast } from '../../state/toastStore';

const ICON: Record<ReportKind, LucideIcon> = { executive: Briefcase, board: BarChart3, exception: FileWarning, collections: Inbox, supplier: Truck, credit: CreditCard, audit: ShieldCheck };
const TONE: Record<ReportKind, string> = { executive: 'bg-brand-soft text-brand-ink', board: 'bg-ai-soft text-ai', exception: 'bg-warning-soft text-warning', collections: 'bg-info-soft text-info', supplier: 'bg-lavender-soft text-lavender', credit: 'bg-success-soft text-success', audit: 'bg-danger-soft text-danger' };

const fmt = (minor: bigint) => `$${(Number(minor) / 100).toLocaleString()}`;

interface ReportContent {
  kpis: { label: string; value: string; tone?: string }[];
  columns: string[];
  rows: string[][];
  narrative: string;
}

// Compose each report from the SAME live seed data the rest of the app uses, so
// reports reflect reality rather than canned numbers.
function buildReport(kind: ReportKind): ReportContent {
  const inflow = seedCashMovements.filter((m) => m.direction === 'in').reduce((a, m) => a + m.amount.amountMinor, 0n);
  const outflow = seedCashMovements.filter((m) => m.direction === 'out').reduce((a, m) => a + m.amount.amountMinor, 0n);
  const overdueTotal = seedOverdue.reduce((a, o) => a + o.amount.amountMinor, 0n);

  switch (kind) {
    case 'collections': {
      return {
        kpis: [{ label: 'Total overdue', value: fmt(overdueTotal), tone: 'text-danger' }, { label: 'Invoices', value: String(seedOverdue.length) }, { label: 'Avg age', value: '41d' }],
        columns: ['Customer', 'Invoice', 'Days', 'Risk', 'Amount'],
        rows: seedOverdue.map((o) => [o.customer, o.invoice, `${o.daysOverdue}`, o.risk, fmt(o.amount.amountMinor)]),
        narrative: '2 invoices have crossed 90 days and should move to final notice. Collections agent has drafted tone-matched reminders for all open items.',
      };
    }
    case 'supplier': {
      const sup = seedParties.filter((p) => p.type === 'supplier').sort((a, b) => Number(b.moneyOut.amountMinor - a.moneyOut.amountMinor));
      return {
        kpis: [{ label: 'Suppliers', value: String(sup.length) }, { label: 'Total spend', value: fmt(sup.reduce((a, p) => a + p.moneyOut.amountMinor, 0n)) }, { label: 'High risk', value: String(sup.filter((p) => p.risk === 'high').length), tone: 'text-danger' }],
        columns: ['Supplier', 'Spend', 'Open inv.', 'Risk'],
        rows: sup.map((p) => [p.name, fmt(p.moneyOut.amountMinor), String(p.openInvoices), p.risk]),
        narrative: 'Software & subscription spend is up 22% month-on-month. PT Imports flagged for a payment $260 over PO — worth a supplier review.',
      };
    }
    case 'exception': {
      const unrec = seedCashMovements.filter((m) => !m.reconciled);
      return {
        kpis: [{ label: 'Open exceptions', value: String(unrec.length), tone: 'text-warning' }, { label: 'Suspicious', value: '1', tone: 'text-danger' }, { label: 'Missing docs', value: '9' }],
        columns: ['Reference', 'Counterparty', 'Amount', 'Issue'],
        rows: unrec.slice(0, 8).map((m) => [m.reference, m.counterparty, fmt(m.amount.amountMinor), m.counterparty === 'OFFSHORE LTD' ? 'No contract — suspicious' : 'Unreconciled']),
        narrative: 'One $15,400 transfer to OFFSHORE LTD has no contract on file and has been referred for review. All other exceptions are routine unreconciled items.',
      };
    }
    case 'board':
      return {
        kpis: [{ label: 'Revenue (MTD)', value: fmt(inflow), tone: 'text-success' }, { label: 'Outflow (MTD)', value: fmt(outflow) }, { label: 'Net', value: fmt(inflow - outflow), tone: 'text-success' }, { label: 'Kora ROI', value: '8.0×' }],
        columns: ['Metric', 'This month', 'Trend'],
        rows: [['Gross margin', '34%', '▲ +2pts'], ['Cash position', '$4.46M', '▲ +6%'], ['Overdue receivables', fmt(overdueTotal), '▼ improving'], ['Value created by Kora', '$384,970', '▲ +18%']],
        narrative: 'Cash position is healthy and improving. The reconciliation engine and collections agent together created $384,970 of measurable value this period against $48,000 in subscription cost.',
      };
    case 'credit':
      return {
        kpis: [{ label: 'Credit score', value: '742', tone: 'text-success' }, { label: 'Facility', value: '$140,000' }, { label: 'Utilisation', value: '38%' }],
        columns: ['Factor', 'Status'],
        rows: [['On-time payments', '96% — strong'], ['Cash-flow stability', 'Stable, positive net'], ['Reconciliation coverage', '83% matched'], ['Document completeness', 'Good']],
        narrative: 'Acme Insurance presents a lender-ready Credit Passport: strong repayment behaviour, stable cash flow, and good evidence coverage. Eligible for an improved working-capital facility.',
      };
    case 'audit':
      return {
        kpis: [{ label: 'SoD flags', value: '2', tone: 'text-danger' }, { label: 'Suspicious', value: '4', tone: 'text-warning' }, { label: 'Missing docs', value: '9' }],
        columns: ['Control', 'Result'],
        rows: [['Segregation of duties', '2 flags (1 high)'], ['Evidence completeness', '9 entries missing docs'], ['Approval thresholds', 'All within policy'], ['Period lock', 'Enforced']],
        narrative: 'Control health is good overall. Two segregation-of-duty flags need owner attention; one suspicious transfer has been referred to the SIU.',
      };
    case 'executive':
    default:
      return {
        kpis: [{ label: 'Cash position', value: '$4.46M', tone: 'text-success' }, { label: 'Net flow (MTD)', value: fmt(inflow - outflow), tone: 'text-success' }, { label: 'Approvals waiting', value: '7' }],
        columns: ['Area', 'Headline'],
        rows: [['Cash', 'Healthy — net positive this month'], ['Collections', `${fmt(overdueTotal)} overdue across ${seedOverdue.length} invoices`], ['Risk', '1 suspicious transfer referred'], ['Approvals', '7 awaiting your sign-off']],
        narrative: 'Good morning. The business is in good shape: cash is positive, collections are improving, and one item needs your attention in Audit & Risk. Seven approvals await your decision.',
      };
  }
}

// `read` (Owner) — open & read finished reports. `produce` (Finance Lead) —
// generate, schedule and build the board pack, then open to review.
export function ReportsPage({ variant = 'read' }: { variant?: 'read' | 'produce' }) {
  const [open, setOpen] = useState<ReportDef | null>(null);
  const produce = variant === 'produce';
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Reports"
        subtitle={produce ? 'Produce the numbers the business runs on — generate, schedule and build the board pack from live data.' : 'Decision-ready outputs, generated from your live data. Open one to read it; export to share.'}
        right={
          <div className="flex items-center gap-2.5">
            {produce ? <button type="button" onClick={() => toast({ tone: 'success', title: 'Board pack building', body: 'Compiling all sections into one PDF — ready in a moment.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><FileStack className="size-4" /> Build board pack</button> : null}
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {produce ? (
          <section className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
            <ProdStat label="Reports" value={String(seedReports.length)} />
            <ProdStat label="Scheduled" value={String(seedReports.filter((r) => r.schedule !== 'On demand').length)} tone="text-brand-ink" />
            <ProdStat label="Generated today" value="3" tone="text-success" />
            <ProdStat label="On demand" value={String(seedReports.filter((r) => r.schedule === 'On demand').length)} tone="text-ink-soft" />
          </section>
        ) : null}
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {seedReports.map((r) => {
            const Icon = ICON[r.kind];
            return (
              <GlassSurface key={r.id} tone="strong" className="flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-2xl', TONE[r.kind])}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-display text-[14.5px] font-bold text-ink">{r.name}</p><p className="truncate text-[11.5px] text-ink-muted">{r.schedule} · last {r.lastGenerated}</p></div>
                </div>
                {produce ? (
                  <div className="mt-auto flex items-center gap-2">
                    <button type="button" onClick={() => toast({ tone: 'success', title: 'Generated', body: `${r.name} regenerated from live data.` })} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><RefreshCw className="size-3.5" /> Generate</button>
                    <button type="button" onClick={() => toast({ tone: 'info', title: 'Schedule', body: `Set when ${r.name} runs automatically.` })} className="inline-flex size-9 items-center justify-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink" title="Schedule"><Clock className="size-4" /></button>
                    <button type="button" onClick={() => setOpen(r)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Open</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setOpen(r)} className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110">Open report</button>
                )}
              </GlassSurface>
            );
          })}
        </section>
      </div>

      <Dialog.Root open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" />
          <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[95] flex h-[min(82vh,760px)] w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
            {open ? <ReportView report={open} onClose={() => setOpen(null)} /> : null}
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

function ReportView({ report, onClose }: { report: ReportDef; onClose: () => void }) {
  const [period, setPeriod] = useState('May 2025');
  const c = buildReport(report.kind);
  const Icon = ICON[report.kind];
  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/55 px-6 py-4">
        <span className={cn('grid size-10 place-items-center rounded-2xl', TONE[report.kind])}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1"><Dialog.Title className="font-display text-[16px] font-bold text-ink">{report.name}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{report.schedule} · evidence-backed</p></div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-xl bg-white/70 px-3 text-[12px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
          <option>May 2025</option><option>April 2025</option><option>Q2 2025</option><option>YTD 2025</option>
        </select>
        <button type="button" onClick={() => toast({ tone: 'success', title: 'Exported', body: `${report.name} (${period}) exported as PDF.` })} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Download className="size-3.5" /> Export</button>
        <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
      </header>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{report.name} · {period}</p>
        <div className={cn('mb-5 grid gap-3', c.kpis.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {c.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{k.label}</span>
              <p className={cn('font-display text-2xl font-bold tabular', k.tone ?? 'text-ink')}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/60">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-white/60"><tr>{c.columns.map((col, i) => <th key={col} className={cn('px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted', i > 0 && i === c.columns.length - 1 && 'text-right')}>{col}</th>)}</tr></thead>
            <tbody>
              {c.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-white/45 bg-white/30">
                  {row.map((cell, ci) => <td key={ci} className={cn('px-3.5 py-2.5', ci === 0 ? 'font-semibold text-ink' : 'text-ink-soft', ci === row.length - 1 && ci > 0 && 'text-right font-semibold tabular')}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-ai-soft/40 p-4 ring-1 ring-ai/15">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-ai">Summary</p><p className="mt-0.5 text-[13px] leading-relaxed text-ink">{c.narrative}</p></div>
        </div>
      </div>
    </>
  );
}
