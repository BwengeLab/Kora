import { useState, type ReactNode } from 'react';
import { Building2, KeyRound, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { registerEnterpriseSession, loginEnterpriseSession, demoLoginSession, sessionTokenKey } from '../../api/session';
import { useSetSession } from '../../auth/hooks';
import { GlassSurface } from '../../design-system';
import { toast } from '../../state/toastStore';
import type { Platform } from '../../platform/types';

export function EnterpriseAuthGate({ apiBaseUrl, platform }: { apiBaseUrl: string; platform: Platform }) {
  const setSession = useSetSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [businessEmail, setBusinessEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('Kora Customer');
  const [displayName, setDisplayName] = useState('Finance Lead');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const loginInput: { business_email: string; password?: string; invite_code?: string } = {
        business_email: businessEmail,
      };
      if (password.trim()) loginInput.password = password;
      if (inviteCode.trim()) loginInput.invite_code = inviteCode;
      const session =
        mode === 'register'
          ? await registerEnterpriseSession(apiBaseUrl, {
              organization_name: organizationName,
              business_email: businessEmail,
              display_name: displayName,
              password,
            })
          : await loginEnterpriseSession(apiBaseUrl, loginInput);
      await platform.store.set(sessionTokenKey(), session.token);
      setSession(session);
    } catch (error) {
      toast({
        tone: 'warning',
        title: mode === 'register' ? 'Registration failed' : 'Sign in failed',
        body: error instanceof Error ? error.message : 'Could not complete authentication.',
      });
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setBusy(true);
    try {
      const session = await demoLoginSession(apiBaseUrl, 'role.org_owner');
      await platform.store.set(sessionTokenKey(), session.token);
      setSession(session);
    } catch (error) {
      toast({ tone: 'warning', title: 'Demo sign-in failed', body: error instanceof Error ? error.message : 'Could not load demo session.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-backdrop px-6 py-10">
      <GlassSurface tone="strong" className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/60 md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand to-brand-ink p-10 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90">
                <Building2 className="size-3.5" /> Enterprise access
              </span>
              <div>
                <h1 className="font-display text-4xl font-bold">Sign in with your business email</h1>
                <p className="mt-3 max-w-lg text-[15px] leading-7 text-white/85">
                  Register the organization once, then invite real people by email. Every session stays tenant-scoped and audit logged.
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-[13px] text-white/90">
              <div className="inline-flex items-center gap-2"><ShieldCheck className="size-4" /> Domain-checked business email sign-in</div>
              <div className="inline-flex items-center gap-2"><UserPlus className="size-4" /> Invite codes for new members</div>
              <div className="inline-flex items-center gap-2"><KeyRound className="size-4" /> Demo mode remains available for development</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
          <div className="flex gap-2 rounded-2xl bg-white/60 p-1 text-[13px] font-bold">
            <button type="button" onClick={() => setMode('login')} className={tabCls(mode === 'login')}>Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={tabCls(mode === 'register')}>Register business</button>
          </div>

          <div className="grid gap-4">
            {mode === 'register' ? (
              <>
                <Field icon={<Building2 className="size-4" />} label="Organization name">
                  <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className={inputCls} placeholder="Kora Holdings Ltd." />
                </Field>
                <Field icon={<UserPlus className="size-4" />} label="Owner name">
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputCls} placeholder="Aline Mukamana" />
                </Field>
              </>
            ) : null}

            <Field icon={<Mail className="size-4" />} label="Business email">
              <input value={businessEmail} onChange={(event) => setBusinessEmail(event.target.value)} className={inputCls} placeholder="you@company.com" />
            </Field>
            {mode === 'register' ? (
              <Field icon={<KeyRound className="size-4" />} label="Password">
                <input value={password} onChange={(event) => setPassword(event.target.value)} className={inputCls} placeholder="Create a password" />
              </Field>
            ) : (
              <>
                <Field icon={<KeyRound className="size-4" />} label="Password">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} className={inputCls} placeholder="Enter your password" />
                </Field>
                <Field icon={<ShieldCheck className="size-4" />} label="Invite code">
                  <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} className={inputCls} placeholder="Optional invite code" />
                </Field>
              </>
            )}

            <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[14px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
              {mode === 'register' ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
              {busy ? 'Working...' : mode === 'register' ? 'Create organization' : 'Sign in'}
            </button>

            <button type="button" disabled={busy} onClick={() => void demo()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/75 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70">
              <ShieldCheck className="size-4 text-brand" /> Use demo workspace
            </button>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
}

function tabCls(active: boolean): string {
  return active
    ? 'flex-1 rounded-2xl bg-white px-3 py-2.5 text-ink shadow-glass-soft'
    : 'flex-1 rounded-2xl px-3 py-2.5 text-ink-soft hover:bg-white/70';
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls = 'h-11 rounded-2xl bg-white/75 px-4 text-[14px] text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
