import { create } from 'zustand';

type Locale = 'en' | 'fr' | 'rw';

interface UiState {
  locale: Locale;
  sidebarOpen: boolean;
  setLocale: (l: Locale) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  locale: 'en',
  // Collapsed (icon-rail) by default; the user expands it deliberately.
  sidebarOpen: false,
  setLocale: (locale) => set({ locale }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
