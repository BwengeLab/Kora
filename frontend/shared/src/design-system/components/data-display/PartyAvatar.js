import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { cn } from '../../utils/cn';
const sizeClasses = {
    sm: 'size-7 text-[10px]',
    md: 'size-9 text-xs',
    lg: 'size-12 text-sm',
};
const palette = [
    'bg-brand-soft text-brand-ink',
    'bg-ai-soft text-ai',
    'bg-success-soft text-success',
    'bg-warning-soft text-warning',
    'bg-lavender-soft text-lavender',
];
function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0])
        return '?';
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return ((parts[0][0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
function hashIndex(s, mod) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % mod;
}
export function PartyAvatar({ name, size = 'md', className }) {
    const tone = useMemo(() => palette[hashIndex(name, palette.length)], [name]);
    return (_jsx("span", { className: cn('inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-white/60', sizeClasses[size], tone, className), "aria-hidden": true, children: initials(name) }));
}
