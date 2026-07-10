import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Source modules have generated JavaScript siblings in this workspace. Prefer
    // the TypeScript source so development and production builds use the code we edit.
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  // `open: true` launches the default browser at the app automatically on dev start.
  server: { port: 5173, strictPort: true, open: true },
});
