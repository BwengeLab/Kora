import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, Lock, Sparkles, Unlock } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { FEATURE_CATALOG, useFeatureStore } from '../../state/featureStore';
import { toast } from '../../state/toastStore';
// The Org Admin's gateway to vertical packs / custom features. Unlocking one
// instantly activates it across the tenant (new workspace + custom role).
export function FeatureMarketplaceCard() {
    const enabled = useFeatureStore((s) => s.enabled);
    const unlock = useFeatureStore((s) => s.unlock);
    const lock = useFeatureStore((s) => s.lock);
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white", children: _jsx(Sparkles, { className: "size-4" }) }), _jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Custom features & vertical packs" }), _jsxs("span", { className: "ml-auto text-xs font-semibold text-ink-muted", children: [enabled.length, " active"] })] }), _jsx("ul", { className: "grid grid-cols-1 gap-3 @4xl:grid-cols-2", children: FEATURE_CATALOG.map((f) => {
                    const on = enabled.includes(f.id);
                    return (_jsxs("li", { className: "flex flex-col gap-3 rounded-3xl bg-white/55 p-4 ring-1 ring-white/60", children: [_jsx("div", { className: "flex items-start justify-between gap-3", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ai", children: f.vertical }), on ? _jsx("span", { className: "rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success", children: "Active" }) : null] }), _jsx("p", { className: "mt-1.5 font-display text-[15px] font-bold text-ink", children: f.name }), _jsx("p", { className: "text-[12px] leading-snug text-ink-muted", children: f.tagline })] }) }), _jsx("ul", { className: "flex flex-wrap gap-1.5", children: f.unlocks.map((u) => (_jsxs("li", { className: "inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft ring-1 ring-white/70", children: [_jsx(Check, { className: "size-3 text-success" }), " ", u] }, u))) }), _jsx("button", { type: "button", onClick: () => {
                                    if (on) {
                                        lock(f.id);
                                        toast({ tone: 'warning', title: `${f.name} disabled`, body: 'The feature is no longer available to your team.' });
                                    }
                                    else {
                                        unlock(f.id);
                                        toast({ tone: 'success', title: `${f.name} activated`, body: 'The Claims workspace and Claims Officer role are now available to your team.' });
                                    }
                                }, className: cn('inline-flex h-10 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold transition-all', on
                                    ? 'bg-white text-ink-soft ring-1 ring-white/70 hover:bg-danger-soft hover:text-danger'
                                    : 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110'), children: on ? _jsxs(_Fragment, { children: [_jsx(Lock, { className: "size-4" }), " Disable"] }) : _jsxs(_Fragment, { children: [_jsx(Unlock, { className: "size-4" }), " Unlock for my team"] }) })] }, f.id));
                }) })] }));
}
