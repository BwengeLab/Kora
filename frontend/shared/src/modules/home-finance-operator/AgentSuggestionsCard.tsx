import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Sparkles, X } from 'lucide-react';
import { ConfidenceChip, GlassSurface, MoneyCell, PartyAvatar } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';

// LIVE agent suggestions — reconciliations the agent matched that still need
// the operator. Accept prepares the match (creates an approval for the Finance
// Lead); Dismiss removes it from the list. Both give feedback.
export function AgentSuggestionsCard() {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const dismissed = useWorkflowStore((s) => s.dismissedReconIds);
  const prepareMatch = useWorkflowStore((s) => s.prepareMatch);
  const dismissSuggestion = useWorkflowStore((s) => s.dismissSuggestion);
  const session = useSession();
  const navigate = useNavigate();
  const actor = { name: session?.user.displayName ?? 'Operator', role: session?.roles[0]?.name ?? 'Finance Operator' };

  const suggestions = recons.filter(
    (r) => r.suggestedRecord && (r.stage === 'reviewing' || r.stage === 'detected') && !dismissed.includes(r.id),
  );

  const accept = (id: string, party: string) => {
    prepareMatch(id, actor);
    toast({ tone: 'success', title: 'Match prepared', body: `${party} sent to Finance Lead for approval.` });
  };

  const dismiss = (id: string) => {
    dismissSuggestion(id);
    toast({ tone: 'info', title: 'Suggestion dismissed', body: 'Removed from your review list.' });
  };

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
            <Sparkles className="size-4" />
          </span>
          <h3 className="font-display text-base font-bold text-ink">Agent suggestions</h3>
          <span className="rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-bold text-ai tabular">{suggestions.length}</span>
        </div>
        <Link to="/agents" className="text-xs font-semibold text-brand hover:text-brand-ink">View all</Link>
      </header>

      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {suggestions.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            <button
              type="button"
              onClick={() => navigate({ to: '/reconciliation' })}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <PartyAvatar name={r.transaction.counterparty} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-ink">{r.transaction.counterparty}</p>
                  <ConfidenceChip score={r.confidence} />
                </div>
                <p className="truncate text-[11px] text-ink-muted">
                  {r.suggestedRecord ? `Matches ${r.suggestedRecord.reference}` : r.reason}
                </p>
              </div>
              <MoneyCell amount={r.transaction.amount} size="sm" className="shrink-0 font-bold !text-[12.5px]" />
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Dismiss"
                title="Dismiss"
                onClick={() => dismiss(r.id)}
                className="grid size-8 place-items-center rounded-xl bg-white/70 text-ink-muted ring-1 ring-white/70 transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Accept and prepare"
                title="Accept & prepare"
                onClick={() => accept(r.id, r.transaction.counterparty)}
                className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft transition-transform hover:-translate-y-0.5"
              >
                <Check className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {suggestions.length === 0 ? (
          <li className="grid place-items-center gap-1 py-12 text-center">
            <Check className="size-7 text-success" />
            <p className="text-[13px] font-semibold text-ink">All suggestions reviewed</p>
            <p className="text-[12px] text-ink-muted">Nothing waiting on you right now.</p>
          </li>
        ) : null}
      </ul>
    </GlassSurface>
  );
}
