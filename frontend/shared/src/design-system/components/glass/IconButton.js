import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
const variantClasses = {
    ghost: 'text-ink-soft hover:bg-white/40 hover:text-ink',
    glass: 'bg-glass-surface backdrop-blur-glass border border-glass-border text-ink-soft hover:bg-glass-strong hover:text-ink shadow-glass',
    primary: 'bg-brand text-white hover:bg-brand-ink shadow-glass',
};
const sizeClasses = {
    sm: 'size-8 [&>svg]:size-4',
    md: 'size-10 [&>svg]:size-[18px]',
    lg: 'size-12 [&>svg]:size-5',
};
export const IconButton = forwardRef(({ variant = 'ghost', size = 'md', label, className, children, ...rest }, ref) => (_jsx("button", { ref: ref, type: "button", "aria-label": label, title: label, className: cn('inline-flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40', variantClasses[variant], sizeClasses[size], className), ...rest, children: children })));
IconButton.displayName = 'IconButton';
