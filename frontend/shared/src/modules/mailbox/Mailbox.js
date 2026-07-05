import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Inbox, Mail, PenSquare, Reply, Search, Send, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../app/shell';
import { fetchMailbox, markMailboxMessageRead, toggleMailboxMessageStar } from '../../api/accountMailbox';
import { getApiBaseUrl } from '../../api/client';
import { useSession } from '../../auth/hooks';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { ComposeModal } from './ComposeModal';
import { ConnectMail } from './ConnectMail';
const FOLDERS = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'archive', label: 'Archive', icon: Archive },
];
const EMPTY = [];
const LABEL_TONE = {
    collections: 'bg-warning-soft text-warning',
    claims: 'bg-info-soft text-info',
    approval: 'bg-brand-soft text-brand-ink',
    audit: 'bg-danger-soft text-danger',
    general: 'bg-white/70 text-ink-soft',
};
export function Mailbox() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['mailbox', session?.user.email],
        queryFn: ({ signal }) => fetchMailbox(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const connected = data?.connected ?? false;
    const messages = data?.messages ?? EMPTY;
    const account = data?.account ?? null;
    const [folder, setFolder] = useState('inbox');
    const [selectedId, setSelectedId] = useState(null);
    const [query, setQuery] = useState('');
    const [compose, setCompose] = useState(false);
    const [reply, setReply] = useState(undefined);
    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return messages
            .filter((message) => message.folder === folder)
            .filter((message) => (q === '' ? true : [message.subject, message.fromName, message.toName, message.preview].some((value) => value.toLowerCase().includes(q))))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [messages, folder, query]);
    const selected = messages.find((message) => message.id === selectedId) ?? list[0] ?? null;
    const unread = messages.filter((message) => message.folder === 'inbox' && !message.read).length;
    const markRead = async (messageId) => {
        if (!session?.token)
            return;
        await markMailboxMessageRead(apiBaseUrl, session.token, messageId);
        await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
    };
    const toggleStar = async (messageId) => {
        if (!session?.token)
            return;
        await toggleMailboxMessageStar(apiBaseUrl, session.token, messageId);
        await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
    };
    if (!connected)
        return _jsx(ConnectMail, {});
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Mail", subtitle: _jsxs(_Fragment, { children: ["Connected as ", _jsx("span", { className: "font-semibold text-ink", children: account }), " - your work inbox, inside Kora."] }), right: _jsxs("button", { type: "button", onClick: () => { setReply(undefined); setCompose(true); }, className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(PenSquare, { className: "size-4" }), " Compose"] }) }), _jsxs("div", { className: "flex min-h-0 flex-1 gap-5 px-8 pb-6", children: [_jsx(GlassSurface, { tone: "strong", className: "flex w-[200px] shrink-0 flex-col gap-1 p-3", children: FOLDERS.map((item) => {
                            const count = item.id === 'inbox' ? unread : messages.filter((message) => message.folder === item.id).length;
                            return (_jsxs("button", { type: "button", onClick: () => { setFolder(item.id); setSelectedId(null); }, className: cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors', folder === item.id ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-soft hover:bg-white/55 hover:text-ink'), children: [_jsx(item.icon, { className: "size-[18px]" }), _jsx("span", { className: "flex-1 text-left", children: item.label }), count > 0 ? _jsx("span", { className: cn('rounded-full px-1.5 text-[11px] font-bold', item.id === 'inbox' ? 'bg-brand text-white' : 'text-ink-muted'), children: count }) : null] }, item.id));
                        }) }), _jsxs(GlassSurface, { tone: "strong", className: "flex w-[340px] shrink-0 flex-col", children: [_jsx("div", { className: "p-3", children: _jsxs("div", { className: "flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search mail...", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }) }), _jsxs("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto", children: [list.map((message) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => { setSelectedId(message.id); if (!message.read)
                                                void markRead(message.id); }, className: cn('flex w-full flex-col gap-1 border-b border-white/40 px-4 py-3 text-left transition-colors', selected?.id === message.id ? 'bg-white' : 'hover:bg-white/55', !message.read && folder === 'inbox' && 'bg-brand-soft/30'), children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: cn('flex-1 truncate text-[13px]', message.read ? 'font-semibold text-ink-soft' : 'font-bold text-ink'), children: folder === 'sent' ? message.toName : message.fromName }), _jsx("span", { className: "shrink-0 text-[10.5px] text-ink-muted", children: new Date(message.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })] }), _jsx("p", { className: cn('truncate text-[12.5px]', message.read ? 'text-ink-soft' : 'font-semibold text-ink'), children: message.subject }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: message.preview }), message.label ? _jsxs("span", { className: cn('mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', LABEL_TONE[message.label]), children: [message.label, message.agentDrafted ? ' · AI' : ''] }) : null] }) }, message.id))), list.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No messages." }) : null] })] }), _jsx(GlassSurface, { tone: "strong", className: "flex min-w-0 flex-1 flex-col", children: selected ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start gap-3 border-b border-white/55 px-6 py-4", children: [_jsx(PartyAvatar, { name: folder === 'sent' ? selected.toName : selected.fromName, size: "lg" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h2", { className: "font-display text-lg font-bold text-ink", children: selected.subject }), _jsxs("p", { className: "text-[12.5px] text-ink-muted", children: [folder === 'sent' ? `To ${selected.toName} <${selected.toEmail}>` : `${selected.fromName} <${selected.fromEmail}>`, " \u00B7 ", new Date(selected.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] }), _jsx("button", { type: "button", onClick: () => void toggleStar(selected.id), "aria-label": "Star", className: cn('grid size-9 place-items-center rounded-xl', selected.starred ? 'text-warning' : 'text-ink-muted hover:bg-white/60'), children: _jsx(Star, { className: cn('size-4', selected.starred && 'fill-current') }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 overflow-y-auto px-6 py-5", children: [selected.agentDrafted ? (_jsxs("p", { className: "mb-3 inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai", children: [_jsx(Sparkles, { className: "size-3.5" }), " Drafted by Kora"] })) : null, _jsx("p", { className: "whitespace-pre-wrap text-[14px] leading-relaxed text-ink", children: selected.body })] }), _jsx("footer", { className: "flex items-center gap-2 border-t border-white/55 px-6 py-3.5", children: _jsxs("button", { type: "button", onClick: () => { setReply({ toName: selected.fromName, toEmail: selected.fromEmail, subject: `Re: ${selected.subject}` }); setCompose(true); }, className: "inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Reply, { className: "size-4" }), " Reply"] }) })] })) : (_jsx("div", { className: "grid flex-1 place-items-center text-ink-muted", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx(Mail, { className: "size-8" }), _jsx("p", { className: "text-[13px]", children: "Select a message" })] }) })) })] }), _jsx(ComposeModal, { open: compose, onOpenChange: setCompose, prefill: reply })] }));
}
