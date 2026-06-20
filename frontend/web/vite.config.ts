import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  // `open: true` launches the default browser at the app automatically on dev start.
  server: { port: 5173, strictPort: true, open: true },
});
