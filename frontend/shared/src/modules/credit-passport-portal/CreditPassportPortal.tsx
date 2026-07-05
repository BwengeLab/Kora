import { Download, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchPortalCreditPassport } from '../../api/portal';
import { seedAffordability, seedEvidencePack, seedGrant, seedPassport, seedPassportTrends, seedSubScores } from '../../seed/portalHome';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { AffordabilityCard } from './AffordabilityCard';
import { EvidenceScopeCard } from './EvidenceScopeCard';
import { ScoreCard } from './ScoreCard';
import { TrendsCard } from './TrendsCard';

// External Collaborator "Shared Portal" â€” a lender's Credit Passport view.
// Few permissions, premium experience: score, trends, affordability, evidence.
export function CreditPassportPortal() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const { data } = useQuery({
    queryKey: ['portal-credit-passport', token],
    queryFn: ({ signal }) => fetchPortalCreditPassport(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const p = data?.passport ?? seedPassport;
  const grant = data?.grant ?? seedGrant;
  const subScores = data?.subScores ?? seedSubScores;
  const trends = data?.trends ?? seedPassportTrends;
  const affordability = data?.affordability ?? seedAffordability;
  const evidencePack = data?.evidencePack ?? seedEvidencePack;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${p.tenant} · Credit Passport`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink-soft ring-1 ring-white/70">
              <Share2 className="size-3" /> Shared with you
            </span>
            by {p.sharedBy} · expires in {grant.expiresInDays} days
          </span>
        }
        right={
          <button
            type="button"
            onClick={() => toast({ tone: 'success', title: 'Download started', body: 'Credit Passport (PDF) is being prepared.' })}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"
          >
            <Download className="size-4" /> Download passport
          </button>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <ScoreCard passport={p} subScores={subScores} />

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <TrendsCard trends={trends} />
          <AffordabilityCard affordability={affordability} />
        </section>

        <EvidenceScopeCard evidencePack={evidencePack} grant={grant} />
      </div>
    </div>
  );
}
