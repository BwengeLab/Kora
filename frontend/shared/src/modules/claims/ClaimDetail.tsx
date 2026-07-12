import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, FileText, Forward, Lock, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { claimWorkspaceAction } from '../../api/claims';
import { getApiBaseUrl } from '../../api/client';
import { CLAIMS_PERMISSIONS } from '../../auth/catalog';
import { usePermissions, useSession } from '../../auth/hooks';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CLAIM_STAGES, type Claim, type ClaimStage } from '../../seed/claims';
import { useClaimsStore } from '../../state/claimsStore';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { ClaimsAgentPanel } from './ClaimsAgentPanel';
import { SEVERITY_TONE, TYPE_ICON, TYPE_TONE } from './claimMeta';

const STAGE_ORDER: ClaimStage[] = ['fnol', 'triage', 'adjusting', 'approval', 'settlement', 'closed'];
const SETTLE_LIMIT = 100000_00n;

export function ClaimDetail({ claimId }: { claimId: string }) {
  const claim = useClaimsStore((s) => s.claims.find((c) => c.id === claimId));
  const hydrateClaims = useClaimsStore((s) => s.hydrate);
  const session = useSession();
  const { can } = usePermissions();
  const apiBaseUrl = getApiBaseUrl();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ claimID, action }: { claimID: string; action: 'advance' | 'refer-siu' | 'request-docs' }) =>
      claimWorkspaceAction(apiBaseUrl, session!.token, claimID, action),
    onSuccess: (response) => {
      hydrateClaims(response.payload.claims);
      queryClient.setQueryData(['claims-workspace', session!.token], response.payload);
    },
  });
  const Icon = useMemo(() => (claim ? TYPE_ICON[claim.type] : FileText), [claim]);

  if (!claim) return <GlassSurface tone="strong" className="grid h-full place-items-center text-ink-muted">Select a claim</GlassSurface>;

  const stageIdx = STAGE_ORDER.indexOf(claim.stage);
  const overLimit = claim.suggestedSettlement.amountMinor > SETTLE_LIMIT;
  const canSettle = can(CLAIMS_PERMISSIONS.CLAIMS_SETTLE);

  const doAdvance = async () => {
    try {
      const response = await mutation.mutateAsync({ claimID: claim.id, action: 'advance' });
      const next = response.result as ClaimStage | 'unchanged';
      if (next !== 'unchanged') {
        const labels: Record<ClaimStage, string> = {
          fnol: 'FNOL',
          triage: 'Triage',
          adjusting: 'Adjusting',
          approval: 'Approval',
          settlement: 'Settlement',
          closed: 'Closed',
        };
        toast({ tone: next === 'closed' ? 'success' : 'info', title: `Moved to ${labels[next]}`, body: `${claim.claimant} · ${claim.id}` });
      }
    } catch (error) {
      toast({ tone: 'danger', title: 'Claim update failed', body: error instanceof Error ? error.message : 'Could not move this claim.' });
    }
  };

  const doReferSIU = async () => {
    try {
      await mutation.mutateAsync({ claimID: claim.id, action: 'refer-siu' });
      toast({ tone: 'danger', title: 'Referred to SIU', body: `${claim.id} flagged for fraud investigation.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'SIU referral failed', body: error instanceof Error ? error.message : 'Could not refer this claim.' });
    }
  };

  const doRequestDocs = async () => {
    try {
      await mutation.mutateAsync({ claimID: claim.id, action: 'request-docs' });
      toast({ tone: 'info', title: 'Documents requested', body: 'Request sent to the claimant.' });
    } catch (error) {
      toast({ tone: 'danger', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request documents.' });
    }
  };

  const primary: Record<ClaimStage, { label: string; sub: string } | null> = {
    fnol: { label: 'Register & triage', sub: 'validate policy -> triage' },
    triage: { label: 'Accept AI triage', sub: claim.triageFastTrack ? 'fast-track -> adjusting' : '-> adjusting' },
    adjusting: { label: 'Recommend settlement', sub: '-> approval' },
    approval: { label: overLimit ? 'Approve & settle (dual)' : 'Approve & settle', sub: overLimit ? 'over limit -> 2 approvers' : '-> settlement' },
    settlement: { label: 'Confirm payment & close', sub: 'reconcile -> closed' },
    closed: null,
  };
  const p = (claim.stage === 'approval' || claim.stage === 'settlement') && !canSettle ? null : primary[claim.stage];

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 px-7 pt-6">
        <PartyAvatar name={claim.claimant} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-[19px] font-bold text-ink">{claim.claimant}</h2>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_TONE[claim.triageSeverity])}>{claim.triageSeverity}</span>
          </div>
          <p className="text-[12.5px] text-ink-muted">{claim.id} · {claim.policyNumber} · reported {new Date(claim.reportedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', TYPE_TONE[claim.type])}><Icon className="size-5" /></span>
      </header>

      <div className="px-7 pt-5">
        <ol className="flex items-center gap-1">
          {CLAIM_STAGES.map((st, i) => {
            const done = i < stageIdx;
            const current = i === stageIdx;
            return (
              <li key={st.id} className="flex flex-1 items-center gap-1">
                <div className={cn('flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5', current ? 'border-brand/30 bg-brand-soft/70' : done ? 'border-success/20 bg-success-soft/50' : 'border-white/60 bg-white/35')}>
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold', done ? 'bg-success text-white' : current ? 'bg-brand text-white' : 'bg-white/70 text-ink-muted')}>
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn('truncate text-[11px] font-bold', current ? 'text-brand-ink' : done ? 'text-success' : 'text-ink-muted')}>{st.label}</span>
                </div>
                {i < CLAIM_STAGES.length - 1 ? <span className={cn('h-0.5 w-2 shrink-0 rounded-full', done ? 'bg-success/40' : 'bg-ink/10')} /> : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="scrollbar-thin mt-5 flex-1 space-y-5 overflow-y-auto px-7 pb-6">
        <ClaimsAgentPanel claim={claim} />

        <section className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          <Amount label="Claimed" money={claim.claimedAmount} />
          <Amount label="Deductible" money={claim.deductible} />
          <Amount label="Reserve" money={claim.reserve} />
          <Amount label="Recommended" money={claim.suggestedSettlement} highlight />
        </section>

        <section className="flex flex-wrap gap-3">
          <Status ok={claim.coverageOk} okText="Coverage confirmed" badText="Coverage in question" />
          {claim.paymentReconciled !== null ? <Status ok={claim.paymentReconciled} okText="Payment reconciled to bank" badText="Payment reconciling..." /> : null}
        </section>

        <section>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Evidence ({claim.evidence.length})</h4>
          <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
            {claim.evidence.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, context: `${claim.id} · ${claim.claimant}` })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink">{d.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">{d.kind} · {d.sizeText}</p>
                  </div>
                  <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-7 py-4">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[11.5px] font-semibold text-ink-muted ring-1 ring-white/60">
          <Lock className="size-3.5" /> Settlement is approval-gated · every step audited
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {claim.fraudScore >= 70 ? (
            <button type="button" onClick={() => void doReferSIU()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 hover:bg-danger-soft">
              <ShieldAlert className="size-4" /> Refer to SIU
            </button>
          ) : null}
          <button type="button" onClick={() => void doRequestDocs()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink">
            <Forward className="size-4" /> Request docs
          </button>
          {p ? (
            <button type="button" onClick={() => void doAdvance()} className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[14px] font-bold text-white shadow-[0_8px_22px_rgba(67,97,238,0.45)] hover:brightness-110">
              <Check className="size-[18px] shrink-0" />
              <span className="flex flex-col items-start leading-none">
                <span>{p.label}</span>
                <span className="text-[10px] font-medium text-white/85">{p.sub}</span>
              </span>
            </button>
          ) : claim.stage === 'closed' ? (
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-success-soft px-5 text-[14px] font-bold text-success">
              <Check className="size-[18px]" /> Closed
            </span>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-warning-soft px-5 text-[13px] font-bold text-warning">
              <Lock className="size-4" /> Awaiting finance approval
            </span>
          )}
        </div>
      </footer>
    </GlassSurface>
  );
}

function Amount({ label, money, highlight }: { label: string; money: Claim['claimedAmount']; highlight?: boolean }) {
  return (
    <div className={cn('rounded-2xl p-3.5 ring-1', highlight ? 'bg-brand-soft/60 ring-brand/20' : 'bg-white/55 ring-white/60')}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <MoneyCell amount={money} size="lg" className={cn('!text-lg', highlight && 'text-brand-ink')} />
    </div>
  );
}

function Status({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold', ok ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
      <Check className="size-3.5" /> {ok ? okText : badText}
    </span>
  );
}
