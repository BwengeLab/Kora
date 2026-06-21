import { create } from 'zustand';

interface CopilotState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
