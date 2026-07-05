import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
// Liquid-glass: a diagonal white sheen gradient (more opaque top-left, more
// transparent bottom-right) over a strong backdrop blur, so the watery page
// shows through like light through a water bubble — never a flat opaque white.
const toneClasses = {
    subtle: 'bg-gradient-to-br from-white/45 to-white/20 border-white/45 shadow-glass-soft',
    default: 'bg-gradient-to-br from-white/58 to-white/32 border-white/55 shadow-glass',
    strong: 'bg-gradient-to-br from-white/70 to-white/44 border-white/65 shadow-glass',
};
export const GlassSurface = forwardRef(({ tone = 'default', as: Tag = 'div', noBorder, noBlur, className, ...rest }, ref) => (_jsx(Tag, { ref: ref, className: cn('rounded-3xl', !noBlur && 'backdrop-blur-glass', !noBorder && 'border', toneClasses[tone], className), ...rest })));
GlassSurface.displayName = 'GlassSurface';
