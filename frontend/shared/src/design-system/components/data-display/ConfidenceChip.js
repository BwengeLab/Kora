import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { confidenceTier } from '../../tokens';
import { StatusChip } from './StatusChip';
const tierToTone = {
    auto: 'success',
    suggested: 'warning',
    review: 'danger',
};
const tierToLabel = {
    auto: 'Auto',
    suggested: 'Suggested',
    review: 'Review',
};
export function ConfidenceChip({ score, className }) {
    const tier = confidenceTier(score);
    return (_jsxs(StatusChip, { tone: tierToTone[tier], className: className, children: [_jsxs("span", { className: "tabular", children: [Math.round(score), "%"] }), _jsx("span", { "aria-hidden": true, className: "opacity-60", children: "\u00B7" }), _jsx("span", { children: tierToLabel[tier] })] }));
}
