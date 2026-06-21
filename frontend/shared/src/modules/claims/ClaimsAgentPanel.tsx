import { AlertTriangle, FileText, Gauge, Sparkles } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Claim } from '../../seed/claims';
import { SEVERITY_TONE, fraudTone } from './claimMeta';

// The Claims AI agent's output — document extraction, triage, fraud score and
// a suggested reserve. It PROPOSES; the officer decides (never silent on money).
export function ClaimsAgentPanel({ claim }: { claim: Claim }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-4 bg-gradient-to-br from-ai-soft/70 to-white/40 p-5 ring-1 ring-ai/15">
      <header className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
          <Sparkles className="size-4" />
        </span>
        <h3 className="font-display text-[15px] font-bold text-ink">Claims agent</h3>
        <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted ring-1 ring-white/70">
          AI proposes · you decide
        </span>
      </header>

      {/* Document-AI summary */}
      <div className="rounded-2xl bg-white/60 p-3.5 ring-1 ring-white/60">
        <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <FileText className="size-3.5" /> Extracted summary
        </p>
        <p className="text-[13px] leading-relaxed text-ink">{claim.aiSummary}</p>
      </div>

      {/* Triage + fraud + reserve */}
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
        <Tile label="Triage severity" icon={<Gauge className="size-4" />}>
          <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold uppercase', SEVERITY_TONE[claim.triageSeverity])}>
            {claim.triageSeverity}
          </span>
          <span className="mt-1 block text-[11px] text-ink-muted">{claim.triageFastTrack ? 'Eligible for fast-track' : 'Standard handling'}</span>
        </Tile>

        <Tile label="Fraud score" icon={<AlertTriangle className="size-4" />}>
          <span className={cn('inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold', fraudTone(claim.fraudScore))}>
            <span className="font-display text-base tabular">{claim.fraudScore}</span>/100
          </span>
          {claim.fraudFlags.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {claim.fraudFlags.slice(0, 3).map((f) => (
                <li key={f} className="text-[10.5px] font-medium text-danger">• {f}</li>
              ))}
            </ul>
          ) : (
            <span className="mt-1 block text-[11px] text-ink-muted">No fraud indicators</span>
          )}
        </Tile>

        <Tile label="Suggested reserve" icon={<Sparkles className="size-4" />}>
          <MoneyCell amount={claim.suggestedReserve} size="lg" className="!text-xl" />
          <span className="mt-1 block text-[11px] text-ink-muted">
            Settlement est. <MoneyCell amount={claim.suggestedSettlement} size="sm" className="!text-[11px] font-semibold" />
          </span>
        </Tile>
      </div>
    </GlassSurface>
  );
}

function Tile({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/60 p-3.5 ring-1 ring-white/60">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}
