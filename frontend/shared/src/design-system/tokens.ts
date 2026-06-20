// Design tokens. The Tailwind theme mirrors these; component code should
// reach for the Tailwind classes (text-ink, bg-glass-surface, etc.) rather
// than reading these constants directly. They exist so non-Tailwind contexts
// (echarts color arrays, SVG fills) can stay in sync.

export const palette = {
  // Page surfaces
  backdrop: '#e8eef9',
  ink: '#0f1729',
  inkSoft: '#475063',
  inkMuted: '#7c8499',

  // Glass surfaces — semi-transparent whites + soft blues
  glassSurface: 'rgba(255, 255, 255, 0.55)',
  glassSurfaceStrong: 'rgba(255, 255, 255, 0.72)',
  glassSurfaceSubtle: 'rgba(255, 255, 255, 0.38)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.78)',

  // Accents
  primary: '#4361ee',
  primarySoft: '#dbe3ff',
  primaryInk: '#1e2c8e',

  lavender: '#9a8ce8',
  lavenderSoft: '#ece8ff',

  // Tones
  success: '#16a37b',
  successSoft: '#d6f5ea',
  warning: '#e89914',
  warningSoft: '#fcecd0',
  danger: '#dc4848',
  dangerSoft: '#fcdcdc',
  info: '#3b86ff',
  infoSoft: '#dbe9ff',
  ai: '#8b5cf6', // AI/agent accent
  aiSoft: '#ece6ff',
} as const;

// Confidence tiers — match the reconciliation pipeline (doc 06 §5):
//   95–100 auto · 70–94 suggested · <70 review.
export const confidenceTier = (score: number): 'auto' | 'suggested' | 'review' => {
  if (score >= 95) return 'auto';
  if (score >= 70) return 'suggested';
  return 'review';
};

// Chart color palette (kept short — long palettes look noisy on a glass surface).
export const chartColors = [palette.primary, palette.ai, palette.success, palette.warning, palette.lavender];
