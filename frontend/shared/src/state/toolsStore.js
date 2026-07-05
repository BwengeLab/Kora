import { create } from 'zustand';
export const useToolsStore = create((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    setOpen: (isOpen) => set({ isOpen }),
}));
