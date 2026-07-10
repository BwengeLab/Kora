import { CheckCircle2, Download, Scale, TrendingUp, Wallet2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { downloadFinancialStatementPack } from '../../api/financialStatements';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { entityName } from '../../seed/entities';
import { balanceSheet, cashFlow, incomeStatement, type StatementLine } from '../../state/glStore';
import { useEntityStore } from '../../state/entityStore';
import { useGLStore } from '../../state/glStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const M = (amountMinor: bigint): Money => ({ amountMinor, currency: 'USD' });
type Tab = 'pl' | 'bs' | 'cf';

// Financial statements — P&L, Balance Sheet and Cash Flow, all computed live from
// the posted journals. They tie out because the GL ties out: the balance sheet
// balances and net income flows from the P&L. This is the output of a real
// system of record, not seeded numbers.
export function FinancialStatements() {
  const scope = useEntityStore((s) => s.scope);
  const journals = useGLStore((s) => s.journals);
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const [tab, setTab] = useState<Tab>('pl');

  const pl = useMemo(() => incomeStatement(journals, scope), [journals, scope]);
  const bs = useMemo(() => balanceSheet(journals, scope), [journals, scope]);
  const cf = useMemo(() => cashFlow(journals, scope), [journals, scope]);

  const exportStatements = async () => {
    try {
      const blob = await downloadFinancialStatementPack(apiBaseUrl, token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'kora-financial-statements.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ tone: 'success', title: 'Export downloaded', body: 'Statement pack prepared from the backend ledger.' });
    } catch (error) {
      toast({ tone: 'danger', title: 'Export failed', body: error instanceof Error ? error.message : 'Could not export the statement pack.' });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Financial Statements"
        subtitle={<>Live from the ledger for <span className="font-semibold text-ink">{entityName(scope)}</span>{scope === 'all' ? ' (consolidated)' : ''} — they tie out because the books do.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => void exportStatements()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink"><Download className="size-4" /> Export</button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="flex gap-1 border-b border-white/55">
          {([['pl', 'Income statement', TrendingUp], ['bs', 'Balance sheet', Scale], ['cf', 'Cash flow', Wallet2]] as [Tab, string, typeof TrendingUp][]).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn('relative inline-flex items-center gap-1.5 px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}>
              <Icon className="size-4" /> {label}
              {tab === id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {tab === 'pl' ? (
            <Sheet title="Income statement · May 2025">
              <Group label="Revenue" lines={pl.revenue} />
              <Subtotal label="Total revenue" amount={pl.totalRevenue} />
              <Group label="Expenses" lines={pl.expenses} />
              <Subtotal label="Total expenses" amount={pl.totalExpense} />
              <Total label="Net income" amount={pl.netIncome} good={pl.netIncome >= 0n} />
            </Sheet>
          ) : null}

          {tab === 'bs' ? (
            <Sheet title="Balance sheet · as at May 31, 2025">
              <Group label="Assets" lines={bs.assets} />
              <Subtotal label="Total assets" amount={bs.totalAssets} />
              <Group label="Liabilities" lines={bs.liabilities} />
              <Subtotal label="Total liabilities" amount={bs.totalLiabilities} />
              <Group label="Equity" lines={bs.equity} extra={[{ code: 'NI', name: 'Net income (period)', amount: bs.netIncome }]} />
              <Subtotal label="Total equity" amount={bs.totalEquity} />
              <Total label="Liabilities + Equity" amount={bs.totalLiabilities + bs.totalEquity} />
              <div className={cn('mt-3 flex items-center gap-2 rounded-2xl p-3.5 ring-1', bs.balances ? 'bg-success-soft/50 ring-success/20' : 'bg-danger-soft/50 ring-danger/20')}>
                <CheckCircle2 className={cn('size-5', bs.balances ? 'text-success' : 'text-danger')} />
                <p className={cn('text-[13px] font-bold', bs.balances ? 'text-success' : 'text-danger')}>{bs.balances ? 'Balanced — Assets = Liabilities + Equity' : 'Out of balance'}</p>
              </div>
            </Sheet>
          ) : null}

          {tab === 'cf' ? (
            <Sheet title="Cash flow statement · May 2025">
              <Row label="Opening cash" amount={cf.opening} muted />
              <div className="mt-2" />
              <Row label="Operating activities" amount={cf.operating} />
              <Row label="Investing activities" amount={cf.investing} />
              <Row label="Financing activities" amount={cf.financing} />
              <Subtotal label="Net change in cash" amount={cf.netChange} signed />
              <Total label="Closing cash" amount={cf.closing} />
            </Sheet>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassSurface tone="strong" className="mx-auto max-w-3xl p-7">
      <h3 className="mb-4 font-display text-lg font-bold text-ink">{title}</h3>
      {children}
    </GlassSurface>
  );
}

function Group({ label, lines, extra }: { label: string; lines: StatementLine[]; extra?: StatementLine[] }) {
  const all = [...lines, ...(extra ?? [])];
  return (
    <div className="mt-4">
      <p className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <ul>
        {all.map((l) => (
          <li key={l.code} className="flex items-center justify-between gap-4 border-b border-white/40 py-2 text-[13px]">
            <span className="text-ink-soft">{l.code !== 'NI' ? <span className="font-mono text-[11px] text-ink-muted">{l.code} · </span> : null}{l.name}</span>
            <MoneyCell amount={M(l.amount)} size="sm" className="font-semibold !text-[13px]" />
          </li>
        ))}
        {all.length === 0 ? <li className="py-2 text-[12.5px] text-ink-muted">None.</li> : null}
      </ul>
    </div>
  );
}

function Row({ label, amount, muted, signed }: { label: string; amount: bigint; muted?: boolean; signed?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-[13px]">
      <span className={muted ? 'text-ink-muted' : 'font-medium text-ink'}>{label}</span>
      <MoneyCell amount={M(amount)} size="sm" className={cn('font-semibold !text-[13px]', muted && 'text-ink-muted')} showSign={signed ?? false} />
    </div>
  );
}

function Subtotal({ label, amount, signed }: { label: string; amount: bigint; signed?: boolean }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-4 rounded-xl bg-white/55 px-3 py-2">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <MoneyCell amount={M(amount)} size="sm" className="font-bold !text-[13px]" showSign={signed ?? false} />
    </div>
  );
}

function Total({ label, amount, good }: { label: string; amount: bigint; good?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-4 border-t-2 border-ink/15 pt-3">
      <span className="font-display text-[15px] font-bold text-ink">{label}</span>
      <MoneyCell amount={M(amount)} size="lg" className={cn('!text-xl font-bold', good === undefined ? 'text-ink' : good ? 'text-success' : 'text-danger')} showSign />
    </div>
  );
}
