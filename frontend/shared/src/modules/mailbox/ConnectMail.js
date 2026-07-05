import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from '@tanstack/react-query';
import { Check, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { connectMailbox } from '../../api/accountMailbox';
import { getApiBaseUrl } from '../../api/client';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { MAIL_PROVIDERS } from '../../seed/mail';
import { toast } from '../../state/toastStore';
export function ConnectMail() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const queryClient = useQueryClient();
    const [provider, setProvider] = useState(MAIL_PROVIDERS[0].id);
    const [email, setEmail] = useState(session?.user.email ?? '');
    const submit = async () => {
        if (!email.trim()) {
            toast({ tone: 'warning', title: 'Enter your email' });
            return;
        }
        if (!session?.token)
            return;
        try {
            await connectMailbox(apiBaseUrl, session.token, email, provider);
            await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
            toast({ tone: 'success', title: 'Mailbox connected', body: `${email} is now linked to Kora.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Connect failed', body: error instanceof Error ? error.message : 'Could not connect mailbox.' });
        }
    };
    return (_jsx("div", { className: "px-8 pb-8 pt-2", children: _jsx(GlassSurface, { tone: "strong", className: "mx-auto grid min-h-[64vh] max-w-xl place-items-center p-10", children: _jsxs("div", { className: "flex w-full max-w-md flex-col items-center gap-4 text-center", children: [_jsx("span", { className: "grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft", children: _jsx(Mail, { className: "size-7" }) }), _jsx("h2", { className: "font-display text-2xl font-bold text-ink", children: "Link your work email" }), _jsx("p", { className: "text-[14px] leading-relaxed text-ink-muted", children: "Send and receive business mail inside Kora - collections reminders, document requests and partner correspondence, all tied to your work." }), _jsxs("div", { className: "flex w-full flex-col gap-2 text-left", children: [_jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Provider" }), _jsx("div", { className: "grid grid-cols-1 gap-2", children: MAIL_PROVIDERS.map((item) => (_jsxs("button", { type: "button", onClick: () => setProvider(item.id), className: cn('flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] font-semibold ring-1 transition-colors', provider === item.id ? 'bg-white text-ink ring-brand/30' : 'bg-white/55 text-ink-soft ring-white/60 hover:bg-white'), children: [item.name, provider === item.id ? _jsx(Check, { className: "size-4 text-brand" }) : null] }, item.id))) }), _jsx("label", { className: "mt-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Email address" }), _jsx("input", { value: email, onChange: (event) => setEmail(event.target.value), placeholder: "you@company.com", className: "h-11 rounded-2xl bg-white/70 px-4 text-[14px] text-ink placeholder:text-ink-muted ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" })] }), _jsx("button", { type: "button", onClick: () => void submit(), className: "mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[14px] font-bold text-white shadow-glass-soft hover:brightness-110", children: "Connect mailbox" }), _jsxs("p", { className: "inline-flex items-center gap-1.5 text-[11px] text-ink-muted", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Read-scoped, revocable, and never shared across tenants."] })] }) }) }));
}
