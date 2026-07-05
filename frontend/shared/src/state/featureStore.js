import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const FEATURE_CATALOG = [
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
export const useFeatureStore = create()(persist((set, get) => ({
    enabled: [],
    isEnabled: (id) => get().enabled.includes(id),
    unlock: (id) => set((s) => (s.enabled.includes(id) ? s : { enabled: [...s.enabled, id] })),
    lock: (id) => set((s) => ({ enabled: s.enabled.filter((x) => x !== id) })),
}), { name: 'kora.features' }));
// Synchronous read for module-load-time checks (e.g. route resolution).
export function isFeatureEnabled(id) {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('kora.features') : null;
        if (!raw)
            return false;
        const enabled = JSON.parse(raw)?.state?.enabled ?? [];
        return enabled.includes(id);
    }
    catch {
        return false;
    }
}
