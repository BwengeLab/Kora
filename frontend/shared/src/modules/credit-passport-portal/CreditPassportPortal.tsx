import { Download, Share2 } from 'lucide-react';
import { PageHeader } from '../../app/shell';
import { seedGrant, seedPassport } from '../../seed/portalHome';
import { AffordabilityCard } from './AffordabilityCard';
import { EvidenceScopeCard } from './EvidenceScopeCard';
import { ScoreCard } from './ScoreCard';
import { TrendsCard } from './TrendsCard';

// External Collaborator "Shared Portal" — a lender's Credit Passport view.
// Few permissions, premium experience: score, trends, affordability, evidence.
export function CreditPassportPortal() {
  const p = seedPassport;
  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${p.tenant} · Credit Passport`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink-soft ring-1 ring-white/70">
              <Share2 className="size-3" /> Shared with you
            </span>
            by {p.sharedBy} · expires in {seedGrant.expiresInDays} days
          </span>
        }
        right={
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
            <Download className="size-4" /> Download passport
          </button>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* Score + sub-scores (hero) */}
        <ScoreCard />

        {/* Trends + affordability */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-2">
          <TrendsCard />
          <AffordabilityCard />
        </section>

        {/* Evidence + scope */}
        <EvidenceScopeCard />
      </div>
    </div>
  );
}
