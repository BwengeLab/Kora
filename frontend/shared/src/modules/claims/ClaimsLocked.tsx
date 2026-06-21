import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react';
import { GlassSurface } from '../../design-system';
import { FEATURE_CATALOG } from '../../state/featureStore';

// Shown when the Insurance Claims pack hasn't been unlocked yet. Tells the user
// what it does and points them to the Org Admin to enable it.
export function ClaimsLocked() {
  const pack = FEATURE_CATALOG.find((f) => f.id === 'insurance-claims')!;
  return (
    <div className="px-8 pb-8 pt-2">
      <GlassSurface tone="strong" className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center p-10">
        <div className="flex max-w-lg flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-ai to-brand text-white shadow-[0_8px_22px_rgba(139,92,246,0.4)]">
            <Lock className="size-7" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1 text-[11px] font-bold text-ai">
            <Sparkles className="size-3.5" /> {pack.vertical} vertical pack
          </span>
          <h2 className="font-display text-2xl font-bold text-ink">{pack.name}</h2>
          <p className="text-[14px] leading-relaxed text-ink-muted">{pack.tagline}</p>
          <ul className="flex w-full flex-col gap-2 text-left">
            {pack.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 rounded-2xl bg-white/55 p-3 text-[12.5px] text-ink-soft ring-1 ring-white/60">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {b}
              </li>
            ))}
          </ul>
          <Link
            to="/settings/org"
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 py-3 text-[13.5px] font-bold text-white shadow-glass-soft hover:brightness-110"
          >
            Ask your Org Admin to unlock it <ArrowRight className="size-4" />
          </Link>
        </div>
      </GlassSurface>
    </div>
  );
}
