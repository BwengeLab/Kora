import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSession } from '../../auth/hooks';
import { cn } from '../../design-system';
import { useCopilotStore } from '../../state/copilotStore';
import { useWorkflowStore } from '../../state/workflowStore';
// The Kora AI copilot — a right-side sheet. Answers are derived from the live
// workflow state (a grounded, deterministic demo), so it reflects what's
// actually on screen rather than a canned script.
export function CopilotPanel() {
    const open = useCopilotStore((s) => s.open);
    const setOpen = useCopilotStore((s) => s.setOpen);
    const session = useSession();
    const approvals = useWorkflowStore((s) => s.approvals);
    const recons = useWorkflowStore((s) => s.reconciliations);
    const firstName = session?.user.displayName.split(' ')[0] ?? 'there';
    const roleName = session?.roles[0]?.name ?? '';
    const answer = useMemo(() => makeAnswerer(approvals, recons), [approvals, recons]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const prompts = [
        'What needs me today?',
        'How many approvals are waiting?',
        'Any suspicious activity?',
        'Summarize reconciliation status',
    ];
    const send = (text) => {
        if (!text.trim())
            return;
        const userMsg = { id: `u-${Date.now()}`, from: 'user', text };
        const koraMsg = { id: `k-${Date.now()}`, from: 'kora', text: answer(text) };
        setMessages((m) => [...m, userMsg, koraMsg]);
        setInput('');
    };
    return (_jsx(Dialog.Root, { open: open, onOpenChange: setOpen, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(420px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-white/55 px-5 py-4", children: [_jsx("span", { className: "grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-ai to-brand text-white shadow-[0_4px_12px_rgba(139,92,246,0.4)]", children: _jsx(Sparkles, { className: "size-5" }) }), _jsxs("div", { className: "flex-1", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: "Kora AI" }), _jsx("p", { className: "text-[11.5px] text-ink-muted", children: "Your finance copilot \u00B7 grounded in your data" })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-3 overflow-y-auto p-5", children: [messages.length === 0 ? (_jsxs("div", { className: "rounded-2xl bg-white/55 p-4 ring-1 ring-white/60", children: [_jsxs("p", { className: "text-[13.5px] font-semibold text-ink", children: ["Hi ", firstName, " \uD83D\uDC4B"] }), _jsxs("p", { className: "mt-1 text-[12.5px] text-ink-soft", children: ["I can see your live ", roleName, " workspace. Ask me anything, or try one of these:"] })] })) : null, messages.map((m) => (_jsx("div", { className: cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start'), children: _jsx("div", { className: cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed', m.from === 'user'
                                            ? 'bg-gradient-to-br from-brand to-brand-ink text-white'
                                            : 'bg-white/70 text-ink ring-1 ring-white/60'), children: m.text }) }, m.id)))] }), _jsx("div", { className: "flex flex-wrap gap-1.5 px-5 pb-2", children: prompts.map((p) => (_jsx("button", { type: "button", onClick: () => send(p), className: "rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-ink-soft ring-1 ring-white/60 hover:bg-white hover:text-ink", children: p }, p))) }), _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                send(input);
                            }, className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask Kora\u2026", className: "h-11 flex-1 rounded-2xl bg-white/70 px-4 text-[13px] text-ink placeholder:text-ink-muted ring-1 ring-white/60 focus:outline-none focus:ring-2 focus:ring-brand/30" }), _jsx("button", { type: "submit", "aria-label": "Send", className: "grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110", children: _jsx(ArrowUp, { className: "size-5" }) })] })] })] }) }));
}
// Deterministic, data-grounded responses.
function makeAnswerer(approvals, recons) {
    const pending = approvals.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
    const open = recons.filter((r) => r.stage === 'reviewing' || r.stage === 'detected');
    const suspicious = recons.filter((r) => r.tier === 'suspicious');
    const value = pending.reduce((acc, a) => acc + Number(a.amount.amountMinor) / 100, 0);
    return (q) => {
        const s = q.toLowerCase();
        if (s.includes('approv')) {
            return pending.length === 0
                ? 'Nothing is waiting for approval right now — you’re all clear.'
                : `${pending.length} approval${pending.length > 1 ? 's' : ''} are awaiting a decision, worth about $${value.toLocaleString()} in total. The highest-risk ones are flagged in red in your Action Center.`;
        }
        if (s.includes('suspicious') || s.includes('fraud') || s.includes('risk')) {
            return suspicious.length === 0
                ? 'No suspicious transactions are currently flagged. The Audit agent is monitoring continuously.'
                : `${suspicious.length} transaction${suspicious.length > 1 ? 's' : ''} are flagged suspicious — e.g. an unknown counterparty with no contract on file. I’d escalate these to the Auditor.`;
        }
        if (s.includes('reconcil') || s.includes('match')) {
            return `${open.length} reconciliation exception${open.length === 1 ? '' : 's'} still need attention. Auto-match rate is healthy; the suggested-tier items are ready for you to prepare.`;
        }
        if (s.includes('today') || s.includes('need')) {
            return `Today: ${open.length} reconciliation exceptions to clear and ${pending.length} approvals waiting. Start with the highest-confidence matches — they’re the fastest wins.`;
        }
        return `Here’s the picture: ${open.length} open reconciliations, ${pending.length} approvals awaiting, ${suspicious.length} suspicious flag${suspicious.length === 1 ? '' : 's'}. Ask me about any of these and I’ll drill in.`;
    };
}
