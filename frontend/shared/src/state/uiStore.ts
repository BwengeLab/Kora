import { create } from 'zustand';

type Locale = 'en' | 'fr' | 'rw';

interface UiState {
  locale: Locale;
  sidebarOpen: boolean;
  /**
   * App-controlled base zoom. 1 = native 100%. We default below 1 so the UI
   * opens at the compact density we design for (≈ what the browser shows at
   * ~80% manual zoom). The user zooming in/out compounds on top of this.
   */
  uiScale: number;
  setLocale: (l: Locale) => void;
  toggleSidebar: () => void;
  setUiScale: (scale: number) => void;
}

export const DEFAULT_UI_SCALE = 0.75;
export const MIN_UI_SCALE = 0.5;
export const MAX_UI_SCALE = 1.2;

const clampScale = (s: number) => Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, s));

export const useUiStore = create<UiState>((set) => ({
  locale: 'en',
  // Collapsed (icon-rail) by default; the user expands it deliberately.
  sidebarOpen: false,
  uiScale: DEFAULT_UI_SCALE,
  setLocale: (locale) => set({ locale }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setUiScale: (scale) => set({ uiScale: clampScale(scale) }),
}));
