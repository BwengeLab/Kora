import { create } from 'zustand';
export const DEFAULT_UI_SCALE = 0.75;
export const MIN_UI_SCALE = 0.5;
export const MAX_UI_SCALE = 1.2;
const clampScale = (s) => Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, s));
export const useUiStore = create((set) => ({
    locale: 'en',
    // Collapsed (icon-rail) by default; the user expands it deliberately.
    sidebarOpen: false,
    uiScale: DEFAULT_UI_SCALE,
    setLocale: (locale) => set({ locale }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setUiScale: (scale) => set({ uiScale: clampScale(scale) }),
}));
