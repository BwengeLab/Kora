import type { Config } from 'tailwindcss';
import { koraPreset } from '../tailwind.preset';

export default {
  presets: [koraPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
  plugins: [],
} satisfies Config;
