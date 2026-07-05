import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Pencil, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { createApprovalRule, deleteApprovalRule, fetchApprovalRules, updateApprovalRule } from '../../api/settingsAccess';
import { GlassSurface, cn } from '../../design-system';
import { entityName, seedEntities, type EntityScope } from '../../seed/entities';
import { APPROVER_ROLES, RULE_CATEGORIES, fmtBand, type ApprovalRule, type ApproverRole, type RuleCategory } from '../../seed/approvalPolicy';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { SettingsCard } from './primitives';

const blankRule = (): ApprovalRule => ({ id: `r-${Date.now()}`, label: 'New rule', scope: 'all', category: 'all', minAmount: 0, maxAmount: null, approvers: ['Finance Lead'], requireEvidence: true });

export function DoaMatrix() {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [editing, setEditing] = useState<ApprovalRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchApprovalRules(apiBaseUrl, token, controller.signal)
      .then(setRules)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast({ tone: 'warning', title: 'Rules unavailable', body: error instanceof Error ? error.message : 'Could not load approval rules.' });
        }
      });
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const openNew = () => { setEditing(blankRule()); setIsNew(true); };
  const openEdit = (rule: ApprovalRule) => { setEditing(rule); setIsNew(false); };
  const save = async (rule: ApprovalRule) => {
    try {
      const items = token
        ? isNew
          ? await createApprovalRule(apiBaseUrl, token, rule)
          : await updateApprovalRule(apiBaseUrl, token, rule)
        : isNew
          ? [...rules, rule]
          : rules.map((item) => (item.id === rule.id ? rule : item));
      setRules(items);
      setEditing(null);
      toast({ tone: 'success', title: isNew ? 'Rule added' : 'Rule saved', body: `"${rule.label}" is now active in the approval matrix.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Rule save failed', body: error instanceof Error ? error.message : 'Could not save approval rule.' });
    }
  };

  const remove = async (id: string, label: string) => {
    try {
      const items = token ? await deleteApprovalRule(apiBaseUrl, token, id) : rules.filter((rule) => rule.id !== id);
      setRules(items);
      toast({ tone: 'warning', title: 'Rule removed', body: `"${label}" deleted from the matrix.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Rule delete failed', body: error instanceof Error ? error.message : 'Could not remove approval rule.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsCard
        title="Delegation of Authority"
        desc="Who must approve what, up to which amount, for which entity. The workflow engine enforces these rules - change them here, no code."
        action={<button type="button" onClick={openNew} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> Add rule</button>}
      >
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/60">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] gap-3 bg-white/60 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span>Rule</span><span>Applies to</span><span>Amount band</span><span>Approval chain</span><span />
          </div>
          <ul>
            {rules.map((rule) => (
              <li key={rule.id} className="grid grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] items-center gap-3 border-t border-white/45 bg-white/30 px-4 py-3">
                <div className="min-w-0"><p className="truncate text-[13px] font-bold text-ink">{rule.label}</p><p className="text-[10.5px] text-ink-muted">{rule.requireEvidence ? 'Evidence required' : 'No evidence rule'}</p></div>
                <span className="text-[12px] text-ink-soft">{rule.category === 'all' ? 'All types' : cap(rule.category)} · {rule.scope === 'all' ? 'All entities' : entityName(rule.scope)}</span>
                <span className="text-[12.5px] font-semibold tabular text-ink">{fmtBand(rule)}</span>
                <div className="flex items-center gap-1">
                  {rule.approvers.map((approver, index) => (
                    <span key={approver} className="inline-flex items-center gap-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', index === 0 ? 'bg-brand-soft text-brand-ink' : 'bg-lavender-soft text-lavender')}>{shortRole(approver)}</span>
                      {index < rule.approvers.length - 1 ? <ArrowRight className="size-3 text-ink-muted" /> : null}
                    </span>
                  ))}
                  {rule.approvers.length >= 2 ? <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">dual</span> : null}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(rule)} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink" title="Edit"><Pencil className="size-3.5" /></button>
                  <button type="button" onClick={() => { void remove(rule.id, rule.label); }} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger" title="Delete"><Trash2 className="size-3.5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted"><ShieldCheck className="size-3.5" /> Segregation of duties always applies - a preparer can never approve their own item, whatever the matrix says.</p>
      </SettingsCard>

      <PolicySimulator rules={rules} />

      {editing ? <RuleEditor rule={editing} isNew={isNew} onCancel={() => setEditing(null)} onSave={save} /> : null}
    </div>
  );
}

function PolicySimulator({ rules }: { rules: ApprovalRule[] }) {
  const [amount, setAmount] = useState('120000');
  const [category, setCategory] = useState<RuleCategory>('all');
  const [scope, setScope] = useState<EntityScope>('all');
  const result = resolveChainFromRules(rules, parseFloat(amount || '0'), { category, scope });

  return (
    <SettingsCard title="Test the policy" desc="Enter a transaction and see exactly who would need to approve it.">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <Field label="Amount (USD)"><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value as RuleCategory)} className={inputCls}>{RULE_CATEGORIES.map((item) => <option key={item} value={item}>{item === 'all' ? 'All types' : cap(item)}</option>)}</select></Field>
        <Field label="Entity"><select value={scope} onChange={(event) => setScope(event.target.value as EntityScope)} className={inputCls}><option value="all">All entities</option>{seedEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></Field>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Requires</span>
          <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl bg-brand-soft/50 px-3 py-2 ring-1 ring-brand/15">
            {result.approvers.map((approver, index) => (
              <span key={approver} className="inline-flex items-center gap-1.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', index === 0 ? 'bg-white text-brand-ink' : 'bg-lavender-soft text-lavender')}>{approver}</span>
                {index < result.approvers.length - 1 ? <ArrowRight className="size-3.5 text-brand-ink" /> : null}
              </span>
            ))}
            <span className="ml-1 text-[11px] font-semibold text-ink-muted">{result.requiresDual ? '· dual approval' : '· single approval'}{result.rule ? ` · ${result.rule.label}` : ''}</span>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

function RuleEditor({ rule, isNew, onCancel, onSave }: { rule: ApprovalRule; isNew: boolean; onCancel: () => void; onSave: (rule: ApprovalRule) => void | Promise<void> }) {
  const [draft, setDraft] = useState<ApprovalRule>(rule);
  const set = <K extends keyof ApprovalRule>(key: K, value: ApprovalRule[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleApprover = (role: ApproverRole) => {
    const has = draft.approvers.includes(role);
    const next = has ? draft.approvers.filter((item) => item !== role) : [...draft.approvers, role];
    set('approvers', APPROVER_ROLES.filter((item) => next.includes(item)));
  };

  return (
    <Dialog.Root open onOpenChange={(value) => !value && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-center justify-between gap-3 border-b border-white/55 px-5 py-4">
            <Dialog.Title className="font-display text-[15px] font-bold text-ink">{isNew ? 'New approval rule' : 'Edit approval rule'}</Dialog.Title>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <Field label="Rule name"><input value={draft.label} onChange={(event) => set('label', event.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><select value={draft.category} onChange={(event) => set('category', event.target.value as RuleCategory)} className={inputCls}>{RULE_CATEGORIES.map((item) => <option key={item} value={item}>{item === 'all' ? 'All types' : cap(item)}</option>)}</select></Field>
              <Field label="Entity"><select value={draft.scope} onChange={(event) => set('scope', event.target.value as EntityScope)} className={inputCls}><option value="all">All entities</option>{seedEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min amount (USD)"><input value={String(draft.minAmount)} onChange={(event) => set('minAmount', parseFloat(event.target.value.replace(/[^0-9.]/g, '')) || 0)} inputMode="decimal" className={inputCls} /></Field>
              <Field label="Max amount (blank = ∞)"><input value={draft.maxAmount === null ? '' : String(draft.maxAmount)} onChange={(event) => { const value = event.target.value.replace(/[^0-9.]/g, ''); set('maxAmount', value === '' ? null : parseFloat(value)); }} inputMode="decimal" className={inputCls} /></Field>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Approval chain (in order)</span>
              <div className="mt-1.5 flex flex-col gap-2">
                {APPROVER_ROLES.map((role) => {
                  const on = draft.approvers.includes(role);
                  const pos = draft.approvers.indexOf(role);
                  return (
                    <button key={role} type="button" onClick={() => toggleApprover(role)} className={cn('flex items-center justify-between gap-3 rounded-2xl p-3 text-left ring-1 transition-colors', on ? 'bg-white ring-brand/30' : 'bg-white/55 ring-white/60 hover:bg-white/70')}>
                      <span className="flex items-center gap-2.5">
                        <span className={cn('grid size-6 place-items-center rounded-full text-[11px] font-bold', on ? 'bg-brand text-white' : 'bg-ink/10 text-ink-muted')}>{on ? pos + 1 : '-'}</span>
                        <span className="text-[13px] font-semibold text-ink">{role}</span>
                      </span>
                      <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-ink/15')}><span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} /></span>
                    </button>
                  );
                })}
              </div>
              {draft.approvers.length >= 2 ? <p className="mt-1.5 text-[11px] font-semibold text-warning">Dual/multi approval - {draft.approvers.length} signatures required.</p> : <p className="mt-1.5 text-[11px] text-ink-muted">Single approval.</p>}
            </div>
            <button type="button" onClick={() => set('requireEvidence', !draft.requireEvidence)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white/70">
              <div><p className="text-[13px] font-semibold text-ink">Require evidence</p><p className="text-[11px] text-ink-muted">Supporting document needed before approval.</p></div>
              <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', draft.requireEvidence ? 'bg-brand' : 'bg-ink/15')}><span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', draft.requireEvidence ? 'left-[18px]' : 'left-0.5')} /></span>
            </button>
          </div>
          <footer className="flex items-center gap-2 border-t border-white/55 p-4">
            <button type="button" onClick={onCancel} className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white">Cancel</button>
            <button type="button" disabled={draft.approvers.length === 0} onClick={() => { void onSave(draft); }} className={cn('inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold shadow-glass-soft', draft.approvers.length === 0 ? 'cursor-not-allowed bg-ink/15 text-ink-muted' : 'bg-gradient-to-br from-brand to-brand-ink text-white hover:brightness-110')}><Sparkles className="size-4" /> {isNew ? 'Add rule' : 'Save rule'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function resolveChainFromRules(rules: ApprovalRule[], amount: number, opts?: { category?: RuleCategory; scope?: EntityScope }) {
  const category = opts?.category ?? 'all';
  const scope = opts?.scope ?? 'all';
  const candidates = rules.filter((rule) =>
    amount >= rule.minAmount &&
    (rule.maxAmount === null || amount < rule.maxAmount) &&
    (rule.category === 'all' || rule.category === category) &&
    (rule.scope === 'all' || rule.scope === scope),
  );
  if (candidates.length === 0) return { approvers: ['Finance Lead'] as ApproverRole[], requiresDual: false, rule: null as ApprovalRule | null };
  const specificity = (rule: ApprovalRule) => (rule.category !== 'all' ? 1 : 0) + (rule.scope !== 'all' ? 1 : 0);
  const best = candidates.sort((a, b) => b.approvers.length - a.approvers.length || specificity(b) - specificity(a))[0]!;
  return { approvers: best.approvers, requiresDual: best.approvers.length >= 2, rule: best };
}

const inputCls = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}
const cap = (value: string) => value[0]!.toUpperCase() + value.slice(1);
const shortRole = (role: ApproverRole) => (role === 'Finance Lead' ? 'Lead' : role === 'Organization Owner' ? 'Owner' : 'Board');
