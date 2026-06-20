import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, type ReactNode } from 'react';
import { initApi } from '../api/client';
import { registerCanonicalBlueprints } from '../blueprints/canonical';
import { initI18n } from '../i18n';
import { PlatformProvider } from '../platform/context';
import type { Platform } from '../platform/types';
import { getSeedSession } from '../seed/sessions';
import { createQueryClient } from '../state/queryClient';
import { usePreviewRoleStore } from '../state/previewRoleStore';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';

export interface AppProvidersProps {
  platform: Platform;
  apiBaseUrl: string;
  children: ReactNode;
}

export function AppProviders({ platform, apiBaseUrl, children }: AppProvidersProps) {
  const queryClient = useMemo(() => createQueryClient(), []);

  useMemo(() => {
    initApi({ baseUrl: apiBaseUrl });
    initI18n('en');
    registerCanonicalBlueprints();
  }, [apiBaseUrl]);

  // Seed-first: hydrate the session from the currently-previewed role.
  // Switching the preview role swaps the session live (real auth replaces this).
  const previewRoleId = usePreviewRoleStore((s) => s.roleId);
  useEffect(() => {
    useSessionStore.getState().setSession(getSeedSession(previewRoleId));
  }, [previewRoleId]);

  // App-controlled base zoom. We apply CSS `zoom` on the document root (works
  // in browsers and the Tauri WebView2 alike) and expose the factor as a CSS
  // var so the full-height shell can divide by it and still fill the window.
  const uiScale = useUiStore((s) => s.uiScale);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-zoom', String(uiScale));
    root.style.zoom = String(uiScale);
    return () => {
      root.style.zoom = '';
      root.style.removeProperty('--app-zoom');
    };
  }, [uiScale]);

  return (
    <PlatformProvider platform={platform}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PlatformProvider>
  );
}
