import { create } from 'zustand';
export const useDocViewerStore = create((set) => ({
    doc: null,
    open: (doc) => set({ doc }),
    close: () => set({ doc: null }),
}));
export const openDoc = (doc) => useDocViewerStore.getState().open(doc);
