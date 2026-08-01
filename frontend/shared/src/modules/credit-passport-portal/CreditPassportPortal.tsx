import { Download, Loader2, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { downloadPortalCreditPassport, fetchPortalCreditPassport } from '../../api/portal';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { AffordabilityCard } from './AffordabilityCard';
import { EvidenceScopeCard } from './EvidenceScopeCard';
import { ScoreCard } from './ScoreCard';
import { TrendsCard } from './TrendsCard';
import { useState } from 'react';
import { CANONICAL_BLUEPRINT_IDS } from '../../auth/catalog';

// External Collaborator "Shared Portal" â€” a lender's Credit Passport view.
// Few permissions, premium experience: score, trends, affordability, evidence.
export function CreditPassportPortal() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const blueprintID = useSessionStore((s) => s.session?.roles[0]?.blueprintId);
  const isExternal = blueprintID === CANONICAL_BLUEPRINT_IDS.EXTERNAL_COLLABORATOR;
  const [downloading, setDownloading] = useState(false);
  const { data } = useQuery({
    queryKey: ['portal-credit-passport', token],
    queryFn: ({ signal }) => fetchPortalCreditPassport(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const p = data?.passport ?? {};
  const grant = data?.grant ?? [];
  const subScores = data?.subScores ?? [];
  const trends = data?.trends ?? {}Trends;
  const affordability = data?.affordability ?? {};
  const evidencePack = data?.evidencePack ?? [];

  const downloadPassport = async () => {
    setDownloading(true);
    try {
      const file = await downloadPortalCreditPassport(apiBaseUrl, token);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'kora-credit-passport.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ tone: 'success', title: 'Passport downloaded', body: 'The consent-scoped Credit Passport PDF is ready.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Download failed', body: error instanceof Error ? error.message : 'Could not download the Credit Passport.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${p.tenant} · Credit Passport`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-ink-soft ring-1 ring-white/70">
              <Share2 className="size-3" /> {isExternal ? 'Shared with you' : 'Verified internal profile'}
            </span>
            {isExternal ? <>by {p.sharedBy} · expires in {grant.expiresInDays} days</> : <>updated {p.updated} · evidence-backed</>}
          </span>
        }
        right={
          <button
            type="button"
            disabled={downloading}
            onClick={() => void downloadPassport()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download passport
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
