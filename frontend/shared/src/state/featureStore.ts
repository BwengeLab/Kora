import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Per-tenant unlockable features ("vertical packs" / add-ons). The Org Admin
// turns these on; the rest of the app reacts (nav, routes, custom roles).
// Persisted so an unlock survives reload — like a real entitlement.

export type FeatureId = 'insurance-claims';

export interface FeatureDef {
  id: FeatureId;
  name: string;
  vertical: string;
  tagline: string;
  benefits: string[];
  unlocks: string[];
}

export const FEATURE_CATALOG: FeatureDef[] = [
  {
    id: 'insurance-claims',
    name: 'Insurance Claims',
    vertical: 'Insurance',
    tagline: 'End-to-end claims handling with an AI Claims agent — FNOL to settlement, reconciled and audited.',
    benefits: [
      'AI triage, fraud scoring & suggested reserves (you decide — never silent on money)',
      'Claim payment ↔ bank ↔ policy reconciliation built in',
      'Settlement approval limits + segregation of duties',
      'Cuts cycle time and leakage; regulator-ready evidence trail',
    ],
    unlocks: ['Claims workspace', 'Claims Officer role', 'Claims AI agent'],
  },
];

interface FeatureState {
  enabled: FeatureId[];
  isEnabled: (id: FeatureId) => boolean;
  hydrate: (enabled: FeatureId[]) => void;
  unlock: (id: FeatureId) => void;
  lock: (id: FeatureId) => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      enabled: [],
      isEnabled: (id) => get().enabled.includes(id),
      hydrate: (enabled) => set({ enabled: Array.isArray(enabled) ? enabled : [] }),
      unlock: (id) => set((s) => (s.enabled.includes(id) ? s : { enabled: [...s.enabled, id] })),
      lock: (id) => set((s) => ({ enabled: s.enabled.filter((x) => x !== id) })),
    }),
    { name: 'kora.features' },
  ),
);

// Synchronous read for module-load-time checks (e.g. route resolution).
export function isFeatureEnabled(id: FeatureId): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('kora.features') : null;
    if (!raw) return false;
    const enabled = (JSON.parse(raw) as { state?: { enabled?: string[] } })?.state?.enabled ?? [];
    return enabled.includes(id);
  } catch {
    return false;
  }
}
