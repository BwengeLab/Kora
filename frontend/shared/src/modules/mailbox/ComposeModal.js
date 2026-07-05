import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sendMailboxMessage } from '../../api/accountMailbox';
import { getApiBaseUrl } from '../../api/client';
import { useSession } from '../../auth/hooks';
import { cn } from '../../design-system';
import { toast } from '../../state/toastStore';
export function ComposeModal({ open, onOpenChange, prefill }) {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const queryClient = useQueryClient();
    const [toName, setToName] = useState(prefill?.toName ?? '');
    const [toEmail, setToEmail] = useState(prefill?.toEmail ?? '');
    const [subject, setSubject] = useState(prefill?.subject ?? '');
    const [body, setBody] = useState(prefill?.body ?? '');
    const [agentDrafted, setAgentDrafted] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        setToName(prefill?.toName ?? '');
        setToEmail(prefill?.toEmail ?? '');
        setSubject(prefill?.subject ?? '');
        setBody(prefill?.body ?? '');
        setAgentDrafted(false);
    }, [open, prefill]);
    const submit = async () => {
        if (!toEmail.trim() || !subject.trim()) {
            toast({ tone: 'warning', title: 'Add a recipient and subject' });
            return;
        }
        if (!session?.token)
            return;
        try {
            await sendMailboxMessage(apiBaseUrl, session.token, { toName: toName || toEmail, toEmail, subject, body, agentDrafted });
            await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
            toast({ tone: 'success', title: 'Email sent', body: `To ${toName || toEmail}` });
            onOpenChange(false);
            setToName('');
            setToEmail('');
            setSubject('');
            setBody('');
            setAgentDrafted(false);
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Send failed', body: error instanceof Error ? error.message : 'Could not send email.' });
        }
    };
    const draftWithAi = () => {
        setBody(`Dear ${toName || 'partner'},\n\nI'm writing regarding ${subject || 'our account'}. [Kora drafted this opener - edit to suit.]\n\nKind regards,\nAcme Insurance`);
        setAgentDrafted(true);
        toast({ tone: 'info', title: 'Draft suggested', body: 'Kora drafted an opener - edit before sending.' });
    };
    return (_jsx(Dialog.Root, { open: open, onOpenChange: onOpenChange, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed bottom-5 right-5 z-[95] flex h-[560px] w-[min(520px,94vw)] flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-white/55 px-5 py-3.5", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: "New email" }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "flex flex-1 flex-col gap-2 p-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("input", { value: toName, onChange: (event) => setToName(event.target.value), placeholder: "Recipient name", className: field }), _jsx("input", { value: toEmail, onChange: (event) => setToEmail(event.target.value), placeholder: "email@company.com", className: field })] }), _jsx("input", { value: subject, onChange: (event) => setSubject(event.target.value), placeholder: "Subject", className: field }), _jsx("textarea", { value: body, onChange: (event) => setBody(event.target.value), placeholder: "Write your message...", className: cn(field, 'flex-1 resize-none py-2.5') })] }), _jsxs("footer", { className: "flex items-center justify-between gap-2 border-t border-white/55 p-4", children: [_jsxs("button", { type: "button", onClick: draftWithAi, className: "inline-flex h-10 items-center gap-2 rounded-xl bg-ai-soft px-3.5 text-[12.5px] font-bold text-ai hover:brightness-105", children: [_jsx(Sparkles, { className: "size-4" }), " Draft with Kora"] }), _jsxs("button", { type: "button", onClick: () => void submit(), className: "inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Send, { className: "size-4" }), " Send"] })] })] })] }) }));
}
const field = 'h-10 rounded-xl bg-white/70 px-3.5 text-[13px] text-ink placeholder:text-ink-muted ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
