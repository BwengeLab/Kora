import { create } from 'zustand';
export const useCopilotStore = create((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((s) => ({ open: !s.open })),
}));
