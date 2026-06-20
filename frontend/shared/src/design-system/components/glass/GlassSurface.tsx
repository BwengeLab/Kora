import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

// The base glass surface. Every card, panel, sheet and chip in the system
// sits on top of this. Tone controls translucency:
//   subtle  — barely-there overlay (sub-cards within a glass card)
//   default — the standard card
//   strong  — emphasis (active nav pill, modal sheet)

export type GlassTone = 'subtle' | 'default' | 'strong';

const toneClasses: Record<GlassTone, string> = {
  subtle: 'bg-glass-subtle border-white/50 shadow-glass-soft',
  default: 'bg-glass-surface border-white/60 shadow-glass',
  strong: 'bg-glass-strong border-white/70 shadow-glass',
};

export interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'nav';
  noBorder?: boolean;
  noBlur?: boolean;
}

export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ tone = 'default', as: Tag = 'div', noBorder, noBlur, className, ...rest }, ref) => (
    <Tag
      ref={ref as never}
      className={cn(
        'rounded-3xl',
        !noBlur && 'backdrop-blur-glass',
        !noBorder && 'border',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  ),
);
GlassSurface.displayName = 'GlassSurface';
