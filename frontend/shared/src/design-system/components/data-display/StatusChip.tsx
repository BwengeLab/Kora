import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai';

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-white/60 text-ink-soft border-white/70',
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/25',
  ai: 'bg-ai-soft text-ai border-ai/20',
};

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
}

export function StatusChip({ tone = 'neutral', icon, className, children, ...rest }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="-ml-0.5 [&>svg]:size-3.5">{icon}</span> : null}
      {children}
    </span>
  );
}
