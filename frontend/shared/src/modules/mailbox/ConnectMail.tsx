import { useQueryClient } from '@tanstack/react-query';
import { Check, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { connectMailbox } from '../../api/accountMailbox';
import { getApiBaseUrl } from '../../api/client';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { toast } from '../../state/toastStore';

export function ConnectMail() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState(MAIL_PROVIDERS[0]!.id);
  const [email, setEmail] = useState(session?.user.email ?? '');

  const submit = async () => {
    if (!email.trim()) {
      toast({ tone: 'warning', title: 'Enter your email' });
      return;
    }
    if (!session?.token) return;
    try {
      await connectMailbox(apiBaseUrl, session.token, email, provider);
      await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
      toast({ tone: 'success', title: 'Mailbox connected', body: `${email} is now linked to Kora.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Connect failed', body: error instanceof Error ? error.message : 'Could not connect mailbox.' });
    }
  };

  return (
    <div className="px-8 pb-8 pt-2">
      <GlassSurface tone="strong" className="mx-auto grid min-h-[64vh] max-w-xl place-items-center p-10">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft"><Mail className="size-7" /></span>
          <h2 className="font-display text-2xl font-bold text-ink">Link your work email</h2>
          <p className="text-[14px] leading-relaxed text-ink-muted">Send and receive business mail inside Kora - collections reminders, document requests and partner correspondence, all tied to your work.</p>

          <div className="flex w-full flex-col gap-2 text-left">
            <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Provider</label>
            <div className="grid grid-cols-1 gap-2">
              {MAIL_PROVIDERS.map((item) => (
                <button key={item.id} type="button" onClick={() => setProvider(item.id)} className={cn('flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] font-semibold ring-1 transition-colors', provider === item.id ? 'bg-white text-ink ring-brand/30' : 'bg-white/55 text-ink-soft ring-white/60 hover:bg-white')}>
                  {item.name}
                  {provider === item.id ? <Check className="size-4 text-brand" /> : null}
                </button>
              ))}
            </div>
            <label className="mt-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Email address</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-2xl bg-white/70 px-4 text-[14px] text-ink placeholder:text-ink-muted ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>

          <button type="button" onClick={() => void submit()} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[14px] font-bold text-white shadow-glass-soft hover:brightness-110">
            Connect mailbox
          </button>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted"><ShieldCheck className="size-3.5" /> Read-scoped, revocable, and never shared across tenants.</p>
        </div>
      </GlassSurface>
    </div>
  );
}
