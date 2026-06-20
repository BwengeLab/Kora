import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'ghost' | 'glass' | 'primary';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  ghost: 'text-ink-soft hover:bg-white/40 hover:text-ink',
  glass:
    'bg-glass-surface backdrop-blur-glass border border-glass-border text-ink-soft hover:bg-glass-strong hover:text-ink shadow-glass',
  primary: 'bg-brand text-white hover:bg-brand-ink shadow-glass',
};

const sizeClasses: Record<Size, string> = {
  sm: 'size-8 [&>svg]:size-4',
  md: 'size-10 [&>svg]:size-[18px]',
  lg: 'size-12 [&>svg]:size-5',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  label: string; // a11y — never decorative
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', label, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
