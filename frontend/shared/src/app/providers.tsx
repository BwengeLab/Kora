import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, type ReactNode } from 'react';
import { initApi } from '../api/client';
import { fetchFeatureEntitlements } from '../api/features';
import { fetchFinanceOperations } from '../api/financeOperations';
import { fetchCurrentSession, sessionTokenKey } from '../api/session';
import { fetchWorkflowSnapshot } from '../api/workflow';
import { registerCanonicalBlueprints } from '../blueprints/canonical';
import { initI18n } from '../i18n';
import { PlatformProvider } from '../platform/context';
import type { Platform } from '../platform/types';
import { createQueryClient } from '../state/queryClient';
import { useFeatureStore } from '../state/featureStore';
import { useGLStore } from '../state/glStore';
import { usePayablesStore } from '../state/payablesStore';
import { useSessionStore } from '../state/sessionStore';
import { useTransactionsStore } from '../state/transactionsStore';
import { useUiStore } from '../state/uiStore';
import { useWorkflowStore } from '../state/workflowStore';
import type { Session } from '../auth/types';
import { PERMISSIONS } from '../auth/catalog';

export interface AppProvidersProps {
  platform: Platform;
  apiBaseUrl: string;
  children: ReactNode;
}

function hasPermission(session: Session, permission: string): boolean {
  return session.permissions.some((grant) => grant.permission === permission);
}

export function AppProviders({ platform, apiBaseUrl, children }: AppProvidersProps) {
  const queryClient = useMemo(() => createQueryClient(), []);
  const hydrateWorkflow = useWorkflowStore((s) => s.hydrate);
  const hydrateFeatures = useFeatureStore((s) => s.hydrate);
  const hydrateGL = useGLStore((s) => s.hydrate);
  const hydratePayables = usePayablesStore((s) => s.hydrate);
  const hydrateTransactions = useTransactionsStore((s) => s.hydrate);

  useMemo(() => {
    initApi({ baseUrl: apiBaseUrl });
    initI18n('en');
    registerCanonicalBlueprints();
  }, [apiBaseUrl]);

  // Seed-first bootstrap so route guards have a session on first paint. Then
  // replace it with a real backend-backed session immediately.
  useEffect(() => {
    const controller = new AbortController();
    const tokenKey = sessionTokenKey();
    const hydrateAuthorizedStores = async (session: Session) => {
      if (hasPermission(session, PERMISSIONS.EVENTS_READ)) {
        try {
          const snapshot = await fetchWorkflowSnapshot(apiBaseUrl, session.token, controller.signal);
          hydrateWorkflow(snapshot);
        } catch {}
        try {
          const finance = await fetchFinanceOperations(apiBaseUrl, session.token, controller.signal);
          hydrateGL(finance.journals);
          hydratePayables(finance.bills);
          hydrateTransactions(finance.transactions);
        } catch {}
      }
      if (hasPermission(session, PERMISSIONS.TENANT_READ)) {
        try {
          const features = await fetchFeatureEntitlements(apiBaseUrl, session.token, controller.signal);
          hydrateFeatures(features.enabled);
        } catch {}
      }
    };
    const run = async () => {
      try {
        const persisted = await platform.store.get(tokenKey);
        if (persisted) {
          const session = await fetchCurrentSession(apiBaseUrl, persisted, controller.signal);
          useSessionStore.getState().setSession(session);
          await hydrateAuthorizedStores(session);
          return;
        }
        await platform.store.remove(tokenKey);
        useSessionStore.getState().setSession(null);
      } catch {
        await platform.store.remove(tokenKey);
        useSessionStore.getState().setSession(null);
      }
    };
    void run();
    return () => controller.abort();
  }, [apiBaseUrl, hydrateFeatures, hydrateGL, hydratePayables, hydrateTransactions, hydrateWorkflow, platform]);

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
