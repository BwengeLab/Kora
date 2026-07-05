import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResolvedBlueprint } from './renderer';
import { registerCanonicalBlueprints } from './canonical';
import { useSessionStore } from '../state/sessionStore';
import { seedSessions } from '../seed/sessions';
import { CANONICAL_ROLE_IDS } from '../auth/catalog';
beforeEach(() => {
    registerCanonicalBlueprints();
    useSessionStore.setState({ session: null });
});
describe('useResolvedBlueprint — canonical blueprints', () => {
    it('returns null blueprint when no session', () => {
        const { result } = renderHook(() => useResolvedBlueprint());
        expect(result.current.blueprint).toBeNull();
        expect(result.current.nav).toEqual([]);
    });
    it('Finance Operator nav excludes audit + approvals/financial-approve targets', () => {
        useSessionStore.setState({ session: seedSessions[CANONICAL_ROLE_IDS.FINANCE_OPERATOR] });
        const { result } = renderHook(() => useResolvedBlueprint());
        const ids = result.current.nav.map((n) => n.id);
        expect(ids).toContain('reconciliation');
        expect(ids).toContain('data_intake');
        expect(ids).not.toContain('audit');
        expect(ids).not.toContain('reports');
    });
    it('Auditor cannot resolve any nav requiring write permissions', () => {
        useSessionStore.setState({ session: seedSessions[CANONICAL_ROLE_IDS.AUDITOR] });
        const { result } = renderHook(() => useResolvedBlueprint());
        const ids = result.current.nav.map((n) => n.id);
        expect(ids).toContain('audit');
        expect(ids).toContain('consent');
        expect(ids).not.toContain('approvals');
        expect(ids).not.toContain('collections');
    });
    it('Org Admin has Settings tree but no finance approval', () => {
        useSessionStore.setState({ session: seedSessions[CANONICAL_ROLE_IDS.ORG_ADMIN] });
        const { result } = renderHook(() => useResolvedBlueprint());
        const settings = result.current.nav.find((n) => n.id === 'settings');
        expect(settings).toBeDefined();
        expect(settings?.children?.map((c) => c.id)).toEqual(expect.arrayContaining(['settings.users', 'settings.policies', 'settings.integrations']));
        const ids = result.current.nav.map((n) => n.id);
        expect(ids).not.toContain('approvals');
        expect(ids).not.toContain('ledger');
    });
    it('External Collaborator sees only the portal', () => {
        useSessionStore.setState({
            session: seedSessions[CANONICAL_ROLE_IDS.EXTERNAL_COLLABORATOR],
        });
        const { result } = renderHook(() => useResolvedBlueprint());
        const ids = result.current.nav.map((n) => n.id);
        expect(ids).toEqual(['portal.home', 'portal.credit_passport', 'portal.access']);
    });
    it('Org Owner nav is the curated 10-item set (no Contracts/Credit Passport/Consent/Settings)', () => {
        useSessionStore.setState({ session: seedSessions[CANONICAL_ROLE_IDS.ORG_OWNER] });
        const { result } = renderHook(() => useResolvedBlueprint());
        const ids = result.current.nav.map((n) => n.id);
        expect(ids).toEqual([
            'home',
            'approvals',
            'ledger',
            'reconciliation',
            'relationships',
            'agents',
            'audit',
            'roi',
            'reports',
            'collections',
        ]);
    });
    it('Super Admin sees only platform-plane nav', () => {
        useSessionStore.setState({ session: seedSessions[CANONICAL_ROLE_IDS.SUPER_ADMIN] });
        const { result } = renderHook(() => useResolvedBlueprint());
        const ids = result.current.nav.map((n) => n.id);
        expect(ids.every((id) => id.startsWith('platform.'))).toBe(true);
    });
});
