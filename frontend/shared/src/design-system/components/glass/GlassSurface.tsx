import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

// The base glass surface. Every card, panel, sheet and chip in the system
// sits on top of this. Tone controls translucency:
//   subtle  — barely-there overlay (sub-cards within a glass card)
//   default — the standard card
//   strong  — emphasis (active nav pill, modal sheet)

export type GlassTone = 'subtle' | 'default' | 'strong';

// Liquid-glass: a diagonal white sheen gradient (more opaque top-left, more
// transparent bottom-right) over a strong backdrop blur, so the watery page
// shows through like light through a water bubble — never a flat opaque white.
const toneClasses: Record<GlassTone, string> = {
  subtle: 'bg-gradient-to-br from-white/45 to-white/20 border-white/45 shadow-glass-soft',
  default: 'bg-gradient-to-br from-white/58 to-white/32 border-white/55 shadow-glass',
  strong: 'bg-gradient-to-br from-white/70 to-white/44 border-white/65 shadow-glass',
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
