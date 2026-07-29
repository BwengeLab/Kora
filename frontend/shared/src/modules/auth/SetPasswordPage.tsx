import { useState } from 'react';
import { Building2, KeyRound, Eye, EyeOff, LogIn } from 'lucide-react';
import { setPasswordSession, sessionTokenKey } from '../../api/session';
import { useSetSession } from '../../auth/hooks';
import { GlassSurface } from '../../design-system';
import { toast } from '../../state/toastStore';
import type { Platform } from '../../platform/types';

export function SetPasswordPage({ apiBaseUrl, platform }: { apiBaseUrl: string; platform: Platform }) {
  const setSession = useSetSession();
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';
  const code = params.get('code') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!email || !code) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 py-10">
        <GlassSurface tone="strong" className="w-full max-w-md rounded-[28px] border border-white/60 p-10 text-center">
          <Building2 className="mx-auto mb-4 size-10 text-brand" />
          <h1 className="font-display text-2xl font-bold">Invalid invite link</h1>
          <p className="mt-2 text-sm text-ink-muted">This link is missing required information. Please ask your organization admin to send a new invitation.</p>
        </GlassSurface>
      </div>
    );
  }

  const submit = async () => {
    if (!password.trim()) {
      toast({ tone: 'warning', title: 'Password required', body: 'Please enter a password.' });
      return;
    }
    if (password.length < 8) {
      toast({ tone: 'warning', title: 'Password too short', body: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== confirm) {
      toast({ tone: 'warning', title: 'Passwords do not match', body: 'Please confirm the same password.' });
      return;
    }
    setBusy(true);
    try {
      const session = await setPasswordSession(apiBaseUrl, {
        business_email: email,
        invite_code: code,
        password,
      });
      await platform.store.set(sessionTokenKey(), session.token);
      setSession(session);
    } catch (error) {
      toast({
        tone: 'warning',
        title: 'Set password failed',
        body: error instanceof Error ? error.message : 'Could not set password. The invite code may have expired.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-10">
      <GlassSurface tone="strong" className="w-full max-w-md rounded-[28px] border border-white/60 p-10">
        <div className="mb-6 text-center">
          <Building2 className="mx-auto mb-3 size-10 text-brand" />
          <h1 className="font-display text-2xl font-bold">Set your password</h1>
          <p className="mt-1 text-sm text-ink-muted">
            You were invited as a member of <span className="font-semibold text-ink">{email}</span>
          </p>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <KeyRound className="size-3.5" /> New password
            </span>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-2xl bg-white/75 px-4 pr-10 text-[14px] text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <KeyRound className="size-3.5" /> Confirm password
            </span>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 rounded-2xl bg-white/75 px-4 text-[14px] text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Re-enter the password"
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[14px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="size-4" />
            {busy ? 'Setting password...' : 'Set password & sign in'}
          </button>
        </div>
      </GlassSurface>
    </div>
  );
}
