import type { Config } from 'tailwindcss';
import containerQueries from '@tailwindcss/container-queries';

// The single source of truth for Kora's Tailwind theme. Both the web and the
// desktop shells consume this via `presets: [koraPreset]`, so the design
// language can never drift between the two clients. Each shell only supplies
// its own `content` globs.
export const koraPreset = {
  plugins: [containerQueries],
  theme: {
    extend: {
      colors: {
        backdrop: '#e8eef9',
        ink: {
          DEFAULT: '#0f1729',
          soft: '#475063',
          muted: '#7c8499',
        },
        glass: {
          surface: 'rgba(255, 255, 255, 0.58)',
          strong: 'rgba(255, 255, 255, 0.74)',
          subtle: 'rgba(255, 255, 255, 0.40)',
          border: 'rgba(255, 255, 255, 0.70)',
          'border-strong': 'rgba(255, 255, 255, 0.90)',
        },
        brand: {
          DEFAULT: '#4361ee',
          soft: '#dbe3ff',
          ink: '#1e2c8e',
        },
        lavender: { DEFAULT: '#9a8ce8', soft: '#ece8ff' },
        success: { DEFAULT: '#16a37b', soft: '#d6f5ea' },
        warning: { DEFAULT: '#e89914', soft: '#fcecd0' },
        danger: { DEFAULT: '#dc4848', soft: '#fcdcdc' },
        info: { DEFAULT: '#3b86ff', soft: '#dbe9ff' },
        ai: { DEFAULT: '#8b5cf6', soft: '#ece6ff' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontFeatureSettings: {
        tabular: '"tnum", "lnum"',
      },
      borderRadius: {
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '26px',
        '4xl': '32px',
      },
      boxShadow: {
        // Soft diffuse drop + a bright inner top edge — the frosted-glass look.
        glass:
          '0 10px 34px -14px rgba(31, 45, 110, 0.20), 0 2px 8px -4px rgba(31, 45, 110, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
        'glass-lg':
          '0 22px 56px -18px rgba(31, 45, 110, 0.26), 0 4px 14px -6px rgba(31, 45, 110, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
        'glass-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
        'glass-soft': '0 6px 22px -12px rgba(31, 45, 110, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
      },
      backdropBlur: {
        // Stronger blur = more of the watery backdrop refracts through the
        // translucent surface (the "liquid glass" read).
        glass: '28px',
        'glass-lg': '40px',
      },
    },
  },
} satisfies Partial<Config>;

export default koraPreset;
