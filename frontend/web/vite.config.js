import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        // Prefer editable TypeScript sources when stale JavaScript siblings exist.
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
            '@shared': path.resolve(__dirname, '../shared/src'),
        },
    },
    // `open: true` launches the default browser at the app automatically on dev start.
    server: { port: 5173, strictPort: true, open: true },
});
