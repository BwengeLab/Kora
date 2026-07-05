import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { palette } from '../../tokens';
export function ProgressRing({ value, size = 132, thickness = 12, color = palette.primary, trackColor = 'rgba(15,23,41,0.08)', children, }) {
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, value));
    const dash = c * clamped;
    return (_jsxs("div", { className: "relative grid place-items-center", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: "-rotate-90", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "ring-grad", x1: "0", y1: "0", x2: "1", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: palette.primary }), _jsx("stop", { offset: "100%", stopColor: palette.ai })] }) }), _jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: trackColor, strokeWidth: thickness }), _jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: color === 'gradient' ? 'url(#ring-grad)' : color, strokeWidth: thickness, strokeLinecap: "round", strokeDasharray: `${dash} ${c - dash}` })] }), children ? _jsx("div", { className: "absolute inset-0 grid place-items-center text-center", children: children }) : null] }));
}
