import { useMutation } from '@tanstack/react-query';
import { Check, Lock, Sparkles, Unlock } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { toggleFeatureEntitlement } from '../../api/features';
import { useSessionStore } from '../../state/sessionStore';
import { GlassSurface, cn } from '../../design-system';
import { FEATURE_CATALOG, useFeatureStore } from '../../state/featureStore';
import { toast } from '../../state/toastStore';

// The Org Admin's gateway to vertical packs / custom features. Unlocking one
// instantly activates it across the tenant (new workspace + custom role).
export function FeatureMarketplaceCard() {
  const enabled = useFeatureStore((s) => s.enabled);
  const hydrate = useFeatureStore((s) => s.hydrate);
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const mutation = useMutation({
    mutationFn: (featureID: (typeof FEATURE_CATALOG)[number]['id']) => toggleFeatureEntitlement(apiBaseUrl, token, featureID),
    onSuccess: (response) => hydrate(response.enabled),
  });

  return (
    <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
          <Sparkles className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Custom features &amp; vertical packs</h3>
        <span className="ml-auto text-xs font-semibold text-ink-muted">{enabled.length} active</span>
      </header>

      <ul className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
        {FEATURE_CATALOG.map((f) => {
          const on = enabled.includes(f.id);
          return (
            <li key={f.id} className="flex flex-col gap-3 rounded-3xl bg-white/55 p-4 ring-1 ring-white/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ai">{f.vertical}</span>
                    {on ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">Active</span> : null}
                  </div>
                  <p className="mt-1.5 font-display text-[15px] font-bold text-ink">{f.name}</p>
                  <p className="text-[12px] leading-snug text-ink-muted">{f.tagline}</p>
                </div>
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {f.unlocks.map((u) => (
                  <li key={u} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft ring-1 ring-white/70">
                    <Check className="size-3 text-success" /> {u}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await mutation.mutateAsync(f.id);
                    if (on) {
                      toast({ tone: 'warning', title: `${f.name} disabled`, body: 'The feature is no longer available to your team.' });
                    } else {
                      toast({ tone: 'success', title: `${f.name} activated`, body: 'The Claims workspace and Claims Officer role are now available to your team.' });
                    }
                  } catch (error) {
                    toast({ tone: 'danger', title: 'Feature update failed', body: error instanceof Error ? error.message : 'Could not update this feature.' });
                  }
                }}
                className={cn(
                  'inline-flex h-10 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold transition-all',
                  on
                    ? 'bg-white text-ink-soft ring-1 ring-white/70 hover:bg-danger-soft hover:text-danger'
                    : 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110',
                )}
              >
                {on ? <><Lock className="size-4" /> Disable</> : <><Unlock className="size-4" /> Unlock for my team</>}
              </button>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}
