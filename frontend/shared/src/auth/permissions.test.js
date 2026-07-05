import { describe, expect, it } from 'vitest';
import { can } from './permissions';
const base = {
    user: { id: 'u1', email: 'a@b.c', displayName: 'A' },
    tenant: { id: 't1', name: 'T' },
    roles: [],
    token: 'x',
    issuedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2099-01-01T00:00:00Z',
};
describe('can()', () => {
    it('returns false when no session', () => {
        expect(can(null, 'ledger.read')).toBe(false);
    });
    it('matches a global grant for any scope', () => {
        const session = { ...base, permissions: [{ permission: 'ledger.read', scope: { kind: 'global' } }] };
        expect(can(session, 'ledger.read')).toBe(true);
        expect(can(session, 'ledger.read', { kind: 'tenant', tenantId: 't1' })).toBe(true);
    });
    it('enforces tenant scope', () => {
        const session = {
            ...base,
            permissions: [{ permission: 'ledger.read', scope: { kind: 'tenant', tenantId: 't1' } }],
        };
        expect(can(session, 'ledger.read', { kind: 'tenant', tenantId: 't1' })).toBe(true);
        expect(can(session, 'ledger.read', { kind: 'tenant', tenantId: 't2' })).toBe(false);
    });
});
