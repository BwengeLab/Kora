import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { initApi } from '../api/client';
import { fetchFinanceOperations } from '../api/financeOperations';
import { demoLoginSession, fetchCurrentSession, sessionTokenKey } from '../api/session';
import { fetchWorkflowSnapshot } from '../api/workflow';
import { registerCanonicalBlueprints } from '../blueprints/canonical';
import { initI18n } from '../i18n';
import { PlatformProvider } from '../platform/context';
import { getSeedSession } from '../seed/sessions';
import { createQueryClient } from '../state/queryClient';
import { usePreviewRoleStore } from '../state/previewRoleStore';
import { useGLStore } from '../state/glStore';
import { usePayablesStore } from '../state/payablesStore';
import { useSessionStore } from '../state/sessionStore';
import { useTransactionsStore } from '../state/transactionsStore';
import { useUiStore } from '../state/uiStore';
import { useWorkflowStore } from '../state/workflowStore';
export function AppProviders({ platform, apiBaseUrl, children }) {
    const queryClient = useMemo(() => createQueryClient(), []);
    const hydrateWorkflow = useWorkflowStore((s) => s.hydrate);
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
    const previewRoleId = usePreviewRoleStore((s) => s.roleId);
    useEffect(() => {
        useSessionStore.getState().setSession(getSeedSession(previewRoleId));
    }, [previewRoleId]);
    useEffect(() => {
        const controller = new AbortController();
        const tokenKey = sessionTokenKey();
        const run = async () => {
            const isDev = typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.DEV) : false;
            try {
                if (isDev) {
                    const session = await demoLoginSession(apiBaseUrl, previewRoleId, controller.signal);
                    await platform.store.set(tokenKey, session.token);
                    useSessionStore.getState().setSession(session);
                    try {
                        const snapshot = await fetchWorkflowSnapshot(apiBaseUrl, session.token, controller.signal);
                        hydrateWorkflow(snapshot);
                    }
                    catch { }
                    try {
                        const finance = await fetchFinanceOperations(apiBaseUrl, session.token, controller.signal);
                        hydrateGL(finance.journals);
                        hydratePayables(finance.bills);
                        hydrateTransactions(finance.transactions);
                    }
                    catch { }
                    return;
                }
                const persisted = await platform.store.get(tokenKey);
                if (persisted) {
                    const session = await fetchCurrentSession(apiBaseUrl, persisted, controller.signal);
                    useSessionStore.getState().setSession(session);
                    try {
                        const snapshot = await fetchWorkflowSnapshot(apiBaseUrl, session.token, controller.signal);
                        hydrateWorkflow(snapshot);
                    }
                    catch { }
                    try {
                        const finance = await fetchFinanceOperations(apiBaseUrl, session.token, controller.signal);
                        hydrateGL(finance.journals);
                        hydratePayables(finance.bills);
                        hydrateTransactions(finance.transactions);
                    }
                    catch { }
                    return;
                }
            }
            catch {
                await platform.store.remove(tokenKey);
                if (isDev) {
                    try {
                        const session = await demoLoginSession(apiBaseUrl, previewRoleId, controller.signal);
                        await platform.store.set(tokenKey, session.token);
                        useSessionStore.getState().setSession(session);
                        try {
                            const snapshot = await fetchWorkflowSnapshot(apiBaseUrl, session.token, controller.signal);
                            hydrateWorkflow(snapshot);
                        }
                        catch { }
                        try {
                            const finance = await fetchFinanceOperations(apiBaseUrl, session.token, controller.signal);
                            hydrateGL(finance.journals);
                            hydratePayables(finance.bills);
                            hydrateTransactions(finance.transactions);
                        }
                        catch { }
                    }
                    catch {
                        useSessionStore.getState().setSession(getSeedSession(previewRoleId));
                    }
                }
            }
        };
        void run();
        return () => controller.abort();
    }, [apiBaseUrl, hydrateGL, hydratePayables, hydrateTransactions, hydrateWorkflow, platform, previewRoleId]);
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
    return (_jsx(PlatformProvider, { platform: platform, children: _jsx(QueryClientProvider, { client: queryClient, children: children }) }));
}
