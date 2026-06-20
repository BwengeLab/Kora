import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// One className helper used across the design system. clsx handles the
// conditional/array forms; tailwind-merge resolves conflicting Tailwind
// classes so the latest one wins (e.g. `p-3 p-4` → `p-4`).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
