// Ambient Vite env types — the shells (web/desktop) re-declare these in their
// own vite-env.d.ts; this file makes them visible to shared code too.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PREVIEW_ROLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
