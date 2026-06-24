import { create } from 'zustand';
import { seedIntake, type IntakeDoc } from '../seed/intake';

interface IntakeState {
  docs: IntakeDoc[];
  match: (id: string) => void;
  post: (id: string) => void;
  upload: (name: string) => void;
}

export const useIntakeStore = create<IntakeState>((set) => ({
  docs: seedIntake,
  match: (id) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, stage: 'matched' } : d)) })),
  post: (id) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, stage: 'posted' } : d)) })),
  upload: (name) =>
    set((s) => ({
      docs: [
        { id: `doc-${Date.now()}`, name, kind: 'invoice', source: 'upload', receivedAt: new Date().toISOString(), stage: 'extracting', sizeText: '— KB', fields: [{ label: 'Status', value: 'Extracting…', confidence: 0 }], suggestedMatch: undefined },
        ...s.docs,
      ],
    })),
}));
