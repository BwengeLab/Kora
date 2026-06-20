import { Calendar } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export interface PageHeaderProps {
  /** Override the auto greeting. Defaults to "Good morning, {firstName} 👋". */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-side slot (date-range pill, primary action…) */
  right?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, right, className }: PageHeaderProps) {
  const session = useSession();
  const firstName = session?.user.displayName.split(' ')[0] ?? '';
  const computed = (
    <>
      {greeting()}, {firstName}
      <span aria-hidden className="ml-2">👋</span>
    </>
  );

  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 px-8 pt-2 pb-5', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">
          {title ?? computed}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

// Default right-side: a date-range pill matching the reference image.
export function DateRangePill({ label }: { label: string }) {
  return (
    <GlassSurface tone="strong" className="flex h-11 items-center gap-2.5 px-4">
      <Calendar className="size-4 text-ink-muted" />
      <span className="text-sm font-semibold text-ink tabular">{label}</span>
    </GlassSurface>
  );
}
