import { create } from 'zustand';
import { seedClaims, type Claim, type ClaimStage } from '../seed/claims';

// Live claims state — advancing a claim through its lifecycle actually mutates
// here, so the pipeline counts and queue update. Mirrors the trust spine:
// the Claims agent proposes; the officer advances; settlement is gated.

const ORDER: ClaimStage[] = ['fnol', 'triage', 'adjusting', 'approval', 'settlement', 'closed'];

const cloneClaims = (claims: Claim[]): Claim[] =>
  claims.map((c) => ({
    ...c,
    fraudFlags: [...c.fraudFlags],
    evidence: c.evidence.map((doc) => ({ ...doc })),
  }));

const clone = (): Claim[] => cloneClaims(seedClaims);

interface ClaimsState {
  initialClaims: Claim[];
  claims: Claim[];
  hydrate: (claims: Claim[]) => void;
  loadClaims: (claims: Claim[]) => void;
  advance: (id: string) => ClaimStage | null;
  referSIU: (id: string) => void;
  reset: () => void;
}

export const useClaimsStore = create<ClaimsState>((set, get) => ({
  initialClaims: clone(),
  claims: clone(),
  hydrate: (claims) => {
    const next = cloneClaims(claims);
    set({ initialClaims: next, claims: cloneClaims(next) });
  },
  loadClaims: (claims) => {
    const next = cloneClaims(claims);
    set({ initialClaims: next, claims: cloneClaims(next) });
  },
  advance: (id) => {
    const c = get().claims.find((x) => x.id === id);
    if (!c) return null;
    const i = ORDER.indexOf(c.stage);
    if (i < 0 || i >= ORDER.length - 1) return null;
    const next = ORDER[i + 1]!;
    set((s) => ({
      claims: s.claims.map((x) =>
        x.id === id
          ? { ...x, stage: next, slaText: next === 'closed' ? 'Closed' : x.slaText, paymentReconciled: next === 'closed' ? true : x.paymentReconciled }
          : x,
      ),
    }));
    return next;
  },
  referSIU: (id) => {
    set((s) => ({
      claims: s.claims.map((x) =>
        x.id === id ? { ...x, slaText: 'SIU review', fraudFlags: x.fraudFlags.includes('Referred to SIU') ? x.fraudFlags : [...x.fraudFlags, 'Referred to SIU'] } : x,
      ),
    }));
  },
  reset: () => set((state) => ({ claims: cloneClaims(state.initialClaims) })),
}));
