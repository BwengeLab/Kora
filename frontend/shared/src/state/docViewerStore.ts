import { create } from 'zustand';

// A document to show in the shared viewer. Flexible shape so any "View"
// affordance (evidence, audit pack, statements…) can open it.
export interface ViewerDoc {
  name: string;
  kind?: string | undefined;
  sizeText?: string | undefined;
  pageRef?: string | undefined;
  /** short context line, e.g. "ACME Supplies · INV-10356" */
  context?: string | undefined;
}

interface DocViewerState {
  doc: ViewerDoc | null;
  open: (doc: ViewerDoc) => void;
  close: () => void;
}

export const useDocViewerStore = create<DocViewerState>((set) => ({
  doc: null,
  open: (doc) => set({ doc }),
  close: () => set({ doc: null }),
}));

export const openDoc = (doc: ViewerDoc) => useDocViewerStore.getState().open(doc);
