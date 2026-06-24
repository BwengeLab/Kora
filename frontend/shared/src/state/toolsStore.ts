import { create } from 'zustand';

interface ToolsState {
  isOpen: boolean;
  open: () => void;
  setOpen: (v: boolean) => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  setOpen: (isOpen) => set({ isOpen }),
}));
